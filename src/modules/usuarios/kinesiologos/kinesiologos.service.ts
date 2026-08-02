import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export interface KinesiologoRow {
  usuario_id: string;
}

@Injectable()
export class KinesiologosService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(usuarioId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('kinesiologos')
      .insert({ usuario_id: usuarioId });

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo crear el registro de kinesiólogo: ${error.message}`,
      );
    }
  }

  async listar(): Promise<KinesiologoRow[]> {
    const { data, error } = await this.supabase.client
      .from('kinesiologos')
      .select('*');

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo listar kinesiólogos: ${error.message}`,
      );
    }

    return data ?? [];
  }

  async buscarPorId(usuarioId: string): Promise<KinesiologoRow> {
    const { data, error } = await this.supabase.client
      .from('kinesiologos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single<KinesiologoRow>();

    if (error || !data) {
      throw new NotFoundException('Kinesiólogo no encontrado');
    }

    return data;
  }
}