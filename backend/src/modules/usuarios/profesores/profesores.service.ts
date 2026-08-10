import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { CrearUsuarioDto } from '../central/dto/crear-usuario.dto';
import { ActualizarProfesorDto } from './dto/actualizar-profesor.dto';
import type { ProfesorRow } from './interfaces/profesor.interface';
import { lanzarErrorSupabase } from '../../../shared/utils/supabase-error.util';

@Injectable()
export class ProfesoresService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(usuarioId: string, dto: CrearUsuarioDto): Promise<ProfesorRow> {
    const { data, error } = await this.supabase.client
      .from('profesores')
      .insert({
        usuario_id: usuarioId,
        tipo_profesor: dto.tipoProfesor ?? null,
      })
      .select()
      .single<ProfesorRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo crear el registro de profesor');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el profesor creado');
    }

    return data;
  }

  async listar(): Promise<ProfesorRow[]> {
    const { data, error } = await this.supabase.client
      .from('profesores')
      .select('*');

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo listar profesores');
    }

    return data ?? [];
  }

  async buscarPorId(usuarioId: string): Promise<ProfesorRow> {
    const { data, error } = await this.supabase.client
      .from('profesores')
      .select('*')
      .eq('usuario_id', usuarioId)
      .single<ProfesorRow>();

    if (error || !data) {
      throw new NotFoundException('Profesor no encontrado');
    }

    return data;
  }

  async actualizar(
    usuarioId: string,
    dto: ActualizarProfesorDto,
  ): Promise<ProfesorRow> {
    const { data, error } = await this.supabase.client
      .from('profesores')
      .update({
        ...(dto.tipoProfesor !== undefined && { tipo_profesor: dto.tipoProfesor }),
      })
      .eq('usuario_id', usuarioId)
      .select()
      .single<ProfesorRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo actualizar el profesor');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el profesor actualizado');
    }

    return data;
  }

  async buscarPorIds(usuarioIds: string[]): Promise<ProfesorRow[]> {
    if (usuarioIds.length === 0) return [];

    const { data, error } = await this.supabase.client
      .from('profesores')
      .select('*')
      .in('usuario_id', usuarioIds);

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo obtener los datos de profesores');
    }

    return data ?? [];
  }

  async filtrarIds(filtros: { tipoProfesor?: string[] }): Promise<string[]> {
    let query = this.supabase.client.from('profesores').select('usuario_id');

    if (filtros.tipoProfesor?.length) {
      query = query.in('tipo_profesor', filtros.tipoProfesor);
    }

    const { data, error } = await query;

    if (error) return [];

    return (data ?? []).map((row: any) => row.usuario_id);
  }
}