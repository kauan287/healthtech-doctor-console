import { Link, useSearchParams } from "react-router";
import { describeError } from "../api/errors";
import { QUEUE_LIMIT, usePrescriptions } from "../api/queries";
import { ErrorNotice } from "../components/ErrorNotice";
import { SafetyBadge, StatusBadge, UrgencyBadge } from "../components/badges";
import { formatDateTime } from "../domain/labels";
import { isTampered, type Prescription, type Status } from "../domain/prescription";
import { isStatus, STATUS, STATUSES } from "../domain/status";

type Tab = Status | "ALL";

const TABS: readonly { tab: Tab; label: string }[] = [
  ...STATUSES.map((status) => ({ tab: status, label: STATUS[status].tab })),
  { tab: "ALL", label: "Todas" },
];

function tabFrom(param: string | null): Tab {
  if (param === "ALL") return "ALL";
  return param !== null && isStatus(param) ? param : "PENDING_APPROVAL";
}

export function QueuePage() {
  const [params, setParams] = useSearchParams();
  const active = tabFrom(params.get("estado"));
  const { data, error } = usePrescriptions();
  const prescriptions = data?.prescriptions ?? [];

  const counts = new Map<Tab, number>([["ALL", prescriptions.length]]);
  for (const { status } of prescriptions) counts.set(status, (counts.get(status) ?? 0) + 1);
  const visible = prescriptions.filter((rx) => active === "ALL" || rx.status === active);

  return (
    <section aria-labelledby="queue-title">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="queue-title" className="text-2xl font-semibold tracking-tight">
            Cola de recetas
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Propuestas de los agentes de IA a la espera de revisión médica. Se actualiza cada 15 s.
          </p>
        </div>
        <Link
          to="/new"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          Nueva receta
        </Link>
      </div>

      <div role="tablist" aria-label="Estado de la receta" className="mb-4 flex flex-wrap gap-2">
        {TABS.map(({ tab, label }) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={tab === active}
            onClick={() => {
              setParams(tab === "PENDING_APPROVAL" ? {} : { estado: tab });
            }}
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
              tab === active
                ? "bg-teal-700 text-white ring-teal-700"
                : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-100"
            }`}
          >
            {label}{" "}
            <span
              className={`rounded-full px-2 text-xs tabular-nums ${tab === active ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}
            >
              {counts.get(tab) ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={TABS.find(({ tab }) => tab === active)?.label}>
        {error && (
          <div className="mb-4">
            <ErrorNotice message={describeError(error)} />
          </div>
        )}
        {data?.capped && (
          <p className="mb-4 text-sm text-slate-600">
            Mostrando las {QUEUE_LIMIT} recetas más recientes.
          </p>
        )}
        {!data ? (
          !error && <p className="py-12 text-center text-sm text-slate-500">Cargando recetas…</p>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="font-medium text-slate-800">No hay recetas en esta lista.</p>
            <p className="mt-1 text-sm text-slate-500">
              Las nuevas propuestas aparecerán aquí automáticamente.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {visible.map((rx) => (
              <QueueRow key={rx.threadId} prescription={rx} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function QueueRow({ prescription: rx }: { prescription: Prescription }) {
  return (
    <li>
      <Link
        to={`/prescriptions/${encodeURIComponent(rx.threadId)}`}
        className="grid gap-x-4 gap-y-2 px-4 py-3 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-600 sm:grid-cols-[13rem_12rem_minmax(0,1fr)_auto] sm:items-center"
      >
        <span className="font-mono text-sm font-medium text-slate-900">{rx.id}</span>
        {isTampered(rx) ? (
          <span className="text-sm text-slate-500 sm:col-span-2">
            Datos clínicos ocultos por manipulación
          </span>
        ) : (
          <>
            <span className="text-sm text-slate-600">{formatDateTime(rx.createdAt)}</span>
            <span className="text-sm font-medium text-slate-800">{rx.proposal.medication}</span>
          </>
        )}
        <span className="flex flex-wrap gap-1.5 sm:justify-end">
          {!isTampered(rx) && (
            <>
              <UrgencyBadge urgency={rx.proposal.urgency} />
              <SafetyBadge approved={rx.safety.approved} />
            </>
          )}
          <StatusBadge status={rx.status} />
        </span>
      </Link>
    </li>
  );
}
