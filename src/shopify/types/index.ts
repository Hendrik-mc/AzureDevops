// ============================================================
// Mission:Control Types
// ============================================================

export interface MCProduct {
  id: string;
  name: string;
  publisherId: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface MCStockCheck {
  productId: string;
  regionId: string;
  hasStock: boolean;
}

export interface MCReservation {
  reservationId: string;
  productId: string;
  regionId: string;
  createdAt: string;
  expiresAt?: string;
}

export interface MCEndConsumer {
  ipAddress: string;
  language: string;
  location: {
    country: string;
    region?: string;
  };
}

export interface MCVatDetail {
  vatPercentage: number;
  vatAmount: number;
}

export interface MCSalesPrice {
  priceIncludingVat: number;
  vatDetail: MCVatDetail;
}

export interface MCOrderData {
  requestId: string;
  partnerReference: string;
  invoiceDate: string;
  salesChannel: string[];
  endConsumer: MCEndConsumer;
  salesPrice: MCSalesPrice;
}

export interface MCOrder {
  orderId: string;
  reservationId: string;
  status: string;
}

// ============================================================
// Shopify Plugin Types
// ============================================================

export interface ShopifyStoreConfig {
  mcPartnerId: string;
  mcEnvironment: "sandbox" | "production";
  autoSync: boolean;
  syncIntervalMins: number;
  defaultMarkup: number;
  regionId: string | null;
}

export type OrderMappingStatus =
  | "pending"
  | "reserved"
  | "fulfilled"
  | "failed"
  | "cancelled";

export type SyncLogType = "product_sync" | "stock_update" | "order_fulfill";
export type SyncLogStatus = "success" | "error" | "partial";

export interface SyncResult {
  type: SyncLogType;
  status: SyncLogStatus;
  created: number;
  updated: number;
  deactivated: number;
  errors: SyncError[];
}

export interface SyncError {
  productId: string;
  message: string;
  code?: string;
}

export interface OrderFlowResult {
  success: boolean;
  shopifyOrderId: string;
  mcReservationId?: string;
  mcOrderId?: string;
  error?: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface PluginHealthStatus {
  missionControl: {
    connected: boolean;
    latencyMs: number;
    environment: string;
  };
  shopify: {
    connected: boolean;
    storeDomain: string;
  };
  lastSync: string | null;
  pendingOrders: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

// ============================================================
// Cache Types
// ============================================================

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  constructor(private defaultTTLMs: number) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTLMs),
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
