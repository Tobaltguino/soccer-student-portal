import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  
  public supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // ==========================================
  // 1. AUTENTICACIÓN Y SEGURIDAD
  // ==========================================
  
  async login(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async logout() {
    return await this.supabase.auth.signOut();
  }

  async getUser() {
    return await this.supabase.auth.getUser();
  }

  async esAdmin(uid: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('admins')
      .select('id')
      .eq('id', uid)
      .single();
    return !(error || !data);
  }

  async resetPassword(email: string) {
    return await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password' 
    });
  }

  async loginConRut(rutInput: string, password: string) {
    const tablas = ['admins', 'estudiantes', 'profesores', 'kinesiologos', 'nutricionistas'];
    
    for (const tabla of tablas) {
      const { data } = await this.supabase
        .from(tabla)
        .select('email')
        .eq('rut', rutInput.trim())
        .maybeSingle();

      if (data?.email) {
        // Intentamos loguear con el email encontrado
        const authResponse = await this.supabase.auth.signInWithPassword({ 
          email: data.email, 
          password 
        });

        // Si la contraseña es incorrecta, devolvemos el error inmediatamente
        if (authResponse.error) {
           return { data: null, error: authResponse.error, role: null };
        }

        // ✅ ÉXITO: Devolvemos la data de auth Y el nombre de la tabla (rol)
        return { 
            data: authResponse.data, 
            error: null, 
            role: tabla // 'admins', 'estudiantes', etc.
        };
      }
    }
    
    return { 
        data: null, 
        error: { message: `El RUT ${rutInput} no está registrado en ProFutbol.` },
        role: null
    };
  }

  // ==========================================
  // 2. DASHBOARD (DATOS RESUMIDOS)
  // ==========================================

  async getTotalEstudiantes() {
    return await this.supabase
      .from('estudiantes')
      .select('*', { count: 'exact', head: true });
  }

  async getClasesHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    return await this.supabase
      .from('clases')
      .select('*, grupos(nombre)')
      .eq('fecha', hoy)
      .order('hora', { ascending: true });
  }

  async getActividadReciente() {
    return await this.supabase
      .from('evaluaciones_sesiones')
      .select('*, grupos(nombre), tipo_evaluacion(nombre)')
      .order('created_at', { ascending: false })
      .limit(5);
  }

  // ==========================================
  // 3. MAESTROS (CONFIGURACIÓN GLOBAL)
  // ==========================================

  async getGrupos() {
    return await this.supabase
      .from('grupos')
      .select('*, estudiantes(count)') 
      .order('nombre', { ascending: true });
  }

  async createGrupo(datos: any) {
    return await this.supabase.from('grupos').insert(datos);
  }

  async updateGrupo(id: number, datos: any) {
    return await this.supabase.from('grupos').update(datos).eq('id', id);
  }

  async deleteGrupo(id: number) {
    return await this.supabase.from('grupos').delete().eq('id', id);
  }

  // ✅ NUEVO: Para el selector de posiciones de estudiantes
  async getPosiciones() {
  return await this.supabase
    .from('posiciones')
    .select('*')
    .order('orden', { ascending: true }); // <--- Ordena de 1 a 8
}

  // ==========================================
  // 4. GESTIÓN DE USUARIOS (CRUD + RELACIONES)
  // ==========================================

  // --- GETTERS (LECTURA) ---
  
  // ✅ ACTUALIZADO: Trae el Grupo Y las Posiciones (Relación Muchos a Muchos)
  async getEstudiantes() { 
    return await this.supabase
      .from('estudiantes')
      .select(`
        *,
        grupos ( id, nombre ),
        estudiantes_posiciones (
          posicion_id,
          posiciones ( nombre, orden )
        )
      `) 
      .order('apellido', { ascending: true }); 
  }

  // ✅ ACTUALIZADO: Trae los Grupos a cargo del profesor
  async getProfesores() { 
    return await this.supabase
      .from('profesores')
      .select(`
        *,
        grupos_profesores (
          grupo_id,
          grupos ( id, nombre )
        )
      `)
      .order('apellido'); 
  }

  async getAdmins() { return await this.supabase.from('admins').select('*').order('apellido'); }
  async getKinesiologos() { return await this.supabase.from('kinesiologos').select('*').order('apellido'); }
  async getNutricionistas() { return await this.supabase.from('nutricionistas').select('*').order('apellido'); }

  // --- CREAR USUARIO (AUTH + DB) ---
  async crearUsuarioCompleto(email: string, password: string, datosPersonales: any, tabla: string) {
    // 1. Instancia temporal para no cerrar sesión del admin actual
    const tempSupabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: { 
        autoRefreshToken: false, 
        persistSession: false,
        detectSessionInUrl: false 
      }
    });

    // ✅ LIMPIEZA DE SEGURIDAD
    if (tabla !== 'estudiantes') {
      delete datosPersonales.fecha_nacimiento;
      delete datosPersonales.grupo_id;
    }

    // 2. Crear usuario en Auth
    const { data: authData, error: authError } = await tempSupabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          role: this.mapTablaToRole(tabla),
          nombre: datosPersonales.nombre,
          apellido: datosPersonales.apellido,
          rut: datosPersonales.rut,
          ...(datosPersonales.tipo_profesor && { tipo_profesor: datosPersonales.tipo_profesor })
        }
      }
    });

    if (authError) return { data: null, error: authError };
    if (!authData.user) return { data: null, error: { message: 'Error creando usuario Auth' } };

    // 3. Insertar/Actualizar datos en la tabla pública
    // Usamos UPSERT en lugar de UPDATE para evitar el error 406 si el trigger es lento
    const datosParaGuardar = {
        id: authData.user.id, // Forzamos el ID del usuario creado
        ...datosPersonales
    };

    const { data: dbData, error: dbError } = await this.supabase
      .from(tabla)
      .upsert(datosParaGuardar) // ✅ CAMBIO CLAVE: Upsert arregla la condición de carrera
      .select()
      .maybeSingle(); 

    if (dbError) {
        console.warn("Error en DB:", dbError.message);
        // Aunque falle la DB, el usuario Auth se creó, devolvemos el usuario
        return { data: { user: authData.user, perfil: null }, error: dbError };
    }

    return { data: { user: authData.user, perfil: dbData }, error: null };
  }

  // --- EDITAR / ELIMINAR ---

  async updateUsuario(tabla: string, id: string, datos: any, email: string) {
    // ✅ LIMPIEZA DE SEGURIDAD antes de enviar al RPC
    if (tabla !== 'estudiantes') {
      delete datos.fecha_nacimiento;
      delete datos.grupo_id;
    }

    return await this.supabase.rpc('admin_actualizar_usuario', {
      id_usuario: id,
      nuevo_email: email,     
      tabla_nombre: tabla,
      nuevos_datos: datos
    });
  }

  async deleteUsuario(tabla: string, id: string) {
    // Llamamos al RPC para borrar en cascada (Auth + Perfil)
    return await this.supabase.rpc('admin_eliminar_usuario', {
      id_usuario: id,
      tabla_nombre: tabla
    });
  }

  // --- GESTIÓN DE RELACIONES (TABLAS INTERMEDIAS) ---

  // ✅ NUEVO: Gestionar Estudiantes <-> Posiciones
  async actualizarPosicionesEstudiante(estudianteId: string, posicionesIds: number[]) {
    // 1. Borrar anteriores
    await this.supabase.from('estudiantes_posiciones').delete().eq('estudiante_id', estudianteId);
    
    // 2. Insertar nuevas si existen
    if (posicionesIds && posicionesIds.length > 0) {
      const inserts = posicionesIds.map(pid => ({
        estudiante_id: estudianteId,
        posicion_id: pid
      }));
      return await this.supabase.from('estudiantes_posiciones').insert(inserts);
    }
    return { error: null };
  }

  // ✅ NUEVO: Gestionar Profesores <-> Grupos
  async actualizarGruposProfesor(profesorId: string, gruposIds: number[]) {
    // 1. Borrar anteriores
    await this.supabase.from('grupos_profesores').delete().eq('profesor_id', profesorId);

    // 2. Insertar nuevos
    if (gruposIds && gruposIds.length > 0) {
      const inserts = gruposIds.map(gid => ({
        profesor_id: profesorId,
        grupo_id: gid
      }));
      return await this.supabase.from('grupos_profesores').insert(inserts);
    }
    return { error: null };
  }

  // ==========================================
  // 5. ENTRENAMIENTOS (CLASES Y ASISTENCIA)
  // ==========================================

  async getClases() {
    return await this.supabase
      .from('clases')
      .select(`
        *,
        grupos (
          id,
          nombre
        )
      `)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: true });
  }

  async createClase(datos: any) {
    return await this.supabase.from('clases').insert(datos).select();
  }

  async updateClase(id: number, datos: any) {
    return await this.supabase.from('clases').update(datos).eq('id', id).select();
  }

  async deleteClase(id: number) {
    return await this.supabase.from('clases').delete().eq('id', id);
  }

  async getAlumnosPorGrupo(grupoId: number) {
    return await this.supabase
      .from('estudiantes')
      .select('id, nombre, apellido, grupo_id')
      .eq('grupo_id', grupoId)
      .eq('activo', true) // Solo alumnos activos
      .order('apellido', { ascending: true });
  }

  async saveAsistencia(registros: any[]) {
    return await this.supabase
      .from('asistencias')
      .upsert(registros, { onConflict: 'clase_id, estudiante_id' }); // Ojo: campo 'estudiante_id' según tu SQL
  }

  async getAsistenciaPorClase(claseId: number) {
    return await this.supabase
      .from('asistencias')
      .select('estudiante_id, presente')
      .eq('clase_id', claseId);
  }

  // ==========================================
  // 6. EVALUACIONES (SALUD Y RENDIRMIENTO)
  // ==========================================

  async getTiposEvaluacion() {
    return await this.supabase.from('tipo_evaluacion').select('*').order('nombre');
  }

  async createTipoEvaluacion(dato: any) {
    return await this.supabase.from('tipo_evaluacion').insert(dato).select();
  }

  async eliminarTipoEvaluacion(id: number) {
    return await this.supabase.from('tipo_evaluacion').delete().eq('id', id);
  }

  // Obtener rangos de un test específico
  async getRangosPorTipo(tipoId: number) {
    return await this.supabase
      .from('evaluacion_rangos')
      .select('*')
      .eq('tipo_evaluacion_id', tipoId)
      .order('valor_min', { ascending: true });
  }

  // Guardar un rango
  async createRango(rango: any) {
    return await this.supabase.from('evaluacion_rangos').insert(rango);
  }

  // Eliminar un rango
  async eliminarRango(id: number) {
    return await this.supabase.from('evaluacion_rangos').delete().eq('id', id);
  }

  // En src/app/core/services/supabase.service.ts

async eliminarRangosPorTipo(tipoId: number) {
  return await this.supabase
    .from('evaluacion_rangos')
    .delete()
    .eq('tipo_evaluacion_id', tipoId); // Borra todos los que pertenezcan a ese test
}

  async getSesionesEvaluacion() {
    return await this.supabase
      .from('evaluaciones_sesiones')
      .select(`
        *,
        grupos!evaluaciones_sesiones_grupo_id_fkey ( nombre ),
        tipo_evaluacion!evaluaciones_sesiones_tipo_evaluacion_id_fkey ( nombre, unidad_medida )
      `)
      .order('fecha', { ascending: false });
  }

  async crearSesionEvaluacion(datos: any) {
    return await this.supabase
      .from('evaluaciones_sesiones')
      .insert(datos)
      .select()
      .single();
  }

  async updateSesionEvaluacion(id: string, datos: any) {
    return await this.supabase
      .from('evaluaciones_sesiones')
      .update(datos)
      .eq('id', id)
      .select();
  }

  async eliminarSesionEvaluacion(id: string) {
    return await this.supabase.from('evaluaciones_sesiones').delete().eq('id', id);
  }

  async getResultadosPorSesion(sesionId: string) {
    return await this.supabase
      .from('evaluaciones_resultados')
      .select('*')
      .eq('sesion_id', sesionId);
  }

  async guardarResultadosMasivos(resultados: any[]) {
  return await this.supabase
    .from('evaluaciones_resultados')
    .upsert(resultados, { 
      onConflict: 'sesion_id, estudiante_id' // ✅ Esto le dice a la DB que actualice si el alumno ya tiene nota en esta sesión
    });
  }

  // ==========================================
  // 7. HELPERS PRIVADOS
  // ==========================================
  
  private mapTablaToRole(tabla: string): string {
    if (tabla === 'estudiantes') return 'estudiante';
    if (tabla === 'profesores') return 'profesor';
    if (tabla === 'admins') return 'admin';
    if (tabla === 'kinesiologos') return 'kinesiologo';
    if (tabla === 'nutricionistas') return 'nutricionista';
    return 'user';
  }

  // --- FUNCIONES PARA ESTUDIANTES ---

  /**
   * Obtiene las clases del grupo al que pertenece el alumno,
   * cruzando los datos con su asistencia personal y limitando el tiempo para optimizar.
   * @param uid ID del estudiante (UUID del auth)
   * @param fechaDesde Fecha opcional (YYYY-MM-DD) para limitar la carga histórica
   */
  async getClasesAlumno(uid: string, fechaDesde?: string) {
    try {
      // 1. Primero identificamos a qué grupo pertenece el estudiante
      const { data: estudiante, error: errEst } = await this.supabase
        .from('estudiantes')
        .select('grupo_id')
        .eq('id', uid)
        .single();

      if (errEst || !estudiante?.grupo_id) {
        console.error('Error al buscar grupo del estudiante:', errEst);
        return { data: [], error: errEst };
      }

      // 2. Construimos la consulta base a la tabla clases
      // Traemos todos los campos (*), el nombre del grupo y la asistencia de este alumno específico
      let query = this.supabase
        .from('clases')
        .select(`
          *,
          grupos ( nombre ),
          asistencias!left ( presente ) 
        `)
        .eq('grupo_id', estudiante.grupo_id)
        .eq('asistencias.estudiante_id', uid); // Filtro para traer solo TU asistencia

      // 3. Aplicamos filtro de fecha si se proporciona para evitar colapsos por exceso de datos
      if (fechaDesde) {
        query = query.gte('fecha', fechaDesde);
      }

      // 4. Ejecutamos y ordenamos por fecha descendente (la DB ayuda al orden inicial)
      const { data, error } = await query.order('fecha', { ascending: false });

      if (error) throw error;

      // 5. Formateamos la respuesta para que 'presente' sea una propiedad directa
      const clasesFormateadas = data?.map(clase => ({
        ...clase,
        // Extraemos el valor del primer (y único) registro de asistencia encontrado
        presente: clase.asistencias && clase.asistencias.length > 0 
                  ? clase.asistencias[0].presente 
                  : null
      }));

      return { data: clasesFormateadas, error: null };

    } catch (error) {
      console.error('Error crítico en getClasesAlumno:', error);
      return { data: null, error };
    }
  }

  /**
   * Obtiene las evaluaciones del alumno con límite de tiempo.
   * @param uid ID del estudiante
   * @param fechaDesde Fecha límite (YYYY-MM-DD)
   */
  async getEvaluacionesAlumno(uid: string, fechaDesde?: string) {
    try {
      let query = this.supabase
        .from('evaluaciones_resultados')
        .select(`
          *,
          evaluaciones_sesiones!inner (
            fecha,
            tipo_evaluacion!inner (
              id,
              nombre,
              unidad_medida,
              evaluacion_rangos (*) 
            )
          )
        `)
        .eq('estudiante_id', uid);

      if (fechaDesde) {
        query = query.gte('evaluaciones_sesiones.fecha', fechaDesde);
      }

      const { data, error } = await query;
      if (error) throw error;

      const dataFormateada = data?.map(res => {
        const valor = res.valor_numerico;
        const rangos = res.evaluaciones_sesiones?.tipo_evaluacion?.evaluacion_rangos || [];
        
        // ✅ Buscamos en qué rango cae el resultado
        const rangoEncontrado = rangos.find((r: any) => 
          valor >= r.valor_min && valor <= r.valor_max
        );

        return {
          id: res.id,
          resultado: valor,
          observacion: res.observacion,
          fecha: res.evaluaciones_sesiones?.fecha,
          created_at: res.created_at,
          test_nombre: res.evaluaciones_sesiones?.tipo_evaluacion?.nombre,
          unidad: res.evaluaciones_sesiones?.tipo_evaluacion?.unidad_medida,
          // Si no hay rango, mostramos un estado neutro
          nivel: rangoEncontrado ? rangoEncontrado.nombre_etiqueta : 'Sin Rango',
          color: rangoEncontrado ? rangoEncontrado.color_sugerido : '#64748b'
        };
      });

      return { data: dataFormateada, error: null };
    } catch (error) {
      console.error('Error en getEvaluacionesAlumno:', error);
      return { data: null, error };
    }
  }

  /**
   * Obtiene los profesores asignados al grupo del estudiante.
   * Realiza el cruce: Estudiante -> Grupo -> Profesores_Grupos -> Profesores
   */
  async getProfesoresDeEstudiante(uid: string) {
    try {
      // 1. Obtener grupo del alumno
      const { data: estudiante, error: errEst } = await this.supabase
        .from('estudiantes')
        .select('grupo_id')
        .eq('id', uid)
        .single();

      if (errEst || !estudiante?.grupo_id) {
        return { data: [], error: null };
      }

      // 2. Buscar los profesores usando las columnas REALES
      const { data, error } = await this.supabase
        .from('grupos_profesores') // Tabla intermedia correcta
        .select(`
          profesores (
            id,
            nombre,
            apellido,
            email,
            tipo_profesor
          )
        `)
        .eq('grupo_id', estudiante.grupo_id);

      if (error) throw error;

      // 3. Mapear respuesta
      const profesoresLimpios = data
        ?.map((item: any) => item.profesores)
        .filter((p: any) => p !== null) || [];

      return { data: profesoresLimpios, error: null };

    } catch (error) {
      console.error('Error en getProfesoresDeEstudiante:', error);
      return { data: null, error };
    }
  }
}