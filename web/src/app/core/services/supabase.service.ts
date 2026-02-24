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
      // 1. Buscamos el email Y el estado activo
      const { data: userData, error: dbError } = await this.supabase
        .from(tabla)
        .select('email, activo')
        .eq('rut', rutInput.trim())
        .maybeSingle();

      if (userData?.email) {
        // 2. 🛡️ VERIFICACIÓN CLAVE: Si la cuenta está inactiva, lanzamos error antes del Auth
        if (userData.activo === false) {
          return { 
            data: null, 
            error: { message: 'Tu cuenta se encuentra desactivada. Contacta al administrador.' }, 
            role: null 
          };
        }

        // 3. Intentamos loguear con el email encontrado
        const authResponse = await this.supabase.auth.signInWithPassword({ 
          email: userData.email, 
          password 
        });

        if (authResponse.error) {
          // ✅ AQUÍ INTERCEPTAMOS EL ERROR DE SUPABASE
          let mensajeError = authResponse.error.message;
          
          if (mensajeError === 'Invalid login credentials') {
            mensajeError = 'Contraseña incorrecta.';
          }

          return { 
            data: null, 
            error: { message: mensajeError }, 
            role: null 
          };
        }

        // ✅ ÉXITO: Usuario existe, está activo y la contraseña es correcta
        return { 
            data: authResponse.data, 
            error: null, 
            role: tabla 
        };
      }
    }
    
    return { 
        data: null, 
        error: { message: `El RUT ${rutInput} no está registrado en ProFutbol.` },
        role: null
    };
  }

  async resetPasswordPorRut(rutInput: string) {
    const tablas = ['admins', 'estudiantes', 'profesores', 'kinesiologos', 'nutricionistas'];
    
    for (const tabla of tablas) {
      // 1. Buscamos el email asociado a ese RUT
      const { data } = await this.supabase
        .from(tabla)
        .select('email, activo')
        .eq('rut', rutInput.trim())
        .maybeSingle();

      if (data?.email) {
        // 2. Verificamos que la cuenta no esté desactivada
        if (data.activo === false) {
           return { error: { message: 'Tu cuenta se encuentra desactivada. Contacta al administrador.' } };
        }
        
        // 3. Enviamos el correo de recuperación al email encontrado
        return await this.supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: window.location.origin + '/update-password' 
        });
      }
    }
    
    // Si termina el ciclo y no encontró nada:
    return { error: { message: `El RUT ${rutInput} no está registrado en ProFutbol.` } };
  }

  // Actualizar la contraseña del usuario (se usa después del reset)
  async updatePassword(newPassword: string) {
    return await this.supabase.auth.updateUser({
      password: newPassword
    });
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
    // Llamamos a la función que acabas de subir (create-user)
    const { data, error } = await this.supabase.functions.invoke('create-user', {
      body: { 
        email, 
        password, 
        datosPersonales, 
        tabla,
        role: this.mapTablaToRole(tabla) 
      }
    });

    // Si hubo un error de red
    if (error) return { data: null, error };

    // Si la función nos devuelve un error (ej: "email ya existe")
    if (data.error) return { data: null, error: data.error };

    // ¡Éxito!
    return { data: data.data, error: null };
  }

  // --- EDITAR / ELIMINAR ---

  async updateUsuario(tabla: string, id: string, datos: any, email: string) {
    // ✅ 1. LIMPIEZA DE SEGURIDAD
    if (tabla !== 'estudiantes') {
      delete datos.fecha_nacimiento;
      delete datos.grupo_id;
    }

    // 🚀 ESTA ES LA LÍNEA MÁGICA QUE FALTABA:
    // Obligamos a que el email también se guarde en la tabla visible (estudiantes/profesores)
    if (email) {
      datos.email = email;
    }

    // ✅ 2. ACTUALIZAR DATOS PÚBLICOS (Nombre, RUT, activo, y AHORA EL EMAIL)
    const { data: updateData, error: dbError } = await this.supabase
      .from(tabla)
      .update(datos)
      .eq('id', id);

    if (dbError) {
      console.error("Error al actualizar datos:", dbError);
      throw dbError; 
    }

    // ✅ 3. ACTUALIZAR EL CORREO EN AUTH (Acceso real)
    if (email) {
      const { error: authError } = await this.supabase.rpc('admin_actualizar_email_auth', {
        usuario_id: id,
        nuevo_email: email
      });

      if (authError) {
        console.error("Error al actualizar el correo en Auth:", authError);
        throw new Error("Se actualizaron los datos, pero el sistema bloqueó el cambio de correo.");
      }
    }

    return { error: null };
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
      .select('id, nombre, apellido, grupo_id, rut, foto_url') // ✅ Campos agregados
      .eq('grupo_id', grupoId)
      .eq('activo', true) 
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
  // Obtener rangos de un test específico
  async getRangosPorTipo(tipoId: number) {
    return await this.supabase
      .from('evaluacion_rangos')
      .select('*')
      .eq('tipo_evaluacion_id', tipoId)
      .order('edad_min', { ascending: true })   // ✅ Ordena por edad inicial
      .order('valor_min', { ascending: true }); // ✅ Luego por valor
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
      const { data: estudiante } = await this.supabase
        .from('estudiantes')
        .select('fecha_nacimiento')
        .eq('id', uid)
        .single();

      const fechaNac = estudiante?.fecha_nacimiento;

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
              descripcion,
              evaluacion_rangos (*) 
            )
          )
        `)
        .eq('estudiante_id', uid);

      if (fechaDesde) query = query.gte('evaluaciones_sesiones.fecha', fechaDesde);

      const { data, error } = await query;
      if (error) throw error;

      const dataFormateada = data?.map(res => {
        const valor = res.valor_numerico;
        const fechaPrueba = res.evaluaciones_sesiones?.fecha;
        const rangos = res.evaluaciones_sesiones?.tipo_evaluacion?.evaluacion_rangos || [];
        
        let edadAlMomento = 0;
        if (fechaNac && fechaPrueba) {
           const nac = new Date(fechaNac + 'T00:00:00');
           const evalDate = new Date(fechaPrueba + 'T00:00:00');
           edadAlMomento = evalDate.getFullYear() - nac.getFullYear();
           const m = evalDate.getMonth() - nac.getMonth();
           if (m < 0 || (m === 0 && evalDate.getDate() < nac.getDate())) edadAlMomento--;
        }

        // ✅ AHORA BUSCAMOS QUE LA EDAD ESTÉ ENTRE EL MÍNIMO Y MÁXIMO
        const rangoEncontrado = rangos.find((r: any) => 
          edadAlMomento >= r.edad_min && 
          edadAlMomento <= r.edad_max && 
          valor >= r.valor_min && 
          valor <= r.valor_max
        );

        let nivelFinal = 'Sin Rango';
        let colorFinal = '#64748b';

        if (edadAlMomento === 0) {
            nivelFinal = 'Falta Edad'; 
        } else if (rangoEncontrado) {
            nivelFinal = rangoEncontrado.nombre_etiqueta;
            colorFinal = rangoEncontrado.color_sugerido;
        }

        return {
          id: res.id,
          resultado: valor,
          observacion: res.observacion,
          fecha: fechaPrueba,
          created_at: res.created_at,
          test_nombre: res.evaluaciones_sesiones?.tipo_evaluacion?.nombre,
          test_descripcion: res.evaluaciones_sesiones?.tipo_evaluacion?.descripcion,
          unidad: res.evaluaciones_sesiones?.tipo_evaluacion?.unidad_medida,
          edad_evaluacion: edadAlMomento, 
          nivel: nivelFinal, 
          color: colorFinal  
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

      // 2. Buscar los profesores agregando foto_url
      const { data, error } = await this.supabase
        .from('grupos_profesores')
        .select(`
          profesores (
            id,
            nombre,
            apellido,
            email,
            tipo_profesor,
            foto_url
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

  // ==========================================
  // 8. GESTIÓN DE ARCHIVOS (FOTOS)
  // ==========================================

  /**
   * Sube una foto al bucket 'avatars' y retorna la URL pública.
   * @param archivo El archivo File seleccionado por el usuario.
   * @param carpeta Nombre del bucket (por defecto 'avatars').
   */
  async subirFoto(archivo: File, carpeta: string = 'avatars'): Promise<string | null> {
    try {
      // 1. Validar que sea imagen (opcional pero recomendado)
      if (!archivo.type.startsWith('image/')) {
        console.error('El archivo no es una imagen');
        return null;
      }

      // 2. Crear un nombre único: TIMESTAMP_NOMBRE_LIMPIO
      // Ej: 1715629123_foto_perfil.png
      const fileExt = archivo.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
      const filePath = `${fileName}`;

      // 3. Subir el archivo a Supabase Storage
      const { error: uploadError } = await this.supabase.storage
        .from(carpeta)
        .upload(filePath, archivo, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error subiendo imagen:', uploadError.message);
        return null;
      }

      // 4. Obtener la URL pública para guardarla en la BD
      const { data } = this.supabase.storage
        .from(carpeta)
        .getPublicUrl(filePath);

      return data.publicUrl;

    } catch (error) {
      console.error('Error fatal subiendo imagen:', error);
      return null;
    }
  }


  // 1. Obtener los datos del profesor logueado
  async getProfesorPorEmail(email: string) {
    return await this.supabase
      .from('profesores')
      .select('id, nombre, apellido')
      .eq('email', email)
      .maybeSingle();
  }

  // 2. Obtener los grupos asignados a un profesor
  async getGruposDeProfesor(profesorId: string) {
    return await this.supabase
      .from('grupos_profesores')
      .select('grupo_id, grupos(id, nombre)')
      .eq('profesor_id', profesorId);
  }

  // 3. Obtener clases de múltiples grupos desde una fecha específica
  async getClasesPorGrupos(grupoIds: string[], fechaInicio: string) {
    return await this.supabase
      .from('clases')
      .select('*')
      .in('grupo_id', grupoIds)
      .gte('fecha', fechaInicio);
  }

  async getSesionesEvaluacionPorGrupos(grupoIds: string[]) {
    return await this.supabase
      .from('evaluaciones_sesiones') // ✅ Nombre correcto de tu tabla
      .select(`
        id, fecha, estado, grupo_id, tipo_evaluacion_id,
        grupos (nombre),
        tipo_evaluacion (nombre, unidad_medida)
      `)
      .in('grupo_id', grupoIds);
  }

  async getClasesPorGrupo(grupoId: number | string) {
    return await this.supabase
      .from('clases')
      .select('*')
      .eq('grupo_id', grupoId)
      .order('fecha', { ascending: false }) // Las más recientes primero
      .order('hora', { ascending: false });
  }

  // ==========================================
  // GUÍAS DE TRABAJO (MATERIAL DE ESTUDIO)
  // ==========================================

  // 1. Obtener todas las guías (Con el nombre del grupo)
  // 1. Obtener TODAS las guías globales
  async getGuias() {
    return await this.supabase
      .from('work_guides')
      .select('*')
      .order('created_at', { ascending: false });
  }

  // 2. Subir el archivo (PDF, Word) al Storage
  async uploadGuiaFile(file: File) {
    const fileExt = file.name.split('.').pop();
    // Creamos un nombre único para evitar que se sobrescriban archivos con el mismo nombre
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const { data, error } = await this.supabase.storage
      .from('guias_trabajo')
      .upload(fileName, file);

    if (error) throw error;

    // Obtener la URL pública para descargar el archivo después
    const { data: urlData } = this.supabase.storage
      .from('guias_trabajo')
      .getPublicUrl(fileName);
      
    return urlData.publicUrl;
  }

  // 3. Guardar los datos de la guía en la tabla
  async createGuia(guia: any) {
    // Al insertar, Supabase tomará automáticamente el auth.uid() para 'creado_por'
    return await this.supabase.from('work_guides').insert(guia);
  }

  // 4. Eliminar guía (Solo admin, validado por RLS)
  async deleteGuia(id: string) {
    return await this.supabase.from('work_guides').delete().eq('id', id);
  }

  // 5. Actualizar guía existente
  async updateGuia(id: string, guia: any) {
    return await this.supabase.from('work_guides').update(guia).eq('id', id);
  }
}