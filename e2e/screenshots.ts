import { expect, test } from "@playwright/test";
import { API_URL, tamper } from "./orchestrator";

const prescriptions = [
  { id: "RX-20261028-7A21", symptoms: "Fiebre de 39 °C y escalofríos", allergies: [] },
  { id: "RX-20261028-91D4", symptoms: "Tos seca persistente por la noche", allergies: [] },
  {
    id: "RX-20261028-5E0B",
    symptoms: "Estornudos y picor de ojos",
    allergies: ["Antihistamínicos"],
  },
  {
    id: "RX-20261028-3B7C",
    symptoms: "Fiebre de 38,5 °C y dolor de cabeza desde ayer",
    allergies: ["Ibuprofeno"],
  },
  {
    id: "RX-20261028-C05E",
    symptoms: "Dolor de cabeza intenso tras un golpe leve",
    allergies: ["Paracetamol", "Penicilina"],
  },
];

const decisions = {
  "RX-20261028-91D4": {
    approved: true,
    doctor_comments: "Adecuado. Revisar si persiste más de una semana.",
  },
  "RX-20261028-5E0B": {
    approved: false,
    doctor_comments: "Alergia a antihistamínicos. Valorar tratamiento tópico.",
  },
};

test("README screenshots", async ({ page, request }) => {
  for (const rx of prescriptions) {
    const response = await request.post(`${API_URL}/api/v1/prescriptions`, {
      data: {
        prescription_id: rx.id,
        patient_symptoms: rx.symptoms,
        patient_allergies: rx.allergies,
      },
    });
    expect(response.status(), `create ${rx.id}`).toBe(201);
  }
  for (const [id, decision] of Object.entries(decisions)) {
    const response = await request.post(`${API_URL}/api/v1/prescriptions/session-${id}/approve`, {
      data: decision,
    });
    expect(response.status(), `decide ${id}`).toBe(200);
  }
  tamper("RX-20261028-7A21");

  await page.goto("/?estado=ALL");
  await expect(page.getByRole("tab", { name: "Todas 5" })).toBeVisible();
  await page.screenshot({ path: "docs/queue.png" });

  await page.goto("/prescriptions/session-RX-20261028-C05E");
  await expect(page.getByRole("button", { name: "Aprobar" })).toBeVisible();
  await page.screenshot({ path: "docs/detail.png" });
});
