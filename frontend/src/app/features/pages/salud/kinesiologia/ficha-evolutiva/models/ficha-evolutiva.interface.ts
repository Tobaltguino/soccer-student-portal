export interface AntecedentesPersonales {
  mecanismoLesion?: string;
  tiempoEvolucion?: string;
  tratamientosRecibidos?: string;
  examenesComplementarios?: string;
  sintomasActuales?: string;
  dolor?: string;
}

export interface AntecedentesRemotos {
  antecedentesSecundarios?: string;
  antecedentesQuirurgicos?: string;
  habitos?: string;
  medicamentos?: string;
}

export interface ArticulacionRom {
  nombre: string;
  derPasivo?: string;
  derActivo?: string;
  izqPasivo?: string;
  izqActivo?: string;
}

export interface FuerzaMovimiento {
  movimiento: string;
  escala?: string;
}

export interface InspeccionEstatica {
  anterior?: string;
  posterior?: string;
  sagitalDer?: string;
  sagitalIzq?: string;
}

export interface InspeccionDinamica {
  disfuncion?: string;
  gruposMusc?: string;
  sinCompensacion?: boolean;
  conCompensacion?: boolean;
  noLograMov?: boolean;
}

export interface Postura {
  actitud?: string;
  eess?: string;
  eeii?: string;
}

export interface Sensibilidad {
  anestesia?: string;
  hipoestesia?: string;
  disestesia?: string;
  hiperestesia?: string;
  parestesia?: string;
}

export interface Coordinacion {
  dedoNariz?: boolean;
  pinzaPulgarIndice?: boolean;
  talonRodilla?: boolean;
}

export interface NoEvaluable {
  rom?: boolean;
  fuerza?: boolean;
  balance?: boolean;
}

export interface FichaEvolutiva {
  id: string;
  estudiante_id: string;
  kinesiologo_id: string;
  fecha_evaluacion: string;
  antecedentes_personales: AntecedentesPersonales | null;
  antecedentes_remotos: AntecedentesRemotos | null;
  diagnostico_medico: string | null;
  inspeccion_estatica: InspeccionEstatica | null;
  inspeccion_dinamica: InspeccionDinamica | null;
  rango_movimiento: ArticulacionRom[] | null;
  fuerza_movimientos: FuerzaMovimiento[] | null;
  postura: Postura | null;
  sensibilidad: Sensibilidad | null;
  marcha: string | null;
  coordinacion: Coordinacion | null;
  balance_romberg: number | null;
  observacion: string | null;
  no_evaluable: NoEvaluable | null;
  created_at: string;
  updated_at: string;
  eliminado_at: string | null;

  kinesiologo?: {
    nombre: string;
    apellido: string;
  } | null;
}

export interface CrearFichaPayload {
  estudianteId: string;
  kinesiologoId?: string; // Si no viene, se usa el usuario autenticado

  fechaEvaluacion: string;
  antecedentesPersonales?: AntecedentesPersonales;
  antecedentesRemotos?: AntecedentesRemotos;
  diagnosticoMedico?: string;
  inspeccionEstatica?: InspeccionEstatica;
  inspeccionDinamica?: InspeccionDinamica;
  rangoMovimiento?: ArticulacionRom[];
  fuerzaMovimientos?: FuerzaMovimiento[];
  postura?: Postura;
  sensibilidad?: Sensibilidad;
  marcha?: string;
  coordinacion?: Coordinacion;
  balanceRomberg?: number;
  observacion?: string;
  noEvaluable?: NoEvaluable;
}

export type ActualizarFichaPayload = Partial<Omit<CrearFichaPayload, 'estudianteId'>>;