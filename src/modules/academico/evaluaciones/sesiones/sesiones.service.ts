import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { CrearSesionDto } from './dto/crear-sesion.dto';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';
import { CambiarEstadoSesionDto } from './dto/cambiar-estado-sesion.dto';
import type { SesionRow } from './interfaces/sesion.interface';
import { lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';

@Injectable()
export class SesionesService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(dto: CrearSesionDto, creadoPor: string): Promise<SesionRow> {
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

  async listar(grupoId?: number): Promise<SesionRow[]> {
    let query = this.supabase.client
      .from('evaluaciones_sesiones')
      .select('*')
      .order('fecha', { ascending: false });

    if (grupoId !== undefined) {
      query = query.eq('grupo_id', grupoId);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar las sesiones: ${error.message}`);
    }

    return data ?? [];
  }

  async buscarPorId(id: string): Promise<SesionRow> {
    const { data, error } = await this.supabase.client
      .from('evaluaciones_sesiones')
      .select('*')
      .eq('id', id)
      .single<SesionRow>();

    if (error || !data) {
      throw new NotFoundException('Sesión de evaluación no encontrada');
    }

    return data;
  }

  async actualizar(id: string, dto: ActualizarSesionDto): Promise<SesionRow> {
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

  async cambiarEstado(id: string, dto: CambiarEstadoSesionDto): Promise<SesionRow> {
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
}