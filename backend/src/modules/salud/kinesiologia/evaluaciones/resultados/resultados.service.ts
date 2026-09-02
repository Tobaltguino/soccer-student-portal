import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../../core/supabase/supabase.service';
import { SesionesService } from '../sesiones/sesiones.service';
// AJUSTA esta ruta a la ubicación real de tu EstudiantesService en el proyecto
import { EstudiantesService } from '../../../../../modules/usuarios/estudiantes/estudiantes.service';
import { CrearResultadoDto } from './dto/crear-resultado.dto';
import { ActualizarResultadoDto } from './dto/actualizar-resultado.dto';
import type { KineResultadoRow, KineResultadoConDetalle } from './interfaces/resultado.interface';
import type { CriterioPrioridad } from '../subevaluaciones/interfaces/subevaluacion.interface';
import { lanzarErrorSupabaseConFk } from '../../../../../shared/utils/supabase-error.util';

import { ExcelService } from '../../../../../shared/services/excel.service';

type SubevaluacionInfo = {
  nombre: string;
  evalua_lados: boolean;
  prioridad: CriterioPrioridad | null;
};

@Injectable()
export class ResultadosService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sesionesService: SesionesService,
    private readonly estudiantesService: EstudiantesService,
    private readonly excelService: ExcelService,
  ) {}

  async crear(
    dto: CrearResultadoDto,
    gruposPermitidos: number[] | null,
  ): Promise<KineResultadoConDetalle> {
    // Valida acceso a la sesión (y por lo tanto al grupo) y obtiene sus datos
    const sesion = await this.sesionesService.buscarPorId(dto.sesionId, gruposPermitidos);

    // Valida que el estudiante exista y pertenezca al mismo grupo que la sesión
    const estudiante = await this.estudiantesService.buscarPorId(dto.estudianteId);

    if (estudiante.grupo_id !== sesion.grupo_id) {
      throw new BadRequestException(
        'El estudiante indicado no pertenece al grupo de esta sesión',
      );
    }

    // Valida que el resultado calce con si la subevaluación mide lados o no
    const subevaluacion = await this.obtenerSubevaluacion(dto.subevaluacionId);

    if (subevaluacion.evalua_lados) {
      if (!dto.resultadoIzquierdo || !dto.resultadoDerecho) {
        throw new BadRequestException(
          'Esta subevaluación requiere resultado izquierdo y derecho',
        );
      }
    } else {
      if (!dto.resultadoUnico) {
        throw new BadRequestException('Esta subevaluación requiere un resultado único');
      }
    }

    const { data, error } = await this.supabase.client
      .from('kine_evaluaciones_resultados')
      .insert({
        sesion_id: dto.sesionId,
        estudiante_id: dto.estudianteId,
        subevaluacion_id: dto.subevaluacionId,
        resultado_unico: dto.resultadoUnico ?? null,
        resultado_izquierdo: dto.resultadoIzquierdo ?? null,
        resultado_derecho: dto.resultadoDerecho ?? null,
        observacion: dto.observacion ?? null,
      })
      .select()
      .single<KineResultadoRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear el resultado',
        'La sesión, el estudiante o la subevaluación indicada no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el resultado creado');
    }

    return this.enriquecerConDetalle(data);
  }

  async listarPorSesion(
    sesionId: string,
    gruposPermitidos: number[] | null,
  ): Promise<KineResultadoConDetalle[]> {
    await this.sesionesService.buscarPorId(sesionId, gruposPermitidos);

    const { data, error } = await this.supabase.client
      .from('kine_evaluaciones_resultados')
      .select('*')
      .eq('sesion_id', sesionId);

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar los resultados: ${error.message}`);
    }

    const resultados = (data ?? []) as KineResultadoRow[];
    const cacheSubevaluaciones = new Map<number, SubevaluacionInfo>();
    return Promise.all(resultados.map((r) => this.enriquecerConDetalle(r, cacheSubevaluaciones)));
  }

  async listarPorEstudianteFinalizados(estudianteId: string): Promise<KineResultadoConDetalle[]> {
    const { data, error } = await this.supabase.client
      .from('kine_evaluaciones_resultados')
      .select('*, kine_evaluaciones_sesiones!inner(estado)')
      .eq('estudiante_id', estudianteId)
      .eq('kine_evaluaciones_sesiones.estado', 'FINALIZADA')
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar los resultados: ${error.message}`);
    }

    const resultados = (data ?? []).map(
      ({ kine_evaluaciones_sesiones, ...resto }: any) => resto,
    ) as KineResultadoRow[];

    const cacheSubevaluaciones = new Map<number, SubevaluacionInfo>();
    return Promise.all(resultados.map((r) => this.enriquecerConDetalle(r, cacheSubevaluaciones)));
  }

  async actualizar(
    id: number,
    dto: ActualizarResultadoDto,
    gruposPermitidos: number[] | null,
  ): Promise<KineResultadoConDetalle> {
    const actual = await this.verificarAccesoResultado(id, gruposPermitidos);

    const { data, error } = await this.supabase.client
      .from('kine_evaluaciones_resultados')
      .update({
        ...(dto.resultadoUnico !== undefined && { resultado_unico: dto.resultadoUnico }),
        ...(dto.resultadoIzquierdo !== undefined && { resultado_izquierdo: dto.resultadoIzquierdo }),
        ...(dto.resultadoDerecho !== undefined && { resultado_derecho: dto.resultadoDerecho }),
        ...(dto.observacion !== undefined && { observacion: dto.observacion }),
      })
      .eq('id', id)
      .select()
      .single<KineResultadoRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo actualizar el resultado: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Resultado no encontrado');
    }

    return this.enriquecerConDetalle(data);
  }

  async eliminar(id: number, gruposPermitidos: number[] | null): Promise<void> {
    await this.verificarAccesoResultado(id, gruposPermitidos);

    const { error } = await this.supabase.client
      .from('kine_evaluaciones_resultados')
      .delete()
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar el resultado: ${error.message}`);
    }
  }

  private async verificarAccesoResultado(
    id: number,
    gruposPermitidos: number[] | null,
  ): Promise<KineResultadoRow> {
    const { data, error } = await this.supabase.client
      .from('kine_evaluaciones_resultados')
      .select('*')
      .eq('id', id)
      .single<KineResultadoRow>();

    if (error || !data) {
      throw new NotFoundException('Resultado no encontrado');
    }

    await this.sesionesService.buscarPorId(data.sesion_id, gruposPermitidos);

    return data;
  }

  private async obtenerSubevaluacion(
    id: number,
    cache?: Map<number, SubevaluacionInfo>,
  ): Promise<SubevaluacionInfo> {
    if (cache?.has(id)) {
      return cache.get(id) as SubevaluacionInfo;
    }

    const { data, error } = await this.supabase.client
      .from('kine_subevaluaciones')
      .select('nombre, evalua_lados, prioridad')
      .eq('id', id)
      .single<SubevaluacionInfo>();

    if (error || !data) {
      throw new BadRequestException('La subevaluación indicada no existe');
    }

    cache?.set(id, data);
    return data;
  }

  /**
   * Determina el puntaje contra el cual se busca el rango.
   * - Si la subevaluación NO evalúa lados: usa resultado_unico.
   * - Si SÍ evalúa lados: usa el MENOR o MAYOR puntaje entre izquierdo y derecho,
   *   según lo configurado en `prioridad` de la subevaluación.
   */
  private calcularPuntajeParaRango(
    subevaluacion: SubevaluacionInfo,
    resultado: KineResultadoRow,
  ): number | null {
    if (subevaluacion.evalua_lados) {
      const candidatos = [resultado.resultado_izquierdo, resultado.resultado_derecho]
        .map((v) => (v !== null ? Number(v) : NaN))
        .filter((v) => !Number.isNaN(v));

      if (candidatos.length === 0) return null;

      return subevaluacion.prioridad === 'MAYOR'
        ? Math.max(...candidatos)
        : Math.min(...candidatos);
    }

    if (resultado.resultado_unico === null) return null;

    const puntaje = Number(resultado.resultado_unico);
    return Number.isNaN(puntaje) ? null : puntaje;
  }

  private async enriquecerConDetalle(
    resultado: KineResultadoRow,
    cacheSubevaluaciones?: Map<number, SubevaluacionInfo>,
  ): Promise<KineResultadoConDetalle> {
    const subevaluacion = await this.obtenerSubevaluacion(
      resultado.subevaluacion_id,
      cacheSubevaluaciones,
    );

    let rango: { etiqueta: string; color: string | null } | null = null;
    const puntajeParaRango = this.calcularPuntajeParaRango(subevaluacion, resultado);

    if (puntajeParaRango !== null) {
      const { data: rangoData } = await this.supabase.client
        .from('kine_evaluacion_rangos')
        .select('etiqueta, color')
        .eq('subevaluacion_id', resultado.subevaluacion_id)
        .eq('puntaje', puntajeParaRango)
        .maybeSingle<{ etiqueta: string; color: string | null }>();

      rango = rangoData ?? null;
    }

    // 🔥 NUEVO: Obtenemos los datos del perfil del alumno
    const { data: perfil } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('nombre, apellido, rut')
      .eq('id_usuario', resultado.estudiante_id)
      .maybeSingle<{ nombre: string; apellido: string; rut: string }>();

    return {
      ...resultado,
      subevaluacion: {
        nombre: subevaluacion.nombre,
        evaluaLados: subevaluacion.evalua_lados,
        prioridad: subevaluacion.prioridad,
      },
      rango,
      // 🔥 NUEVO: Empaquetamos al alumno para el frontend
      alumno: {
        nombre: perfil?.nombre ?? 'Desconocido',
        apellido: perfil?.apellido ?? '',
        rut: perfil?.rut ?? 'Sin RUT',
      },
    };
  }

  // 🔥 MÉTODO DE EXCEL OPTIMIZADO
  async generarExcelPorSesionKine(sesionId: string, gruposPermitidos: number[] | null): Promise<Buffer> {
    // 1. Reutilizamos tu método que ya enriquece los datos y AHORA trae al alumno
    const resultadosEnriquecidos = await this.listarPorSesion(sesionId, gruposPermitidos);

    if (resultadosEnriquecidos.length === 0) {
      throw new BadRequestException('No hay resultados registrados en esta sesión para exportar.');
    }

    // 2. Mapeamos directamente (¡Ya no necesitamos hacer otra consulta a la BD!)
    const datosMapeados = resultadosEnriquecidos.map((r) => {
      return {
        rut: r.alumno.rut,
        nombreCompleto: `${r.alumno.nombre} ${r.alumno.apellido}`.trim() || '-',
        subevaluacion: r.subevaluacion.nombre,
        resultadoUnico: r.resultado_unico !== null ? r.resultado_unico : '-',
        resultadoIzquierdo: r.resultado_izquierdo !== null ? r.resultado_izquierdo : '-',
        resultadoDerecho: r.resultado_derecho !== null ? r.resultado_derecho : '-',
        rango: r.rango?.etiqueta || 'Sin rango', 
        observacion: r.observacion || '-',
      };
    });

    // 3. Definimos las columnas del Excel
    const columnas = [
      { header: 'RUT', key: 'rut', width: 15 },
      { header: 'Nombre Alumno', key: 'nombreCompleto', width: 30 },
      { header: 'Subevaluación', key: 'subevaluacion', width: 30 },
      { header: 'Res. Único', key: 'resultadoUnico', width: 15 },
      { header: 'Res. Izquierdo', key: 'resultadoIzquierdo', width: 15 },
      { header: 'Res. Derecho', key: 'resultadoDerecho', width: 15 },
      { header: 'Rango Alcanzado', key: 'rango', width: 20 },
      { header: 'Observación', key: 'observacion', width: 35 },
    ];

    try {
      return await this.excelService.generarExcel('Resultados Kine', columnas, datosMapeados);
    } catch (error) {
      throw new InternalServerErrorException('Error al generar el archivo Excel de kinesiología');
    }
  }
}