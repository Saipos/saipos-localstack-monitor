import type { LucideIcon } from 'lucide-react';
import type { MetricCardProps } from '../../types';

interface MetricCardPropsWithIcon extends Omit<MetricCardProps, 'icon'> {
  icon: LucideIcon;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  trend,
  onClick,
  className
}: MetricCardPropsWithIcon) {
  const colorClasses = {
    blue: 'from-saipos-blue-500 to-saipos-blue-600',
    green: 'from-accent-500 to-accent-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    gray: 'from-saipos-gray-500 to-saipos-gray-600',
  };

  const CardWrapper = onClick ? 'button' : 'div';

  return (
    <CardWrapper
      className={`metric-card group ${onClick ? 'cursor-pointer hover:shadow-lg transition-all duration-200' : ''} ${className || ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-saipos-gray-600">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-saipos-gray-900">{value}</p>
            {trend && (
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-saipos-gray-600 mt-1 font-medium">{subtitle}</p>
          )}
        </div>

        <div className={`
          w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]}
          flex items-center justify-center transition-transform duration-200
          group-hover:scale-110
        `}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardWrapper>
  );
}