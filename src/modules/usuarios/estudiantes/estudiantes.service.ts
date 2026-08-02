import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { CrearUsuarioDto } from '../central/dto/crear-usuario.dto';
import { ActualizarEstudianteDto } from './dto/actualizar-estudiante.dto';
import type { EstudianteRow } from './interfaces/estudiante.interface';
import { lanzarErrorSupabase } from '../../../shared/utils/supabase-error.util';

@Injectable()
export class EstudiantesService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(usuarioId: string, dto: CrearUsuarioDto): Promise<EstudianteRow> {
    const { data, error } = await this.supabase.client
      .from('estudiantes')
      .insert({
        usuario_id: usuarioId,
        peso: dto.peso ?? null,
        altura: dto.altura ?? null,
        posiciones: dto.posiciones ?? null,
        direccion: dto.direccion ?? null,
        prevision: dto.prevision ?? null,
        grupo_id: dto.grupoId ?? null,
      })
      .select()
      .single<EstudianteRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo crear el registro de estudiante');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el estudiante creado');
    }

    return data;
  }

  async listar(): Promise<EstudianteRow[]> {
    const { data, error } = await this.supabase.client
      .from('estudiantes')
      .select('*');

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo listar estudiantes');
    }

    return data ?? [];
  }

  async buscarPorId(usuarioId: string): Promise<EstudianteRow> {
    const { data, error } = await this.supabase.client
      .from('estudiantes')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single<EstudianteRow>();

    if (error || !data) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    return data;
  }

  async actualizar(
    usuarioId: string,
    dto: ActualizarEstudianteDto,
  ): Promise<EstudianteRow> {
    const { data, error } = await this.supabase.client
      .from('estudiantes')
      .update({
        ...(dto.peso !== undefined && { peso: dto.peso }),
        ...(dto.altura !== undefined && { altura: dto.altura }),
        ...(dto.posiciones !== undefined && { posiciones: dto.posiciones }),
        ...(dto.direccion !== undefined && { direccion: dto.direccion }),
        ...(dto.prevision !== undefined && { prevision: dto.prevision }),
        ...(dto.grupoId !== undefined && { grupo_id: dto.grupoId }),
      })
      .eq('usuario_id', usuarioId)
      .select()
      .single<EstudianteRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo actualizar el estudiante');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el estudiante actualizado');
    }

    return data;
  }

  async buscarPorIds(usuarioIds: string[]): Promise<EstudianteRow[]> {
    if (usuarioIds.length === 0) return [];

    const { data, error } = await this.supabase.client
      .from('estudiantes')
      .select('*')
      .in('usuario_id', usuarioIds);

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo obtener los datos de estudiantes');
    }

    return data ?? [];
  }
}