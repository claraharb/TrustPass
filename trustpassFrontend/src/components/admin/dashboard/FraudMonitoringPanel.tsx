import { Link } from 'react-router-dom';
import type { FraudEvent } from '../../../types/fraud';

interface FraudMonitoringPanelProps {
  events: FraudEvent[];
  networkStatus: {
    isOperational: boolean;
    provider?: string;
    latencyMs?: number;
  };
}

export const FraudMonitoringPanel: React.FC<FraudMonitoringPanelProps> = ({
  events,
  networkStatus,
}) => {
  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'HIGH':
      case 'CRITICAL':
        return 'high';
      case 'MEDIUM':
        return 'medium';
      case 'LOW':
      default:
        return 'low';
    }
  };

  return (
    <div className="dashboard-card panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Fraud monitoring</h2>
          <span className="panel-subtitle">Open events</span>
        </div>
        <Link to="/admin/fraud" className="panel-link">
          View all →
        </Link>
      </div>

      <div className="fraud-events-list">
        {events.map((evt) => (
          <div key={evt.id} className="fraud-event-item">
            <span
              className={`fraud-event-dot ${getSeverityClass(evt.severity)}`}
              title={`${evt.severity} severity`}
            />
            <div className="fraud-event-content">
              <h3 className="fraud-event-title">{evt.eventType}</h3>
              <div className="fraud-event-meta">
                {evt.clientName} · {evt.severity.charAt(0) + evt.severity.slice(1).toLowerCase()} severity · {evt.createdAt}
              </div>
              {evt.description && (
                <div className="fraud-event-desc">{evt.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="network-status-box">
        <span className="network-status-label">Network API integrations</span>
        <span className="network-status-online">
          <span className="pulse-dot" />
          {networkStatus.isOperational ? 'Operational' : 'Degraded'}
        </span>
      </div>
    </div>
  );
};
