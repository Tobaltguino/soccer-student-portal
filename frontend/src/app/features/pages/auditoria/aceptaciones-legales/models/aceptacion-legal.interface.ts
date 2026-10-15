export interface AceptacionLegal {
  usuario_id: string;
  version_terminos: string;
  version_politica: string;
  ip_address: string | null;
  fecha_aceptacion: string;
}

export interface AceptarTerminosPayload {
  versionTerminos: string;
  versionPolitica: string;
}