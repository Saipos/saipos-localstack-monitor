const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = 3002;
const LOCALSTACK_URL = 'http://localhost:4566';

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:3003', 'http://127.0.0.1:3001', 'http://127.0.0.1:3003'],
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

// Test LocalStack connectivity
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

// Helper function to execute AWS CLI commands
function executeAwsCommand(args) {
  return new Promise((resolve, reject) => {
    const awsArgs = [
      '--profile', 'localstack',
      '--endpoint-url', LOCALSTACK_URL,
      ...args
    ];

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
          // If not JSON, return raw output
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

// Proxy all requests to LocalStack
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

// Handle preflight requests
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