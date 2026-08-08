import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { CrearSesionDto } from './dto/crear-sesion.dto';
import { CambiarEstadoSesionDto } from './dto/cambiar-estado-sesion.dto';
import type { NutriSesionRow } from './interfaces/sesion.interface';
import { lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';

@Injectable()
export class SesionesService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(
    dto: CrearSesionDto,
    solicitanteId: string,
    esAdmin: boolean,
  ): Promise<NutriSesionRow> {
    const nutricionistaId = esAdmin && dto.nutricionistaId ? dto.nutricionistaId : solicitanteId;

    const { data, error } = await this.supabase.client
      .from('nutri_evaluacion_sesiones')
      .insert({
        tipo_id: dto.tipoId,
        nutricionista_id: nutricionistaId,
        fecha: dto.fecha,
        estado: 'PROGRAMADA',
      })
      .select()
      .single<NutriSesionRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear la sesión',
        'El tipo de evaluación o nutricionista indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la sesión creada');
    }

    return data;
  }

  async listar(
    soloDeNutricionista: string | null,
    incluirEliminadas: boolean = false,
  ): Promise<NutriSesionRow[]> {
    let query = this.supabase.client
      .from('nutri_evaluacion_sesiones')
      .select('*')
      .order('fecha', { ascending: false });

    if (soloDeNutricionista !== null) {
      query = query.eq('nutricionista_id', soloDeNutricionista);
    }

    if (!incluirEliminadas) {
      query = query.is('eliminado_at', null);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar las sesiones: ${error.message}`);
    }

    return data ?? [];
  }

  async buscarPorId(id: string, soloDeNutricionista: string | null): Promise<NutriSesionRow> {
    const { data, error } = await this.supabase.client
      .from('nutri_evaluacion_sesiones')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single<NutriSesionRow>();

    if (error || !data) {
      throw new NotFoundException('Sesión no encontrada');
    }

    if (soloDeNutricionista !== null && data.nutricionista_id !== soloDeNutricionista) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return data;
  }

  async cambiarEstado(
    id: string,
    dto: CambiarEstadoSesionDto,
    soloDeNutricionista: string | null,
  ): Promise<NutriSesionRow> {
    await this.buscarPorId(id, soloDeNutricionista);

    const { data, error } = await this.supabase.client
      .from('nutri_evaluacion_sesiones')
      .update({ estado: dto.estado })
      .eq('id', id)
      .select()
      .single<NutriSesionRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo cambiar el estado: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return data;
  }

  async eliminar(id: string): Promise<NutriSesionRow> {
    const { data, error } = await this.supabase.client
      .from('nutri_evaluacion_sesiones')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single<NutriSesionRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar la sesión: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return data;
  }

  async restaurar(id: string): Promise<NutriSesionRow> {
    const { data, error } = await this.supabase.client
      .from('nutri_evaluacion_sesiones')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single<NutriSesionRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo restaurar la sesión: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return data;
  }
}