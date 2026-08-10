import { Posicion } from '../../../../shared/enums/posicion.enum';

export interface EstudianteRow {
  usuario_id: string;
  peso: number | null;
  altura: number | null;
  posiciones: Posicion[] | null;
  direccion: string | null;
  prevision: string | null;
  grupo_id: number | null;
}