export interface WebPrograma {
  id: number;
  icono: string;
  color_fondo: string | null;
  color_texto: string | null;
  titulo: string;
  descripcion: string | null;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface CrearWebProgramaPayload {
  icono: string;
  colorFondo?: string;
  colorTexto?: string;
  titulo: string;
  descripcion?: string;
  orden?: number;
}

export type ActualizarWebProgramaPayload = Partial<CrearWebProgramaPayload>;