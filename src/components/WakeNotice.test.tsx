import { screen } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { API, pending } from "../test/fixtures";
import { renderApp } from "../test/render";
import { server } from "../test/server";

test("a request still pending after 3 s says the server is waking up, then the notice goes away", async () => {
  server.use(
    http.get(`${API}/prescriptions`, async () => {
      await delay(3_500);
      return HttpResponse.json({ items: [pending("RX-1")] });
    }),
  );
  renderApp("/");

  expect(screen.queryByText(/Despertando el servidor/)).not.toBeInTheDocument();
  expect(
    await screen.findByText(/Despertando el servidor/, {}, { timeout: 3_400 }),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole("tab", { name: "Pendientes 1" }, { timeout: 2_000 }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Despertando el servidor/)).not.toBeInTheDocument();
}, 10_000);
