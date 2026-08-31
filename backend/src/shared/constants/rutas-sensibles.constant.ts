export const RUTAS_GET_AUDITABLES = [
  // ==========================================
  // ÁREA DE SALUD (Kinesiología y Nutrición)
  // ==========================================
  '/kine-fichas-evolutivas',
  '/kine-historial-clinico',
  '/kine-evaluaciones-resultados',
  '/kine-evaluaciones-sesiones/', 
  '/nutri-evaluacion-resultados',

  // ==========================================
  // ÁREA ACADÉMICA Y DEPORTIVA
  // ==========================================
  '/reportes/',                   
  '/clases/',                     
  '/evaluaciones-resultados',     
  '/evaluaciones-sesiones/',      

  // ==========================================
  // DATOS PERSONALES Y DE PERFIL (PII)
  // ==========================================
  '/estudiantes/', // Protege el acceso al perfil individual y listas de alumnos
  '/usuarios/',    // Protege el directorio central y la extracción de datos personales

  // ==========================================
  // DASHBOARDS Y SISTEMA SUPERIOR
  // ==========================================
  '/stats',
  '/estado-salud-estudiantes',
  '/auditoria',    // Vigila a los que vigilan
];

export function esRutaSensible(ruta: string): boolean {
  // Verificamos si la ruta consultada comienza con alguno de nuestros prefijos protegidos
  return RUTAS_GET_AUDITABLES.some((prefijo) => ruta.startsWith(prefijo));
}