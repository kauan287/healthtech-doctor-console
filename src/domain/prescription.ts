import type { components } from "../api/schema";

type ApiPrescription = components["schemas"]["PrescriptionResponse"];
export type Status = components["schemas"]["Status"];
export type Urgency = NonNullable<ApiPrescription["urgency_level"]>;
export type AuditTrail = components["schemas"]["AuditTrailResponse"];
export type AuditEntry = components["schemas"]["AuditEntryResponse"];

interface Identity {
  id: string;
  threadId: string;
}

/** The API withholds every clinical field once the audit chain fails verification. */
export interface TamperedPrescription extends Identity {
  status: "INVALID";
}

export interface VerifiedPrescription extends Identity {
  status: Exclude<Status, "INVALID">;
  createdAt: string;
  patient: { symptoms: string; allergies: string[] };
  proposal: { medication: string; dosage: string; reasoning: string; urgency: Urgency };
  safety: { approved: boolean; notes: string };
  decision: { approved: boolean; comments: string } | null;
}

export type Prescription = TamperedPrescription | VerifiedPrescription;

function required<T>(value: T | null, field: string): T {
  if (value === null) throw new Error(`Verified prescription is missing ${field}`);
  return value;
}

export function parsePrescription(raw: ApiPrescription): Prescription {
  const identity = { id: raw.prescription_id, threadId: raw.thread_id };
  if (raw.status === "INVALID") return { ...identity, status: raw.status };
  return {
    ...identity,
    status: raw.status,
    createdAt: required(raw.created_at, "created_at"),
    patient: {
      symptoms: required(raw.patient_symptoms, "patient_symptoms"),
      allergies: required(raw.patient_allergies, "patient_allergies"),
    },
    proposal: {
      medication: required(raw.proposed_medication, "proposed_medication"),
      dosage: required(raw.dosage, "dosage"),
      reasoning: required(raw.triage_reasoning, "triage_reasoning"),
      urgency: required(raw.urgency_level, "urgency_level"),
    },
    safety: { approved: raw.safety_approved, notes: required(raw.risk_notes, "risk_notes") },
    decision:
      raw.human_approved === null
        ? null
        : { approved: raw.human_approved, comments: raw.doctor_comments ?? "" },
  };
}

export const PRESCRIPTION_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export function newPrescriptionId(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.getRandomValues(new Uint16Array(1))[0] ?? 0;
  return `RX-${date}-${suffix.toString(16).toUpperCase().padStart(4, "0")}`;
}
