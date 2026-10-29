import { cleanup, screen, within } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { API, decided, pending, tampered, trail } from "../test/fixtures";
import { renderApp } from "../test/render";
import { server } from "../test/server";

function serve(
  prescription: ReturnType<typeof pending>,
  audit: ReturnType<typeof trail> | boolean,
) {
  server.use(
    http.get(`${API}/prescriptions/${prescription.thread_id}`, () =>
      HttpResponse.json(prescription),
    ),
    http.get(`${API}/prescriptions/${prescription.thread_id}/audit`, () =>
      HttpResponse.json(
        typeof audit === "boolean" ? trail(prescription.prescription_id, audit) : audit,
      ),
    ),
  );
}

test("a tampered prescription shows the red banner and offers no decision", async () => {
  serve(tampered("RX-9"), false);
  renderApp("/prescriptions/session-RX-9");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Cadena manipulada: Entry 0 has an invalid signature.",
  );
  expect(screen.getAllByRole("article", { name: /Agente de/ })).toHaveLength(2);
  expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Rechazar" })).not.toBeInTheDocument();
  expect(screen.queryByText("Paracetamol")).not.toBeInTheDocument();
});

test.each([
  { case: "status INVALID", overrides: { status: "INVALID", audit_chain_valid: false } as const },
  { case: "audit_chain_valid false", overrides: { audit_chain_valid: false } },
])(
  "a record flagged as tampered by $case renders none of the clinical fields it carries",
  async ({ overrides }) => {
    serve(pending("RX-9", overrides), true);
    renderApp("/prescriptions/session-RX-9");

    expect(await screen.findByRole("heading", { level: 1, name: "RX-9" })).toBeInTheDocument();
    expect(screen.getByText("Manipulada")).toBeInTheDocument();
    for (const clinical of ["Paracetamol", "500 mg cada 8 horas", "Fiebre alta", "Ibuprofeno"]) {
      expect(screen.queryByText(clinical, { exact: false })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
  },
);

test("a hand-edited timestamp in a broken chain still shows the red banner", async () => {
  const audit = trail("RX-9", false);
  serve(tampered("RX-9"), {
    ...audit,
    entries: audit.entries.map((entry) => ({ ...entry, timestamp: "not-a-date" })),
  });
  renderApp("/prescriptions/session-RX-9");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Cadena manipulada: Entry 0 has an invalid signature.",
  );
  expect(screen.getAllByText("not-a-date")).toHaveLength(2);
});

test("rejecting without a comment is blocked before any request is sent", async () => {
  serve(pending("RX-1"), true);
  const decisions: unknown[] = [];
  server.use(
    http.post(`${API}/prescriptions/session-RX-1/approve`, async ({ request }) => {
      decisions.push(await request.json());
      return HttpResponse.json(pending("RX-1"));
    }),
  );
  const { user } = renderApp("/prescriptions/session-RX-1");

  await user.click(await screen.findByRole("button", { name: "Rechazar" }));

  expect(screen.getByText("Escribe un comentario para rechazar la receta.")).toBeInTheDocument();
  expect(screen.getByLabelText("Comentarios")).toHaveAttribute("aria-invalid", "true");
  expect(decisions).toEqual([]);

  await user.type(screen.getByLabelText("Comentarios"), "Dosis demasiado alta");
  await user.click(screen.getByRole("button", { name: "Rechazar" }));
  await screen.findByText("Obligatorio para rechazar. Opcional para aprobar.");
  expect(decisions).toEqual([{ approved: false, doctor_comments: "Dosis demasiado alta" }]);
});

test("a 409 on approve explains the conflict and refreshes the page to the current state", async () => {
  serve(pending("RX-1"), true);
  let decidedElsewhere = false;
  server.use(
    http.post(`${API}/prescriptions/session-RX-1/approve`, () => {
      decidedElsewhere = true;
      return HttpResponse.json({ detail: "Prescription is already REJECTED." }, { status: 409 });
    }),
    http.get(`${API}/prescriptions/session-RX-1`, () =>
      HttpResponse.json(decidedElsewhere ? decided("RX-1", false) : pending("RX-1")),
    ),
  );
  const { user } = renderApp("/prescriptions/session-RX-1");

  await user.click(await screen.findByRole("button", { name: "Aprobar" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se pudo registrar tu decisión: la receta ya tenía una decisión o su cadena de auditoría dejó de ser válida. Abajo se muestra su estado actual.",
  );
  expect(await screen.findByText("Revisar dosis.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
});

test("a failed load offers a retry and a way back to the queue", async () => {
  let requests = 0;
  server.use(
    http.get(`${API}/prescriptions/session-RX-1`, () => {
      requests += 1;
      return requests === 1
        ? HttpResponse.json({ detail: "Too many requests." }, { status: 429 })
        : HttpResponse.json(pending("RX-1"));
    }),
    http.get(`${API}/prescriptions/session-RX-1/audit`, () =>
      HttpResponse.json(trail("RX-1", true)),
    ),
  );
  const { user } = renderApp("/prescriptions/session-RX-1");

  expect(await screen.findByRole("alert")).toHaveTextContent("Demasiadas solicitudes.");
  expect(screen.getByRole("link", { name: "← Volver a la cola" })).toHaveAttribute("href", "/");
  await user.click(screen.getByRole("button", { name: "Reintentar" }));

  expect(await screen.findByRole("button", { name: "Aprobar" })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
test("a response that breaks the contract is reported as such and not retried", async () => {
  let requests = 0;
  server.use(
    http.get(`${API}/prescriptions/session-RX-1`, () => {
      requests += 1;
      return HttpResponse.json(pending("RX-1", { created_at: null }));
    }),
    http.get(`${API}/prescriptions/session-RX-1/audit`, () =>
      HttpResponse.json(trail("RX-1", true)),
    ),
  );
  renderApp("/prescriptions/session-RX-1");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "La API devolvió una respuesta inesperada.",
  );
  expect(requests).toBe(1);
});

test("coming back to a prescription tampered with in the meantime never offers the cached decision", async () => {
  serve(pending("RX-1"), true);
  server.use(
    http.get(`${API}/prescriptions`, () => HttpResponse.json({ items: [pending("RX-1")] })),
  );
  const { user } = renderApp("/prescriptions/session-RX-1");
  expect(await screen.findByRole("button", { name: "Aprobar" })).toBeInTheDocument();

  await user.click(screen.getByRole("link", { name: "← Volver a la cola" }));
  const row = await screen.findByRole("link", { name: /RX-1/ });
  server.use(
    http.get(`${API}/prescriptions/session-RX-1`, async () => {
      await delay(200);
      return HttpResponse.json(tampered("RX-1"));
    }),
    http.get(`${API}/prescriptions/session-RX-1/audit`, async () => {
      await delay(200);
      return HttpResponse.json(trail("RX-1", false));
    }),
  );
  await user.click(row);

  expect(screen.getByText("Cargando receta…")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
  expect(await screen.findByText(/Cadena manipulada/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
});

test("the detail names the window after the prescription and announces that it is loading", async () => {
  serve(pending("RX-1"), true);
  renderApp("/prescriptions/session-RX-1");

  expect(screen.getByRole("status")).toHaveTextContent("Cargando receta…");
  expect(await screen.findByRole("heading", { level: 1, name: "RX-1" })).toBeInTheDocument();
  expect(document.title).toBe("RX-1 · HealthTech");
});

test("a prescription read from FHIR names the patient and shows the allergies as read", async () => {
  serve(pending("RX-F1", { fhir_patient: "Patient/p1", patient_allergies: ["Paracetamol"] }), true);
  renderApp("/prescriptions/session-RX-F1");

  const patient = await screen.findByRole("region", { name: "Paciente" });
  expect(patient).toHaveTextContent("Origen: FHIR Patient/p1");
  expect(within(patient).getByText("Paracetamol")).toBeInTheDocument();
});

test("a prescription with typed allergies names no FHIR origin", async () => {
  serve(pending("RX-1"), true);
  renderApp("/prescriptions/session-RX-1");

  const patient = await screen.findByRole("region", { name: "Paciente" });
  expect(patient).toHaveTextContent("Ibuprofeno");
  expect(patient).not.toHaveTextContent("Origen");
});

test("the FHIR export is offered for a verified prescription and hidden for a tampered one", async () => {
  serve(pending("RX-1"), true);
  serve(tampered("RX-9"), false);
  renderApp("/prescriptions/session-RX-1");
  expect(await screen.findByRole("button", { name: "Exportar FHIR (JSON)" })).toBeEnabled();
  cleanup();

  renderApp("/prescriptions/session-RX-9");

  expect(await screen.findByRole("alert")).toHaveTextContent("Cadena manipulada");
  expect(screen.queryByRole("button", { name: "Exportar FHIR (JSON)" })).not.toBeInTheDocument();
});

test("an export refused with a 409 says why and refreshes the page to the tampered state", async () => {
  let tamperedSinceLoad = false;
  serve(pending("RX-1"), true);
  server.use(
    http.get(`${API}/prescriptions/session-RX-1/fhir`, () => {
      tamperedSinceLoad = true;
      return HttpResponse.json(
        { detail: "Audit chain is invalid; the prescription is not exported." },
        { status: 409 },
      );
    }),
    http.get(`${API}/prescriptions/session-RX-1`, () =>
      HttpResponse.json(tamperedSinceLoad ? tampered("RX-1") : pending("RX-1")),
    ),
    http.get(`${API}/prescriptions/session-RX-1/audit`, () =>
      HttpResponse.json(trail("RX-1", !tamperedSinceLoad)),
    ),
  );
  const { user } = renderApp("/prescriptions/session-RX-1");

  await user.click(await screen.findByRole("button", { name: "Exportar FHIR (JSON)" }));

  expect(
    await screen.findByText(
      "No se pudo exportar: la cadena de auditoría de la receta dejó de ser válida. Abajo se muestra su estado actual.",
    ),
  ).toBeInTheDocument();
  expect(await screen.findByText(/Cadena manipulada/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Exportar FHIR (JSON)" })).not.toBeInTheDocument();
});
