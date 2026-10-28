import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { API, decided, pending, tampered } from "../test/fixtures";
import { renderApp } from "../test/render";
import { server } from "../test/server";

test("tabs count prescriptions per status and the pending tab lists only pending ones", async () => {
  server.use(
    http.get(`${API}/prescriptions`, () =>
      HttpResponse.json({
        items: [pending("RX-4"), decided("RX-3", true), tampered("RX-2"), pending("RX-1")],
      }),
    ),
  );
  renderApp("/");

  expect(await screen.findByRole("tab", { name: "Pendientes 2" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tab", { name: "Aprobadas 1" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Rechazadas 0" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Manipuladas 1" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Todas 4" })).toBeInTheDocument();

  const rows = within(screen.getByRole("tabpanel")).getAllByRole("link");
  expect(rows.map((row) => row.textContent)).toEqual([
    expect.stringContaining("RX-4"),
    expect.stringContaining("RX-1"),
  ]);
});

test("a 429 from the API tells the doctor how long to wait", async () => {
  server.use(
    http.get(`${API}/prescriptions`, () =>
      HttpResponse.json(
        { detail: "Too many requests." },
        { status: 429, headers: { "Retry-After": "42" } },
      ),
    ),
  );
  renderApp("/");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Demasiadas solicitudes. Espera 42 s y vuelve a intentarlo.",
  );
});
