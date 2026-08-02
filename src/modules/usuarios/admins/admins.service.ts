import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export interface AdminRow {
  usuario_id: string;
}

@Injectable()
export class AdminsService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(usuarioId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('administradores')
      .insert({ usuario_id: usuarioId });

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo crear el registro de administrador: ${error.message}`,
      );
    }
  }

  async listar(): Promise<AdminRow[]> {
    const { data, error } = await this.supabase.client
      .from('administradores')
      .select('*');

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo listar administradores: ${error.message}`,
      );
    }

    return data ?? [];
  }

  async buscarPorId(usuarioId: string): Promise<AdminRow> {
    const { data, error } = await this.supabase.client
      .from('administradores')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single<AdminRow>();

    if (error || !data) {
      throw new NotFoundException('Administrador no encontrado');
    }

    return data;
  }
}