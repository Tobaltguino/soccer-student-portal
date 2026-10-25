import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  UsuarioPerfil,
  UsuarioPerfilCompleto,
  CrearUsuarioPayload,
  ActualizarUsuarioPayload,
  FiltrosUsuarios,
  PaginacionUsuarios,
  Rol
} from '../models/usuario-central.interface';

const BUCKET_FOTOS = 'usuarios-fotos';
const TIPOS_IMAGEN_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANO_MAXIMO_FOTO = 3 * 1024 * 1024; // 3 MB
const LIMITE_MAXIMO_FILAS = 1000; // Máximo de filas que devuelve Supabase por petición

@Injectable({
  providedIn: 'root'
})
export class UsuarioCentralService {
  private supabase = inject(SupabaseService).client;

  /**
   * Llama a una Supabase Edge Function para crear el usuario de forma segura con la Admin API
   */
  async crearUsuario(payload: CrearUsuarioPayload): Promise<UsuarioPerfilCompleto> {
    // ⚠️ ATENCIÓN: Las operaciones Auth Admin requieren llamar a una Edge Function 
    const { data, error } = await this.supabase.functions.invoke('admin-crear-usuario', {
      body: payload
    });

    if (error || !data) {
      throw new Error(`No se pudo crear el usuario: ${await this.mensajeErrorFuncion(error)}`);
    }

    return this.obtenerUsuarioPorId(data.id_usuario);
  }

  /**
   * Lista todos los usuarios con sus tablas asociadas en UNA sola consulta (magia de Supabase).
   */
  async listarUsuarios(filtros: FiltrosUsuarios = {}): Promise<PaginacionUsuarios> {
    const pagina = filtros.pagina ?? 1;
    // 1000 = máximo de filas por petición de Supabase (antes se cortaba en 100 sin avisar)
    const limite = Math.min(filtros.limite ?? 20, LIMITE_MAXIMO_FILAS);
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    // Al filtrar estudiantes por grupo, el join debe ser !inner: si no, PostgREST solo
    // filtra la relación anidada y devuelve igual a todos los estudiantes.
    const filtraPorGrupo = filtros.rol === Rol.ESTUDIANTE && !!filtros.grupoIds?.length;
    const relacionEstudiante = filtraPorGrupo ? 'usu_estudiantes!inner' : 'usu_estudiantes';

    // Con Supabase seleccionamos las relaciones dinámicamente
    let query = this.supabase
      .from('usu_perfiles')
      .select(`
        *,
        datosEstudiante:${relacionEstudiante}(*),
        datosProfesor:usu_profesores(*)
      `, { count: 'exact' })
      .order('nombre', { ascending: true })
      .range(desde, hasta);

    if (filtros.rol) query = query.eq('rol', filtros.rol);
    if (filtros.activo !== undefined) query = query.eq('activo', filtros.activo);
    if (filtros.generos && filtros.generos.length > 0) query = query.in('genero', filtros.generos);
    
    if (filtros.busqueda) {
      const b = filtros.busqueda.replace(/[%_]/g, '');
      query = query.or(`nombre.ilike.%${b}%,apellido.ilike.%${b}%,rut.ilike.%${b}%,email.ilike.%${b}%`);
    }

    // Filtros específicos que requieren PostgREST inner joins
    if (filtraPorGrupo) {
      query = query.in('datosEstudiante.grupo_id', filtros.grupoIds!);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`No se pudo listar usuarios: ${error.message}`);
    }

    // Unificamos los grupos en 'grupos_asignados' igual que en tu backend
    const registros = (data ?? []).map((u: any) => {
      let gruposAsignados: any[] = [];
      if (u.rol === Rol.PROFESOR) gruposAsignados = u.gruposProfesores || [];
      if (u.rol === Rol.KINESIOLOGO) gruposAsignados = u.gruposKinesiologos || [];
      if (u.rol === Rol.NUTRICIONISTA) gruposAsignados = u.gruposNutricionistas || [];

      // Aplanamos arreglos de relaciones uno a uno
      const datosEstudiante = Array.isArray(u.datosEstudiante) ? u.datosEstudiante[0] : u.datosEstudiante;
      const datosProfesor = Array.isArray(u.datosProfesor) ? u.datosProfesor[0] : u.datosProfesor;

      return {
        ...u,
        datosEstudiante: datosEstudiante || null,
        datosProfesor: datosProfesor || null,
        grupos_asignados: gruposAsignados,
        // Limpiamos la respuesta
        gruposProfesores: undefined,
        gruposKinesiologos: undefined,
        gruposNutris: undefined
      };
    });

    return {
      registros,
      total: count ?? 0,
      pagina,
      limite,
    };
  }

  async obtenerMiPerfil(): Promise<UsuarioPerfilCompleto> {
    const { data: authData } = await this.supabase.auth.getUser();
    if (!authData?.user) throw new Error('Usuario no autenticado');
    return this.obtenerUsuarioPorId(authData.user.id);
  }

  async obtenerUsuarioPorId(id: string): Promise<UsuarioPerfilCompleto> {
    const { data, error } = await this.supabase
      .from('usu_perfiles')
      .select(`
        *,
        datosEstudiante:usu_estudiantes(*),
        datosProfesor:usu_profesores(*)
      `)
      .eq('id_usuario', id)
      .single();

    if (error || !data) throw new Error('Perfil no encontrado');

    const datosEstudiante = Array.isArray(data.datosEstudiante) ? data.datosEstudiante[0] : data.datosEstudiante;
    const datosProfesor = Array.isArray(data.datosProfesor) ? data.datosProfesor[0] : data.datosProfesor;

    return { ...data, datosEstudiante, datosProfesor };
  }

  async actualizarUsuario(id: string, payload: ActualizarUsuarioPayload): Promise<UsuarioPerfilCompleto> {
    // ⚠️ Si cambian el email, debes llamar a una Edge Function por temas de seguridad de Auth Admin
    if (payload.email) {
      const { error } = await this.supabase.functions.invoke('admin-actualizar-email', { body: { id_usuario: id, email: payload.email } });
      if (error) throw new Error(`No se pudo actualizar el email: ${await this.mensajeErrorFuncion(error)}`);
    }

    const camposBase: Record<string, any> = {};
    if (payload.rut !== undefined) camposBase['rut'] = payload.rut;
    if (payload.nombre !== undefined) camposBase['nombre'] = payload.nombre;
    if (payload.apellido !== undefined) camposBase['apellido'] = payload.apellido;
    if (payload.telefono !== undefined) camposBase['telefono'] = payload.telefono;
    if (payload.fechaNacimiento !== undefined) camposBase['fecha_nacimiento'] = payload.fechaNacimiento;
    if (payload.genero !== undefined) camposBase['genero'] = payload.genero;

    if (Object.keys(camposBase).length > 0) {
      const { error } = await this.supabase.from('usu_perfiles').update(camposBase).eq('id_usuario', id);
      if (error) throw new Error(`No se pudo actualizar el perfil: ${error.message}`);
    }

    // Actualizamos tabla de estudiante o profesor según corresponda en cascada
    const camposEstudiante: Record<string, any> = {};
    if (payload.peso !== undefined) camposEstudiante['peso'] = payload.peso;
    if (payload.altura !== undefined) camposEstudiante['altura'] = payload.altura;
    if (payload.grupoId !== undefined) camposEstudiante['grupo_id'] = payload.grupoId;
    if (payload.posiciones !== undefined) camposEstudiante['posiciones'] = payload.posiciones;
    if (payload.direccion !== undefined) camposEstudiante['direccion'] = payload.direccion;
    if (payload.prevision !== undefined) camposEstudiante['prevision'] = payload.prevision;

    if (Object.keys(camposEstudiante).length > 0) {
      const { error } = await this.supabase.from('usu_estudiantes').update(camposEstudiante).eq('id_usuario', id);
      if (error) throw new Error(`No se pudieron actualizar los datos del estudiante: ${error.message}`);
    }

    if (payload.tipoProfesor !== undefined) {
      const { error } = await this.supabase.from('usu_profesores').update({ tipo_profesor: payload.tipoProfesor }).eq('id_usuario', id);
      if (error) throw new Error(`No se pudieron actualizar los datos del profesor: ${error.message}`);
    }

    return this.obtenerUsuarioPorId(id);
  }

  async desactivarUsuario(id: string): Promise<void> {
    const { error } = await this.supabase.from('usu_perfiles').update({ activo: false }).eq('id_usuario', id);
    if (error) throw new Error(`No se pudo desactivar el usuario: ${error.message}`);
  }

  async reactivarUsuario(id: string): Promise<void> {
    const { error } = await this.supabase.from('usu_perfiles').update({ activo: true }).eq('id_usuario', id);
    if (error) throw new Error(`No se pudo reactivar el usuario: ${error.message}`);
  }

  async eliminarUsuario(id: string): Promise<void> {
    // ⚠️ Eliminar un usuario completo (Auth + Tablas) requiere la Admin API en una Edge Function
    const { error } = await this.supabase.functions.invoke('admin-eliminar-usuario', { body: { id_usuario: id } });
    if (error) throw new Error(`No se pudo eliminar el usuario: ${await this.mensajeErrorFuncion(error)}`);
  }

  /**
   * functions.invoke solo dice "non-2xx status code"; el motivo real viene
   * en el cuerpo de la respuesta ({ error: '...' }) de la Edge Function.
   */
  private async mensajeErrorFuncion(error: any): Promise<string> {
    const detalle = await error?.context?.json?.().catch(() => null);
    return detalle?.error || error?.message || 'Error en Edge Function';
  }

  // =========================================================================
  // FOTOS DE PERFIL (STORAGE)
  // =========================================================================
  async actualizarFoto(id: string, foto: File): Promise<{ fotoUrl: string }> {
    this.validarImagen(foto);
    const perfilActual = await this.obtenerUsuarioPorId(id);

    const fotoUrl = await this.subirFoto(foto, id);

    if (perfilActual.foto_url) {
      await this.borrarFoto(perfilActual.foto_url);
    }

    await this.supabase.from('usu_perfiles').update({ foto_url: fotoUrl }).eq('id_usuario', id);
    return { fotoUrl };
  }

  async eliminarFoto(id: string): Promise<void> {
    const perfilActual = await this.obtenerUsuarioPorId(id);
    if (perfilActual.foto_url) {
      await this.borrarFoto(perfilActual.foto_url);
    }
    await this.supabase.from('usu_perfiles').update({ foto_url: null }).eq('id_usuario', id);
  }

  private validarImagen(archivo: File): void {
    if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) throw new Error(`Tipo de imagen no permitido: ${archivo.type}`);
    if (archivo.size > TAMANO_MAXIMO_FOTO) throw new Error('La imagen supera el tamaño máximo permitido (3 MB)');
  }

  private async subirFoto(archivo: File, usuarioId: string): Promise<string> {
    const extension = archivo.name.split('.').pop() || 'jpg';
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const nombreArchivo = `${usuarioId}/${uuid}.${extension}`;

    const { error } = await this.supabase.storage.from(BUCKET_FOTOS).upload(nombreArchivo, archivo, { contentType: archivo.type });
    if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);

    const { data } = this.supabase.storage.from(BUCKET_FOTOS).getPublicUrl(nombreArchivo);
    return data.publicUrl;
  }

  private async borrarFoto(url: string): Promise<void> {
    const marcador = `/${BUCKET_FOTOS}/`;
    const index = url.indexOf(marcador);
    if (index === -1) return;
    const path = url.substring(index + marcador.length);
    await this.supabase.storage.from(BUCKET_FOTOS).remove([path]);
  }

  /**
   * Obtiene el cuerpo técnico (Profesores, Kinesiólogos, Nutricionistas)
   * asignado al grupo del estudiante logueado.
   */
  async obtenerMiCuerpoTecnico(): Promise<UsuarioPerfilCompleto[]> {
    // 1. Obtenemos el perfil del estudiante para saber su grupo
    const miPerfil = await this.obtenerMiPerfil();
    const grupoId = miPerfil.datosEstudiante?.grupo_id;

    if (!grupoId) return []; // Si no tiene grupo asignado, retornamos vacío

    // 2. Buscamos los IDs de los profesionales asignados a ese grupo en las tablas intermedias
    const [profes, kines, nutris] = await Promise.all([
      this.supabase.from('aca_grupos_profesores').select('profesor_id').eq('grupo_id', grupoId),
      this.supabase.from('aca_grupos_kinesiologos').select('kinesiologo_id').eq('grupo_id', grupoId),
      this.supabase.from('aca_grupos_nutricionistas').select('nutricionista_id').eq('grupo_id', grupoId)
    ]);

    const errorAsignaciones = profes.error || kines.error || nutris.error;
    if (errorAsignaciones) {
      throw new Error(`Error al obtener el cuerpo técnico: ${errorAsignaciones.message}`);
    }

    // Consolidamos todos los IDs encontrados
    const idsStaff = [
      ...(profes.data || []).map(p => p.profesor_id),
      ...(kines.data || []).map(k => k.kinesiologo_id),
      ...(nutris.data || []).map(n => n.nutricionista_id)
    ];

    if (idsStaff.length === 0) return [];

    // 3. Traemos solo los datos que muestra la tarjeta (sin RUT, teléfono ni fecha de nacimiento)
    const { data: perfiles, error } = await this.supabase
      .from('usu_perfiles')
      .select(`
        id_usuario, nombre, apellido, email, rol, foto_url,
        datosProfesor:usu_profesores(tipo_profesor)
      `)
      .in('id_usuario', idsStaff)
      .eq('activo', true);

    if (error) {
      throw new Error(`Error al obtener el cuerpo técnico: ${error.message}`);
    }

    // 4. Formateamos la respuesta para que el componente HTML lo lea directo
    return (perfiles || []).map((u: any) => {
      const datosProfesor = Array.isArray(u.datosProfesor) ? u.datosProfesor[0] : u.datosProfesor;
      return {
        ...u,
        datosProfesor: datosProfesor || null,
        tipo_profesor: datosProfesor?.tipo_profesor || null // Extraemos el tipo directo al root para el HTML
      };
    });
  }
}