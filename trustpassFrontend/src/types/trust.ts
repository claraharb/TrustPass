export type TrustDecisionType = 'ALLOW' | 'CHALLENGE' | 'THROTTLE' | 'BLOCK';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TrustDecision {
  id: number;
  trustRequestId: number;
  decision: TrustDecisionType;
  trustScore: number; // 0 - 100
  riskLevel: RiskLevel;
  explanation?: string;
  createdAt: string;
}

export interface RiskSignal {
  id: number;
  trustRequestId: number;
  signalType: string;
  source: 'CAMARA' | 'OPEN_GATEWAY' | 'NOKIA_NAC' | 'TRUSTPASS_ENGINE';
  value?: string;
  riskScore?: number;
  isPositive?: boolean;
  details?: string;
  createdAt: string;
}

export interface ProtectedAction {
  id: number;
  clientId: number;
  name: string;
  description?: string;
  riskLevel: RiskLevel;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrustRequest {
  id: number;
  clientId: number;
  clientName?: string;
  protectedActionId: number;
  protectedActionName?: string;
  requestId: string;
  phoneNumber?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'PENDING' | 'EVALUATED' | 'BLOCKED' | 'ERROR';
  createdAt: string;
  completedAt?: string;
  decision?: TrustDecisionType;
  trustScore?: number;
  riskLevel?: RiskLevel;
  riskSignals?: RiskSignal[];
}
