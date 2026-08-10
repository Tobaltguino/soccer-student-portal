export interface AuditoriaRow {
  id: number;
  usuario_id: string | null;
  usuario_email: string | null;
  usuario_rol: string | null;
  metodo: string;
  ruta: string;
  parametros: Record<string, any> | null;
  cuerpo_enviado: Record<string, any> | null;
  status_code: number | null;
  ip_address: string | null;
  created_at: string;
}