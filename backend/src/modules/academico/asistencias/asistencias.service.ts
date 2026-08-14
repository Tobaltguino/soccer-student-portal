import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { RegistrarAsistenciasLoteDto } from './dto/registrar-asistencias-lotes.dto';
import type { AsistenciaRow } from './interfaces/asistencias.interface';
import { lanzarErrorSupabaseConFk } from '../../../shared/utils/supabase-error.util';

@Injectable()
export class AsistenciasService {
  constructor(private readonly supabase: SupabaseService) {}

  async registrarLote(
    claseId: number,
    dto: RegistrarAsistenciasLoteDto,
    gruposPermitidos: number[] | null = null,
  ): Promise<AsistenciaRow[]> {
    await this.verificarAccesoClase(claseId, gruposPermitidos);

    const filas = dto.asistencias.map((a) => ({
      clase_id: claseId,
      estudiante_id: a.estudianteId,
      presente: a.presente,
    }));

    const { data, error } = await this.supabase.client
      .from('asistencias')
      .upsert(filas, { onConflict: 'clase_id,estudiante_id' })
      .select();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo registrar la asistencia',
        'La clase o algún estudiante indicado no existe',
      );
    }

    return (data ?? []) as AsistenciaRow[];
  }

  async listarPorClase(
    claseId: number,
    gruposPermitidos: number[] | null = null,
  ): Promise<AsistenciaRow[]> {
    await this.verificarAccesoClase(claseId, gruposPermitidos);

    const { data, error } = await this.supabase.client
      .from('asistencias')
      .select('*')
      .eq('clase_id', claseId);

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo listar la asistencia: ${error.message}`,
      );
    }

    return data ?? [];
  }

  async listarPorEstudiante(
    estudianteId: string,
    gruposPermitidos: number[] | null = null,
  ): Promise<AsistenciaRow[]> {
    let query = this.supabase.client
      .from('asistencias')
      .select('*, clases!inner(grupo_id)')
      .eq('estudiante_id', estudianteId)
      .order('clase_id', { ascending: false });

    if (gruposPermitidos !== null) {
      query = query.in('clases.grupo_id', gruposPermitidos);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo listar la asistencia del estudiante: ${error.message}`,
      );
    }

    // Quita el campo "clases" que se agregó solo para el filtro, no es parte de AsistenciaRow
    return (data ?? []).map(({ clases, ...resto }: any) => resto);
  }

  /**
   * Verifica que la clase exista y, si hay restricción de alcance,
   * que pertenezca a uno de los grupos permitidos del usuario.
   */
  private async verificarAccesoClase(
    claseId: number,
    gruposPermitidos: number[] | null,
  ): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('clases')
      .select('grupo_id')
      .eq('id', claseId)
      .single<{ grupo_id: number }>();

    if (error || !data) {
      throw new BadRequestException('La clase indicada no existe');
    }

    if (gruposPermitidos !== null && !gruposPermitidos.includes(data.grupo_id)) {
      throw new BadRequestException('La clase indicada no existe');
    }
  }

  /**
   * Genera el reporte mensual consolidado de asistencia por grupo.
   * Calcula el porcentaje de asistencia de cada alumno activo del grupo.
   */
  async reporteMensualConsolidado(
    grupoId: number,
    mes: number,
    anio: number,
  ): Promise<any[]> {
    
    // 1. Obtener los alumnos activos del grupo (uniendo estudiantes con usuarios)
    const { data: alumnos, error: errorAlumnos } = await this.supabase.client
      .from('estudiantes')
      .select(`
        usuario_id,
        usuarios!inner(nombre, apellido, rut, foto_url, activo)
      `)
      .eq('grupo_id', grupoId)
      .eq('usuarios.activo', true);

    if (errorAlumnos) {
      throw new InternalServerErrorException(`Error al obtener estudiantes: ${errorAlumnos.message}`);
    }

    // 2. Obtener las clases de ese grupo en el mes específico
    const mesStr = ('0' + mes).slice(-2);
    const primerDia = `${anio}-${mesStr}-01`;
    const ultimoDiaNum = new Date(anio, mes, 0).getDate();
    const ultimoDia = `${anio}-${mesStr}-${ultimoDiaNum}`;

    const { data: clasesMes, error: errorClases } = await this.supabase.client
      .from('clases')
      .select('id')
      .eq('grupo_id', grupoId)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia);

    if (errorClases) {
      throw new InternalServerErrorException(`Error al obtener clases: ${errorClases.message}`);
    }

    const claseIds = clasesMes?.map(c => c.id) || [];
    const totalClasesEnElMes = claseIds.length;

    // Si no hay clases en el mes, devolvemos a los alumnos con 0%
    if (totalClasesEnElMes === 0) {
      return (alumnos || []).map(est => ({
        estudiante_id: est.usuario_id,
        nombre: (est.usuarios as any).nombre,
        apellido: (est.usuarios as any).apellido,
        rut: (est.usuarios as any).rut,
        foto_url: (est.usuarios as any).foto_url,
        total_clases: 0,
        total_presentes: 0,
        porcentaje: 0,
        resumen: '0 / 0'
      }));
    }

    // 3. Obtener todas las asistencias marcadas para esas clases
    const { data: asistencias, error: errorAsistencias } = await this.supabase.client
      .from('asistencias')
      .select('estudiante_id, presente')
      .in('clase_id', claseIds);

    if (errorAsistencias) {
      throw new InternalServerErrorException(`Error al obtener asistencias: ${errorAsistencias.message}`);
    }

    // 4. Cruzar datos y calcular porcentajes
    const reporte = (alumnos || []).map(est => {
      const registrosAlumno = asistencias?.filter(a => a.estudiante_id === est.usuario_id) || [];
      
      // Contamos cuántas veces asistió realmente
      const totalPresentes = registrosAlumno.filter(a => a.presente === true).length;
      const porcentaje = Math.round((totalPresentes / totalClasesEnElMes) * 100);

      return {
        estudiante_id: est.usuario_id,
        nombre: (est.usuarios as any).nombre,
        apellido: (est.usuarios as any).apellido,
        rut: (est.usuarios as any).rut,
        foto_url: (est.usuarios as any).foto_url,
        total_clases: totalClasesEnElMes,
        total_presentes: totalPresentes,
        porcentaje,
        resumen: `${totalPresentes} / ${totalClasesEnElMes}`
      };
    });

    return reporte;
  }

  /**
   * Obtiene el detalle día a día de las asistencias de un alumno en un mes específico.
   */
  async detalleMensualEstudiante(
    estudianteId: string,
    mes: number,
    anio: number,
  ): Promise<any[]> {
    
    const mesStr = ('0' + mes).slice(-2);
    const primerDia = `${anio}-${mesStr}-01`;
    const ultimoDiaNum = new Date(anio, mes, 0).getDate();
    const ultimoDia = `${anio}-${mesStr}-${ultimoDiaNum}`;

    const { data, error } = await this.supabase.client
      .from('asistencias')
      .select(`
        presente,
        clases!inner(fecha, hora, lugar)
      `)
      .eq('estudiante_id', estudianteId)
      .gte('clases.fecha', primerDia)
      .lte('clases.fecha', ultimoDia)
      .order('clases(fecha)', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(`Error al obtener detalle del estudiante: ${error.message}`);
    }

    // Aplanamos un poco la respuesta para el frontend
    return (data || []).map((reg: any) => ({
      presente: reg.presente,
      fecha: reg.clases.fecha,
      hora: reg.clases.hora,
      lugar: reg.clases.lugar
    }));
  }
}