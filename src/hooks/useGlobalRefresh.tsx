import { createContext, useContext, useCallback, useState, useRef, useEffect, type ReactNode } from 'react';
import type { ConnectionState } from '../types';
import { REFRESH_INTERVALS } from '../types';

interface GlobalRefreshContextType {
  // Estados
  interval: number;
  isEnabled: boolean;
  lastRefresh: Date;
  isPageVisible: boolean;
  isRefreshing: boolean;
  connectionStatus: ConnectionState;
  lastError: string | null;

  // Funções de controle
  changeInterval: (interval: number) => void;
  toggleRefresh: () => void;
  executeRefresh: () => Promise<void>;
  formatInterval: (intervalMs: number) => string;

  // Registro de páginas
  registerRefreshFunction: (pageId: string, refreshFn: () => Promise<void>) => void;
  unregisterRefreshFunction: (pageId: string) => void;
}

const GlobalRefreshContext = createContext<GlobalRefreshContextType | null>(null);

interface GlobalRefreshProviderProps {
  children: ReactNode;
  defaultInterval?: number;
}

export function GlobalRefreshProvider({
  children,
  defaultInterval = 10000
}: GlobalRefreshProviderProps) {
  const [interval, setInterval] = useState(defaultInterval);

  const [isEnabled, setIsEnabled] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const refreshFunctionsRef = useRef<Map<string, () => Promise<void>>>(new Map());
  const executeRefreshRef = useRef<(() => Promise<void>) | null>(null);
  const isRefreshingRef = useRef<boolean>(false);

  // Sincroniza refs com estados
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  // Ref para manter o interval atual
  const currentIntervalRef = useRef(interval);

  // Atualiza a ref quando o interval muda
  useEffect(() => {
    // Proteção contra valores undefined ou inválidos
    const validInterval = interval && interval > 0 ? interval : defaultInterval;
    currentIntervalRef.current = validInterval;

    // Se o interval original era inválido, corrige o estado
    if (interval !== validInterval) {
      setInterval(validInterval);
    }
  }, [interval, defaultInterval]);

  // Função para configurar/reconfigurar timer
  const setupTimer = useCallback(() => {

    // Limpa timer existente
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Só configura timer se estiver habilitado, página visível e há funções registradas
    if (isEnabled && isPageVisible && refreshFunctionsRef.current.size > 0) {
      const currentInterval = currentIntervalRef.current;

      // Proteção adicional contra intervalos inválidos
      if (!currentInterval || currentInterval <= 0) {
        currentIntervalRef.current = defaultInterval;
        setInterval(defaultInterval);
        return; // Retorna e aguarda novo ciclo com valor correto
      }

      intervalRef.current = window.setInterval(() => {
        // const _displayInterval = currentIntervalRef.current || 'UNDEFINED';
        if (executeRefreshRef.current && !isRefreshingRef.current) {
          executeRefreshRef.current();
        }
      }, currentInterval);
    }
  }, [isEnabled, isPageVisible]); // Removendo interval das dependências

  // Efeito para configurar/reconfigurar timer quando as condições mudam
  useEffect(() => {
    setupTimer();
  }, [setupTimer]);

  // Efeito específico para mudanças de interval
  useEffect(() => {
    if (isEnabled) {
      setupTimer();
    }
  }, [interval, isEnabled, setupTimer]);

  // Verificador de integridade do timer (debug)
  useEffect(() => {
    if (isEnabled) {
      const healthCheck = window.setInterval(() => {
        // Health check logic here if needed
      }, 5000);

      return () => window.clearInterval(healthCheck);
    }
  }, [isEnabled, isPageVisible]);

  // Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Executa todas as funções de refresh registradas
  const executeAllRefreshFunctions = useCallback(async () => {
    // Usa ref para verificar estado atual sem criar dependência
    if (isRefreshingRef.current) {
      return;
    }


    try {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      setConnectionStatus('checking');
      setLastError(null);

      const functionsToExecute = Array.from(refreshFunctionsRef.current.values());

      const refreshPromises = functionsToExecute.map(fn => fn());
      const results = await Promise.allSettled(refreshPromises);

      // Debug: Log dos resultados para verificar

      // Verifica se houve falhas
      const failures = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];


      if (failures.length === 0) {
        setConnectionStatus('connected');
        setLastError(null);
      } else if (failures.length === results.length) {
        // Todas falharam - LocalStack completamente offline
        setConnectionStatus('disconnected');
        const error = failures[0].reason;
        if (error?.message?.includes('500') || error?.message?.includes('Failed to load resource') || error?.message?.includes('Failed to list')) {
          setLastError('LocalStack não está respondendo. Verifique se o serviço está ativo.');
        } else if (error?.message?.includes('fetch')) {
          setLastError('Não foi possível conectar ao servidor LocalStack.');
        } else {
          setLastError('Serviços AWS indisponíveis no momento.');
        }
      } else {
        // Algumas falharam - serviços parciais disponíveis
        const workingServices = results.length - failures.length;
        setConnectionStatus('connected'); // Considera conectado se alguns serviços funcionam
        setLastError(`${workingServices} de ${results.length} serviços disponíveis`);
      }

      setLastRefresh(new Date());
    } catch (error) {
      setConnectionStatus('disconnected');
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      if (errorMessage.includes('500') || errorMessage.includes('indisponível')) {
        setLastError('LocalStack não está respondendo. Verifique se o serviço está ativo.');
      } else {
        setLastError('Problema na conexão com os serviços AWS.');
      }
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, []); // Remove isRefreshing das dependências

  // Atualiza a ref sempre que a função muda
  executeRefreshRef.current = executeAllRefreshFunctions;

  // Check inicial de conectividade após as páginas carregarem
  useEffect(() => {
    const timer = setTimeout(() => {

      if (refreshFunctionsRef.current.size > 0 && executeRefreshRef.current) {
        executeRefreshRef.current().catch(() => {
          // Handle error silently
        });
      }
    }, 3000); // Aumentei para 3s para garantir

    return () => clearTimeout(timer);
  }, []); // Sem dependências para evitar loops

  // Cleanup do timer no unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const registerRefreshFunction = useCallback((pageId: string, refreshFn: () => Promise<void>) => {
    refreshFunctionsRef.current.set(pageId, refreshFn);
    // Reconfigura timer quando uma nova função é registrada
    setupTimer();
  }, [setupTimer]);

  const unregisterRefreshFunction = useCallback((pageId: string) => {
    refreshFunctionsRef.current.delete(pageId);
    // Reconfigura timer quando uma função é removida
    setupTimer();
  }, [setupTimer]);

  const toggleRefresh = useCallback(() => {
    setIsEnabled(prev => {
      const newValue = !prev;
      return newValue;
    });
  }, [isEnabled]);

  const changeInterval = useCallback((newInterval: number) => {
    // Proteção contra valores inválidos
    if (!newInterval || newInterval <= 0) {
      return;
    }

    setInterval(newInterval);
  }, [interval]);

  const formatInterval = useCallback((intervalMs: number): string => {
    const option = REFRESH_INTERVALS.find(opt => opt.value === intervalMs);
    return option ? option.label : `${intervalMs}ms`;
  }, []);

  const value: GlobalRefreshContextType = {
    interval,
    isEnabled,
    lastRefresh,
    isPageVisible,
    isRefreshing,
    connectionStatus,
    lastError,
    changeInterval,
    toggleRefresh,
    executeRefresh: executeAllRefreshFunctions,
    formatInterval,
    registerRefreshFunction,
    unregisterRefreshFunction,
  };

  return (
    <GlobalRefreshContext.Provider value={value}>
      {children}
    </GlobalRefreshContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGlobalRefresh() {
  const context = useContext(GlobalRefreshContext);
  if (!context) {
    throw new Error('useGlobalRefresh must be used within a GlobalRefreshProvider');
  }
  return context;
}

// Hook para páginas registrarem sua função de refresh
// eslint-disable-next-line react-refresh/only-export-components
export function usePageRefresh(pageId: string, refreshFunction: () => Promise<void>) {
  const { registerRefreshFunction, unregisterRefreshFunction } = useGlobalRefresh();

  useEffect(() => {
    registerRefreshFunction(pageId, refreshFunction);
    return () => unregisterRefreshFunction(pageId);
  }, [pageId, refreshFunction, registerRefreshFunction, unregisterRefreshFunction]);
}