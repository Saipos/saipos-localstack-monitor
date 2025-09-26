import { ChevronDown, RefreshCw, Play, Pause } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { REFRESH_INTERVALS } from '../../types';
import { formatTime } from '../../utils/formatters';

interface RefreshControlProps {
  interval: number;
  isEnabled: boolean;
  lastRefresh: Date;
  isPageVisible?: boolean;
  isRefreshing?: boolean;
  onIntervalChange: (interval: number) => void;
  onToggle: () => void;
  onManualRefresh?: () => void;
}

export function RefreshControl({
  interval,
  isEnabled,
  lastRefresh,
  isPageVisible = true,
  isRefreshing = false,
  onIntervalChange,
  onToggle,
  onManualRefresh
}: RefreshControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedInterval = REFRESH_INTERVALS.find(opt => opt.value === interval) || REFRESH_INTERVALS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleIntervalSelect = (newInterval: number) => {
    onIntervalChange(newInterval);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Manual Refresh Button */}
      {onManualRefresh && (
        <button
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
            isRefreshing
              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'btn-secondary hover:bg-gray-100'
          }`}
          title={isRefreshing ? "Atualizando..." : "Atualizar manualmente"}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      )}

      {/* Auto Refresh Toggle */}
      <button
        onClick={onToggle}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
          isEnabled
            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
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
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <span className="text-sm font-medium">{selectedInterval.label}</span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-32">
            {REFRESH_INTERVALS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleIntervalSelect(option.value)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  option.value === interval ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <div className={`w-2 h-2 rounded-full ${
          isEnabled && isPageVisible ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`} />
        <span>
          {!isPageVisible ? 'Aba inativa' : isEnabled ? 'Atualizando' : 'Pausado'}
        </span>
      </div>

      {/* Last Refresh Time */}
      <div className="text-xs text-gray-400">
        Última: {formatTime(lastRefresh)}
      </div>
    </div>
  );
}