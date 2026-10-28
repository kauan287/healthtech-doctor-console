import { useState, type SubmitEvent } from "react";
import type { Decision } from "../api/queries";

export function DecisionPanel({
  onDecide,
  pending,
}: {
  onDecide: (decision: Decision) => void;
  pending: boolean;
}) {
  const [comments, setComments] = useState("");
  const [missingComment, setMissingComment] = useState(false);

  function decide(approved: boolean) {
    const trimmed = comments.trim();
    if (!approved && trimmed === "") {
      setMissingComment(true);
      return;
    }
    setMissingComment(false);
    onDecide({ approved, doctor_comments: trimmed });
  }

  function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    decide(true);
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby="decision-title"
      className="rounded-xl border border-teal-200 bg-white p-5 shadow-sm"
    >
      <h2 id="decision-title" className="text-base font-semibold">
        Decisión del médico
      </h2>
      <label htmlFor="doctor-comments" className="mt-3 block text-sm font-medium text-slate-700">
        Comentarios
      </label>
      <textarea
        id="doctor-comments"
        value={comments}
        onChange={(event) => {
          setComments(event.target.value);
        }}
        rows={3}
        maxLength={5000}
        aria-invalid={missingComment}
        aria-describedby="doctor-comments-hint"
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30 focus:outline-none aria-invalid:border-red-500"
      />
      <p
        id="doctor-comments-hint"
        className={`mt-1 text-xs ${missingComment ? "font-medium text-red-700" : "text-slate-500"}`}
      >
        {missingComment
          ? "Escribe un comentario para rechazar la receta."
          : "Obligatorio para rechazar. Opcional para aprobar."}
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-60"
        >
          Aprobar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            decide(false);
          }}
          className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm ring-1 ring-red-300 ring-inset hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-60"
        >
          Rechazar
        </button>
      </div>
    </form>
  );
}
