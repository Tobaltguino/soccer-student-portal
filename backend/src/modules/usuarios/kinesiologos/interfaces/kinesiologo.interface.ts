export interface IKinesiologo {
  usuario_id: string; // La llave foránea hacia usuarios_perfiles
  especialidad?: string; // Ej: 'Rehabilitación deportiva', 'Traumatología'
}