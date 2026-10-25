// Utilidades de fechas de la academia (zona horaria de Chile).
// Las fechas 'YYYY-MM-DD' de la base son fechas de calendario: no deben pasar
// por new Date('YYYY-MM-DD'), que las interpreta en UTC y en Chile resta un día.

const ZONA_HORARIA = 'America/Santiago';

/** Fecha de hoy en Chile como 'YYYY-MM-DD' (toISOString() da la fecha UTC, que después de las ~21h ya es mañana). */
export function hoyChile(): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(new Date());
}

/** Hora actual en Chile como 'HH:MM:SS' (mismo formato que las columnas time de la base). */
export function horaActualChile(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date());
}

/** Convierte 'YYYY-MM-DD' (o un ISO con hora) en un Date local a medianoche, sin desfase por UTC. */
export function parsearFechaLocal(fecha: string | Date): Date {
  if (fecha instanceof Date) return fecha;
  const [anio, mes, dia] = fecha.split('T')[0].split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

/**
 * Edad cumplida en una fecha de referencia (por defecto, hoy en Chile).
 * Para resultados de evaluación usar la fecha de la sesión, así la categoría
 * no cambia cuando el alumno cumple años después.
 */
export function calcularEdad(
  fechaNacimiento: string | Date | null | undefined,
  fechaReferencia: string | Date = hoyChile()
): number | null {
  if (!fechaNacimiento) return null;
  const nacimiento = parsearFechaLocal(fechaNacimiento);
  const referencia = parsearFechaLocal(fechaReferencia);

  let edad = referencia.getFullYear() - nacimiento.getFullYear();
  const mes = referencia.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && referencia.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}
