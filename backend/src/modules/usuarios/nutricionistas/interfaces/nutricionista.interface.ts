export interface INutricionista {
  usuario_id: string; // La llave foránea hacia usuarios_perfiles
  enfoque?: string;   // Ej: 'Nutrición Deportiva', 'Suplementación'
}