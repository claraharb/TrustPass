export interface Client {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ClientSubscription {
  id: number;
  startDate: string;
  endDate: string;
  requestsUsed: number;
  isActive: boolean;
  paymentStatus: string;
  package: {
    id: number;
    name: string;
    requestLimit: number;
    price: number | string;
    durationDays: number;
    features: string;
  };
}

export interface ClientUsageRecord {
  id: number;
  endpoint: string;
  method: string;
  statusCode: number;
  requestId?: string | null;
  createdAt: string;
}

export interface ClientDetails extends Client {
  subscriptions: ClientSubscription[];
  apiUsage: ClientUsageRecord[];
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
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
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
