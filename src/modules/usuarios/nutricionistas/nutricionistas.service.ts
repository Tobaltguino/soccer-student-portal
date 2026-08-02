import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export interface NutricionistaRow {
  usuario_id: string;
}

@Injectable()
export class NutricionistasService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(usuarioId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('nutricionistas')
      .insert({ usuario_id: usuarioId });

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo crear el registro de nutricionista: ${error.message}`,
      );
    }
  }

  async listar(): Promise<NutricionistaRow[]> {
    const { data, error } = await this.supabase.client
      .from('nutricionistas')
      .select('*');

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo listar nutricionistas: ${error.message}`,
      );
    }

    return data ?? [];
  }

  async buscarPorId(usuarioId: string): Promise<NutricionistaRow> {
    const { data, error } = await this.supabase.client
      .from('nutricionistas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single<NutricionistaRow>();

    if (error || !data) {
      throw new NotFoundException('Nutricionista no encontrado');
    }

    return data;
  }
}