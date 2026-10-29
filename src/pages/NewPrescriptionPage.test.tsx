import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { API, pending, trail } from "../test/fixtures";
import { renderApp } from "../test/render";
import { server } from "../test/server";

test("a duplicate id sends the allergy chips and names the id that already exists", async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post(`${API}/prescriptions`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({ detail: "Prescription RX-7 already exists." }, { status: 409 });
    }),
  );
  const { user } = renderApp("/new");

  const id = screen.getByLabelText("Identificador de la receta");
  await user.clear(id);
  await user.type(id, "RX-7");
  await user.type(screen.getByLabelText("Síntomas"), "Fiebre");
  await user.type(screen.getByLabelText("Alergias conocidas"), "Ibuprofeno{Enter}Polen{Enter}");
  await user.click(screen.getByRole("button", { name: "Quitar Polen" }));
  await user.click(screen.getByRole("button", { name: "Crear receta" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Ya existe una receta con el identificador RX-7. Cambia el identificador e inténtalo de nuevo.",
  );
  await user.type(id, "B");
  expect(screen.getByRole("alert")).toHaveTextContent("identificador RX-7.");
  expect(bodies).toEqual([
    { prescription_id: "RX-7", patient_symptoms: "Fiebre", patient_allergies: ["Ibuprofeno"] },
  ]);
});

async function submitWithAllergies(keys: string) {
  const bodies: unknown[] = [];
  server.use(
    http.post(`${API}/prescriptions`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({ detail: "Prescription RX-8 already exists." }, { status: 409 });
    }),
  );
  const { user } = renderApp("/new");
  const id = screen.getByLabelText("Identificador de la receta");
  await user.clear(id);
  await user.type(id, "RX-8");
  await user.type(screen.getByLabelText("Síntomas"), "Tos");
  await user.type(screen.getByLabelText("Alergias conocidas"), keys);
  await user.click(screen.getByRole("button", { name: "Crear receta" }));
  await screen.findByRole("alert");
  return bodies;
}

test("an allergy typed but not confirmed with Enter is still sent", async () => {
  expect(await submitWithAllergies("Ibuprofeno{Enter}  Polen ")).toEqual([
    {
      prescription_id: "RX-8",
      patient_symptoms: "Tos",
      patient_allergies: ["Ibuprofeno", "Polen"],
    },
  ]);
});

test("an unconfirmed allergy that repeats a chip is sent once", async () => {
  expect(await submitWithAllergies("Ibuprofeno{Enter}ibuprofeno")).toEqual([
    { prescription_id: "RX-8", patient_symptoms: "Tos", patient_allergies: ["Ibuprofeno"] },
  ]);
});

test("Enter stops adding allergies at the API's limit of 50", async () => {
  const { user } = renderApp("/new");
  const keys = Array.from({ length: 51 }, (_, index) => `A${String(index + 1)}{Enter}`).join("");

  await user.type(screen.getByLabelText("Alergias conocidas"), keys);

  const chips = within(screen.getByRole("list", { name: "Alergias añadidas" })).getAllByRole(
    "listitem",
  );
  expect(chips).toHaveLength(50);
  expect(chips.at(-1)).toHaveTextContent("A50");
  expect(screen.getByText("Has llegado al máximo de 50 alergias.")).toBeInTheDocument();
});

test("the id and the symptoms are both checked when the form is submitted", async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post(`${API}/prescriptions`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({}, { status: 500 });
    }),
  );
  const { user } = renderApp("/new");
  const id = screen.getByLabelText("Identificador de la receta");

  await user.clear(id);
  await user.type(id, "RX 1");
  expect(id).toHaveAttribute("aria-invalid", "false");
  expect(screen.getByText("Generado automáticamente. Puedes editarlo.")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Crear receta" }));
  expect(id).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Síntomas")).toHaveAttribute("aria-invalid", "true");
  expect(
    screen.getByText("Usa solo letras, números, puntos, guiones y guiones bajos, sin espacios."),
  ).toBeInTheDocument();
  expect(screen.getByText("Describe los síntomas del paciente.")).toBeInTheDocument();
  expect(bodies).toEqual([]);
});

test("the form names the window", () => {
  renderApp("/new");

  expect(document.title).toBe("Nueva receta · HealthTech");
});

async function fillFhirForm(patientId: string) {
  const { user } = renderApp("/new");
  const id = screen.getByLabelText("Identificador de la receta");
  await user.clear(id);
  await user.type(id, "RX-F1");
  await user.type(screen.getByLabelText("Síntomas"), "Fiebre");
  await user.click(screen.getByRole("radio", { name: "Leer de FHIR" }));
  await user.type(screen.getByLabelText("ID de paciente FHIR"), patientId);
  await user.click(screen.getByRole("button", { name: "Crear receta" }));
}

function answerFromFhir(response: () => Response) {
  const bodies: unknown[] = [];
  server.use(
    http.post(`${API}/prescriptions/from-fhir`, async ({ request }) => {
      bodies.push(await request.json());
      return response();
    }),
  );
  return bodies;
}

test("reading the allergies from FHIR posts the patient id and opens the new prescription", async () => {
  const created = pending("RX-F1", {
    patient_allergies: ["Paracetamol"],
    fhir_patient: "Patient/p1",
  });
  const bodies = answerFromFhir(() => HttpResponse.json(created, { status: 201 }));
  server.use(
    http.get(`${API}/prescriptions/session-RX-F1`, () => HttpResponse.json(created)),
    http.get(`${API}/prescriptions/session-RX-F1/audit`, () =>
      HttpResponse.json(trail("RX-F1", true)),
    ),
  );

  await fillFhirForm("p1");

  expect(await screen.findByRole("heading", { level: 1, name: "RX-F1" })).toBeInTheDocument();
  expect(bodies).toEqual([
    { prescription_id: "RX-F1", fhir_patient_id: "p1", patient_symptoms: "Fiebre" },
  ]);
});

test("the allergy source is a radio group that starts on typing them", () => {
  renderApp("/new");

  const group = screen.getByRole("group", { name: "Origen de las alergias" });
  expect(within(group).getByRole("radio", { name: "Escribirlas" })).toBeChecked();
  expect(within(group).getByRole("radio", { name: "Leer de FHIR" })).not.toBeChecked();
  expect(screen.getByLabelText("Alergias conocidas")).toBeInTheDocument();
  expect(screen.queryByLabelText("ID de paciente FHIR")).not.toBeInTheDocument();
});

test.each([
  {
    status: 422,
    detail: "FHIR patient p404 not found.",
    message: "No hay ningún paciente con el ID p404 en el servidor FHIR. Revisa el ID.",
  },
  {
    status: 422,
    detail: "The allergies of Patient/p404 exceed the prescription limits.",
    message:
      "El paciente p404 tiene más alergias activas de las que admite una receta: hasta 50, de 200 caracteres como máximo.",
  },
  {
    status: 502,
    detail: "FHIR server unavailable.",
    message:
      "El servidor FHIR no respondió o devolvió datos no válidos. Inténtalo de nuevo en unos minutos.",
  },
  {
    status: 503,
    detail: "FHIR server not configured.",
    message: "Esta demo no tiene un servidor FHIR configurado. Escribe las alergias a mano.",
  },
])(
  "a $status from the FHIR read says so in plain Spanish ($detail)",
  async ({ status, detail, message }) => {
    answerFromFhir(() => HttpResponse.json({ detail }, { status }));

    await fillFhirForm("p404");

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  },
);

test("an invalid FHIR patient id is blocked on submit before any request", async () => {
  const bodies = answerFromFhir(() => HttpResponse.json({}, { status: 500 }));

  await fillFhirForm("Patient/p1");

  const patientId = screen.getByLabelText("ID de paciente FHIR");
  expect(patientId).toHaveAttribute("aria-invalid", "true");
  expect(patientId).toHaveAccessibleDescription(
    "Usa de 1 a 64 letras, números, puntos o guiones, sin espacios ni barras.",
  );
  expect(bodies).toEqual([]);
});
