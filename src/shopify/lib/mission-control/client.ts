import { ClientBuilder } from "@missioncontrolio/client";
import {
  getPluginConfig,
  MissionControlEnvironment,
} from "../../config";

export interface MCClientOptions {
  clientId: string;
  clientSecret: string;
  partnerId: string;
  tenantId?: string;
  environment: MissionControlEnvironment;
}

let _client: ReturnType<ClientBuilder["build"]> | null = null;
let _currentEnv: MissionControlEnvironment | null = null;

/**
 * Get or create the Mission:Control API client.
 * Uses singleton pattern; recreates if environment changes.
 */
export function getMCClient() {
  const config = getPluginConfig();
  const opts = config.missionControl;

  if (_client && _currentEnv === opts.environment) {
    return _client;
  }

  const builder = new ClientBuilder()
    .withAzureAdClientCredentials(opts.clientId, opts.clientSecret)
    .withDefaultPartnerId(opts.partnerId);

  if (opts.environment === MissionControlEnvironment.Sandbox) {
    builder.forEnvironment(MissionControlEnvironment.Sandbox);
  }

  _client = builder.build();
  _currentEnv = opts.environment;

  return _client;
}

/**
 * Create a client with explicit options (for per-store config overrides).
 */
export function createMCClient(opts: MCClientOptions) {
  const builder = new ClientBuilder()
    .withAzureAdClientCredentials(opts.clientId, opts.clientSecret)
    .withDefaultPartnerId(opts.partnerId);

  if (opts.environment === MissionControlEnvironment.Sandbox) {
    builder.forEnvironment(MissionControlEnvironment.Sandbox);
  }

  return builder.build();
}

/**
 * Reset the singleton client (for testing or config changes).
 */
export function resetMCClient(): void {
  _client = null;
  _currentEnv = null;
}

/**
 * Translate Mission:Control ProblemDetails errors into a standard format.
 */
export class MCApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: string,
    public readonly traceId?: string,
    public readonly validationErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "MCApiError";
  }

  static fromProblemDetails(err: unknown): MCApiError {
    if (err && typeof err === "object") {
      const pd = err as Record<string, unknown>;
      const additionalData = pd.additionalData as Record<string, unknown> | undefined;
      return new MCApiError(
        (pd.title as string) ?? "Mission:Control API Error",
        (pd.status as number) ?? 500,
        pd.detail as string | undefined,
        additionalData?.traceId as string | undefined,
        additionalData?.errors as Record<string, string[]> | undefined
      );
    }
    if (err instanceof Error) {
      return new MCApiError(err.message, 500);
    }
    return new MCApiError("Unknown Mission:Control API error", 500);
  }
}

/**
 * Wrap an MC SDK call with error handling.
 */
export async function mcApiCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw MCApiError.fromProblemDetails(err);
  }
}
