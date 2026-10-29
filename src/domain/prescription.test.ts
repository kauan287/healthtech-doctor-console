import { expect, test } from "vitest";
import { decided, pending, tampered } from "../test/fixtures";
import {
  ContractError,
  newPrescriptionId,
  parsePrescription,
  PRESCRIPTION_ID_PATTERN,
} from "./prescription";

test("a verified response becomes a prescription with its clinical record", () => {
  expect(parsePrescription(decided("RX-1", false))).toEqual({
    id: "RX-1",
    threadId: "session-RX-1",
    status: "REJECTED",
    createdAt: "2026-10-28T09:15:00+00:00",
    patient: { symptoms: "Fiebre alta", allergies: ["Ibuprofeno"], source: { kind: "manual" } },
    proposal: {
      medication: "Paracetamol",
      dosage: "500 mg cada 8 horas",
      reasoning: "Antipirético de primera línea.",
      urgency: "MEDIO",
    },
    safety: { approved: true, notes: "Sin conflictos con las alergias conocidas." },
    decision: { approved: false, comments: "Revisar dosis." },
  });
});

test("a response read from FHIR names the patient it came from", () => {
  expect(parsePrescription(pending("RX-1", { fhir_patient: "Patient/p1" }))).toMatchObject({
    patient: { source: { kind: "fhir", reference: "Patient/p1" } },
  });
});

test("a pending response has no decision yet", () => {
  expect(parsePrescription(pending("RX-1"))).toMatchObject({ decision: null });
});

test("a tampered response keeps only its identity, even when clinical fields come along", () => {
  const expected = { id: "RX-2", threadId: "session-RX-2", status: "INVALID" };
  expect(parsePrescription(tampered("RX-2"))).toEqual(expected);
  expect(
    parsePrescription(pending("RX-2", { audit_chain_valid: false, fhir_patient: "Patient/p1" })),
  ).toEqual(expected);
});

test("a verified response missing a clinical field is a contract error", () => {
  const parse = () => parsePrescription(pending("RX-3", { dosage: null }));
  expect(parse).toThrow(ContractError);
  expect(parse).toThrow("Verified prescription is missing dosage");
});

test("generated ids carry today's date and pass the API's id pattern", () => {
  const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const id = newPrescriptionId();
  expect(id).toMatch(new RegExp(`^RX-${today}-[0-9A-F]{4}$`));
  expect(PRESCRIPTION_ID_PATTERN.test(id)).toBe(true);
  expect(PRESCRIPTION_ID_PATTERN.test("RX 1")).toBe(false);
});
