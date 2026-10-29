import { ContractError } from "../domain/prescription";
import { ApiError } from "./client";

export function describeError(error: Error, { conflict }: { conflict?: string } = {}): string {
  if (error instanceof ContractError) return "La API devolvió una respuesta inesperada.";
  if (!(error instanceof ApiError)) {
    return "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.";
  }
  switch (error.status) {
    case 404:
      return "No existe ninguna receta con ese identificador.";
    case 409:
      return conflict ?? "La operación entra en conflicto con el estado actual de la receta.";
    case 422:
      return "El servidor rechazó los datos enviados. Revisa el formulario.";
    case 429: {
      const wait = error.retryAfterSeconds === null ? "un minuto" : `${error.retryAfterSeconds} s`;
      return `Demasiadas solicitudes. Espera ${wait} y vuelve a intentarlo.`;
    }
    default:
      return "El servidor respondió con un error. Inténtalo de nuevo en unos segundos.";
  }
}

/** The from-fhir endpoint answers 422, 502 and 503 for reasons of its own, all about the FHIR read. */
export function describeFhirError(
  error: Error,
  { patientId, conflict }: { patientId: string; conflict: string },
): string {
  if (error instanceof ApiError) {
    if (error.status === 422 && error.message === `FHIR patient ${patientId} not found.`) {
      return `No hay ningún paciente con el ID ${patientId} en el servidor FHIR. Revisa el ID.`;
    }
    if (error.status === 422 && error.message.endsWith("exceed the prescription limits.")) {
      return `El paciente ${patientId} tiene más alergias activas de las que admite una receta: hasta 50, de 200 caracteres como máximo.`;
    }
    if (error.status === 502) {
      return "El servidor FHIR no respondió o devolvió datos no válidos. Inténtalo de nuevo en unos minutos.";
    }
    if (error.status === 503) {
      return "Esta demo no tiene un servidor FHIR configurado. Escribe las alergias a mano.";
    }
  }
  return describeError(error, { conflict });
}
