import { MissionControlEnvironment } from "./environments";

export { MissionControlEnvironment };

export interface PluginConfig {
  missionControl: {
    clientId: string;
    clientSecret: string;
    partnerId: string;
    tenantId?: string;
    environment: MissionControlEnvironment;
  };
  shopify: {
    apiKey: string;
    apiSecret: string;
    scopes: string[];
    appUrl: string;
  };
  sync: {
    defaultIntervalMins: number;
    stockRefreshMins: number;
    reservationTimeoutMins: number;
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue?: string): string | undefined {
  return process.env[name] ?? defaultValue;
}

let _config: PluginConfig | null = null;

export function getPluginConfig(): PluginConfig {
  if (_config) return _config;

  _config = {
    missionControl: {
      clientId: requireEnv("MC_CLIENT_ID"),
      clientSecret: requireEnv("MC_CLIENT_SECRET"),
      partnerId: requireEnv("MC_PARTNER_ID"),
      tenantId: optionalEnv("MC_TENANT_ID"),
      environment:
        optionalEnv("MC_ENVIRONMENT", "sandbox") === "production"
          ? MissionControlEnvironment.Production
          : MissionControlEnvironment.Sandbox,
    },
    shopify: {
      apiKey: requireEnv("SHOPIFY_API_KEY"),
      apiSecret: requireEnv("SHOPIFY_API_SECRET"),
      scopes: (
        optionalEnv(
          "SHOPIFY_SCOPES",
          "read_products,write_products,read_orders,write_orders,read_inventory,write_inventory,write_fulfillments"
        ) ?? ""
      ).split(","),
      appUrl: requireEnv("SHOPIFY_APP_URL"),
    },
    sync: {
      defaultIntervalMins: parseInt(
        optionalEnv("SYNC_INTERVAL_MINS", "60") ?? "60",
        10
      ),
      stockRefreshMins: parseInt(
        optionalEnv("STOCK_REFRESH_MINS", "15") ?? "15",
        10
      ),
      reservationTimeoutMins: parseInt(
        optionalEnv("RESERVATION_TIMEOUT_MINS", "30") ?? "30",
        10
      ),
    },
  };

  return _config;
}

/** Reset cached config (for testing) */
export function resetConfig(): void {
  _config = null;
}
