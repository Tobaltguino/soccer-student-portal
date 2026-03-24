import { Injectable } from '@angular/core';
import { SupabaseCoreService } from './supabase-core.service';

@Injectable({
  providedIn: 'root'
})
export class AcademyService {

  constructor(private supabaseCore: SupabaseCoreService) {}

  // Getter privado para que el código quede igual de limpio que antes
  private get supabase() {
    return this.supabaseCore.client;
  }

  // ==========================================
  // 1. DASHBOARD GENERAL (Estadísticas Admin)
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

  // ==========================================
  // 2. MAESTROS (Grupos y Posiciones)
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

  async getPosiciones() {
    return await this.supabase
      .from('posiciones')
      .select('*')
      .order('orden', { ascending: true });
  }

  // ==========================================
  // 3. GESTIÓN DE USUARIOS (Lectura base)
  // ==========================================

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

  async getEstudiantesBasico() {
    return await this.supabase
      .from('estudiantes')
      .select('id, nombre, apellido')
      .order('apellido', { ascending: true });
  }

  // Obtiene solo los estudiantes activos (ideal para dashboards y contadores)
  async getEstudiantesActivos() {
    return await this.supabase
      .from('estudiantes')
      .select('id, nombre, apellido, fecha_nacimiento, activo')
      .eq('activo', true);
  }

  // ==========================================
  // 4. RELACIONES Y ASIGNACIONES
  // ==========================================

  async actualizarPosicionesEstudiante(estudianteId: string, posicionesIds: number[]) {
    await this.supabase.from('estudiantes_posiciones').delete().eq('estudiante_id', estudianteId);
    
    if (posicionesIds && posicionesIds.length > 0) {
      const inserts = posicionesIds.map(pid => ({ estudiante_id: estudianteId, posicion_id: pid }));
      return await this.supabase.from('estudiantes_posiciones').insert(inserts);
    }
    return { error: null };
  }

  async actualizarGruposProfesor(profesorId: string, gruposIds: number[]) {
    await this.supabase.from('grupos_profesores').delete().eq('profesor_id', profesorId);

    if (gruposIds && gruposIds.length > 0) {
      const inserts = gruposIds.map(gid => ({ profesor_id: profesorId, grupo_id: gid }));
      return await this.supabase.from('grupos_profesores').insert(inserts);
    }
    return { error: null };
  }

  // ==========================================
  // 5. CONSULTAS DE PROFESORES Y GRUPOS
  // ==========================================

  // Unificada: Obtiene el profesor por email devolviendo los datos clave
  async getProfesorByEmail(email: string) {
    return await this.supabase
      .from('profesores')
      .select('id, nombre, apellido')
      .eq('email', email)
      .maybeSingle();
  }

  async getGruposDeProfesor(profesorId: string) {
    return await this.supabase
      .from('grupos_profesores')
      .select('grupo_id, grupos(id, nombre)')
      .eq('profesor_id', profesorId);
  }

  async getProfesoresDeEstudiante(uid: string) {
    try {
      const { data: estudiante, error: errEst } = await this.supabase
        .from('estudiantes')
        .select('grupo_id')
        .eq('id', uid)
        .single();

      if (errEst || !estudiante?.grupo_id) return { data: [], error: null };

      const { data, error } = await this.supabase
        .from('grupos_profesores')
        .select('profesores (id, nombre, apellido, email, tipo_profesor, foto_url)')
        .eq('grupo_id', estudiante.grupo_id);

      if (error) throw error;

      const profesoresLimpios = data?.map((item: any) => item.profesores).filter((p: any) => p !== null) || [];
      return { data: profesoresLimpios, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // 💡 OPTIMIZACIÓN: Función genérica que reemplaza a getEstudiantesDeProfesor y getEstudiantesDeKine
  async getEstudiantesPorEncargado(tablaIntermedia: string, columnaId: string, encargadoId: string) {
    const { data: grupos, error: errGrupos } = await this.supabase
      .from(tablaIntermedia)
      .select('grupo_id')
      .eq(columnaId, encargadoId);

    if (errGrupos || !grupos || grupos.length === 0) return { data: [], error: errGrupos };

    const gruposIds = grupos.map(g => g.grupo_id);

    return await this.supabase
      .from('estudiantes')
      .select('*, grupos ( id, nombre ), estudiantes_posiciones (posicion_id, posiciones ( nombre, orden ))')
      .in('grupo_id', gruposIds)
      .eq('activo', true) 
      .order('apellido', { ascending: true });
  }

  async getAlumnosPorGrupo(grupoId: number | string) {
    return await this.supabase
      .from('estudiantes')
      .select('id, nombre, apellido, grupo_id, rut, foto_url')
      .eq('grupo_id', grupoId)
      .eq('activo', true) 
      .order('apellido', { ascending: true });
  }

  // ==========================================
  // 6. GESTIÓN DE CLASES (CRUD)
  // ==========================================

  async getClases() {
    return await this.supabase
      .from('clases')
      .select('*, grupos (id, nombre)')
      .order('fecha', { ascending: false })
      .order('hora', { ascending: true });
  }

  async getClasesPorGrupo(grupoId: number | string) {
    return await this.supabase
      .from('clases')
      .select('*')
      .eq('grupo_id', grupoId)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });
  }

  // Obtiene clases futuras o de hoy para varios grupos a la vez (Dashboard)
  async getClasesPorGruposYFecha(grupoIds: number[], fechaDesde: string) {
    return await this.supabase
      .from('clases')
      .select('*, grupos(nombre)')
      .in('grupo_id', grupoIds)
      .gte('fecha', fechaDesde)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });
  }

  // Obtiene clases de una lista de grupos a partir de una fecha (Calendario)
  async getClasesPorGrupos(grupoIds: (number | string)[], fechaInicio: string) {
    return await this.supabase
      .from('clases')
      .select('*')
      .in('grupo_id', grupoIds)
      .gte('fecha', fechaInicio)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });
  }

  // Unificamos crear/actualizar para que el admin y profesor usen la misma
  async crearClase(payload: any) {
    return await this.supabase.from('clases').insert(payload).select();
  }
  async createClase(datos: any) { return this.crearClase(datos); } // Alias para retrocompatibilidad admin

  async actualizarClase(id: number | string, payload: any) {
    return await this.supabase.from('clases').update(payload).eq('id', id).select();
  }
  async updateClase(id: number, datos: any) { return this.actualizarClase(id, datos); } // Alias

  async deleteClase(id: number) {
    return await this.supabase.from('clases').delete().eq('id', id);
  }

  // ==========================================
  // 7. ASISTENCIAS (CRUD y Estadísticas)
  // ==========================================

  // Unificada: Guarda o actualiza la asistencia de forma masiva
  async guardarAsistenciaMasiva(registros: any[]) {
    return await this.supabase
      .from('asistencias')
      .upsert(registros, { onConflict: 'clase_id, estudiante_id' });
  }
  async saveAsistencia(registros: any[]) { return this.guardarAsistenciaMasiva(registros); } // Alias

  async getAsistenciaPorClase(claseId: number | string) {
    return await this.supabase
      .from('asistencias')
      .select('estudiante_id, presente')
      .eq('clase_id', claseId);
  }

  // Unificada: Obtiene todas las asistencias de un grupo en un rango de fechas
  async getAsistenciasPorGrupoYFechas(grupoId: number | string, fechaInicio: string, fechaFin: string) {
    return await this.supabase
      .from('asistencias')
      .select('estudiante_id, presente, clases!inner(fecha)')
      .eq('clases.grupo_id', grupoId)
      .gte('clases.fecha', fechaInicio)
      .lte('clases.fecha', fechaFin);
  }
  // Alias de retrocompatibilidad
  async getAsistenciasPorRangoFecha(gId: number, fIn: string, fFin: string) { return this.getAsistenciasPorGrupoYFechas(gId, fIn, fFin); }

  // Obtiene el historial detallado de un alumno específico
  async getHistorialAsistenciaAlumno(estudianteId: string, fechaInicio: string, fechaFin: string) {
    return await this.supabase
      .from('asistencias')
      .select('presente, clases!inner(fecha, hora, lugar)')
      .eq('estudiante_id', estudianteId)
      .gte('clases.fecha', fechaInicio)
      .lte('clases.fecha', fechaFin)
      .order('clases(fecha)', { ascending: false });
  }

  // Lógica pesada que usa el admin para los reportes de estudiantes
  async getEstudiantesConEstadisticas(grupoId: number, fechaInicio: string, fechaFin: string) {
    const { data: alumnos, error: errAlumnos } = await this.getAlumnosPorGrupo(grupoId);
    if (errAlumnos) return { data: null, error: errAlumnos };

    const { data: asistencias, error: errAsis } = await this.getAsistenciasPorGrupoYFechas(grupoId, fechaInicio, fechaFin);
    if (errAsis) return { data: null, error: errAsis };

    const procesados = (alumnos || []).map((est: any) => {
      const registrosAlumno = asistencias?.filter((a: any) => a.estudiante_id === est.id) || [];
      const totalClases = registrosAlumno.length;
      const totalPresentes = registrosAlumno.filter((a: any) => a.presente).length;
      const porcentaje = totalClases > 0 ? Math.round((totalPresentes / totalClases) * 100) : 0;

      return { 
        ...est, 
        porcentaje, 
        resumen: `${totalPresentes} / ${totalClases}` 
      };
    });

    return { data: procesados, error: null };
  }

  // ==========================================
  // 8. CONSULTAS ESTUDIANTES (Dashboard y vistas)
  // ==========================================

  // Clases y asistencias para la vista del propio alumno
  async getClasesAlumno(uid: string, fechaDesde?: string) {
    try {
      const { data: estudiante, error: errEst } = await this.supabase.from('estudiantes').select('grupo_id').eq('id', uid).single();
      if (errEst || !estudiante?.grupo_id) return { data: [], error: errEst };

      let query = this.supabase
        .from('clases')
        .select('*, grupos ( nombre ), asistencias!left ( presente )')
        .eq('grupo_id', estudiante.grupo_id)
        .eq('asistencias.estudiante_id', uid); 

      if (fechaDesde) query = query.gte('fecha', fechaDesde);

      const { data, error } = await query.order('fecha', { ascending: false });
      if (error) throw error;

      const clasesFormateadas = data?.map(clase => ({
        ...clase,
        presente: clase.asistencias && clase.asistencias.length > 0 ? clase.asistencias[0].presente : null
      }));

      return { data: clasesFormateadas, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Obtiene estudiantes activos filtrados por una lista de grupos
  async getEstudiantesActivosPorGrupos(grupoIds: number[]) {
    return await this.supabase
      .from('estudiantes')
      .select('*, grupos(nombre)')
      .in('grupo_id', grupoIds)
      .eq('activo', true);
  }

  // Obtiene TODOS los estudiantes (activos e inactivos) de una lista de grupos
  async getTodosEstudiantesPorGrupos(grupoIds: number[]) {
    return await this.supabase
      .from('estudiantes')
      .select('*, grupos(nombre), estudiantes_posiciones(posicion_id)')
      .in('grupo_id', grupoIds);
  }

}