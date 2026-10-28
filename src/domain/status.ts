import type { Status } from "./prescription";

interface StatusView {
  label: string;
  tab: string;
  badge: string;
  canDecide: boolean;
}

export const STATUS = {
  PENDING_APPROVAL: {
    label: "Pendiente",
    tab: "Pendientes",
    badge: "bg-amber-50 text-amber-800 ring-amber-600/25",
    canDecide: true,
  },
  APPROVED: {
    label: "Aprobada",
    tab: "Aprobadas",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/25",
    canDecide: false,
  },
  REJECTED: {
    label: "Rechazada",
    tab: "Rechazadas",
    badge: "bg-slate-100 text-slate-700 ring-slate-500/25",
    canDecide: false,
  },
  INVALID: {
    label: "Manipulada",
    tab: "Manipuladas",
    badge: "bg-red-50 text-red-800 ring-red-600/30",
    canDecide: false,
  },
} as const satisfies Record<Status, StatusView>;

export function isStatus(value: string): value is Status {
  return Object.hasOwn(STATUS, value);
}

export const STATUSES: readonly Status[] = Object.keys(STATUS).filter(isStatus);
