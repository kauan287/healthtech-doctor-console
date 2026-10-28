import { auditStepLabel, formatPreciseTime } from "../domain/labels";
import type { AuditEntry } from "../domain/prescription";

const GENESIS_HASH = "0".repeat(64);
const short = (hash: string) => hash.slice(0, 12);

export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  return (
    <ol aria-label="Cadena de auditoría" className="space-y-0">
      {entries.map((entry, index) => {
        const previous = entries[index - 1];
        const linked = previous
          ? entry.previous_hash === previous.hash
          : entry.previous_hash === GENESIS_HASH;
        return (
          <li key={entry.hash}>
            {previous && (
              <div aria-hidden="true" className="flex h-7 items-center pl-6">
                <span
                  className={`text-lg leading-none ${linked ? "text-teal-600" : "text-red-600"}`}
                >
                  ↓
                </span>
              </div>
            )}
            <article
              aria-label={auditStepLabel(entry.step)}
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {auditStepLabel(entry.step)}
                </h3>
                <time dateTime={entry.timestamp} className="text-xs text-slate-500">
                  {formatPreciseTime(entry.timestamp)}
                </time>
              </div>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
                <dt className="font-sans text-slate-500">Hash</dt>
                <dd className="text-slate-800" title={entry.hash}>
                  {short(entry.hash)}
                </dd>
                <dt className="font-sans text-slate-500">Anterior</dt>
                <dd
                  className={linked ? "text-slate-600" : "text-red-700"}
                  title={entry.previous_hash}
                >
                  {previous ? `→ ${short(entry.previous_hash)}` : "→ génesis"}
                  {!linked && <span className="ml-2 font-sans">(no enlaza)</span>}
                </dd>
              </dl>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
