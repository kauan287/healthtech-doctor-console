import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { API, decided, pending, tampered } from "../test/fixtures";
import { renderApp } from "../test/render";
import { server } from "../test/server";

test("status filters count prescriptions per status and the pending filter lists only pending ones", async () => {
  server.use(
    http.get(`${API}/prescriptions`, () =>
      HttpResponse.json({
        items: [pending("RX-4"), decided("RX-3", true), tampered("RX-2"), pending("RX-1")],
      }),
    ),
  );
  renderApp("/");

  const filters = within(await screen.findByRole("navigation", { name: "Estado de la receta" }));
  expect(await filters.findByRole("link", { name: "Pendientes 2" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(filters.getByRole("link", { name: "Aprobadas 1" })).toHaveAttribute(
    "href",
    "/?estado=APPROVED",
  );
  expect(filters.getByRole("link", { name: "Aprobadas 1" })).not.toHaveAttribute("aria-current");
  expect(filters.getByRole("link", { name: "Rechazadas 0" })).toBeInTheDocument();
  expect(filters.getByRole("link", { name: "Manipuladas 1" })).toBeInTheDocument();
  expect(filters.getByRole("link", { name: "Todas 4" })).toBeInTheDocument();

  const rows = within(screen.getByRole("list", { name: "Recetas: Pendientes" })).getAllByRole(
    "link",
  );
  expect(rows.map((row) => row.textContent)).toEqual([
    expect.stringContaining("RX-4"),
    expect.stringContaining("RX-1"),
  ]);
  expect(screen.queryByText(/Mostrando las/)).not.toBeInTheDocument();
});

test("a full page from the API says only the newest 100 are shown", async () => {
  server.use(
    http.get(`${API}/prescriptions`, ({ request }) => {
      const limit = Number(new URL(request.url).searchParams.get("limit"));
      return HttpResponse.json({
        items: Array.from({ length: limit }, (_, index) => pending(`RX-${String(index)}`)),
      });
    }),
  );
  renderApp("/");

  expect(await screen.findByText("Mostrando las 100 recetas más recientes.")).toBeInTheDocument();
  expect(screen.getByText(/^Todas/)).toHaveTextContent("Todas 100");
});

test("a 429 from the API tells the doctor how long to wait and is not retried", async () => {
  let requests = 0;
  server.use(
    http.get(`${API}/prescriptions`, () => {
      requests += 1;
      return HttpResponse.json(
        { detail: "Too many requests." },
        { status: 429, headers: { "Retry-After": "42" } },
      );
    }),
  );
  renderApp("/");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Demasiadas solicitudes. Espera 42 s y vuelve a intentarlo.",
  );
  expect(requests).toBe(1);
});

test("two 5xx responses in a row are retried until the list loads", async () => {
  let requests = 0;
  server.use(
    http.get(`${API}/prescriptions`, () => {
      requests += 1;
      return requests <= 2
        ? HttpResponse.json({ detail: "Upstream unavailable." }, { status: 503 })
        : HttpResponse.json({ items: [pending("RX-1")] });
    }),
  );
  renderApp("/");

  expect(await screen.findByText("Paracetamol", {}, { timeout: 5_000 })).toBeInTheDocument();
  expect(requests).toBe(3);
}, 10_000);

test("a row whose audit chain failed verification shows no clinical data", async () => {
  server.use(
    http.get(`${API}/prescriptions`, () =>
      HttpResponse.json({ items: [pending("RX-5", { audit_chain_valid: false })] }),
    ),
  );
  renderApp("/?estado=ALL");

  expect(await screen.findByText("Datos clínicos ocultos por manipulación")).toBeInTheDocument();
  expect(screen.queryByText("Paracetamol")).not.toBeInTheDocument();
});
