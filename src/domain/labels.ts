import type { Urgency } from "./prescription";

export const URGENCY = {
  ALTO: { label: "Alta", badge: "bg-red-50 text-red-800 ring-red-600/25" },
  MEDIO: { label: "Media", badge: "bg-amber-50 text-amber-800 ring-amber-600/25" },
  BAJO: { label: "Baja", badge: "bg-sky-50 text-sky-800 ring-sky-600/25" },
} as const satisfies Record<Urgency, { label: string; badge: string }>;

export const SAFETY = {
  safe: { label: "OK", badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/25" },
  alert: { label: "Alerta de alergia", badge: "bg-red-50 text-red-800 ring-red-600/25" },
} as const;

const AUDIT_STEP: Partial<Record<string, string>> = {
  TRIAGE_AGENT: "Agente de triaje",
  SAFETY_AGENT: "Agente de seguridad",
  HUMAN_APPROVAL: "Decisión del médico",
};

export function auditStepLabel(step: string): string {
  return AUDIT_STEP[step] ?? step;
}

const dateTime = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" });
const preciseTime = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "medium" });

/** A hand-edited timestamp reaches the screen as stored, so the doctor sees what was written. */
function format(formatter: Intl.DateTimeFormat, iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : formatter.format(date);
}

export function formatDateTime(iso: string): string {
  return format(dateTime, iso);
}

export function formatPreciseTime(iso: string): string {
  return format(preciseTime, iso);
}
