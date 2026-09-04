export type FraudSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FraudStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';

export interface FraudEvent {
  id: number;
  clientId: number;
  clientName?: string;
  trustRequestId?: number;
  eventType: string;
  severity: FraudSeverity;
  description?: string;
  status: FraudStatus;
  createdAt: string;
  resolvedAt?: string;
}
