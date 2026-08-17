import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { CrearSesionDto } from './dto/crear-sesion.dto';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';
import { CambiarEstadoSesionDto } from './dto/cambiar-estado-sesion.dto';
import type { SesionRow } from './interfaces/sesion.interface';
import { lanzarErrorSupabase, lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';
import { FiltrarSesionesDto } from './dto/filtrar-sesiones.dto';

@Injectable()
export class SesionesService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(
    dto: CrearSesionDto,
    creadoPor: string,
    gruposPermitidos: number[] | null = null,
  ): Promise<SesionRow> {
    if (gruposPermitidos !== null && !gruposPermitidos.includes(dto.grupoId)) {
      throw new ForbiddenException('No puedes crear sesiones en un grupo que no tienes asignado');
    }

    const { data, error } = await this.supabase.client
      .from('evaluaciones_sesiones')
      .insert({
        tipo_evaluacion_id: dto.tipoEvaluacionId,
        grupo_id: dto.grupoId,
        fecha: dto.fecha,
        estado: dto.estado ?? 'PROGRAMADA',
        creado_por: creadoPor,
      })
      .select()
      .single<SesionRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear la sesión de evaluación',
        'El tipo de evaluación o grupo indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la sesión creada');
    }

    return data;
  }

  async listar(
    filtros: FiltrarSesionesDto,
    gruposPermitidos: number[] | null = null,
  ): Promise<{ registros: SesionRow[]; total: number; pagina: number; limite: number }> {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let query = this.supabase.client
      .from('evaluaciones_sesiones')
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(desde, hasta);

    if (filtros.grupoId !== undefined) {
      query = query.eq('grupo_id', filtros.grupoId);
    } else if (gruposPermitidos !== null) {
      query = query.in('grupo_id', gruposPermitidos);
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

  async buscarPorId(id: string, gruposPermitidos: number[] | null = null): Promise<SesionRow> {
    const { data, error } = await this.supabase.client
      .from('evaluaciones_sesiones')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single<SesionRow>();

    if (error || !data) {
      throw new NotFoundException('Sesión de evaluación no encontrada');
    }

    if (gruposPermitidos !== null && !gruposPermitidos.includes(data.grupo_id)) {
      throw new NotFoundException('Sesión de evaluación no encontrada');
    }

    return data;
  }

  async actualizar(
    id: string,
    dto: ActualizarSesionDto,
    gruposPermitidos: number[] | null = null,
  ): Promise<SesionRow> {
    await this.buscarPorId(id, gruposPermitidos);

    if (
      dto.grupoId !== undefined &&
      gruposPermitidos !== null &&
      !gruposPermitidos.includes(dto.grupoId)
    ) {
      throw new ForbiddenException('No puedes mover la sesión a un grupo que no tienes asignado');
    }

    const { data, error } = await this.supabase.client
      .from('evaluaciones_sesiones')
      .update({
        ...(dto.tipoEvaluacionId !== undefined && { tipo_evaluacion_id: dto.tipoEvaluacionId }),
        ...(dto.grupoId !== undefined && { grupo_id: dto.grupoId }),
        ...(dto.fecha !== undefined && { fecha: dto.fecha }),
        ...(dto.estado !== undefined && { estado: dto.estado }),
      })
      .eq('id', id)
      .select()
      .single<SesionRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo actualizar la sesión',
        'El tipo de evaluación o grupo indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la sesión actualizada');
    }

    return data;
  }

  async cambiarEstado(
    id: string,
    dto: CambiarEstadoSesionDto,
    gruposPermitidos: number[] | null = null,
  ): Promise<SesionRow> {
    await this.buscarPorId(id, gruposPermitidos);

    const { data, error } = await this.supabase.client
      .from('evaluaciones_sesiones')
      .update({ estado: dto.estado })
      .eq('id', id)
      .select()
      .single<SesionRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo cambiar el estado: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Sesión de evaluación no encontrada');
    }

    return data;
  }

  async eliminar(id: string): Promise<SesionRow> {
    const { data, error } = await this.supabase.client
      .from('evaluaciones_sesiones')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single<SesionRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar la sesión: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Sesión de evaluación no encontrada');
    }

    return data;
  }

  async restaurar(id: string): Promise<SesionRow> {
    const { data, error } = await this.supabase.client
      .from('evaluaciones_sesiones')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single<SesionRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo restaurar la sesión: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Sesión de evaluación no encontrada');
    }

    return data;
  }  

  async obtenerUltimaFinalizada(): Promise<any> {
    // Buscamos la sesión más reciente que esté FINALIZADA
    // Y pedimos a Supabase que nos traiga también el conteo de sus resultados
    const { data, error } = await this.supabase.client
      .from('evaluaciones_sesiones')
      .select(`
        id,
        fecha,
        estado,
        tipo_evaluacion:tipos_evaluacion ( nombre ),
        grupo:grupos ( nombre ),
        resultados:evaluaciones_resultados ( count )
      `)
      .eq('estado', 'FINALIZADA')
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo obtener la última sesión finalizada');
    }

    if (!data) return null; // Si no hay sesiones finalizadas aún

    // Formateamos la respuesta para que el frontend la consuma fácil
    return {
      id: data.id,
      fecha: data.fecha,
      // Le agregamos ( ... as any) para calmar a TypeScript
      tipoEvaluacion: (data.tipo_evaluacion as any)?.nombre || 'Evaluación',
      grupo: (data.grupo as any)?.nombre || 'Sin Grupo',
      totalResultados: (data.resultados as any)?.[0]?.count || 0 
    };
  }
}