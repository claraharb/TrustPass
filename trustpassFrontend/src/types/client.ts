export interface Client {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface Package {
  id: number;
  name: string;
  description?: string;
  requestLimit: number;
  price: number;
  durationDays: number;
  features: string[];
  isActive: boolean;
}

export interface Subscription {
  id: number;
  clientId: number;
  packageId: number;
  packageName?: string;
  startDate: string;
  endDate: string;
  requestsUsed: number;
  requestLimit?: number;
  isActive: boolean;
  paymentStatus: string;
}

export interface ApiKey {
  id: number;
  clientId: number;
  keyPrefix: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  createdAt: string;
  lastUsedAt?: string;
  usageCount: number;
}

export interface ApiUsage {
  id: number;
  clientId: number;
  apiKeyId?: number;
  endpoint: string;
  method: string;
  statusCode: number;
  requestId?: string;
  createdAt: string;
}
