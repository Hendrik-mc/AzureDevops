import type { TokenCredential, AccessToken } from "@azure/identity";

export class SessionTokenCredential implements TokenCredential {
  private token: string;

  constructor(accessToken: string) {
    this.token = accessToken;
  }

  async getToken(): Promise<AccessToken> {
    return {
      token: this.token,
      expiresOnTimestamp: Date.now() + 3600 * 1000,
    };
  }
}

const BASE_URL = "https://management.azure.com";

interface AzureFetchOptions {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  apiVersion?: string;
}

export async function azureFetch<T>(
  token: string,
  path: string,
  options: AzureFetchOptions = {}
): Promise<T> {
  const { method = "GET", body, apiVersion } = options;

  const url = new URL(path.startsWith("https://") ? path : `${BASE_URL}${path}`);
  if (apiVersion) {
    url.searchParams.set("api-version", apiVersion);
  }

  let retries = 0;
  const maxRetries = 3;

  while (true) {
    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 429 && retries < maxRetries) {
      const retryAfter = parseInt(
        response.headers.get("Retry-After") || "5",
        10
      );
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      retries++;
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AzureApiError(
        `Azure API error ${response.status}: ${errorBody}`,
        response.status,
        path
      );
    }

    return response.json() as Promise<T>;
  }
}

export class AzureApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public path: string
  ) {
    super(message);
    this.name = "AzureApiError";
  }
}

export async function fetchAllSettled(
  fetchers: Record<string, () => Promise<unknown>>
): Promise<
  Record<
    string,
    { status: "success"; data: unknown } | { status: "error"; error: string }
  >
> {
  const entries = Object.entries(fetchers);
  const results = await Promise.allSettled(
    entries.map(([, fn]) => fn())
  );

  const output: Record<
    string,
    { status: "success"; data: unknown } | { status: "error"; error: string }
  > = {};

  entries.forEach(([key], i) => {
    const result = results[i];
    if (result.status === "fulfilled") {
      output[key] = { status: "success", data: result.value };
    } else {
      output[key] = {
        status: "error",
        error: result.reason?.message || "Unknown error",
      };
    }
  });

  return output;
}
