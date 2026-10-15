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
      throw new Error(`No se pudo crear el usuario: ${error?.message || 'Error en Edge Function'}`);
    }

    return this.obtenerUsuarioPorId(data.id_usuario);
  }

  /**
   * Lista todos los usuarios con sus tablas asociadas en UNA sola consulta (magia de Supabase).
   */
  async listarUsuarios(filtros: FiltrosUsuarios = {}): Promise<PaginacionUsuarios> {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    // Con Supabase seleccionamos las relaciones dinámicamente
    let query = this.supabase
      .from('usu_perfiles')
      .select(`
        *,
        datosEstudiante:usu_estudiantes(*),
        datosProfesor:usu_profesores(*),
        gruposProfesores:aca_grupos_profesores(grupo_id),
        gruposKinesiologos:aca_grupos_kinesiologos(grupo_id),
        gruposNutricionistas:aca_grupos_nutricionistas(grupo_id)
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
    if (filtros.rol === Rol.ESTUDIANTE && filtros.grupoIds && filtros.grupoIds.length > 0) {
      query = query.in('datosEstudiante.grupo_id', filtros.grupoIds);
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
      await this.supabase.functions.invoke('admin-actualizar-email', { body: { id_usuario: id, email: payload.email } });
    }

    const camposBase: Record<string, any> = {};
    if (payload.rut !== undefined) camposBase['rut'] = payload.rut;
    if (payload.nombre !== undefined) camposBase['nombre'] = payload.nombre;
    if (payload.apellido !== undefined) camposBase['apellido'] = payload.apellido;
    if (payload.telefono !== undefined) camposBase['telefono'] = payload.telefono;
    if (payload.fechaNacimiento !== undefined) camposBase['fecha_nacimiento'] = payload.fechaNacimiento;
    if (payload.genero !== undefined) camposBase['genero'] = payload.genero;

    if (Object.keys(camposBase).length > 0) {
      await this.supabase.from('usu_perfiles').update(camposBase).eq('id_usuario', id);
    }

    // Actualizamos tabla de estudiante o profesor según corresponda en cascada
    if (payload.peso !== undefined || payload.altura !== undefined || payload.grupoId !== undefined) {
      await this.supabase.from('usu_estudiantes').update({
        peso: payload.peso,
        altura: payload.altura,
        grupo_id: payload.grupoId
      }).eq('id_usuario', id);
    }

    return this.obtenerUsuarioPorId(id);
  }

  async desactivarUsuario(id: string): Promise<void> {
    await this.supabase.from('usu_perfiles').update({ activo: false }).eq('id_usuario', id);
  }

  async reactivarUsuario(id: string): Promise<void> {
    await this.supabase.from('usu_perfiles').update({ activo: true }).eq('id_usuario', id);
  }

  async eliminarUsuario(id: string): Promise<void> {
    // ⚠️ Eliminar un usuario completo (Auth + Tablas) requiere la Admin API en una Edge Function
    const { error } = await this.supabase.functions.invoke('admin-eliminar-usuario', { body: { id_usuario: id } });
    if (error) throw new Error(`No se pudo eliminar el usuario: ${error.message}`);
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
}