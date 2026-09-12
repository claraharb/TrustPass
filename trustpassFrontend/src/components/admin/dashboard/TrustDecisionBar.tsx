import type { DecisionStat } from '../../../types/admin';

interface TrustDecisionBarProps {
  decisions: DecisionStat[];
  totalAssessed: number;
}

export const TrustDecisionBar: React.FC<TrustDecisionBarProps> = ({
  decisions,
  totalAssessed,
}) => {
  const getDecisionFillClass = (decision: string) => {
    switch (decision) {
      case 'ALLOW':
        return 'allow';
      case 'CHALLENGE':
        return 'challenge';
      case 'THROTTLE':
        return 'throttle';
      case 'BLOCK':
        return 'block';
      default:
        return 'allow';
    }
  };

  return (
    <div className="dashboard-card panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Trust decisions</h2>
          <span className="panel-subtitle">All clients aggregate</span>
        </div>
      </div>

      <div className="decisions-list">
        {decisions.map((item) => (
          <div key={item.decision} className="decision-row">
            <span className="decision-name">{item.label}</span>
            <div className="decision-bar-track" title={`${item.label}: ${item.percentage}% (${item.count.toLocaleString()} requests)`}>
              <div
                className={`decision-bar-fill ${getDecisionFillClass(item.decision)}`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <span className="decision-pct">{item.percentage}%</span>
          </div>
        ))}
      </div>

      <div className="decisions-summary-footer">
        <span>Requests assessed</span>
        <b>{totalAssessed.toLocaleString()}</b>
      </div>
    </div>
  );
};
