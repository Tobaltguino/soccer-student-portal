export interface Auditoria {
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

export interface FiltrosAuditoria {
  usuarioId?: string;
  metodo?: string;
  ruta?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
  limite?: number;
}

export interface PaginacionAuditoria {
  registros: Auditoria[];
  total: number;
  pagina: number;
  limite: number;
}