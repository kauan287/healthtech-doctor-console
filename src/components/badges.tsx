import type { ReactNode } from "react";
import { SAFETY, URGENCY } from "../domain/labels";
import type { Status, Urgency } from "../domain/prescription";
import { STATUS } from "../domain/status";

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return <Badge className={STATUS[status].badge}>{STATUS[status].label}</Badge>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <Badge className={URGENCY[urgency].badge}>
      Urgencia {URGENCY[urgency].label.toLowerCase()}
    </Badge>
  );
}

export function FhirSourceBadge({ reference }: { reference: string }) {
  return (
    <Badge className="bg-indigo-50 text-indigo-800 ring-indigo-600/25">
      {`Origen: FHIR ${reference}`}
    </Badge>
  );
}

export function SafetyBadge({ approved }: { approved: boolean }) {
  const view = approved ? SAFETY.safe : SAFETY.alert;
  return <Badge className={view.badge}>{view.label}</Badge>;
}
