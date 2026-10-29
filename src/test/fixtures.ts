import type { components } from "../api/schema";

type ApiPrescription = components["schemas"]["PrescriptionResponse"];
type AuditTrail = components["schemas"]["AuditTrailResponse"];

export const API = "http://localhost:8000/api/v1";

export function pending(id: string, overrides: Partial<ApiPrescription> = {}): ApiPrescription {
  return {
    thread_id: `session-${id}`,
    prescription_id: id,
    status: "PENDING_APPROVAL",
    proposed_medication: "Paracetamol",
    dosage: "500 mg cada 8 horas",
    safety_approved: true,
    risk_notes: "Sin conflictos con las alergias conocidas.",
    human_approved: null,
    doctor_comments: null,
    is_paused_waiting_approval: true,
    audit_chain_valid: true,
    patient_symptoms: "Fiebre alta",
    patient_allergies: ["Ibuprofeno"],
    urgency_level: "MEDIO",
    triage_reasoning: "Antipirético de primera línea.",
    created_at: "2026-10-28T09:15:00+00:00",
    fhir_patient: null,
    ...overrides,
  };
}

export function decided(id: string, approved: boolean): ApiPrescription {
  return pending(id, {
    status: approved ? "APPROVED" : "REJECTED",
    human_approved: approved,
    doctor_comments: approved ? "Correcto." : "Revisar dosis.",
    is_paused_waiting_approval: false,
  });
}

export function tampered(id: string): ApiPrescription {
  return {
    thread_id: `session-${id}`,
    prescription_id: id,
    status: "INVALID",
    proposed_medication: null,
    dosage: null,
    safety_approved: false,
    risk_notes: null,
    human_approved: null,
    doctor_comments: null,
    is_paused_waiting_approval: false,
    audit_chain_valid: false,
    patient_symptoms: null,
    patient_allergies: null,
    urgency_level: null,
    triage_reasoning: null,
    created_at: null,
    fhir_patient: null,
  };
}

export function trail(id: string, valid: boolean): AuditTrail {
  const triageHash = "a1".repeat(32);
  return {
    prescription_id: id,
    valid,
    detail: valid ? "2 entries verified." : "Entry 0 has an invalid signature.",
    entries: [
      {
        step: "TRIAGE_AGENT",
        action: "TRIAGE_AGENT recorded",
        timestamp: "2026-10-28T09:15:00+00:00",
        details: null,
        previous_hash: "0".repeat(64),
        hash: triageHash,
      },
      {
        step: "SAFETY_AGENT",
        action: "SAFETY_AGENT recorded",
        timestamp: "2026-10-28T09:15:01+00:00",
        details: null,
        previous_hash: triageHash,
        hash: "b2".repeat(32),
      },
    ],
  };
}
