import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { ChartDataPoint, ChartColorKey, MetricsChartProps } from '../../types';

export function MetricsChart({
  title,
  data,
  unit = '',
  color = 'blue',
  type = 'line',
  height = 200
}: MetricsChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Limit and optimize data for better performance
  const processedData = data
    .slice(-50)
    .filter(point => point.value !== undefined && point.value !== null)
    .map(point => ({
      ...point,
      value: Number(point.value) || 0
    }));

  if (processedData.length === 0) {
    return (
      <div className="card p-6">
        <h4 className="font-medium text-gray-900 mb-4">{title}</h4>
        <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-1">Sem dados disponíveis</p>
          <p className="text-xs text-gray-400">Execute a função para gerar métricas</p>
        </div>
      </div>
    );
  }

  // Calculate statistics using processed data
  const values = processedData.map(d => d.value);
  const maxValue = Math.max(...values, 1); // Minimum 1 to avoid zero division
  const minValue = Math.min(...values);
  const avgValue = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  const latestValue = values[values.length - 1] || 0;
  const previousValue = values[values.length - 2] || 0;
  const trend = previousValue ? ((latestValue - previousValue) / Math.abs(previousValue)) * 100 : 0;

  const getColorClasses = (colorName: ChartColorKey) => {
    const colors = {
      blue: {
        line: 'stroke-blue-500',
        fill: 'fill-blue-100',
        bar: 'bg-blue-500',
        text: 'text-blue-600',
        bg: 'bg-blue-50'
      },
      green: {
        line: 'stroke-green-500',
        fill: 'fill-green-100',
        bar: 'bg-green-500',
        text: 'text-green-600',
        bg: 'bg-green-50'
      },
      red: {
        line: 'stroke-red-500',
        fill: 'fill-red-100',
        bar: 'bg-red-500',
        text: 'text-red-600',
        bg: 'bg-red-50'
      },
      yellow: {
        line: 'stroke-yellow-500',
        fill: 'fill-yellow-100',
        bar: 'bg-yellow-500',
        text: 'text-yellow-600',
        bg: 'bg-yellow-50'
      },
      purple: {
        line: 'stroke-purple-500',
        fill: 'fill-purple-100',
        bar: 'bg-purple-500',
        text: 'text-purple-600',
        bg: 'bg-purple-50'
      }
    };
    return colors[colorName as keyof typeof colors] || colors.blue;
  };

  const colorClasses = getColorClasses(color);

  const formatValue = (value: number) => {
    if (unit === 'ms') {
      return `${value.toFixed(1)}ms`;
    }
    if (unit === 'MB') {
      return `${value.toFixed(1)}MB`;
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    return `${value.toLocaleString()}${unit}`;
  };

  const getTrendIcon = () => {
    if (Math.abs(trend) < 1) return <Minus className="w-4 h-4 text-gray-500" />;
    return trend > 0
      ? <TrendingUp className="w-4 h-4 text-green-500" />
      : <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const renderLineChart = () => {
    const width = 400;
    const chartHeight = height - 40;
    const padding = 20;

    if (processedData.length < 2) {
      return (
        <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Dados insuficientes para gráfico</p>
        </div>
      );
    }

    const xStep = (width - 2 * padding) / (processedData.length - 1);
    const yRange = maxValue - minValue;
    const yScale = yRange > 0 ? (chartHeight - 2 * padding) / yRange : 1;

    const pathData = processedData
      .map((point, index) => {
        const x = padding + index * xStep;
        const y = chartHeight - padding - (point.value - minValue) * yScale;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    const areaData = `${pathData} L ${padding + (processedData.length - 1) * xStep} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`;

    return (
      <div className="relative">
        <svg width={width} height={height} className="overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <g key={index}>
              <line
                x1={padding}
                y1={padding + ratio * (chartHeight - 2 * padding)}
                x2={width - padding}
                y2={padding + ratio * (chartHeight - 2 * padding)}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Area fill */}
          <path
            d={areaData}
            className={colorClasses.fill}
            opacity="0.3"
          />

          {/* Main line */}
          <path
            d={pathData}
            fill="none"
            className={colorClasses.line}
            strokeWidth="2"
          />

          {/* Data points */}
          {data.map((point, index) => {
            const x = padding + index * xStep;
            const y = chartHeight - padding - (point.value - minValue) * yScale;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                className={`${colorClasses.line} fill-white`}
                strokeWidth="2"
                onMouseEnter={() => setHoveredPoint(index)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredPoint !== null && (
          <div className="absolute bg-gray-900 text-white px-2 py-1 rounded text-sm pointer-events-none z-10"
               style={{
                 left: `${padding + hoveredPoint * xStep}px`,
                 top: `${chartHeight - padding - (data[hoveredPoint].value - minValue) * yScale - 30}px`,
                 transform: 'translateX(-50%)'
               }}>
            {formatValue(data[hoveredPoint].value)}
          </div>
        )}
      </div>
    );
  };

  const renderBarChart = () => {
    const maxBarHeight = height - 60;
    const barWidth = Math.max(20, Math.min(60, 300 / data.length));
    // const spacing = 4; // TODO: Use for bar spacing if needed

    return (
      <div className="flex items-end space-x-1 h-full justify-center">
        {data.map((point, index) => {
          const barHeight = (point.value / maxValue) * maxBarHeight;
          return (
            <div
              key={index}
              className="flex flex-col items-center"
              onMouseEnter={() => setHoveredPoint(index)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <div
                className={`${colorClasses.bar} rounded-t transition-all duration-200 cursor-pointer hover:opacity-80`}
                style={{
                  width: `${barWidth}px`,
                  height: `${barHeight}px`,
                  minHeight: '2px'
                }}
              />
              {hoveredPoint === index && (
                <div className="absolute bg-gray-900 text-white px-2 py-1 rounded text-sm mt-1 z-10">
                  {formatValue(point.value)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <div className="flex items-center space-x-2 text-sm">
          {getTrendIcon()}
          <span className={trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}>
            {Math.abs(trend).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className={`p-3 ${colorClasses.bg} rounded-lg`}>
          <div className="text-xs text-gray-600">Atual</div>
          <div className={`font-semibold ${colorClasses.text}`}>
            {formatValue(latestValue)}
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">Média</div>
          <div className="font-semibold text-gray-700">
            {formatValue(avgValue)}
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">Máximo</div>
          <div className="font-semibold text-gray-700">
            {formatValue(maxValue)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: `${height}px` }}>
        {type === 'line' ? renderLineChart() : renderBarChart()}
      </div>
    </div>
  );
}