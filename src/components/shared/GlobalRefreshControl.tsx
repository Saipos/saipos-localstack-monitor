import { AlertTriangle, CheckCircle, ChevronDown, Clock, Pause, Play, RefreshCw, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useGlobalRefresh } from '../../hooks/useGlobalRefresh';
import { REFRESH_INTERVALS } from '../../types';
import { formatTime } from '../../utils/formatters';

export function GlobalRefreshControl() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    interval,
    isEnabled,
    lastRefresh,
    isPageVisible,
    isRefreshing,
    connectionStatus,
    lastError,
    changeInterval,
    toggleRefresh,
    executeRefresh,
    formatInterval,
  } = useGlobalRefresh();

  const selectedInterval = REFRESH_INTERVALS.find(opt => opt.value === interval) || {
    value: interval,
    label: formatInterval(interval)
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleIntervalSelect = (newInterval: number) => {
    changeInterval(newInterval);
    setIsDropdownOpen(false);
  };

  const getStatusConfig = () => {
    if (!isPageVisible) {
      return {
        icon: WifiOff,
        color: 'text-orange-500',
        text: 'Aba Inativa',
        pulse: false
      };
    }

    switch (connectionStatus) {
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          text: isEnabled ? 'Conectado • Ativo' : 'Conectado • Pausado',
          pulse: isEnabled
        };
      case 'checking':
        return {
          icon: RefreshCw,
          color: 'text-blue-500',
          text: 'Verificando...',
          pulse: false,
          spin: true
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-orange-500',
          text: 'Problemas Parciais',
          pulse: false
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-red-500',
          text: 'LocalStack Offline',
          pulse: false
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
      {/* Status Indicator */}
      <div className="flex items-center space-x-2">
        <StatusIcon
          className={`w-4 h-4 ${statusConfig.color} ${
            statusConfig.pulse ? 'animate-pulse' : ''
          } ${statusConfig.spin ? 'animate-spin' : ''}`}
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white/90">
            {statusConfig.text}
          </span>
          {lastError && connectionStatus !== 'connected' && (
            <span className="text-xs text-white/60 max-w-48 truncate" title={lastError}>
              {lastError}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-white/20"></div>

      {/* Manual Refresh Button */}
      <button
        onClick={() => {
          executeRefresh();
        }}
        disabled={isRefreshing}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all duration-200 ${
          isRefreshing
            ? 'bg-white/5 text-white/50 cursor-not-allowed'
            : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105 active:scale-95'
        }`}
        title={isRefreshing ? "Atualizando..." : "Atualizar manualmente"}
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium">
          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </span>
      </button>

      {/* Auto Refresh Toggle */}
      <button
        onClick={toggleRefresh}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all duration-200 ${
          isEnabled
            ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30'
            : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
        }`}
        title={isEnabled ? 'Pausar atualização automática' : 'Iniciar atualização automática'}
      >
        {isEnabled ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {isEnabled ? 'Pausar' : 'Iniciar'}
        </span>
      </button>

      {/* Interval Selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 text-white hover:bg-white/20 border border-white/20 rounded-md transition-all duration-200 hover:scale-105"
        >
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">{selectedInterval.label}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isDropdownOpen ? 'transform rotate-180' : ''
            }`}
          />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-40 overflow-hidden">
            <div className="py-1">
              {REFRESH_INTERVALS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleIntervalSelect(option.value)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${
                    option.value === interval
                      ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-500'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {option.value === interval && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Last Refresh Time */}
      <div className="flex items-center space-x-1 text-xs text-white/60">
        <span>Última:</span>
        <span className="font-mono">{formatTime(lastRefresh)}</span>
      </div>
    </div>
  );
}