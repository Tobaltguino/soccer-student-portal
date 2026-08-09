export const RUTAS_GET_AUDITABLES = [
  '/kine-fichas-evolutivas',
  '/kine-historial-clinico',
  '/nutri-evaluacion-resultados',
  '/kine-evaluaciones-resultados',
  '/estudiantes/me/resultados',
  '/estudiantes/me/kine-resultados',
  '/estudiantes/me/nutri-resultados',
  '/estudiantes/me/fichas-evolutivas',
  '/estudiantes/me/historial-clinico',
  '/auditoria',
];

export function esRutaSensible(ruta: string): boolean {
  return RUTAS_GET_AUDITABLES.some((prefijo) => ruta.startsWith(prefijo));
}