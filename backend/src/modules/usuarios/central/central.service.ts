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
import { FiltrarUsuariosDto } from './dto/filtrar-usuarios.dto';
import { ExcelService } from '../../../shared/services/excel.service'; // 🔥 IMPORTACIÓN DEL MOTOR EXCEL

import 'multer';
import { randomUUID } from 'crypto';

const BUCKET_FOTOS = 'usuarios-fotos';
const TIPOS_IMAGEN_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANO_MAXIMO_FOTO = 3 * 1024 * 1024; // 3 MB

@Injectable()
export class CentralService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly estudiantesService: EstudiantesService,
    private readonly profesoresService: ProfesoresService,
    private readonly kinesiologosService: KinesiologosService,
    private readonly nutricionistasService: NutricionistasService,
    private readonly adminsService: AdminsService,
    private readonly excelService: ExcelService, // 🔥 INYECCIÓN DEL MOTOR EXCEL
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
          genero: dto.genero,
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

  async listarUsuarios(filtros: FiltrarUsuariosDto): Promise<{
    registros: UsuarioPerfilCompleto[];
    total: number;
    pagina: number;
    limite: number;
  }> {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let idsPreseleccionados: string[] | null = null;

    if (filtros.rol === Rol.ESTUDIANTE && (filtros.grupoIds?.length || filtros.posiciones?.length)) {
      idsPreseleccionados = await this.estudiantesService.filtrarIds({
        grupoIds: filtros.grupoIds,
        posiciones: filtros.posiciones,
      });
    }

    if (filtros.rol === Rol.PROFESOR && filtros.tipoProfesor?.length) {
      idsPreseleccionados = await this.profesoresService.filtrarIds({
        tipoProfesor: filtros.tipoProfesor,
      });
    }

    if (idsPreseleccionados !== null && idsPreseleccionados.length === 0) {
      return { registros: [], total: 0, pagina, limite };
    }

    let query = this.supabase.client
      .from('usuarios_perfiles')
      .select('*', { count: 'exact' })
      .order('nombre')
      .range(desde, hasta);

    if (filtros.rol) {
      query = query.eq('rol', filtros.rol);
    }

    if (filtros.activo !== undefined) {
      query = query.eq('activo', filtros.activo);
    }

    if (filtros.generos && filtros.generos.length > 0) {
      query = query.in('genero', filtros.generos);
    }

    if (filtros.busqueda) {
      const b = filtros.busqueda.replace(/[%_]/g, '');
      query = query.or(
        `nombre.ilike.%${b}%,apellido.ilike.%${b}%,rut.ilike.%${b}%,email.ilike.%${b}%`,
      );
    }

    if (idsPreseleccionados !== null) {
      query = query.in('id_usuario', idsPreseleccionados);
    }

    const { data: perfiles, error, count } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar usuarios: ${error.message}`);
    }

    const listaPerfiles = (perfiles ?? []) as UsuarioPerfilRow[];

    // 🔥 Extraemos IDs según el rol para las consultas
    const idsEstudiantes = listaPerfiles.filter((p) => p.rol === Rol.ESTUDIANTE).map((p) => p.id_usuario);
    const idsProfesores = listaPerfiles.filter((p) => p.rol === Rol.PROFESOR).map((p) => p.id_usuario);
    const idsKinesiologos = listaPerfiles.filter((p) => p.rol === Rol.KINESIOLOGO).map((p) => p.id_usuario);
    const idsNutricionistas = listaPerfiles.filter((p) => p.rol === Rol.NUTRICIONISTA).map((p) => p.id_usuario);

    // 🔥 Consultamos TODO en paralelo (Estudiantes, Profesores y asignaciones de grupos)
    const [
      datosEstudiantes,
      datosProfesores,
      { data: gruposProfesores },
      { data: gruposKines },
      { data: gruposNutris }
    ] = await Promise.all([
      this.estudiantesService.buscarPorIds(idsEstudiantes),
      this.profesoresService.buscarPorIds(idsProfesores),
      idsProfesores.length > 0 
        ? this.supabase.client.from('grupos_profesores').select('grupo_id, profesor_id').in('profesor_id', idsProfesores) 
        : Promise.resolve({ data: [] }),
      idsKinesiologos.length > 0 
        ? this.supabase.client.from('grupos_kinesiologos').select('grupo_id, kinesiologo_id').in('kinesiologo_id', idsKinesiologos) 
        : Promise.resolve({ data: [] }),
      idsNutricionistas.length > 0 
        ? this.supabase.client.from('grupos_nutricionistas').select('grupo_id, nutricionista_id').in('nutricionista_id', idsNutricionistas) 
        : Promise.resolve({ data: [] }),
    ]);

    const mapaEstudiantes = new Map(datosEstudiantes.map((e) => [e.usuario_id, e]));
    const mapaProfesores = new Map(datosProfesores.map((p) => [p.usuario_id, p]));

    const registros = listaPerfiles.map((perfil) => {
      // 🔥 Unificamos los grupos en una sola variable dependiendo del rol
      let gruposAsignados: any[] = [];
      
      if (perfil.rol === Rol.PROFESOR) {
        gruposAsignados = (gruposProfesores ?? []).filter((g: any) => g.profesor_id === perfil.id_usuario);
      } else if (perfil.rol === Rol.KINESIOLOGO) {
        gruposAsignados = (gruposKines ?? []).filter((g: any) => g.kinesiologo_id === perfil.id_usuario);
      } else if (perfil.rol === Rol.NUTRICIONISTA) {
        gruposAsignados = (gruposNutris ?? []).filter((g: any) => g.nutricionista_id === perfil.id_usuario);
      }

      return {
        ...perfil,
        ...(mapaEstudiantes.has(perfil.id_usuario) && {
          datosEstudiante: mapaEstudiantes.get(perfil.id_usuario),
        }),
        ...(mapaProfesores.has(perfil.id_usuario) && {
          datosProfesor: mapaProfesores.get(perfil.id_usuario),
        }),
        // 🔥 Inyectamos la variable unificada para el Frontend
        grupos_asignados: gruposAsignados, 
      };
    });

    return { registros, total: count ?? 0, pagina, limite };
  }

  // 🔥 NUEVO MÉTODO EXPORTAR EXCEL
  async generarExcelUsuarios(filtros: FiltrarUsuariosDto): Promise<Buffer> {
    const filtrosExportacion = { ...filtros, limite: 10000, pagina: 1 };
    
    // Obtenemos los datos
    const { registros } = await this.listarUsuarios(filtrosExportacion);

    // Mapeamos TODA la info de la tabla
    const datosMapeados = registros.map((u: any) => {
      // Formateamos las fechas de manera segura (Día/Mes/Año)
      const fechaNacimientoStr = u.fecha_nacimiento 
        ? new Date(u.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-CL') 
        : 'Sin fecha';
        
      const fechaRegistroStr = u.created_at 
        ? new Date(u.created_at).toLocaleDateString('es-CL') 
        : 'Sin registro';

      return {
        rol: u.rol ? u.rol.toUpperCase() : '-',
        genero: u.genero || '-',
        rut: u.rut || 'Sin RUT',
        nombre: u.nombre || '-',
        apellido: u.apellido || '-',
        email: u.email || '-',
        telefono: u.telefono || 'Sin teléfono',
        fechaNacimiento: fechaNacimientoStr,
        fechaRegistro: fechaRegistroStr,
        estado: u.activo ? 'Activo' : 'Inactivo'
      };
    });

    // Definimos las columnas que aparecerán en el Excel
    const columnas = [
      { header: 'Rol', key: 'rol', width: 20 },
      { header: 'Género', key: 'genero', width: 15 },
      { header: 'RUT', key: 'rut', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 20 },
      { header: 'Apellido', key: 'apellido', width: 20 },
      { header: 'Email', key: 'email', width: 35 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Fecha de Nacimiento', key: 'fechaNacimiento', width: 20 },
      { header: 'Fecha de Registro', key: 'fechaRegistro', width: 20 },
      { header: 'Estado', key: 'estado', width: 15 },
    ];

    try {
      return await this.excelService.generarExcel('Directorio de Usuarios', columnas, datosMapeados);
    } catch (error) {
      throw new InternalServerErrorException('Error al generar el archivo Excel de usuarios');
    }
  }

  async obtenerProximosCumpleanos(dias: number = 7): Promise<any[]> {
    const { data, error } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('id_usuario, nombre, apellido, fecha_nacimiento, rol')
      .eq('activo', true)
      .not('fecha_nacimiento', 'is', null);

    if (error) {
      lanzarErrorSupabase(error, 'No se pudieron obtener los cumpleaños');
    }

    const usuarios = data ?? [];
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); 

    const proximos = usuarios
      .map((u) => {
        const nacimiento = new Date(u.fecha_nacimiento + 'T00:00:00'); 
        const cumpleEsteAno = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
        
        let proximoCumple = cumpleEsteAno < hoy 
            ? new Date(hoy.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate()) 
            : cumpleEsteAno;
            
        const diasRestantes = Math.ceil((proximoCumple.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        
        return { 
            id: u.id_usuario,
            nombreCompleto: `${u.nombre} ${u.apellido}`,
            rol: u.rol, 
            proximoCumple, 
            diasRestantes, 
            nuevaEdad: proximoCumple.getFullYear() - nacimiento.getFullYear() 
        };
      })
      .filter((item) => item.diasRestantes >= 0 && item.diasRestantes <= dias)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);

    return proximos;
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
    if (dto.genero !== undefined) camposBase.genero = dto.genero;

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
    const tieneActividad = await this.tieneActividadRelacionada(usuarioId);

    if (tieneActividad) {
      throw new BadRequestException(
        'Este usuario ya tiene actividad registrada (asistencias, evaluaciones, etc.). ' +
        'No se puede eliminar, pero puedes desactivarlo.',
      );
    }

    const { error } = await this.supabase.client.auth.admin.deleteUser(usuarioId);

    if (error) {
      throw new BadRequestException(`No se pudo eliminar el usuario: ${error.message}`);
    }
  }

  private async tieneActividadRelacionada(usuarioId: string): Promise<boolean> {
    const { count: countAsistencias } = await this.supabase.client
      .from('asistencias')
      .select('*', { count: 'exact', head: true })
      .eq('estudiante_id', usuarioId);

    if (countAsistencias && countAsistencias > 0) return true;

    const { count: countResultados } = await this.supabase.client
      .from('evaluaciones_resultados')
      .select('*', { count: 'exact', head: true })
      .eq('estudiante_id', usuarioId);

    if (countResultados && countResultados > 0) return true;

    const { count: countClases } = await this.supabase.client
      .from('clases')
      .select('*', { count: 'exact', head: true })
      .eq('profesor_id', usuarioId);

    if (countClases && countClases > 0) return true;

    return false;
  }

  async miEquipoTecnico(estudianteId: string): Promise<any[]> {
    const { data: estudiante, error: errorEstudiante } = await this.supabase.client
      .from('estudiantes')
      .select('grupo_id')
      .eq('usuario_id', estudianteId)
      .single<{ grupo_id: number | null }>();

    if (errorEstudiante || !estudiante || !estudiante.grupo_id) {
      return [];
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

    const listaPerfiles = (perfiles ?? []) as UsuarioPerfilRow[];

    const datosProfesores = await this.profesoresService.buscarPorIds(profesoresIds);
    const mapaTipoProfesor = new Map(datosProfesores.map((p) => [p.usuario_id, p.tipo_profesor]));

    return listaPerfiles.map((perfil) => ({
      ...perfil,
      ...(mapaTipoProfesor.has(perfil.id_usuario) && {
        tipo_profesor: mapaTipoProfesor.get(perfil.id_usuario),
      }),
    }));
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

  async actualizarFoto(
    usuarioId: string,
    archivo: Express.Multer.File,
  ): Promise<UsuarioPerfilRow> {
    this.validarImagen(archivo);

    const perfilActual = await this.buscarPropioPerfil(usuarioId);

    const fotoUrl = await this.subirFoto(archivo, usuarioId);

    if (perfilActual.foto_url) {
      await this.borrarFoto(perfilActual.foto_url);
    }

    const { data, error } = await this.supabase.client
      .from('usuarios_perfiles')
      .update({ foto_url: fotoUrl })
      .eq('id_usuario', usuarioId)
      .select()
      .single<UsuarioPerfilRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo actualizar la foto de perfil');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el perfil actualizado');
    }

    return data;
  }

  async eliminarFoto(usuarioId: string): Promise<UsuarioPerfilRow> {
    const perfilActual = await this.buscarPropioPerfil(usuarioId);

    if (perfilActual.foto_url) {
      await this.borrarFoto(perfilActual.foto_url);
    }

    const { data, error } = await this.supabase.client
      .from('usuarios_perfiles')
      .update({ foto_url: null })
      .eq('id_usuario', usuarioId)
      .select()
      .single<UsuarioPerfilRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo quitar la foto de perfil');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el perfil actualizado');
    }

    return data;
  }

  private validarImagen(archivo: Express.Multer.File): void {
    if (!archivo) {
      throw new BadRequestException('Debes adjuntar una imagen');
    }

    if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.mimetype)) {
      throw new BadRequestException(`Tipo de imagen no permitido: ${archivo.mimetype}`);
    }

    if (archivo.size > TAMANO_MAXIMO_FOTO) {
      throw new BadRequestException('La imagen supera el tamaño máximo permitido (3 MB)');
    }
  }

  private async subirFoto(archivo: Express.Multer.File, usuarioId: string): Promise<string> {
    const extension = archivo.originalname.split('.').pop();
    const nombreArchivo = `${usuarioId}/${randomUUID()}.${extension}`;

    const { error } = await this.supabase.client.storage
      .from(BUCKET_FOTOS)
      .upload(nombreArchivo, archivo.buffer, { contentType: archivo.mimetype });

    if (error) {
      throw new InternalServerErrorException(`No se pudo subir la foto: ${error.message}`);
    }

    const { data } = this.supabase.client.storage.from(BUCKET_FOTOS).getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  private async borrarFoto(url: string): Promise<void> {
    const marcador = `/${BUCKET_FOTOS}/`;
    const index = url.indexOf(marcador);
    if (index === -1) return;

    const path = url.substring(index + marcador.length);
    await this.supabase.client.storage.from(BUCKET_FOTOS).remove([path]);
  }
}