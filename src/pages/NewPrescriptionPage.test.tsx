import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { API } from "../test/fixtures";
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
