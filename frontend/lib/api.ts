export const API_BASE_URL: string = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export type ActionDecision = "ALLOW" | "REDACT" | "REVIEW" | "BLOCK";
export type ResponseDecision = "ALLOW" | "REDACT" | "BLOCK";
export type RequestStatus =
  | "COMPLETED"
  | "BLOCKED"
  | "DENIED"
  | "PENDING_REVIEW"
  | "NO_ROUTE"
  | "PROVIDER_FAILED"
  | "RESPONSE_BLOCKED";
export type TargetProvider = "auto" | "aws-bedrock" | "azure-ai" | "gcp-vertex" | "local";
export type ProviderId = Exclude<TargetProvider, "auto">;
export type TelemetryLevel = "info" | "warn" | "block" | "success";
export type RouteStatus = "SELECTED" | "NO_FEASIBLE_ROUTE";
export type DataResidency = "IN" | "US" | "EU" | "LOCAL";
export type CircuitState = "CLOSED" | "OPEN";

export interface InspectRequest {
  prompt: string;
  target_provider: TargetProvider;
}

export interface Finding {
  category: string;
  rule: string;
  severity: string;
  start: number;
  end: number;
  confidence: number;
  source: string;
}

export interface RouteEvaluation {
  provider_id: string;
  feasible: boolean;
  utility: number;
  effective_cost: number;
  priced_by: string;
  reasons: string[];
}

export interface RouteResult {
  status: RouteStatus;
  selected: string | null;
  utility: number | null;
  ranking: string[];
  evaluations: RouteEvaluation[];
  notes: string[];
}

export interface ModelResponse {
  provider: string;
  text: string;
  decision: ResponseDecision;
  categories: string[];
}

export interface VaultInfo {
  token_preview: string;
  sealed_bytes: number;
  kdf: string;
  iterations: number;
  cipher: string;
  key_id: string;
}

export interface TelemetryStep {
  step: number;
  node: string;
  event: string;
  detail: string;
  elapsed_ms: number;
  level: TelemetryLevel;
}

export interface InspectResponse {
  request_id: string;
  action_decision: ActionDecision;
  status: RequestStatus;
  target_provider: TargetProvider;
  routed_provider: string | null;
  processed_prompt: string | null;
  safe_preview: string | null;
  reasons: string[];
  findings: Finding[];
  review_id: string | null;
  route: RouteResult | null;
  response: ModelResponse | null;
  vault: VaultInfo | null;
  telemetry: TelemetryStep[];
  graph_path: string[];
  timings_ms: Record<string, number>;
  policy_version: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  graph: string;
  vault: string;
  mode: string;
  uptime_s: number;
}

export interface ProviderInfo {
  provider_id: string;
  display_name: string;
  kind: "cloud" | "local";
  region: string;
  data_residency: DataResidency;
  cost_per_1k_requests_usd: number;
  contract_price_per_1k_usd: number | null;
  p95_latency_ms: number;
  quality_score: number;
  availability_pct: number;
  circuit: CircuitState;
}

export interface ReviewTicket {
  review_id: string;
  created_at: string;
  expires_at: string;
  status: string;
  categories: string[];
  reasons: string[];
  safe_preview: string | null;
  requested_provider: string | null;
}

export interface ReviewDecisionRequest {
  approved: boolean;
  reviewer: string;
}

export interface MetricsResponse {
  requests_total: number;
  decisions: Record<ActionDecision, number>;
  status_counts: Record<string, number>;
  pending_reviews: number;
  mean_latency_ms: number;
  p95_latency_ms: number;
}

export interface GraphResponse {
  mermaid: string;
  nodes: string[];
  edges: [string, string][];
}

export const PROVIDER_OPTIONS: ReadonlyArray<{ value: TargetProvider; label: string }> = [
  { value: "auto", label: "Auto-route (utility)" },
  { value: "aws-bedrock", label: "AWS Bedrock" },
  { value: "azure-ai", label: "Azure AI" },
  { value: "gcp-vertex", label: "GCP Vertex AI" },
  { value: "local", label: "Local (Ollama)" },
];

export function requestedProviderLabel(id: string | null | undefined): string {
  return id && id.trim() ? providerLabel(id) : "Auto-route";
}

export function providerLabel(id: string | null | undefined): string {
  if (!id) return "—";
  const match = PROVIDER_OPTIONS.find((p) => p.value === id);
  return match ? match.label : id;
}

export class ApiError extends Error {
  readonly status: number;
  readonly kind: "network" | "http" | "parse";
  readonly detail: string | null;

  constructor(message: string, status: number, kind: "network" | "http" | "parse", detail: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind;
    this.detail = detail;
  }
}

const TOKEN_KEY = "ciphermesh.token";
const REVIEWER_TOKEN_KEY = "ciphermesh.reviewerToken";

export const TOKENS_CHANGED_EVENT = "ciphermesh:tokens-changed";
export const OPEN_SETTINGS_EVENT = "ciphermesh:open-settings";

function readKey(key: string): string {
  try {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeKey(key: string, token: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    const trimmed = token.trim();
    if (trimmed) window.localStorage.setItem(key, trimmed);
    else window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function notifyTokensChanged(): void {
  try {
    window.dispatchEvent(new Event(TOKENS_CHANGED_EVENT));
  } catch {
    /* non-browser environment */
  }
}

export function readToken(): string {
  return readKey(TOKEN_KEY);
}

export function writeToken(token: string): boolean {
  const ok = writeKey(TOKEN_KEY, token);
  if (ok) notifyTokensChanged();
  return ok;
}

export function readReviewerToken(): string {
  return readKey(REVIEWER_TOKEN_KEY);
}

export function writeReviewerToken(token: string): boolean {
  const ok = writeKey(REVIEWER_TOKEN_KEY, token);
  if (ok) notifyTokensChanged();
  return ok;
}

export function openSettings(focus: "api" | "reviewer" = "api"): void {
  try {
    window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT, { detail: { focus } }));
  } catch {
    /* non-browser environment */
  }
}

/** Classifies a review-endpoint failure: reviewer sign-in needed, console disabled, or neither. */
export function reviewAccessState(err: unknown): "locked" | "disabled" | null {
  if (!(err instanceof ApiError) || err.kind !== "http") return null;
  const detail = (err.detail ?? "").toLowerCase();
  if (err.status === 403 && detail.includes("disabled")) return "disabled";
  if (err.status === 401 && !detail.includes("x-ciphermesh-token")) return "locked";
  return null;
}

function describeDetail(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (item && typeof item === "object") {
          const rec = item as { msg?: unknown; loc?: unknown };
          const msg = typeof rec.msg === "string" ? rec.msg : null;
          const loc = Array.isArray(rec.loc)
            ? rec.loc.filter((x) => x !== "body").map(String).join(".")
            : "";
          if (msg) return loc ? `${loc}: ${msg}` : msg;
        }
        return typeof item === "string" ? item : null;
      })
      .filter((x): x is string => Boolean(x));
    return parts.length ? parts.join("; ") : null;
  }
  if (detail && typeof detail === "object") {
    const rec = detail as { message?: unknown; error?: unknown };
    if (typeof rec.message === "string") return rec.message;
    if (typeof rec.error === "string") return rec.error;
  }
  return null;
}

function statusMessage(
  status: number,
  serverMessage: string | null,
  retryAfter: string | null,
  reviewer: boolean,
): string {
  const suffix = serverMessage ? ` ${serverMessage}` : "";
  const lower = (serverMessage ?? "").toLowerCase();
  if (reviewer && status === 401 && !lower.includes("x-ciphermesh-token")) {
    return "Reviewer sign-in required (401). Enter the reviewer token in Settings.";
  }
  if (reviewer && status === 403 && lower.includes("disabled")) {
    return "Review console disabled on this deployment (403).";
  }
  switch (status) {
    case 401:
    case 403:
      return `Not authorized (${status}). Set a valid X-CipherMesh-Token in Settings.${suffix}`;
    case 404:
      return `Not found (404).${suffix}`;
    case 409:
      return `Conflict (409): this review was already decided or has expired.${suffix}`;
    case 413:
      return "Request too large (413). Shorten the prompt and try again.";
    case 422:
      return `Validation failed (422).${suffix}`;
    case 429:
      return `Rate limited (429). ${retryAfter ? `Retry after ${retryAfter}s.` : "Slow down and retry shortly."}${suffix}`;
    default:
      if (status >= 500) return `Server error (${status}).${suffix}`;
      return `Request failed (${status}).${suffix}`;
  }
}

async function request<T>(
  path: string,
  init?: { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal; reviewer?: boolean },
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const method = init?.method ?? "GET";
  if (init?.body !== undefined) headers["Content-Type"] = "application/json";
  const token = readToken();
  if (token) headers["X-CipherMesh-Token"] = token;
  if (init?.reviewer) {
    const reviewerToken = readReviewerToken();
    if (reviewerToken) headers["X-CipherMesh-Reviewer-Token"] = reviewerToken;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init?.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request was cancelled.", 0, "network");
    }
    throw new ApiError(
      `Cannot reach the CipherMesh API at ${API_BASE_URL}. Check that the backend is running.`,
      0,
      "network",
    );
  }

  const text = await res.text().catch(() => "");
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (res.ok) throw new ApiError("The API returned a response that is not valid JSON.", res.status, "parse");
    }
  }

  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data
        ? describeDetail((data as { detail: unknown }).detail)
        : describeDetail(data);
    throw new ApiError(
      statusMessage(res.status, detail, res.headers.get("Retry-After"), Boolean(init?.reviewer)),
      res.status,
      "http",
      detail,
    );
  }

  return data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Unexpected error.";
}

export const api = {
  inspect: (body: InspectRequest, signal?: AbortSignal) =>
    request<InspectResponse>("/api/v1/inspect", { method: "POST", body, signal }),
  health: (signal?: AbortSignal) => request<HealthResponse>("/api/v1/health", { signal }),
  providers: (signal?: AbortSignal) => request<ProviderInfo[]>("/api/v1/providers", { signal }),
  reviews: (status: string = "PENDING", signal?: AbortSignal) =>
    request<ReviewTicket[]>(`/api/v1/reviews?status=${encodeURIComponent(status)}`, { signal, reviewer: true }),
  decideReview: (reviewId: string, body: ReviewDecisionRequest, signal?: AbortSignal) =>
    request<InspectResponse>(`/api/v1/reviews/${encodeURIComponent(reviewId)}/decision`, {
      method: "POST",
      body,
      signal,
      reviewer: true,
    }),
  metrics: (signal?: AbortSignal) => request<MetricsResponse>("/api/v1/metrics", { signal }),
  graph: (signal?: AbortSignal) => request<GraphResponse>("/api/v1/graph", { signal }),
};
