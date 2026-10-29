import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parsePrescription, type AuditTrail, type Prescription } from "../domain/prescription";
import { api, ApiError, unwrap } from "./client";
import type { components } from "./schema";

/** The doctor either types the allergies or has the orchestrator read them from a FHIR Patient. */
export type NewPrescription =
  | { source: "manual"; body: components["schemas"]["CreatePrescriptionRequest"] }
  | { source: "fhir"; body: components["schemas"]["CreateFromFhirRequest"] };
export type Decision = components["schemas"]["DoctorApprovalRequest"];

const QUEUE_REFRESH_MS = 15_000;
export const QUEUE_LIMIT = 100;

const keys = {
  list: ["prescriptions"] as const,
  detail: (threadId: string) => ["prescriptions", threadId] as const,
  audit: (threadId: string) => ["prescriptions", threadId, "audit"] as const,
};

export function usePrescriptions() {
  return useQuery({
    queryKey: keys.list,
    queryFn: async ({ signal }): Promise<{ prescriptions: Prescription[]; capped: boolean }> => {
      const { items } = await unwrap(
        api.GET("/api/v1/prescriptions", { params: { query: { limit: QUEUE_LIMIT } }, signal }),
      );
      return { prescriptions: items.map(parsePrescription), capped: items.length === QUEUE_LIMIT };
    },
    refetchInterval: QUEUE_REFRESH_MS,
  });
}

/**
 * The detail and the audit trail decide whether Approve is offered, so they are never served from
 * a cache left by an earlier visit. Seeding them with setQueryData would bring back the default
 * gcTime, because TanStack keeps the largest gcTime a query was ever given.
 */
const UNCACHED = { gcTime: 0 } as const;

export function usePrescription(threadId: string) {
  return useQuery({
    ...UNCACHED,
    queryKey: keys.detail(threadId),
    queryFn: async ({ signal }) =>
      parsePrescription(
        await unwrap(
          api.GET("/api/v1/prescriptions/{thread_id}", {
            params: { path: { thread_id: threadId } },
            signal,
          }),
        ),
      ),
  });
}

export function useAuditTrail(threadId: string) {
  return useQuery({
    ...UNCACHED,
    queryKey: keys.audit(threadId),
    queryFn: ({ signal }): Promise<AuditTrail> =>
      unwrap(
        api.GET("/api/v1/prescriptions/{thread_id}/audit", {
          params: { path: { thread_id: threadId } },
          signal,
        }),
      ),
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: NewPrescription) =>
      parsePrescription(
        await unwrap(
          request.source === "manual"
            ? api.POST("/api/v1/prescriptions", { body: request.body })
            : api.POST("/api/v1/prescriptions/from-fhir", { body: request.body }),
        ),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list, exact: true }),
  });
}

/** Refused with a 409 once the chain is invalid, so the page refreshes to show why. */
export function useFhirExport(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<Blob> =>
      unwrap(
        api.GET("/api/v1/prescriptions/{thread_id}/fhir", {
          params: { path: { thread_id: threadId } },
          parseAs: "blob",
        }),
      ),
    onError: (error) => {
      if (!(error instanceof ApiError) || error.status !== 409) return;
      return queryClient.invalidateQueries({ queryKey: keys.detail(threadId) });
    },
  });
}

export function useDecision(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Decision) =>
      parsePrescription(
        await unwrap(
          api.POST("/api/v1/prescriptions/{thread_id}/approve", {
            params: { path: { thread_id: threadId } },
            body,
          }),
        ),
      ),
    onSuccess: (prescription) => {
      queryClient.setQueryData(keys.detail(threadId), prescription);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.audit(threadId) }),
        queryClient.invalidateQueries({ queryKey: keys.list, exact: true }),
      ]);
    },
    onError: (error) => {
      if (!(error instanceof ApiError) || error.status !== 409) return;
      // The detail key prefixes the audit key, so both refresh.
      return queryClient.invalidateQueries({ queryKey: keys.detail(threadId) });
    },
  });
}
