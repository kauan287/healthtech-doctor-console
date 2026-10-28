import { QueryClient } from "@tanstack/react-query";
import { ContractError } from "../domain/prescription";
import { ApiError } from "./client";

/** A 5xx or a dropped connection may pass. A 4xx or a contract break will repeat. */
function isTransient(error: Error): boolean {
  if (error instanceof ApiError) return error.status >= 500;
  return !(error instanceof ContractError);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failures, error) => isTransient(error) && failures < 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}
