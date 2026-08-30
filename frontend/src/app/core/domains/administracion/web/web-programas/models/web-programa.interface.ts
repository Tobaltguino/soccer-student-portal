export interface WebPrograma {
  id: number;
  icono: string;
  colorFondo: string | null; // 🔥 Cambiado a camelCase
  colorTexto: string | null; // 🔥 Cambiado a camelCase
  titulo: string;
  descripcion: string | null;
  orden: number;
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
