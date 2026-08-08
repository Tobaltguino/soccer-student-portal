// modules/salud/kinesiologia/historial-clinico/historial-clinico.service.ts
import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { CrearHistorialDto } from './dto/crear-historial.dto';
import { ActualizarHistorialDto } from './dto/actualizar-historial.dto';
import type { HistorialClinicoRow } from './interfaces/historial-clinico.interface';
import { lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';

@Injectable()
export class HistorialClinicoService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(
    dto: CrearHistorialDto,
    gruposPermitidos: number[] | null,
  ): Promise<HistorialClinicoRow> {
    if (gruposPermitidos !== null) {
      await this.verificarEstudianteEnAlcance(dto.estudianteId, gruposPermitidos);
    }

    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .insert({
        estudiante_id: dto.estudianteId,
        tipo: dto.tipo,
        diagnostico: dto.diagnostico ?? null,
        fecha_evento: dto.fechaEvento,
        estado: dto.estado ?? 'EN_OBSERVACION',
        observaciones: dto.observaciones ?? null,
      })
      .select()
      .single<HistorialClinicoRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear el registro de historial clínico',
        'El estudiante indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el registro creado');
    }

    return data;
  }

  async listarPorEstudiante(
    estudianteId: string,
    gruposPermitidos: number[] | null,
    incluirEliminados: boolean = false,
  ): Promise<HistorialClinicoRow[]> {
    if (gruposPermitidos !== null) {
      await this.verificarEstudianteEnAlcance(estudianteId, gruposPermitidos);
    }

    let query = this.supabase.client
      .from('kine_historial_clinico')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .order('fecha_evento', { ascending: false });

    if (!incluirEliminados) {
      query = query.is('eliminado_at', null);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar el historial: ${error.message}`);
    }

    return data ?? [];
  }

  async buscarPorId(id: number, gruposPermitidos: number[] | null): Promise<HistorialClinicoRow> {
    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single<HistorialClinicoRow>();

    if (error || !data) {
      throw new NotFoundException('Registro no encontrado');
    }

    if (gruposPermitidos !== null) {
      await this.verificarEstudianteEnAlcance(data.estudiante_id, gruposPermitidos, true);
    }

    return data;
  }

  async actualizar(
    id: number,
    dto: ActualizarHistorialDto,
    gruposPermitidos: number[] | null,
  ): Promise<HistorialClinicoRow> {
    await this.buscarPorId(id, gruposPermitidos);

    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .update({
        ...(dto.tipo !== undefined && { tipo: dto.tipo }),
        ...(dto.diagnostico !== undefined && { diagnostico: dto.diagnostico }),
        ...(dto.fechaEvento !== undefined && { fecha_evento: dto.fechaEvento }),
        ...(dto.estado !== undefined && { estado: dto.estado }),
        ...(dto.observaciones !== undefined && { observaciones: dto.observaciones }),
      })
      .eq('id', id)
      .select()
      .single<HistorialClinicoRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo actualizar el registro: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Registro no encontrado');
    }

    return data;
  }

  async eliminar(id: number): Promise<HistorialClinicoRow> {
    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single<HistorialClinicoRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar el registro: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Registro no encontrado');
    }

    return data;
  }

  async restaurar(id: number): Promise<HistorialClinicoRow> {
    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single<HistorialClinicoRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo restaurar el registro: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Registro no encontrado');
    }

    return data;
  }

  private async verificarEstudianteEnAlcance(
    estudianteId: string,
    gruposPermitidos: number[],
    esNotFound: boolean = false,
  ): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('estudiantes')
      .select('grupo_id')
      .eq('usuario_id', estudianteId)
      .single<{ grupo_id: number | null }>();

    const fueraDeAlcance =
      error || !data || data.grupo_id === null || !gruposPermitidos.includes(data.grupo_id);

    if (fueraDeAlcance) {
      if (esNotFound) {
        throw new NotFoundException('Registro no encontrado');
      }
      throw new ForbiddenException('El estudiante no pertenece a tu grupo asignado');
    }
  }
}