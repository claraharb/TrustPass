import type { TrustDecisionType } from '../../types/trust';

interface DecisionBadgeProps {
  decision: TrustDecisionType;
  className?: string;
}

export const DecisionBadge: React.FC<DecisionBadgeProps> = ({ decision, className = '' }) => {
  const getDecisionClass = () => {
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
    <span className={`decision-pill ${getDecisionClass()} ${className}`}>
      {decision}
    </span>
  );
};
