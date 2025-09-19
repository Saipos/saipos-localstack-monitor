# Analytics Dashboard

Dashboard moderno para monitorar o sistema de User Analytics Events no LocalStack.

## 🚀 Como Executar

```bash
npm install
npm run dev
```

Dashboard disponível em: http://localhost:3001

## 🔗 Conexões LocalStack

- DynamoDB: user-analytics-events-platform-tokens
- SQS: user-analytics-events-events.fifo
- Logs: /aws/lambda/user-analytics-events-events-consumer

## 📊 Funcionalidades

1. Dashboard em tempo real com métricas
2. Monitor de tokens DynamoDB
3. Monitor de filas SQS
4. Visualizador de logs Lambda
5. Gerador de eventos de teste
