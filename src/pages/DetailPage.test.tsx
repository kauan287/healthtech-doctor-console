import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { API, pending, tampered, trail } from "../test/fixtures";
import { renderApp } from "../test/render";
import { server } from "../test/server";

function serve(prescription: ReturnType<typeof pending>, valid: boolean) {
  server.use(
    http.get(`${API}/prescriptions/${prescription.thread_id}`, () =>
      HttpResponse.json(prescription),
    ),
    http.get(`${API}/prescriptions/${prescription.thread_id}/audit`, () =>
      HttpResponse.json(trail(prescription.prescription_id, valid)),
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

test("a 409 on approve explains the conflict in Spanish", async () => {
  serve(pending("RX-1"), true);
  server.use(
    http.post(`${API}/prescriptions/session-RX-1/approve`, () =>
      HttpResponse.json({ detail: "Prescription is already APPROVED." }, { status: 409 }),
    ),
  );
  const { user } = renderApp("/prescriptions/session-RX-1");

  await user.click(await screen.findByRole("button", { name: "Aprobar" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se pudo registrar la decisión: la receta ya tiene una decisión o su cadena de auditoría no es válida.",
  );
});
