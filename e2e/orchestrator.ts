import { DatabaseSync } from "node:sqlite";

export const API_URL = process.env.VITE_API_URL ?? "http://localhost:8000";

function databasePath(): string {
  const path = process.env.ORCHESTRATOR_DB;
  if (!path) throw new Error("Set ORCHESTRATOR_DB to the SQLite file the orchestrator writes to");
  return path;
}

const TAMPER = {
  details:
    "UPDATE audit_logs SET details = replace(details, 'Paracetamol', 'Morfina') WHERE prescription_id = ?",
  timestamp: "UPDATE audit_logs SET timestamp = 'not-a-date' WHERE prescription_id = ?",
};

/** Rewrites signed audit entries behind the API's back, as an attacker with database access would. */
export function tamper(prescriptionId: string, field: keyof typeof TAMPER = "details"): void {
  const db = new DatabaseSync(databasePath());
  try {
    const { changes } = db.prepare(TAMPER[field]).run(prescriptionId);
    if (changes === 0) throw new Error(`No audit entries to tamper with for ${prescriptionId}`);
  } finally {
    db.close();
  }
}

export function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
