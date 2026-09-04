import React, { useState } from 'react';
import type { TrustActivityPoint } from '../../../types/admin';

interface TrustRequestChartProps {
  data: TrustActivityPoint[];
}

export const TrustRequestChart: React.FC<TrustRequestChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="chart-empty">No activity data available</div>;
  }

  const width = 700;
  const height = 180;
  const paddingX = 24;
  const paddingY = 28;

  const maxVal = Math.max(...data.map((d) => d.requests), 1);
  const minVal = 0;

  const getX = (index: number) => {
    return paddingX + (index / (data.length - 1)) * (width - 2 * paddingX);
  };

  const getY = (val: number) => {
    const range = maxVal - minVal;
    const normalized = (val - minVal) / (range || 1);
    return height - paddingY - normalized * (height - 2 * paddingY);
  };

  const points = data
    .map((d, i) => `${getX(i).toFixed(1)},${getY(d.requests).toFixed(1)}`)
    .join(' ');

  const areaPoints = `${getX(0).toFixed(1)},${height} ${points} ${getX(
    data.length - 1
  ).toFixed(1)},${height}`;

  const activeIndex = hoveredIndex !== null ? hoveredIndex : data.length - 1;
  const activePoint = data[activeIndex];
  const activeX = getX(activeIndex);

  return (
    <div className="dashboard-card panel chart-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Trust request activity</h2>
          <span className="panel-subtitle">Real-time throughput & trend</span>
        </div>
        {activePoint && (
          <div className="chart-live-metric">
            <span className="metric-date">{activePoint.label}:</span>
            <b>{activePoint.requests.toLocaleString()} reqs</b>
            <span className="metric-tag allow">{activePoint.allowed} allowed</span>
            <span className="metric-tag block">{activePoint.blocked} blocked</span>
          </div>
        )}
      </div>

      <div className="chart-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="chartGradientLive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#02B29D" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#02B29D" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          <polygon points={areaPoints} fill="url(#chartGradientLive)" />

          <line
            x1={activeX}
            y1={10}
            x2={activeX}
            y2={height - 10}
            stroke="rgba(2, 178, 157, 0.25)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          <polyline
            points={points}
            fill="none"
            stroke="#02B29D"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((d, i) => {
            const cx = getX(i);

            return (
              <g key={d.date} onMouseEnter={() => setHoveredIndex(i)} style={{ cursor: 'pointer' }}>
                <rect
                  x={cx - 20}
                  y={0}
                  width={40}
                  height={height}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>

        <div className="chart-point-layer" aria-hidden="true">
          {data.map((d, i) => {
            const pointClass = i === activeIndex ? 'chart-point active' : 'chart-point';
            return (
              <span
                key={d.date}
                className={pointClass}
                style={{
                  left: `${(getX(i) / width) * 100}%`,
                  top: `${(getY(d.requests) / height) * 100}%`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="chart-axis">
        {data.map((d, i) => {
          const showLabel =
            i === 0 ||
            i === Math.floor(data.length / 4) ||
            i === Math.floor(data.length / 2) ||
            i === Math.floor((3 * data.length) / 4) ||
            i === data.length - 1;

          return showLabel ? (
            <span
              key={d.date}
              className={`axis-tick ${i === activeIndex ? 'active' : ''}`}
            >
              {d.label}
            </span>
          ) : null;
        })}
      </div>
    </div>
  );
};
