import { useState, type SubmitEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { describeError } from "../api/errors";
import { useCreatePrescription } from "../api/queries";
import { ErrorNotice } from "../components/ErrorNotice";
import { newPrescriptionId, PRESCRIPTION_ID_PATTERN } from "../domain/prescription";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30 focus:outline-none disabled:bg-slate-100 aria-invalid:border-red-500";

const MAX_ALLERGIES = 50;

function withAllergy(allergies: string[], draft: string): string[] {
  const allergy = draft.trim();
  if (allergy === "" || allergies.some((known) => known.toLowerCase() === allergy.toLowerCase())) {
    return allergies;
  }
  return [...allergies, allergy];
}

export function NewPrescriptionPage() {
  const navigate = useNavigate();
  const create = useCreatePrescription();
  const [id, setId] = useState(() => newPrescriptionId());
  const [symptoms, setSymptoms] = useState("");
  const [allergyDraft, setAllergyDraft] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const idError = PRESCRIPTION_ID_PATTERN.test(id)
    ? null
    : "Usa solo letras, números, puntos, guiones y guiones bajos, sin espacios.";
  const allergiesFull = allergies.length >= MAX_ALLERGIES;
  const symptomsError = symptoms.trim() === "" ? "Describe los síntomas del paciente." : null;

  function addAllergy() {
    setAllergies(withAllergy(allergies, allergyDraft));
    setAllergyDraft("");
  }

  function onAllergyKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addAllergy();
    }
  }

  function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (idError || symptomsError) return;
    create.mutate(
      {
        prescription_id: id,
        patient_symptoms: symptoms.trim(),
        patient_allergies: withAllergy(allergies, allergyDraft),
      },
      {
        onSuccess: (rx) => {
          void navigate(`/prescriptions/${encodeURIComponent(rx.threadId)}`);
        },
      },
    );
  }

  return (
    <section aria-labelledby="new-title" className="mx-auto max-w-2xl">
      <h1 id="new-title" className="text-2xl font-semibold tracking-tight">
        Nueva receta
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        El agente de triaje propondrá un tratamiento y el agente de seguridad lo comprobará contra
        las alergias. Después la receta queda pendiente de tu decisión.
      </p>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="rx-id" className="block text-sm font-medium text-slate-700">
            Identificador de la receta
          </label>
          <input
            id="rx-id"
            value={id}
            onChange={(event) => {
              setId(event.target.value);
            }}
            maxLength={100}
            aria-invalid={idError !== null}
            aria-describedby="rx-id-hint"
            className={`${inputClass} mt-1 font-mono`}
          />
          <p
            id="rx-id-hint"
            className={`mt-1 text-xs ${idError ? "font-medium text-red-700" : "text-slate-500"}`}
          >
            {idError ?? "Generado automáticamente. Puedes editarlo."}
          </p>
        </div>

        <div>
          <label htmlFor="rx-symptoms" className="block text-sm font-medium text-slate-700">
            Síntomas
          </label>
          <textarea
            id="rx-symptoms"
            value={symptoms}
            onChange={(event) => {
              setSymptoms(event.target.value);
            }}
            rows={4}
            maxLength={5000}
            placeholder="Fiebre de 38,5 °C y dolor de cabeza desde hace dos días"
            aria-invalid={submitted && symptomsError !== null}
            aria-describedby={submitted && symptomsError ? "rx-symptoms-error" : undefined}
            className={`${inputClass} mt-1`}
          />
          {submitted && symptomsError && (
            <p id="rx-symptoms-error" className="mt-1 text-xs font-medium text-red-700">
              {symptomsError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="rx-allergy" className="block text-sm font-medium text-slate-700">
            Alergias conocidas
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="rx-allergy"
              value={allergyDraft}
              onChange={(event) => {
                setAllergyDraft(event.target.value);
              }}
              onKeyDown={onAllergyKey}
              maxLength={200}
              disabled={allergiesFull}
              placeholder="Ibuprofeno"
              aria-describedby="rx-allergy-hint"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addAllergy}
              disabled={allergiesFull}
              className="rounded-lg px-4 text-sm font-medium text-teal-800 ring-1 ring-teal-300 ring-inset hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-60"
            >
              Añadir
            </button>
          </div>
          <p id="rx-allergy-hint" className="mt-1 text-xs text-slate-500">
            {allergiesFull
              ? `Has llegado al máximo de ${String(MAX_ALLERGIES)} alergias.`
              : "Pulsa Intro para añadir cada alergia."}
          </p>
          {allergies.length > 0 && (
            <ul aria-label="Alergias añadidas" className="mt-2 flex flex-wrap gap-2">
              {allergies.map((allergy) => (
                <li
                  key={allergy}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pr-1 pl-3 text-sm text-slate-800"
                >
                  {allergy}
                  <button
                    type="button"
                    aria-label={`Quitar ${allergy}`}
                    onClick={() => {
                      setAllergies(allergies.filter((known) => known !== allergy));
                    }}
                    className="rounded-full px-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-600"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {create.error && (
          <ErrorNotice
            message={describeError(create.error, {
              conflict: `Ya existe una receta con el identificador ${create.variables.prescription_id}. Cambia el identificador e inténtalo de nuevo.`,
            })}
          />
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-60"
          >
            {create.isPending ? "Analizando…" : "Crear receta"}
          </button>
        </div>
      </form>
    </section>
  );
}
