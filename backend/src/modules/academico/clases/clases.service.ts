import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { CrearClaseDto } from './dto/crear-clase.dto';
import { ActualizarClaseDto } from './dto/actualizar-clase.dto';
import type { ClaseRow } from './interfaces/clase.interface';
import { lanzarErrorSupabaseConFk } from '../../../shared/utils/supabase-error.util';
import { FiltrarClasesDto } from './dto/filtrar-clases.dto';

@Injectable()
  export class ClasesService {
    constructor(private readonly supabase: SupabaseService) {}

    async crear(dto: CrearClaseDto, gruposPermitidos: number[] | null = null): Promise<ClaseRow> {
    if (gruposPermitidos !== null && !gruposPermitidos.includes(dto.grupoId)) {
      throw new ForbiddenException('No puedes crear clases en un grupo que no tienes asignado');
    }

    const { data, error } = await this.supabase.client
      .from('clases')
      .insert({
        grupo_id: dto.grupoId,
        profesor_id: dto.profesorId ?? null,
        fecha: dto.fecha,
        hora: dto.hora,
        lugar: dto.lugar ?? null,
        objetivo: dto.objetivo ?? null,
        calentamiento: dto.calentamiento ?? null,
        parte_principal: dto.partePrincipal ?? null,
        vuelta_calma: dto.vueltaCalma ?? null,
      })
      .select()
      .single<ClaseRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear la clase',
        'El grupo o profesor indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la clase creada');
    }

    return data;
  }

  async listar(
    filtros: FiltrarClasesDto,
    gruposPermitidos: number[] | null = null,
  ): Promise<{
    registros: ClaseRow[];
    total: number;
    pagina: number;
    limite: number;
  }> {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let query = this.supabase.client
      .from('clases')
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(desde, hasta);

    if (filtros.grupoId !== undefined) {
      query = query.eq('grupo_id', filtros.grupoId);
    } else if (gruposPermitidos !== null) {
      query = query.in('grupo_id', gruposPermitidos);
    }

    if (filtros.lugar) {
      const l = filtros.lugar.replace(/[%_]/g, '');
      query = query.ilike('lugar', `%${l}%`);
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
      throw new InternalServerErrorException(`No se pudo listar las clases: ${error.message}`);
    }

    return {
      registros: data ?? [],
      total: count ?? 0,
      pagina,
      limite,
    };
  }

  async listarPorGrupoDeEstudiante(estudianteId: string): Promise<(ClaseRow & { presente: boolean | null })[]> {
    const { data: estudiante, error: errorEstudiante } = await this.supabase.client
      .from('estudiantes')
      .select('grupo_id')
      .eq('usuario_id', estudianteId)
      .single<{ grupo_id: number | null }>();

    if (errorEstudiante || !estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    if (!estudiante.grupo_id) {
      return [];
    }

    const { data: clases, error } = await this.supabase.client
      .from('clases')
      .select('*')
      .eq('grupo_id', estudiante.grupo_id)
      .is('eliminado_at', null)
      .order('fecha', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar las clases: ${error.message}`);
    }

    const listaClases = (clases ?? []) as ClaseRow[];

    if (listaClases.length === 0) return [];

    // Trae la asistencia del estudiante para esas clases específicas
    const { data: asistencias, error: errorAsistencias } = await this.supabase.client
      .from('asistencias')
      .select('clase_id, presente')
      .eq('estudiante_id', estudianteId)
      .in('clase_id', listaClases.map((c) => c.id));

    if (errorAsistencias) {
      throw new InternalServerErrorException(
        `No se pudo obtener la asistencia: ${errorAsistencias.message}`,
      );
    }

    const mapaAsistencia = new Map(
      (asistencias ?? []).map((a: any) => [a.clase_id, a.presente]),
    );

    return listaClases.map((clase) => ({
      ...clase,
      presente: mapaAsistencia.has(clase.id) ? mapaAsistencia.get(clase.id)! : null,
    }));
  }

  async buscarPorId(id: number, gruposPermitidos: number[] | null = null): Promise<ClaseRow> {
    const { data, error } = await this.supabase.client
      .from('clases')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single<ClaseRow>();

    if (error || !data) {
      throw new NotFoundException('Clase no encontrada');
    }

    if (gruposPermitidos !== null && !gruposPermitidos.includes(data.grupo_id)) {
      throw new NotFoundException('Clase no encontrada');
    }

    return data;
  }

  async actualizar(
    id: number,
    dto: ActualizarClaseDto,
    gruposPermitidos: number[] | null = null,
  ): Promise<ClaseRow> {
    // Valida que el usuario tenga acceso a esta clase antes de modificarla
    await this.buscarPorId(id, gruposPermitidos);

    const { data, error } = await this.supabase.client
      .from('clases')
      .update({
        ...(dto.grupoId !== undefined && { grupo_id: dto.grupoId }),
        ...(dto.profesorId !== undefined && { profesor_id: dto.profesorId }),
        ...(dto.fecha !== undefined && { fecha: dto.fecha }),
        ...(dto.hora !== undefined && { hora: dto.hora }),
        ...(dto.lugar !== undefined && { lugar: dto.lugar }),
        ...(dto.objetivo !== undefined && { objetivo: dto.objetivo }),
        ...(dto.calentamiento !== undefined && { calentamiento: dto.calentamiento }),
        ...(dto.partePrincipal !== undefined && { parte_principal: dto.partePrincipal }),
        ...(dto.vueltaCalma !== undefined && { vuelta_calma: dto.vueltaCalma }),
      })
      .eq('id', id)
      .select()
      .single<ClaseRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo actualizar la clase',
        'El grupo o profesor indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la clase actualizada');
    }

    return data;
  }

  async eliminar(id: number): Promise<ClaseRow> {
    const { data, error } = await this.supabase.client
      .from('clases')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single<ClaseRow>();

    if (error) {
      lanzarErrorSupabaseConFk(error, 'No se pudo eliminar la clase', 'La clase indicada no existe');
    }

    if (!data) {
      throw new NotFoundException('Clase no encontrada');
    }

    return data;
  }

  async restaurar(id: number): Promise<ClaseRow> {
    const { data, error } = await this.supabase.client
      .from('clases')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single<ClaseRow>();

    if (error) {
      lanzarErrorSupabaseConFk(error, 'No se pudo restaurar la clase', 'La clase indicada no existe');
    }

    if (!data) {
      throw new NotFoundException('Clase no encontrada');
    }

    return data;
  }
}