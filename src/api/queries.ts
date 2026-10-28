import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parsePrescription, type AuditTrail, type Prescription } from "../domain/prescription";
import { api, unwrap } from "./client";
import type { components } from "./schema";

type CreateRequest = components["schemas"]["CreatePrescriptionRequest"];
type DecisionRequest = components["schemas"]["DoctorApprovalRequest"];

const QUEUE_REFRESH_MS = 15_000;

const keys = {
  list: ["prescriptions"] as const,
  detail: (threadId: string) => ["prescriptions", threadId] as const,
  audit: (threadId: string) => ["prescriptions", threadId, "audit"] as const,
};

export function usePrescriptions() {
  return useQuery({
    queryKey: keys.list,
    queryFn: async ({ signal }): Promise<Prescription[]> => {
      const { items } = await unwrap(
        api.GET("/api/v1/prescriptions", { params: { query: { limit: 50 } }, signal }),
      );
      return items.map(parsePrescription);
    },
    refetchInterval: QUEUE_REFRESH_MS,
  });
}

export function usePrescription(threadId: string) {
  return useQuery({
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
    mutationFn: async (body: CreateRequest) =>
      parsePrescription(await unwrap(api.POST("/api/v1/prescriptions", { body }))),
    onSuccess: (prescription) => {
      queryClient.setQueryData(keys.detail(prescription.threadId), prescription);
      return queryClient.invalidateQueries({ queryKey: keys.list, exact: true });
    },
  });
}

export function useDecision(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: DecisionRequest) =>
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
  });
}
