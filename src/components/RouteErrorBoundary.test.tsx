import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { expect, test, vi } from "vitest";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

function Broken(): never {
  throw new Error("render failed");
}

function Queue() {
  return <p>Cola en {useLocation().pathname}</p>;
}

function Routed() {
  return (
    <RouteErrorBoundary>
      <Routes>
        <Route path="/" element={<Queue />} />
        <Route path="/broken" element={<Broken />} />
      </Routes>
    </RouteErrorBoundary>
  );
}

test("a page that throws while rendering shows a Spanish message and a way back to the queue", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(
    <MemoryRouter initialEntries={["/broken"]}>
      <Routed />
    </MemoryRouter>,
  );

  expect(screen.getByRole("alert")).toHaveTextContent(
    "No se pudo mostrar esta página por un error inesperado.",
  );
  await userEvent.click(screen.getByRole("link", { name: "← Volver a la cola" }));
  expect(screen.getByText("Cola en /")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  consoleError.mockRestore();
});
