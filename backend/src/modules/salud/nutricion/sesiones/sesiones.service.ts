import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { CrearSesionDto } from './dto/crear-sesion.dto';
import { CambiarEstadoSesionDto } from './dto/cambiar-estado-sesion.dto';
import type { NutriSesionRow } from './interfaces/sesion.interface';
import { lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';
import { FiltrarSesionesDto } from './dto/filtrar-sesion.dto';

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
    filtros: FiltrarSesionesDto,
  ): Promise<{ registros: NutriSesionRow[]; total: number; pagina: number; limite: number }> {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let query = this.supabase.client
      .from('nutri_evaluacion_sesiones')
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(desde, hasta);

    if (soloDeNutricionista !== null) {
      query = query.eq('nutricionista_id', soloDeNutricionista);
    }

    if (filtros.desde) {
      query = query.gte('fecha', filtros.desde);
    }

    if (filtros.hasta) {
      query = query.lte('fecha', filtros.hasta);
    }

    if (!filtros.incluirEliminadas) {
      query = query.is('eliminado_at', null);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar las sesiones: ${error.message}`);
    }

    return { registros: data ?? [], total: count ?? 0, pagina, limite };
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