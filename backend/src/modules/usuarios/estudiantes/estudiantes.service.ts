import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { CrearUsuarioDto } from '../central/dto/crear-usuario.dto';
import { ActualizarEstudianteDto } from './dto/actualizar-estudiante.dto';
import type { EstudianteRow } from './interfaces/estudiante.interface';
import { lanzarErrorSupabase } from '../../../shared/utils/supabase-error.util';
import { FiltrarEstudiantesDto } from './dto/flitrar-estudiante.dto';
import { UsuarioPerfilRow } from 'src/shared/interfaces/usuario-perfil.interface';

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

  async listarPorGrupos(gruposPermitidos: number[] | null): Promise<EstudianteRow[]> {
    let query = this.supabase.client.from('estudiantes').select('*');

    if (gruposPermitidos !== null) {
      query = query.in('grupo_id', gruposPermitidos);
    }

    const { data, error } = await query;

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo listar los estudiantes');
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

  async filtrarIds(filtros: { grupoIds?: number[]; posiciones?: string[] }): Promise<string[]> {
    let query = this.supabase.client.from('estudiantes').select('usuario_id');

    if (filtros.grupoIds?.length) {
      query = query.in('grupo_id', filtros.grupoIds);
    }

    if (filtros.posiciones?.length) {
      query = query.overlaps('posiciones', filtros.posiciones);
    }

    const { data, error } = await query;

    if (error) return [];

    return (data ?? []).map((row: any) => row.usuario_id);
  }

  async contarActivos(): Promise<number> {
    const { count, error } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('*', { count: 'exact', head: true })
      .eq('rol', 'estudiante')
      .eq('activo', true);

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo contar los estudiantes activos');
    }

    return count ?? 0;
  }

  async listarConFiltros(filtros: FiltrarEstudiantesDto): Promise<{
    registros: (EstudianteRow & { perfil: UsuarioPerfilRow })[];
    total: number;
    pagina: number;
    limite: number;
  }> {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    // Si hay búsqueda o filtro de activo, primero resolvemos qué usuario_ids califican
    let idsPreseleccionados: string[] | null = null;

    if (filtros.busqueda || filtros.activo !== undefined) {
      let queryPerfiles = this.supabase.client
        .from('usuarios_perfiles')
        .select('id_usuario')
        .eq('rol', 'estudiante');

      if (filtros.busqueda) {
        const b = filtros.busqueda.replace(/[%_]/g, '');
        queryPerfiles = queryPerfiles.or(
          `nombre.ilike.%${b}%,apellido.ilike.%${b}%,rut.ilike.%${b}%,email.ilike.%${b}%`,
        );
      }

      if (filtros.activo !== undefined) {
        queryPerfiles = queryPerfiles.eq('activo', filtros.activo);
      }

      const { data, error } = await queryPerfiles;

      if (error) {
        throw new InternalServerErrorException(`No se pudo filtrar estudiantes: ${error.message}`);
      }

      idsPreseleccionados = (data ?? []).map((row: any) => row.id_usuario);

      if (idsPreseleccionados.length === 0) {
        return { registros: [], total: 0, pagina, limite };
      }
    }

    let query = this.supabase.client
      .from('estudiantes')
      .select('*', { count: 'exact' })
      .range(desde, hasta);

    if (idsPreseleccionados !== null) {
      query = query.in('usuario_id', idsPreseleccionados);
    }

    if (filtros.grupoIds?.length) {
      query = query.in('grupo_id', filtros.grupoIds);
    }

    if (filtros.posiciones?.length) {
      query = query.overlaps('posiciones', filtros.posiciones);
    }

    const { data: estudiantes, error, count } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar estudiantes: ${error.message}`);
    }

    const lista = (estudiantes ?? []) as EstudianteRow[];

    if (lista.length === 0) {
      return { registros: [], total: count ?? 0, pagina, limite };
    }

    // Trae los perfiles correspondientes para armar la respuesta completa
    const { data: perfiles, error: errorPerfiles } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('*')
      .in(
        'id_usuario',
        lista.map((e) => e.usuario_id),
      );

    if (errorPerfiles) {
      throw new InternalServerErrorException(`No se pudo obtener los perfiles: ${errorPerfiles.message}`);
    }

    const mapaPerfiles = new Map((perfiles ?? []).map((p: any) => [p.id_usuario, p]));

    const registros = lista.map((e) => ({
      ...e,
      perfil: mapaPerfiles.get(e.usuario_id),
    })) as (EstudianteRow & { perfil: UsuarioPerfilRow })[];

    return { registros, total: count ?? 0, pagina, limite };
  }
}