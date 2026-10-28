import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { describeError } from "../api/errors";
import { useAuditTrail, usePrescription } from "../api/queries";
import { AuditTimeline } from "../components/AuditTimeline";
import { DecisionPanel } from "../components/DecisionPanel";
import { ErrorNotice } from "../components/ErrorNotice";
import { SafetyBadge, StatusBadge, UrgencyBadge } from "../components/badges";
import { formatDateTime } from "../domain/labels";
import { isTampered, type AuditTrail, type VerifiedPrescription } from "../domain/prescription";
import { STATUS } from "../domain/status";

export function DetailPage() {
  const threadId = useParams().threadId ?? "";
  const prescription = usePrescription(threadId);
  const audit = useAuditTrail(threadId);

  const error = prescription.error ?? audit.error;
  if (error) return <ErrorNotice message={describeError(error)} />;
  if (!prescription.data || !audit.data) {
    return <p className="py-12 text-center text-sm text-slate-500">Cargando receta…</p>;
  }
  const rx = prescription.data;
  const trail = audit.data;
  const verified = !isTampered(rx) && trail.valid;

  return (
    <article aria-labelledby="rx-title" className="space-y-6">
      <div>
        <Link
          to="/"
          className="text-sm text-teal-700 hover:underline focus-visible:outline-2 focus-visible:outline-teal-600"
        >
          ← Volver a la cola
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 id="rx-title" className="font-mono text-2xl font-semibold tracking-tight">
            {rx.id}
          </h1>
          <StatusBadge status={rx.status} />
        </div>
        {verified && (
          <p className="mt-1 text-sm text-slate-600">Creada el {formatDateTime(rx.createdAt)}</p>
        )}
      </div>

      <ChainBanner trail={trail} />

      {!verified ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <p className="h-fit rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Los datos clínicos no se muestran porque no se pueden verificar. No es posible aprobar
            ni rechazar esta receta.
          </p>
          <AuditSection trail={trail} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <ClinicalRecord rx={rx} />
          <div className="space-y-6">
            {STATUS[rx.status].canDecide ? (
              <DecisionPanel threadId={rx.threadId} />
            ) : (
              rx.decision && (
                <Card title="Decisión del médico" aside={<StatusBadge status={rx.status} />}>
                  <Field label="Comentarios" wide>
                    {rx.decision.comments || "Sin comentarios"}
                  </Field>
                </Card>
              )
            )}
            <AuditSection trail={trail} />
          </div>
        </div>
      )}
    </article>
  );
}

function AuditSection({ trail }: { trail: AuditTrail }) {
  return (
    <section aria-labelledby="audit-title" className="space-y-3">
      <h2 id="audit-title" className="text-base font-semibold">
        Cadena de auditoría
      </h2>
      <AuditTimeline entries={trail.entries} />
    </section>
  );
}

function ChainBanner({ trail }: { trail: AuditTrail }) {
  return trail.valid ? (
    <p
      role="status"
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
    >
      ✓ Cadena de auditoría verificada (HMAC-SHA256)
    </p>
  ) : (
    <p
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
    >
      ⚠ Cadena manipulada: {trail.detail}
    </p>
  );
}

function ClinicalRecord({ rx }: { rx: VerifiedPrescription }) {
  return (
    <div className="space-y-4">
      <Card title="Paciente">
        <Field label="Síntomas">{rx.patient.symptoms}</Field>
        <Field label="Alergias">
          {rx.patient.allergies.length === 0 ? "Ninguna conocida" : rx.patient.allergies.join(", ")}
        </Field>
      </Card>

      <Card title="Propuesta de la IA" aside={<UrgencyBadge urgency={rx.proposal.urgency} />}>
        <Field label="Medicamento">
          <span className="font-semibold">{rx.proposal.medication}</span>
        </Field>
        <Field label="Posología">{rx.proposal.dosage}</Field>
        <Field label="Razonamiento" wide>
          {rx.proposal.reasoning}
        </Field>
      </Card>

      <Card title="Verificación de seguridad" aside={<SafetyBadge approved={rx.safety.approved} />}>
        <Field label="Notas" wide>
          {rx.safety.notes}
        </Field>
      </Card>
    </div>
  );
}

function Card({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {aside}
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}
