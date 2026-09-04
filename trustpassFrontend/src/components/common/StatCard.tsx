import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  deltaText?: string;
  deltaHighlight?: string;
  isPositiveDelta?: boolean;
  isNegativeDelta?: boolean;
  icon?: ReactNode;
  variant?: 'teal' | 'amber' | 'red';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  deltaText,
  deltaHighlight,
  isPositiveDelta = true,
  isNegativeDelta = false,
  icon,
  variant = 'teal',
}) => {
  return (
    <div className="dashboard-card metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        {icon && (
          <div className={`metric-symbol-badge ${variant !== 'teal' ? variant : ''}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="metric-number">{value}</div>
      {(deltaText || deltaHighlight) && (
        <div className="metric-footer">
          {deltaHighlight && (
            <span
              className={`metric-delta ${
                isNegativeDelta ? 'red' : isPositiveDelta ? 'green' : ''
              }`}
            >
              {deltaHighlight}
            </span>
          )}
          {deltaText && <span>{deltaText}</span>}
        </div>
      )}
    </div>
  );
};
