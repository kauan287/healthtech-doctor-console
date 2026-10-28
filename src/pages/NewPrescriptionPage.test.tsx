import { screen } from "@testing-library/react";
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
