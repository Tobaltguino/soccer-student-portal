export interface WebPrograma {
  id: number;
  icono: string;
  colorFondo: string | null;
  colorTexto: string | null;
  titulo: string;
  descripcion: string | null;
  orden: number;
}

export interface CrearWebProgramaPayload {
  icono: string;
  colorFondo?: string | null;
  colorTexto?: string | null;
  titulo: string;
  descripcion?: string | null;
  orden?: number;
}

export type ActualizarWebProgramaPayload = Partial<CrearWebProgramaPayload>;