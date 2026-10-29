/**
 * A stand-in for a HAPI FHIR R4 server with one patient, p1, so the end-to-end tests read
 * allergies over real HTTP without depending on the public HAPI sandbox.
 */
import { createServer, type ServerResponse } from "node:http";

const FHIR_PORT = 8090;
const FHIR_PATIENT = "p1";

const CLINICAL_STATUS = "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical";

function allergy({ id, text, status }: { id: string; text: string; status: string }) {
  return {
    resourceType: "AllergyIntolerance",
    id,
    clinicalStatus: { coding: [{ system: CLINICAL_STATUS, code: status }] },
    code: { text },
    patient: { reference: `Patient/${FHIR_PATIENT}` },
  };
}

const RESOURCES: Partial<Record<string, object>> = {
  "/fhir/metadata": { resourceType: "CapabilityStatement", status: "active", fhirVersion: "4.0.1" },
  [`/fhir/Patient/${FHIR_PATIENT}`]: { resourceType: "Patient", id: FHIR_PATIENT },
};

const ALLERGIES = {
  resourceType: "Bundle",
  type: "searchset",
  entry: [
    allergy({ id: "a1", text: "Paracetamol", status: "active" }),
    allergy({ id: "a2", text: "Ibuprofeno", status: "inactive" }),
  ].map((resource) => ({ resource })),
};

function send(response: ServerResponse, status: number, body: object) {
  response.writeHead(status, { "Content-Type": "application/fhir+json" });
  response.end(JSON.stringify(body));
}

function notFound(response: ServerResponse) {
  send(response, 404, {
    resourceType: "OperationOutcome",
    issue: [{ severity: "error", code: "not-found" }],
  });
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${FHIR_PORT}`);
  if (request.method !== "GET") {
    notFound(response);
    return;
  }
  if (url.pathname === "/fhir/AllergyIntolerance") {
    const patient = url.searchParams.get("patient");
    send(
      response,
      200,
      patient === `Patient/${FHIR_PATIENT}`
        ? ALLERGIES
        : { resourceType: "Bundle", type: "searchset", entry: [] },
    );
    return;
  }
  const resource = RESOURCES[url.pathname];
  if (resource === undefined) {
    notFound(response);
    return;
  }
  send(response, 200, resource);
});

server.listen(FHIR_PORT, () => {
  console.log(`Fake FHIR server on http://localhost:${String(FHIR_PORT)}/fhir`);
});
