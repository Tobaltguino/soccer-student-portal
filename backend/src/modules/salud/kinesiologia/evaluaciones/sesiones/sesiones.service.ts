import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../../core/supabase/supabase.service';
import { CrearSesionDto } from './dto/crear-sesion.dto';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';
import { CambiarEstadoSesionDto } from './dto/cambiar-estado-sesion.dto';
import type { KineSesionRow } from './interfaces/sesion.interface';
import { lanzarErrorSupabaseConFk } from '../../../../../shared/utils/supabase-error.util';
import { FiltrarSesionesDto } from './dto/filtrar-sesiones.dto';

@Injectable()
export class SesionesService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(
    dto: CrearSesionDto,
    kinesiologoId: string,
    gruposPermitidos: number[] | null,
  ): Promise<KineSesionRow> {
    if (gruposPermitidos !== null && !gruposPermitidos.includes(dto.grupoId)) {
      throw new ForbiddenException('No puedes crear sesiones en un grupo que no tienes asignado');
    }

    const { data, error } = await this.supabase.client
      .from('kine_evaluaciones_sesiones')
      .insert({
        tipo_evaluacion_id: dto.tipoEvaluacionId,
        grupo_id: dto.grupoId,
        kinesiologo_id: kinesiologoId,
        fecha: dto.fecha,
        estado: 'PROGRAMADA',
        observacion: dto.observacion ?? null,
      })
      .select()
      .single<KineSesionRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear la sesión',
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
    gruposPermitidos: number[] | null,
  ): Promise<{ registros: KineSesionRow[]; total: number; pagina: number; limite: number }> {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let query = this.supabase.client
      .from('kine_evaluaciones_sesiones')
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

  async buscarPorId(id: string, gruposPermitidos: number[] | null): Promise<KineSesionRow> {
    const { data, error } = await this.supabase.client
      .from('kine_evaluaciones_sesiones')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single<KineSesionRow>();

    if (error || !data) {
      throw new NotFoundException('Sesión no encontrada');
    }

    if (gruposPermitidos !== null && !gruposPermitidos.includes(data.grupo_id)) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return data;
  }

  async actualizar(
    id: string,
    dto: ActualizarSesionDto,
    gruposPermitidos: number[] | null,
  ): Promise<KineSesionRow> {
    await this.buscarPorId(id, gruposPermitidos);

    const { data, error } = await this.supabase.client
      .from('kine_evaluaciones_sesiones')
      .update({
        ...(dto.fecha !== undefined && { fecha: dto.fecha }),
        ...(dto.observacion !== undefined && { observacion: dto.observacion }),
      })
      .eq('id', id)
      .select()
      .single<KineSesionRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo actualizar la sesión: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return data;
  }

  async cambiarEstado(
    id: string,
    dto: CambiarEstadoSesionDto,
    gruposPermitidos: number[] | null,
  ): Promise<KineSesionRow> {
    await this.buscarPorId(id, gruposPermitidos);

    const { data, error } = await this.supabase.client
      .from('kine_evaluaciones_sesiones')
      .update({ estado: dto.estado })
      .eq('id', id)
      .select()
      .single<KineSesionRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo cambiar el estado: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return data;
  }

  async eliminar(id: string): Promise<KineSesionRow> {
    const { data, error } = await this.supabase.client
      .from('kine_evaluaciones_sesiones')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single<KineSesionRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar la sesión: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return data;
  }

  async restaurar(id: string): Promise<KineSesionRow> {
    const { data, error } = await this.supabase.client
      .from('kine_evaluaciones_sesiones')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single<KineSesionRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo restaurar la sesión: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return data;
  }
}