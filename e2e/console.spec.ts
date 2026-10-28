import { expect, test, type Page } from "@playwright/test";
import { tamper, uniqueId } from "./orchestrator";

async function createPrescription(
  page: Page,
  { id, symptoms, allergies }: { id: string; symptoms: string; allergies: string[] },
) {
  await page.goto("/new");
  await page.getByLabel("Identificador de la receta").fill(id);
  await page.getByLabel("Síntomas").fill(symptoms);
  for (const allergy of allergies) {
    await page.getByLabel("Alergias conocidas").fill(allergy);
    await page.getByRole("button", { name: "Añadir" }).click();
  }
  await page.getByRole("button", { name: "Crear receta" }).click();
  await expect(page.getByRole("heading", { level: 1, name: id })).toBeVisible();
}

test("a doctor approves a pending prescription and sees the signed decision", async ({ page }) => {
  const id = uniqueId("RX-E2E-OK");
  await createPrescription(page, {
    id,
    symptoms: "Fiebre de 38,5 °C y dolor de cabeza",
    allergies: ["Ibuprofeno"],
  });

  await page.getByRole("link", { name: "Cola de recetas" }).click();
  await page.getByRole("tab", { name: /^Pendientes/ }).click();
  const row = page.getByRole("tabpanel").getByRole("link", { name: new RegExp(id) });
  await expect(row).toContainText("Paracetamol");
  await expect(row).toContainText("Pendiente");
  await row.click();

  await expect(page.getByRole("region", { name: "Paciente" })).toContainText("Ibuprofeno");
  await page.getByLabel("Comentarios").fill("Sin interacciones. Revisar en 48 horas.");
  await page.getByRole("button", { name: "Aprobar" }).click();

  await expect(page.getByRole("heading", { level: 1, name: id })).toBeVisible();
  await expect(page.locator("main").getByText("Aprobada").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Aprobar" })).toHaveCount(0);
  const timeline = page.getByRole("list", { name: "Cadena de auditoría" });
  await expect(timeline.getByRole("article")).toHaveCount(3);
  await expect(timeline.getByRole("article").nth(2)).toContainText("Decisión del médico");
  await expect(
    page.getByRole("status").filter({ hasText: "Cadena de auditoría verificada (HMAC-SHA256)" }),
  ).toBeVisible();
});

test("tampering with the stored audit chain hides the clinical data and the decision panel", async ({
  page,
}) => {
  const id = uniqueId("RX-E2E-TAMPER");
  await createPrescription(page, { id, symptoms: "Fiebre y malestar general", allergies: [] });
  await expect(page.getByRole("button", { name: "Aprobar" })).toBeVisible();

  tamper(id);
  await page.reload();

  await expect(page.getByRole("alert")).toContainText("Cadena manipulada:");
  await expect(page.locator("main").getByText("Manipulada", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aprobar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Rechazar" })).toHaveCount(0);
  await expect(page.getByText("Paracetamol")).toHaveCount(0);
  await expect(page.getByText("Morfina")).toHaveCount(0);
});
