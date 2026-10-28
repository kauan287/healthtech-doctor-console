import { ApiError } from "./client";

export function describeError(error: Error, { conflict }: { conflict?: string } = {}): string {
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
