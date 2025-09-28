# Guia Claude Code - Saipos LocalStack Monitor

## Visão Geral do Projeto

Este é um **Saipos LocalStack Monitor** para monitoramento de serviços LocalStack (AWS local). O projeto foi completamente refatorado seguindo **princípios de clean code**, **SOLID**, e **boas práticas TypeScript**.

---

## Regras Fundamentais de Desenvolvimento

### NEVER DO - Proibições Absolutas:

```typescript
// JAMAIS usar 'any' type
const data: any = response;

// JAMAIS deixar parâmetros implícitos
function process(item) { } // BAD

// JAMAIS criar constantes hardcoded espalhadas
const url = 'http://localhost:3006/api'; // BAD

// JAMAIS duplicar lógica entre componentes
const formatBytes = (bytes) => { /* logic */ } // BAD se já existe
```

### ALWAYS DO - Obrigatórios:

```typescript
// SEMPRE usar tipos explícitos
const data: ApiResponse<UserData> = response;

// SEMPRE tipar parâmetros
function process(item: ProcessableItem): ProcessResult { }

// SEMPRE usar constantes centralizadas
import { API_BASE_URL } from '../utils/constants';

// SEMPRE reutilizar funções utilitárias
import { formatBytes } from '../utils/formatters';
```

---

## Arquitetura e Organização

### Estrutura de Pastas - Detalhada

```
src/
├── components/                 # Componentes React
│   ├── shared/                 # Componentes reutilizáveis globais
│   │   ├── ConnectionStatus/   # Status de conectividade
│   │   ├── ErrorBoundary/      # Tratamento de erros
│   │   ├── MetricsChart/       # Gráficos e visualizações
│   │   ├── RefreshControl/     # Controles de atualização
│   │   └── ServiceStatus/      # Status de serviços
│   ├── dashboard/              # Componentes específicos do dashboard
│   │   ├── sections/           # Seções modulares (cada seção = 1 responsabilidade)
│   │   ├── BasicLocalStack/    # Dashboard principal
│   │   ├── DynamoDBView/       # Visualização DynamoDB
│   │   ├── SQSView/            # Visualização SQS
│   │   └── LambdaView/         # Visualização Lambda
│   └── layout/                 # Componentes de layout
│       └── Header/             # Cabeçalho e navegação
├── hooks/                      # Custom hooks React
│   ├── state/                  # Gerenciamento de estado
│   │   ├── useConnectionStatus # Status de conexão
│   │   ├── useRefreshTimer     # Timers de atualização
│   │   └── usePageVisibility   # Visibilidade da página
│   └── api/                    # Hooks para APIs
│       ├── useServiceStats     # Estatísticas de serviços
│       └── useServiceAvail     # Disponibilidade
├── services/                   # Camada de serviços/APIs
│   ├── aws/                    # Serviços AWS específicos
│   │   ├── base.ts             # Classe base (error handling, HTTP)
│   │   ├── dynamodb.ts         # Operações DynamoDB
│   │   ├── sqs.ts              # Operações SQS
│   │   ├── lambda.ts           # Operações Lambda
│   │   ├── cloudwatch.ts       # Métricas CloudWatch
│   │   └── connection.ts       # Health checks e conectividade
│   ├── localstack-api.ts       # API LocalStack (backward compatibility)
│   └── localstack-direct.ts    # Comunicação direta LocalStack
├── types/                      # Definições TypeScript
│   ├── index.ts                # Exportações principais + re-exports
│   ├── api/                    # Tipos relacionados a APIs
│   │   └── aws-api.ts          # Namespace AWS hierárquico
│   └── domain/                 # Tipos de domínio/negócio
│       └── index.ts            # Analytics, Events, Metrics
├── utils/                      # Utilitários e helpers
│   ├── formatters/             # Formatação de dados
│   │   └── formatters.ts       # formatBytes, formatDate, etc.
│   ├── validators/             # Validações
│   │   └── validation.ts       # Type guards, validadores
│   └── index.ts                # Re-exports dos utils
├── constants/                  # Constantes centralizadas
│   ├── constants.ts            # URLs, configs, mensagens
│   └── index.ts                # Re-exports das constantes
└── lib/                        # Configurações de bibliotecas
    └── aws-client.ts           # Cliente AWS configurado
```

### Regras de Organização por Pasta

#### `/src/components/`

**OBJETIVO:** Todos os componentes React da aplicação

**REGRAS:**
- **1 arquivo = 1 componente principal**
- **Props sempre tipadas** com interface `ComponentNameProps`
- **Single Responsibility**: cada componente tem 1 função
- **Shared components** são 100% reutilizáveis
- **Dashboard components** são específicos do contexto dashboard
- **NUNCA** lógica de negócio complexa dentro do componente
- **NUNCA** fetch de dados diretamente - usar hooks

```typescript
// ESTRUTURA CORRETA
export interface ComponentProps {
  data: DataType;
  onAction: (id: string) => void;
}

export function Component({ data, onAction }: ComponentProps) {
  // Apenas renderização e manipulação de eventos simples
}
```

#### `/src/hooks/`

**OBJETIVO:** Lógica reutilizável e gerenciamento de estado React

**REGRAS:**
- **1 hook = 1 responsabilidade específica**
- **`/state/`**: gerenciamento de estado local/global
- **`/api/`**: comunicação com APIs, cache, loading states
- **Return objects tipados** com interface `UseHookNameReturn`
- **NUNCA** hooks gigantes com múltiplas responsabilidades
- **NUNCA** lógica de UI dentro dos hooks

```typescript
// PADRÃO CORRETO
export interface UseConnectionStatusReturn {
  connectionStatus: ConnectionState;
  lastError: string | null;
  updateStatus: (status: ConnectionState) => void;
}

export function useConnectionStatus(): UseConnectionStatusReturn {
  // Lógica específica apenas para status de conexão
}
```

#### `/src/services/`

**OBJETIVO:** Camada de comunicação com APIs e serviços externos

**REGRAS:**
- **Classes estáticas** para organização
- **1 arquivo = 1 serviço/domínio** (DynamoDB, SQS, etc.)
- **Sempre estender `BaseAWSService`** para consistência
- **Error handling** centralizado na classe base
- **Tipos tipados** para requests/responses
- **NUNCA** lógica de UI ou componente
- **NUNCA** gerenciamento de estado React

```typescript
// PADRÃO CORRETO
export class DynamoDBService extends BaseAWSService {
  private static readonly SERVICE_PATH = '/dynamodb';

  static async getTables(): Promise<TableInfo[]> {
    return this.makeRequest<TableInfo[]>(`${this.SERVICE_PATH}/tables`);
  }
}
```

#### `/src/types/`

**OBJETIVO:** Definições TypeScript centralizadas e organizadas

**REGRAS:**
- **`/api/`**: tipos relacionados a APIs externas (AWS, LocalStack)
- **`/domain/`**: tipos de negócio (Analytics, Events, etc.)
- **Namespace hierárquico** para APIs complexas (`AWS.DynamoDB.Table`)
- **Re-exports** no `index.ts` para backward compatibility
- **TODO comments** quando tipo exato é desconhecido
- **NUNCA** usar `any` - usar `unknown` + type guards
- **NUNCA** tipos inline - sempre interfaces/types nomeados

```typescript
// ORGANIZAÇÃO CORRETA
// types/api/aws-api.ts
export namespace AWS {
  export namespace DynamoDB {
    export interface Table {
      TableName: string;
      ItemCount: number;
    }
  }
}

// types/domain/index.ts
export interface AnalyticsEvent {
  eventType: 'purchase' | 'view';
  value: number;
}
```

#### `/src/utils/`

**OBJETIVO:** Funções utilitárias puras e helpers

**REGRAS:**
- **`/formatters/`**: formatação de dados (bytes, datas, números)
- **`/validators/`**: type guards e validações
- **Funções puras**: mesma entrada = mesma saída
- **Tipagem explícita** entrada e saída
- **Zero dependências** de React ou estado
- **NUNCA** side effects (API calls, localStorage, etc.)
- **NUNCA** lógica específica de componente

```typescript
// FUNÇÃO UTILITÁRIA CORRETA
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  // Lógica pura de formatação
};
```

#### `/src/constants/`

**OBJETIVO:** Constantes centralizadas e configurações

**REGRAS:**
- **Agrupamento por contexto** (API_URLS, ERROR_MESSAGES)
- **`as const`** para type safety
- **UPPER_CASE** para constantes primitivas
- **PascalCase** para objetos de configuração
- **NUNCA** constantes hardcoded espalhadas pelo código
- **NUNCA** valores que mudam em runtime

```typescript
// ORGANIZAÇÃO CORRETA
export const API_BASE_URL = 'http://localhost:3006/api';

export const CONNECTION_STATUS_CONFIG = {
  connected: { text: 'Connected', color: 'bg-green-500' },
  disconnected: { text: 'Disconnected', color: 'bg-red-500' },
} as const;
```

### Decisão Rápida: "Onde Colocar Este Código?"

```
- É um componente React?              → /components/
- É reutilizável em várias telas?     → /components/shared/
- É específico do dashboard?          → /components/dashboard/

- É lógica de estado/efeitos?         → /hooks/state/
- É comunicação com API?              → /hooks/api/

- É uma chamada HTTP/API?             → /services/
- É específico de um serviço AWS?     → /services/aws/

- É definição de tipo?                → /types/
- É tipo de API externa?              → /types/api/
- É tipo de negócio?                  → /types/domain/

- É formatação/transformação?         → /utils/formatters/
- É validação/type guard?             → /utils/validators/

- É uma URL/config/constante?         → /constants/
```

### Regras de Imports e Exports

#### Exports (index.ts em cada pasta)

**REGRA:** Cada pasta deve ter um `index.ts` que re-exporta tudo de forma organizada:

```typescript
// /src/types/index.ts
export * from './api/aws-api';
export * from './domain';

// /src/utils/index.ts
export * from './formatters';
export * from './validators';
export * from '../constants';

// /src/services/index.ts
export * from './aws/base';
export * from './aws/dynamodb';
export * from './localstack-api';
```

#### Imports (sempre usar paths relativos curtos)

```typescript
// CORRETO - Import from index files
import { formatBytes, API_BASE_URL } from '../../utils';
import { ConnectionState, ServiceStats } from '../../types';
import { DynamoDBService } from '../../services';

// ERRADO - Imports específicos demais
import { formatBytes } from '../../utils/formatters/formatters';
import { API_BASE_URL } from '../../constants/constants';
```

#### Hierarquia de Imports (ordem recomendada)

```typescript
// 1. React e bibliotecas externas
import { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

// 2. Tipos (sempre com 'type' keyword)
import type { ComponentProps, ServiceStats } from '../../types';

// 3. Hooks, utilitários e serviços internos
import { useServiceStats } from '../../hooks';
import { formatBytes } from '../../utils';
import { DynamoDBService } from '../../services';
```

### Comandos Úteis para Verificar Estrutura

```bash
# Ver estrutura geral
tree src -I "node_modules"

# Contar arquivos por pasta
find src -name "*.ts" -o -name "*.tsx" | wc -l

# Verificar imports problemáticos
grep -r "from '\.\./\.\./\.\./\.\." src/  # Paths muito longos

# Ver re-exports dos index.ts
find src -name "index.ts" -exec echo "=== {} ===" \; -exec cat {} \;

# Verificar se todos os tipos estão tipados
grep -r ": any" src/  # Deve retornar vazio

# Verificar constantes hardcoded
grep -r "http://localhost" src/  # Só deve aparecer em constants/
```

---

## Padrões de Tipagem

### 1. Namespace Hierárquico AWS:

```typescript
// CORRETO - Usando namespace organizado
export namespace AWS {
  export namespace DynamoDB {
    export interface ListTablesResponse {
      TableNames: string[];
    }
  }
  export namespace SQS {
    export interface Message {
      MessageId: string;
      Body: string;
    }
  }
}

// Backward compatibility mantida
export type DynamoDBListTablesResponse = AWS.DynamoDB.ListTablesResponse;
```

### 2. Tipos para Componentes:

```typescript
// SEMPRE definir props interfaces
interface ComponentNameProps {
  data: DataType;
  onAction: (item: ItemType) => void;
  className?: string;  // Props opcionais sempre com ?
}

// SEMPRE usar union types para valores limitados
type Status = 'connected' | 'disconnected' | 'checking' | 'error';
```

### 3. Tratamento de Dados Desconhecidos:

```typescript
// QUANDO não souber o tipo exato, documente:
interface ApiResponse {
  data: unknown; // TODO: Definir tipo exato - verificar response real da API
  status: number;
}

// Use type guards para validação
function isValidResponse(data: unknown): data is ExpectedType {
  return typeof data === 'object' && data !== null && 'id' in data;
}```

---

## Padrões de Serviços

### Base Service Pattern:

```typescript
// SEMPRE estender BaseAWSService
export class DynamoDBService extends BaseAWSService {
  private static readonly SERVICE_PATH = '/dynamodb';

  static async getStats(): Promise<DynamoDBStats> {
    try {
      return await this.makeRequest<DynamoDBStats>(`${this.SERVICE_PATH}/stats`);
    } catch (error) {
      this.handleServiceError(error, 'DynamoDB');
    }
  }
}
```

---

## Padrões de Componentes

### Componentes Modulares:

```typescript
// SEMPRE separar responsabilidades
export function ServiceMetricsSection({ stats, onTabChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Conteúdo focado apenas em métricas */}
    </div>
  );
}

// SEMPRE usar custom hooks para lógica complexa
export function Dashboard() {
  const { stats, loading, error } = useServiceStats();
  const { serviceAvailability } = useServiceAvailability();

  return (
    <div>
      <ServiceMetricsSection stats={stats} />
      <DynamoDBSection tables={stats.dynamodb.tables} />
    </div>
  );
}
```

---

## Padrões de Hooks

### Hooks Especializados:

```typescript
// Um hook = uma responsabilidade
export function useConnectionStatus(): UseConnectionStatusReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected');

  const updateConnectionState = useCallback((
    successCount: number,
    totalAttempts: number,
    failures: PromiseRejectedResult[]
  ) => {
    // Lógica específica de conexão
  }, []);

  return { connectionStatus, updateConnectionState };
}
```

---

## Constantes e Utilitários

### Constantes Organizadas:

```typescript
// SEMPRE agrupar por contexto
export const API_URLS = {
  BASE: 'http://localhost:3006/api',
  LOCALSTACK: 'http://localhost:4566',
  HEALTH_CHECK: 'http://localhost:3006/health',
} as const;

export const CONNECTION_STATUS_CONFIG = {
  connected: { text: 'Connected', color: 'bg-green-500' },
  disconnected: { text: 'Disconnected', color: 'bg-red-500' },
} as const;
```

### Funções Utilitárias:

```typescript
// SEMPRE tipar entrada e saída
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  // ... implementação
};

export const safeParseInt = (value: string | number, defaultValue: number = 0): number => {
  if (typeof value === 'number') return value;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};
```

---

## Testes e Validação

### Build Check:
```bash
npm run build  # DEVE passar sem erros TypeScript
npm run lint   # DEVE passar sem warnings
```

### Funcionalidades Críticas:
- Dashboard principal carrega métricas
- Refresh automático funciona
- Seções individuais expandem/colapsam
- Navegação entre abas preservada

---

## Code Review Checklist

Antes de qualquer commit, verificar:

- [ ] Zero `any` types no código
- [ ] Todos os parâmetros tipados explicitamente
- [ ] Constantes centralizadas (não hardcoded)
- [ ] Funções utilitárias reutilizadas
- [ ] Componentes com única responsabilidade
- [ ] Hooks especializados (não monolíticos)
- [ ] Interfaces bem definidas
- [ ] TODOs documentados para tipos desconhecidos
- [ ] Build passa sem erros/warnings

---

## Backward Compatibility

**CRÍTICO:** Manter compatibility durante refatorações:

```typescript
// Sempre manter exports antigos com aliases
export { ConnectionService as LocalStackApiService } from './aws/connection';
export type DynamoDBListTablesResponse = AWS.DynamoDB.ListTablesResponse;
```

---

## Dicas para Novos Agentes

1. **Antes de criar qualquer função/constante:** Verificar se já existe em `utils/`
2. **Antes de usar `any`:** Pensar em `unknown` + type guard
3. **Antes de criar componente grande:** Considerar divisão em seções
4. **Antes de duplicar lógica:** Criar hook ou utility função
5. **Sempre testar build:** `npm run build` após mudanças

---

## Próximos Passos Recomendados

### Status Atual do Projeto

**CONCLUÍDO:**
- Refatoração completa clean code + SOLID
- Arquitetura modular (components/hooks/services/types)
- Build 100% limpo (0 erros TypeScript)
- Documentação completa de boas práticas
- Tipos centralizados e organizados
- Estrutura de pastas hierárquica

### Roadmap Estratégico

#### PRIORIDADE ALTA - Funcionalidades Core

**Status:** Várias funcionalidades estão comentadas como TODO
**Objetivo:** Dashboard 100% funcional

```bash
# Verificar TODOs pendentes
grep -r "TODO:" src/ | wc -l
```

**Tasks:**
1. **StoreTokensView Real** - Implementar carregamento real de dados DynamoDB
2. **Lambda Metrics Complete** - Completar métricas CloudWatch detalhadas
3. **SQS Messages Live** - Visualização de mensagens em tempo real
4. **Error Handling** - Melhorar tratamento de erros nos serviços
5. **Loading States** - Estados de carregamento consistentes

**Estimativa:** 4-6 horas de desenvolvimento

#### RECOMENDADO - Cobertura de Testes

**Status:** Zero testes implementados
**Objetivo:** Garantir qualidade do código refatorado

```bash
# Setup sugerido
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest jsdom

# Estrutura de testes
src/__tests__/
├── components/     # Testes de componentes
├── hooks/          # Testes de custom hooks
├── services/       # Testes de APIs
└── utils/          # Testes de utilities
```

**Tasks:**
1. **Utils Tests** - Testar formatters e validators (mais fácil)
2. **Services Tests** - Testar classes AWS (mocks)
3. **Hooks Tests** - Testar lógica de estado
4. **Components Tests** - Testar renderização

**Estimativa:** 6-8 horas

#### VALOR DE NEGÓCIO - Dashboard Avançado

**Status:** Dashboard básico funcionando
**Objetivo:** Experiência rica em tempo real

**Features:**
- **Real-time Updates** - WebSocket/SSE para métricas live
- **Alerting System** - Notificações quando serviços ficam offline
- **Historical Data** - Armazenar e visualizar tendências temporais
- **Export Reports** - Gerar relatórios PDF/CSV
- **Advanced Charts** - Gráficos mais sofisticados

**Estimativa:** 10-15 horas

#### PRODUÇÃO - Deploy Ready

**Status:** Apenas desenvolvimento local
**Objetivo:** Preparar para ambiente produção

**Tasks:**
1. **Docker Setup** - Containerização da aplicação
2. **Environment Config** - Variáveis de ambiente
3. **CI/CD Pipeline** - GitHub Actions
4. **Monitoring** - Logs e métricas de produção
5. **Security** - HTTPS, CORS, headers

**Estimativa:** 8-10 horas

#### POLISH - UX/UI Melhorias

**Status:** Interface funcional básica
**Objetivo:** Experiência profissional

**Features:**
- **Dark Mode** - Toggle tema escuro/claro
- **Responsive Design** - Suporte mobile/tablet
- **Loading Skeletons** - UX durante carregamentos
- **Keyboard Shortcuts** - Navegação rápida
- **Accessibility** - ARIA labels, contraste

**Estimativa:** 6-8 horas

### Recomendação Estratégica

**Para Agentes Futuros - Ordem Sugerida:**

1.  **Funcionalidades Core** (PRIMEIRO - impacto imediato)
2.  **Testes Básicos** (SEGUNDO - qualidade)
3.  **Dashboard Avançado** (TERCEIRO - valor agregado)
4.  **Deploy Produção** (QUARTO - go-live)
5.  **UX Polish** (QUINTO - refinamentos)

**Justificativa:** Funcionalidades core aproveitam toda arquitetura limpa criada e entregam valor imediato. Testes garantem estabilidade. Demais itens são evoluções.

### Como Escolher o Próximo Passo

- Precisa demonstrar valor rapidamente? → Funcionalidades Core
- Qualidade é crítica para o projeto? → Testes First
- Quer impressionar stakeholders? → Dashboard Avançado
- Vai para produção em breve? → Deploy Ready
- Experiência do usuário é prioridade? → UX Polish

### Meta de Cada Sprint

- **Sprint 1:** TODOs implementados → Dashboard 100% funcional
- **Sprint 2:** Testes principais → Cobertura 70%+
- **Sprint 3:** Features avançadas → Real-time dashboard
- **Sprint 4:** Deploy + monitoring → Produção ready
- **Sprint 5:** Polish + acessibilidade → Experiência premium

---

## Comandos Essenciais

```bash
# Desenvolvimento
npm run dev          # Iniciar dev server
npm run build        # Build de produção
npm run lint         # Verificar code quality

# Estrutura
find src -name "*.ts" -o -name "*.tsx" | head -20  # Ver arquivos TS
wc -l src/components/dashboard/*.tsx               # Contagem de linhas
```

---

**LEMBRE-SE:** Este projeto segue **padrões rigorosos** de qualidade. Cada linha de código deve ser **profissional**, **tipada**, e **bem estruturada**. Não há exceções para atalhos ou gambiarras.

**Zero tolerance para:**
- `any` types
- Constantes hardcoded
- Lógica duplicada
- Componentes monolíticos
- Hooks gigantes
- Parâmetros sem tipo

**Sempre priorizar:**
- Clean Code
- SOLID Principles
- DRY (Don't Repeat Yourself)
- Explicit Typing
- Single Responsibility
- Reusability