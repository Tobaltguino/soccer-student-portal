// modules/usuarios/central/central.service.ts
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { Rol } from '../../../shared/enums/rol.enum';
import { EstudiantesService } from '../estudiantes/estudiantes.service';
import { ProfesoresService } from '../profesores/profesores.service';
import { KinesiologosService } from '../kinesiologos/kinesiologos.service';
import { NutricionistasService } from '../nutricionistas/nutricionistas.service';
import { AdminsService } from '../admins/admins.service';
import type { UsuarioPerfilRow, UsuarioPerfilCompleto } from '../../../shared/interfaces/usuario-perfil.interface';
import { lanzarErrorSupabase, lanzarErrorAuth } from '../../../shared/utils/supabase-error.util';

@Injectable()
export class CentralService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly estudiantesService: EstudiantesService,
    private readonly profesoresService: ProfesoresService,
    private readonly kinesiologosService: KinesiologosService,
    private readonly nutricionistasService: NutricionistasService,
    private readonly adminsService: AdminsService,
  ) {}

  async crearUsuario(dto: CrearUsuarioDto): Promise<UsuarioPerfilRow> {
    const { data: authData, error: authError } =
      await this.supabase.client.auth.admin.createUser({
        email: dto.email,
        password: dto.passwordTemporal,
        email_confirm: true,
        user_metadata: {
          rut: dto.rut,
          nombre: dto.nombre,
          apellido: dto.apellido,
          rol: dto.rol,
        },
      });

    if (authError) {
      lanzarErrorAuth(authError, 'Error al crear usuario');
    }

    if (!authData.user) {
      throw new BadRequestException('No se pudo crear el usuario en Auth');
    }

    const usuarioId = authData.user.id;

    try {
      await this.crearFilaDeRol(usuarioId, dto);
    } catch (err) {
      await this.supabase.client.auth.admin.deleteUser(usuarioId);
      throw err;
    }

    return this.buscarPropioPerfil(usuarioId);
  }

  async buscarPropioPerfil(usuarioId: string): Promise<UsuarioPerfilRow> {
    const { data, error } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('*')
      .eq('id_usuario', usuarioId)
      .single<UsuarioPerfilRow>();

    if (error || !data) {
      throw new NotFoundException('Perfil no encontrado');
    }

    return data;
  }

  async buscarPerfilCompleto(usuarioId: string): Promise<UsuarioPerfilCompleto> {
    const perfil = await this.buscarPropioPerfil(usuarioId);
    const datosRol = await this.obtenerDatosDeRol(usuarioId, perfil.rol);

    return {
      ...perfil,
      ...datosRol,
    };
  }

  async listarUsuarios(rolFiltro?: Rol): Promise<UsuarioPerfilCompleto[]> {
    let query = this.supabase.client.from('usuarios_perfiles').select('*');

    if (rolFiltro) {
      query = query.eq('rol', rolFiltro);
    }

    const { data: perfiles, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo listar usuarios: ${error.message}`,
      );
    }

    const listaPerfiles = (perfiles ?? []) as UsuarioPerfilRow[];

    const idsEstudiantes = listaPerfiles
      .filter((p) => p.rol === Rol.ESTUDIANTE)
      .map((p) => p.id_usuario);

    const idsProfesores = listaPerfiles
      .filter((p) => p.rol === Rol.PROFESOR)
      .map((p) => p.id_usuario);

    const [datosEstudiantes, datosProfesores] = await Promise.all([
      this.estudiantesService.buscarPorIds(idsEstudiantes),
      this.profesoresService.buscarPorIds(idsProfesores),
    ]);

    const mapaEstudiantes = new Map(datosEstudiantes.map((e) => [e.usuario_id, e]));
    const mapaProfesores = new Map(datosProfesores.map((p) => [p.usuario_id, p]));

    return listaPerfiles.map((perfil) => ({
      ...perfil,
      ...(mapaEstudiantes.has(perfil.id_usuario) && {
        datosEstudiante: mapaEstudiantes.get(perfil.id_usuario),
      }),
      ...(mapaProfesores.has(perfil.id_usuario) && {
        datosProfesor: mapaProfesores.get(perfil.id_usuario),
      }),
    }));
  }

  async actualizarUsuario(
    usuarioId: string,
    dto: ActualizarUsuarioDto,
  ): Promise<UsuarioPerfilRow> {
    const perfilActual = await this.buscarPropioPerfil(usuarioId);

    if (dto.email && dto.email !== perfilActual.email) {
      const { error: authError } = await this.supabase.client.auth.admin.updateUserById(
        usuarioId,
        { email: dto.email, email_confirm: true },
      );

      if (authError) {
        lanzarErrorAuth(authError, 'Error al actualizar email');
      }
    }

    const camposBase: Record<string, unknown> = {};
    if (dto.rut !== undefined) camposBase.rut = dto.rut;
    if (dto.nombre !== undefined) camposBase.nombre = dto.nombre;
    if (dto.apellido !== undefined) camposBase.apellido = dto.apellido;
    if (dto.email !== undefined) camposBase.email = dto.email;
    if (dto.telefono !== undefined) camposBase.telefono = dto.telefono;
    if (dto.fechaNacimiento !== undefined) camposBase.fecha_nacimiento = dto.fechaNacimiento; 

    if (Object.keys(camposBase).length > 0) {
      const { error: perfilError } = await this.supabase.client
        .from('usuarios_perfiles')
        .update(camposBase)
        .eq('id_usuario', usuarioId);

      if (perfilError) {
        lanzarErrorSupabase(perfilError, 'No se pudo actualizar el perfil');
      }
    }

    await this.actualizarFilaDeRol(usuarioId, perfilActual.rol, dto);

    return this.buscarPropioPerfil(usuarioId);
  }

  async desactivarUsuario(usuarioId: string): Promise<UsuarioPerfilRow> {
    const { data, error } = await this.supabase.client
      .from('usuarios_perfiles')
      .update({ activo: false })
      .eq('id_usuario', usuarioId)
      .select()
      .single<UsuarioPerfilRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo desactivar el usuario');
    }

    if (!data) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return data;
  }

  async reactivarUsuario(usuarioId: string): Promise<UsuarioPerfilRow> {
    const { data, error } = await this.supabase.client
      .from('usuarios_perfiles')
      .update({ activo: true })
      .eq('id_usuario', usuarioId)
      .select()
      .single<UsuarioPerfilRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo reactivar el usuario');
    }

    if (!data) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return data;
  }

  private async crearFilaDeRol(usuarioId: string, dto: CrearUsuarioDto) {
    switch (dto.rol) {
      case Rol.ESTUDIANTE:
        return this.estudiantesService.crear(usuarioId, dto);
      case Rol.PROFESOR:
        return this.profesoresService.crear(usuarioId, dto);
      case Rol.KINESIOLOGO:
        return this.kinesiologosService.crear(usuarioId);
      case Rol.NUTRICIONISTA:
        return this.nutricionistasService.crear(usuarioId);
      case Rol.ADMINISTRADOR:
        return this.adminsService.crear(usuarioId);
      default:
        throw new BadRequestException(`Rol no soportado: ${dto.rol}`);
    }
  }

  private async actualizarFilaDeRol(
    usuarioId: string,
    rol: Rol,
    dto: ActualizarUsuarioDto,
  ) {
    switch (rol) {
      case Rol.ESTUDIANTE: {
        const tieneCambiosEstudiante =
          dto.peso !== undefined ||
          dto.altura !== undefined ||
          dto.posiciones !== undefined ||
          dto.direccion !== undefined ||
          dto.prevision !== undefined ||
          dto.grupoId !== undefined;

        if (!tieneCambiosEstudiante) return;

        return this.estudiantesService.actualizar(usuarioId, dto);
      }
      case Rol.PROFESOR: {
        const tieneCambiosProfesor = dto.tipoProfesor !== undefined;

        if (!tieneCambiosProfesor) return;

        return this.profesoresService.actualizar(usuarioId, dto);
      }
      default:
        return;
    }
  }

  private async obtenerDatosDeRol(
    usuarioId: string,
    rol: Rol,
  ): Promise<Partial<UsuarioPerfilCompleto>> {
    switch (rol) {
      case Rol.ESTUDIANTE: {
        const datosEstudiante = await this.estudiantesService.buscarPorId(usuarioId);
        return { datosEstudiante };
      }
      case Rol.PROFESOR: {
        const datosProfesor = await this.profesoresService.buscarPorId(usuarioId);
        return { datosProfesor };
      }
      default:
        return {};
    }
  }

  async eliminarUsuario(usuarioId: string): Promise<void> {
  // Verificar si tiene actividad relevante antes de permitir el borrado físico
  const tieneActividad = await this.tieneActividadRelacionada(usuarioId);

  if (tieneActividad) {
    throw new BadRequestException(
      'Este usuario ya tiene actividad registrada (asistencias, evaluaciones, etc.). ' +
      'No se puede eliminar, pero puedes desactivarlo.',
    );
  }

  // Sin actividad relacionada: se puede borrar físicamente sin perder historial real
  const { error } = await this.supabase.client.auth.admin.deleteUser(usuarioId);

  if (error) {
    throw new BadRequestException(`No se pudo eliminar el usuario: ${error.message}`);
  }
  // El resto de las filas (usuarios_perfiles, estudiantes, etc.) se borran
  // automáticamente por el ON DELETE CASCADE que ya tienen las FKs.
}

private async tieneActividadRelacionada(usuarioId: string): Promise<boolean> {
  // Revisa asistencias como estudiante
  const { count: countAsistencias } = await this.supabase.client
    .from('asistencias')
    .select('*', { count: 'exact', head: true })
    .eq('estudiante_id', usuarioId);

  if (countAsistencias && countAsistencias > 0) return true;

  // Revisa resultados de evaluaciones como estudiante
  const { count: countResultados } = await this.supabase.client
    .from('evaluaciones_resultados')
    .select('*', { count: 'exact', head: true })
    .eq('estudiante_id', usuarioId);

  if (countResultados && countResultados > 0) return true;

  // Revisa clases dictadas como profesor
  const { count: countClases } = await this.supabase.client
    .from('clases')
    .select('*', { count: 'exact', head: true })
    .eq('profesor_id', usuarioId);

  if (countClases && countClases > 0) return true;

  return false;
  }

  async miEquipoTecnico(estudianteId: string): Promise<UsuarioPerfilRow[]> {
    const { data: estudiante, error: errorEstudiante } = await this.supabase.client
      .from('estudiantes')
      .select('grupo_id')
      .eq('usuario_id', estudianteId)
      .single<{ grupo_id: number | null }>();

    if (errorEstudiante || !estudiante || !estudiante.grupo_id) {
      return []; // sin grupo asignado, no tiene equipo técnico aún
    }

    const [profesoresIds, kinesiologosIds] = await Promise.all([
      this.obtenerIdsPorGrupo('grupos_profesores', 'profesor_id', estudiante.grupo_id),
      this.obtenerIdsPorGrupo('grupos_kinesiologos', 'kinesiologo_id', estudiante.grupo_id),
    ]);

    const todosLosIds = [...profesoresIds, ...kinesiologosIds];

    if (todosLosIds.length === 0) return [];

    const { data: perfiles, error } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('*')
      .in('id_usuario', todosLosIds);

    if (error) {
      throw new InternalServerErrorException(`No se pudo obtener el equipo técnico: ${error.message}`);
    }

    return perfiles ?? [];
  }

  private async obtenerIdsPorGrupo(
    tabla: string,
    columna: string,
    grupoId: number,
  ): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from(tabla)
      .select(columna)
      .eq('grupo_id', grupoId);

    if (error) return [];

    return (data ?? []).map((row: any) => row[columna]);
  }
}