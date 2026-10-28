import createClient from "openapi-fetch";
import type { paths } from "./schema";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = createClient<paths>({ baseUrl: API_URL });

export class ApiError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;

  constructor({
    status,
    detail,
    retryAfter,
  }: {
    status: number;
    detail: string;
    retryAfter: string | null;
  }) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    const seconds = Number(retryAfter);
    this.retryAfterSeconds = retryAfter !== null && Number.isFinite(seconds) ? seconds : null;
  }
}

function detailOf(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof error.detail === "string"
  ) {
    return error.detail;
  }
  return "";
}

export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await call;
  if (!response.ok || data === undefined) {
    throw new ApiError({
      status: response.status,
      detail: detailOf(error),
      retryAfter: response.headers.get("Retry-After"),
    });
  }
  return data;
}
