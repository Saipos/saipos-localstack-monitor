const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = 3006;
const LOCALSTACK_URL = 'http://localhost:4566';

// Enable JSON body parsing
app.use(express.json());

// Enable CORS para requisições do frontend
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:3003', 'http://localhost:3005', 'http://127.0.0.1:3001', 'http://127.0.0.1:3003', 'http://127.0.0.1:3005'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Amz-Target',
    'X-Amz-Date',
    'X-Amz-Security-Token',
    'X-Amz-User-Agent',
    'X-Amz-Content-Sha256',
    'X-Amz-Algorithm',
    'X-Amz-Credential',
    'X-Amz-Signed-Headers',
    'X-Amz-Signature',
    'amz-sdk-invocation-id',
    'amz-sdk-request'
  ]
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    localstack: LOCALSTACK_URL,
    port: PORT
  });
});

// Teste de conexão com LocalStack
app.get('/test-localstack', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${LOCALSTACK_URL}/_localstack/health`);
    const data = await response.json();

    res.json({
      connected: response.ok,
      status: response.status,
      localstack_health: data
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});

// Função para executar comandos AWS CLI
function executeAwsCommand(args) {
  return new Promise((resolve, reject) => {
    const awsArgs = [
      '--profile', 'localstack',
      '--endpoint-url', LOCALSTACK_URL,
      ...args
    ];

    console.log('Full AWS Command:', 'aws', awsArgs.join(' '));

    const aws = spawn('aws', awsArgs);
    let stdout = '';
    let stderr = '';

    aws.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    aws.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    aws.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          resolve({ raw: stdout.trim() });
        }
      } else {
        reject(new Error(`AWS command failed: ${stderr || stdout}`));
      }
    });

    aws.on('error', (error) => {
      reject(error);
    });
  });
}

// DynamoDB endpoints
app.get('/api/dynamodb/tables', async (req, res) => {
  try {
    const result = await executeAwsCommand(['dynamodb', 'list-tables']);
    res.json(result);
  } catch (error) {
    console.error('Error listing tables:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dynamodb/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const result = await executeAwsCommand(['dynamodb', 'describe-table', '--table-name', tableName]);
    res.json(result);
  } catch (error) {
    console.error('Error describing table:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dynamodb/table/:tableName/scan', async (req, res) => {
  try {
    const { tableName } = req.params;
    const limit = req.query.limit || '50';
    const result = await executeAwsCommand(['dynamodb', 'scan', '--table-name', tableName, '--limit', limit]);
    res.json(result);
  } catch (error) {
    console.error('Error scanning table:', error);
    res.status(500).json({ error: error.message });
  }
});

// SQS endpoints
app.get('/api/sqs/queues', async (req, res) => {
  try {
    const result = await executeAwsCommand(['sqs', 'list-queues']);
    res.json(result);
  } catch (error) {
    console.error('Error listing queues:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sqs/queue-attributes', async (req, res) => {
  try {
    const { queueUrl } = req.query;
    if (!queueUrl) {
      return res.status(400).json({ error: 'queueUrl is required' });
    }

    const result = await executeAwsCommand([
      'sqs', 'get-queue-attributes',
      '--queue-url', queueUrl,
      '--attribute-names', 'All'
    ]);
    res.json(result);
  } catch (error) {
    console.error('Error getting queue attributes:', error);
    res.status(500).json({ error: error.message });
  }
});

// SQS Message Operations
app.post('/api/sqs/receive-messages', async (req, res) => {
  try {
    const { queueUrl, maxNumberOfMessages = 10, waitTimeSeconds = 0, visibilityTimeout = 30 } = req.body;

    if (!queueUrl) {
      return res.status(400).json({ error: 'queueUrl is required' });
    }

    const args = [
      'sqs', 'receive-message',
      '--queue-url', queueUrl,
      '--max-number-of-messages', maxNumberOfMessages.toString(),
      '--wait-time-seconds', waitTimeSeconds.toString(),
      '--visibility-timeout', visibilityTimeout.toString(),
      '--attribute-names', 'All',
      '--message-attribute-names', 'All'
    ];

    const result = await executeAwsCommand(args);
    res.json(result);
  } catch (error) {
    console.error('Error receiving SQS messages:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sqs/send-message', async (req, res) => {
  try {
    const { queueUrl, messageBody, messageAttributes = {}, messageGroupId, messageDeduplicationId } = req.body;

    console.log('SQS Send Message Request:', { queueUrl, messageBody, messageGroupId, messageDeduplicationId, messageAttributes });

    if (!queueUrl || !messageBody) {
      return res.status(400).json({ error: 'queueUrl and messageBody are required' });
    }

    const args = [
      'sqs', 'send-message',
      '--queue-url', queueUrl,
      '--message-body', messageBody
    ];

    // Add parâmetros opcionais para filas FIFO
    if (messageGroupId) {
      args.push('--message-group-id', messageGroupId);
    }

    if (messageDeduplicationId) {
      args.push('--message-deduplication-id', messageDeduplicationId);
    }

    // Adicionar atributos de mensagem se fornecidos
    if (Object.keys(messageAttributes).length > 0) {
      args.push('--message-attributes');
      args.push(JSON.stringify(messageAttributes));
    }

    console.log('AWS CLI Command:', args);

    const result = await executeAwsCommand(args);
    res.json(result);
  } catch (error) {
    console.error('Error sending SQS message:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sqs/delete-message', async (req, res) => {
  try {
    const { queueUrl, receiptHandle } = req.body;

    if (!queueUrl || !receiptHandle) {
      return res.status(400).json({ error: 'queueUrl and receiptHandle are required' });
    }

    const args = [
      'sqs', 'delete-message',
      '--queue-url', queueUrl,
      '--receipt-handle', receiptHandle
    ];

    await executeAwsCommand(args);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting SQS message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lambda endpoints
app.get('/api/lambda/functions', async (req, res) => {
  try {
    const result = await executeAwsCommand(['lambda', 'list-functions']);
    res.json(result);
  } catch (error) {
    console.error('Error listing functions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/lambda/function/:functionName', async (req, res) => {
  try {
    const { functionName } = req.params;
    const result = await executeAwsCommand(['lambda', 'get-function', '--function-name', functionName]);
    res.json(result);
  } catch (error) {
    console.error('Error getting function:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lambda/invoke', async (req, res) => {
  try {
    const { functionName, payload } = req.body;

    if (!functionName) {
      return res.status(400).json({ error: 'functionName is required' });
    }

    const args = [
      'lambda', 'invoke',
      '--function-name', functionName,
      '--payload', payload || '{}',
      '--cli-binary-format', 'raw-in-base64-out',
      '/tmp/lambda-response.json'
    ];

    console.log('Lambda Invoke Command:', args);

    const result = await executeAwsCommand(args);

    try {
      const fs = require('fs');
      const responsePayload = fs.readFileSync('/tmp/lambda-response.json', 'utf8');

      res.json({
        ...result,
        ResponsePayload: responsePayload
      });
    } catch (fileError) {
      console.warn('Could not read response file:', fileError);
      res.json(result);
    }
  } catch (error) {
    console.error('Error invoking function:', error);
    res.status(500).json({ error: error.message });
  }
});

// CloudWatch Metrics endpoints
app.get('/api/cloudwatch/metrics/:functionName', async (req, res) => {
  try {
    const { functionName } = req.params;
    const { startTime, endTime, period } = req.query;

    // Por padrão, buscar métricas das últimas 24 horas
    const start = startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const end = endTime || new Date().toISOString();
    const metricPeriod = period || '300'; // 5 minutes

    // Obter várias métricas para a função Lambda
    const metrics = [
      'Invocations',
      'Duration',
      'Errors',
      'Throttles',
      'ConcurrentExecutions'
    ];

    const results = {};

    for (const metricName of metrics) {
      try {
        const args = [
          'cloudwatch', 'get-metric-statistics',
          '--namespace', 'AWS/Lambda',
          '--metric-name', metricName,
          '--dimensions', `Name=FunctionName,Value=${functionName}`,
          '--start-time', start,
          '--end-time', end,
          '--period', metricPeriod,
          '--statistics', metricName === 'Duration' ? 'Average,Maximum' : 'Sum'
        ];

        const result = await executeAwsCommand(args);
        results[metricName] = result.Datapoints || [];
      } catch (error) {
        console.warn(`Failed to get metric ${metricName}:`, error.message);
        results[metricName] = [];
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error getting CloudWatch metrics:', error);
    // Return empty results structure instead of error status
    res.json({
      Invocations: [],
      Duration: [],
      Errors: [],
      Throttles: [],
      ConcurrentExecutions: []
    });
  }
});

app.get('/api/cloudwatch/insights/:functionName', async (req, res) => {
  try {
    const { functionName } = req.params;

    // Comando para iniciar uma consulta no CloudWatch Logs Insights
    const query = `
      fields @timestamp, @duration, @billedDuration, @memorySize, @maxMemoryUsed
      | filter @type = "REPORT"
      | sort @timestamp desc
      | limit 100
    `;

    const args = [
      'logs', 'start-query',
      '--log-group-name', `/aws/lambda/${functionName}`,
      '--start-time', Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000).toString(),
      '--end-time', Math.floor(Date.now() / 1000).toString(),
      '--query-string', query
    ];

    const startResult = await executeAwsCommand(args);

    if (startResult.queryId) {
      // Esperar alguns segundos para a consulta ser processada
      await new Promise(resolve => setTimeout(resolve, 2000));

      const getResultsArgs = [
        'logs', 'get-query-results',
        '--query-id', startResult.queryId
      ];

      const queryResults = await executeAwsCommand(getResultsArgs);
      res.json(queryResults);
    } else {
      res.json({ results: [] });
    }
  } catch (error) {
    console.error('Error getting CloudWatch Insights:', error);
    // Retornar estrutura vazia em vez de erro
    res.json({ results: [] });
  }
});

// CloudWatch Logs endpoints
app.get('/api/logs/groups', async (req, res) => {
  try {
    const result = await executeAwsCommand(['logs', 'describe-log-groups']);
    res.json(result);
  } catch (error) {
    console.error('Error listing log groups:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs/streams', async (req, res) => {
  try {
    const { logGroupName } = req.query;
    if (!logGroupName) {
      return res.status(400).json({ error: 'logGroupName is required' });
    }

    const result = await executeAwsCommand([
      'logs', 'describe-log-streams',
      '--log-group-name', logGroupName,
      '--order-by', 'LastEventTime',
      '--descending'
    ]);
    res.json(result);
  } catch (error) {
    console.error('Error listing log streams:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs/events', async (req, res) => {
  try {
    const { logGroupName, logStreamName } = req.query;
    if (!logGroupName || !logStreamName) {
      return res.status(400).json({ error: 'logGroupName and logStreamName are required' });
    }

    const result = await executeAwsCommand([
      'logs', 'get-log-events',
      '--log-group-name', logGroupName,
      '--log-stream-name', logStreamName,
      '--limit', '50'
    ]);
    res.json(result);
  } catch (error) {
    console.error('Error getting log events:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para LocalStack
app.use('/aws', createProxyMiddleware({
  target: LOCALSTACK_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/aws': '', // remove /aws prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> ${LOCALSTACK_URL}${req.url.replace('/aws', '')}`);
    console.log(`[PROXY HEADERS]`, JSON.stringify(req.headers, null, 2));

    // Add required headers for AWS API calls
    proxyReq.setHeader('Host', 'localhost:4566');
    proxyReq.setHeader('X-Forwarded-For', req.ip);

    // Completely strip the origin header to avoid LocalStack CORS issues
    delete req.headers.origin;
    delete req.headers.Origin;

    // Preserve all AWS-related headers
    Object.keys(req.headers).forEach(key => {
      if (key.toLowerCase().startsWith('x-amz') ||
          key.toLowerCase().includes('authorization') ||
          key.toLowerCase() === 'content-type') {
        proxyReq.setHeader(key, req.headers[key]);
      }
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY RESPONSE] ${proxyRes.statusCode} for ${req.method} ${req.url}`);

    // Add CORS headers to response
    proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Amz-Target, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent';
  },
  onError: (err, req, res) => {
    console.error(`[PROXY ERROR] ${err.message} for ${req.method} ${req.url}`);
    res.status(500).json({
      error: 'Proxy error',
      message: err.message,
      localstack_url: LOCALSTACK_URL
    });
  }
}));

// Lidar com requisições OPTIONS para CORS
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', [
    'Content-Type',
    'Authorization',
    'X-Amz-Target',
    'X-Amz-Date',
    'X-Amz-Security-Token',
    'X-Amz-User-Agent',
    'X-Amz-Content-Sha256',
    'X-Amz-Algorithm',
    'X-Amz-Credential',
    'X-Amz-Signed-Headers',
    'X-Amz-Signature',
    'amz-sdk-invocation-id',
    'amz-sdk-request'
  ].join(', '));
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🚀 Analytics Dashboard API Server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying LocalStack requests to ${LOCALSTACK_URL}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test LocalStack: http://localhost:${PORT}/test-localstack`);
});

module.exports = app;