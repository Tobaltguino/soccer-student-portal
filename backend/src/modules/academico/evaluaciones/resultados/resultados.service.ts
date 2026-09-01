import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { SesionesService } from '../sesiones/sesiones.service';
import { RangosService } from '../rangos/rangos.service';
import { CrearResultadoDto } from './dto/crear-resultado.dto';
import { ActualizarResultadoDto } from './dto/actualizar-resultado.dto';
import type { ResultadoRow, ResultadoConRango, ResultadoConDetalle } from './interfaces/resultado.interface';
import { lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';
import { ExcelService } from '../../../../shared/services/excel.service';

@Injectable()
export class ResultadosService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sesionesService: SesionesService,
    private readonly rangosService: RangosService,
    private readonly excelService: ExcelService, // 🔥 INYECTAR EXCEL SERVICE
  ) {}

  async crear(
    dto: CrearResultadoDto,
    gruposPermitidos: number[] | null = null,
  ): Promise<ResultadoConRango> {
    // Valida acceso a la sesión (y por lo tanto al grupo) antes de crear el resultado
    await this.sesionesService.buscarPorId(dto.sesionId, gruposPermitidos);

    const { data, error } = await this.supabase.client
      .from('evaluaciones_resultados')
      .insert({
        sesion_id: dto.sesionId,
        estudiante_id: dto.estudianteId,
        valor_numerico: dto.valorNumerico,
        observacion: dto.observacion ?? null,
      })
      .select()
      .single<ResultadoRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear el resultado',
        'La sesión o el estudiante indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el resultado creado');
    }

    return this.enriquecerConDetalle(data);
  }

  async listarPorSesion(
    sesionId: string,
    gruposPermitidos: number[] | null = null,
  ): Promise<ResultadoConRango[]> {
    await this.sesionesService.buscarPorId(sesionId, gruposPermitidos);

    const { data, error } = await this.supabase.client
      .from('evaluaciones_resultados')
      .select('*')
      .eq('sesion_id', sesionId);

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar los resultados: ${error.message}`);
    }

    const resultados = (data ?? []) as ResultadoRow[];
    return Promise.all(resultados.map((r) => this.enriquecerConDetalle(r)));
  }

  async listarPorEstudiante(
    estudianteId: string,
    gruposPermitidos: number[] | null = null,
  ): Promise<ResultadoConRango[]> {
    let query = this.supabase.client
      .from('evaluaciones_resultados')
      .select('*, evaluaciones_sesiones!inner(grupo_id)')
      .eq('estudiante_id', estudianteId)
      .order('created_at', { ascending: false });

    if (gruposPermitidos !== null) {
      query = query.in('evaluaciones_sesiones.grupo_id', gruposPermitidos);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar los resultados: ${error.message}`);
    }

    const resultados = (data ?? []).map(({ evaluaciones_sesiones, ...resto }: any) => resto) as ResultadoRow[];
    return Promise.all(resultados.map((r) => this.enriquecerConDetalle(r)));
  }

  async listarPorEstudianteFinalizados(estudianteId: string): Promise<ResultadoConDetalle[]> {
    const { data, error } = await this.supabase.client
      .from('evaluaciones_resultados')
      .select('*, evaluaciones_sesiones!inner(estado)')
      .eq('estudiante_id', estudianteId)
      .eq('evaluaciones_sesiones.estado', 'FINALIZADA')
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar los resultados: ${error.message}`);
    }

    const resultados = (data ?? []).map(
      ({ evaluaciones_sesiones, ...resto }: any) => resto,
    ) as ResultadoRow[];

    return Promise.all(resultados.map((r) => this.enriquecerConDetalle(r)));
  }

  async actualizar(
    id: number,
    dto: ActualizarResultadoDto,
    gruposPermitidos: number[] | null = null,
  ): Promise<ResultadoConRango> {
    await this.verificarAccesoResultado(id, gruposPermitidos);

    const { data, error } = await this.supabase.client
      .from('evaluaciones_resultados')
      .update({
        ...(dto.valorNumerico !== undefined && { valor_numerico: dto.valorNumerico }),
        ...(dto.observacion !== undefined && { observacion: dto.observacion }),
      })
      .eq('id', id)
      .select()
      .single<ResultadoRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo actualizar el resultado: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Resultado no encontrado');
    }

    return this.enriquecerConDetalle(data);
  }

  async eliminar(id: number, gruposPermitidos: number[] | null = null): Promise<void> {
    await this.verificarAccesoResultado(id, gruposPermitidos);

    const { error } = await this.supabase.client
      .from('evaluaciones_resultados')
      .delete()
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar el resultado: ${error.message}`);
    }
  }

  /**
   * Verifica que el resultado exista y que el usuario tenga acceso al grupo
   * de la sesión a la que pertenece.
   */
  private async verificarAccesoResultado(
    id: number,
    gruposPermitidos: number[] | null,
  ): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('evaluaciones_resultados')
      .select('sesion_id')
      .eq('id', id)
      .single<{ sesion_id: string }>();

    if (error || !data) {
      throw new NotFoundException('Resultado no encontrado');
    }

    // buscarPorId de sesiones ya valida el alcance y lanza NotFoundException si no corresponde
    await this.sesionesService.buscarPorId(data.sesion_id, gruposPermitidos);
  }

  private async enriquecerConDetalle(resultado: ResultadoRow): Promise<ResultadoConDetalle> {
    const sesion = await this.sesionesService.buscarPorId(resultado.sesion_id);

    const { data: tipoEvaluacion } = await this.supabase.client
      .from('tipo_evaluacion')
      .select('nombre, unidad_medida, descripcion')
      .eq('id', sesion.tipo_evaluacion_id)
      .single<{ nombre: string; unidad_medida: string; descripcion: string | null }>();

    const { data: perfil } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('fecha_nacimiento')
      .eq('id_usuario', resultado.estudiante_id)
      .maybeSingle<{ fecha_nacimiento: string | null }>();

    let rango: { nombreEtiqueta: string; colorSugerido: string | null } | null = null;
    let edadEvaluacion: number | null = null;

    if (perfil?.fecha_nacimiento) {
      edadEvaluacion = this.calcularEdad(perfil.fecha_nacimiento);

      const rangoEncontrado = await this.rangosService.encontrarRango(
        sesion.tipo_evaluacion_id,
        edadEvaluacion,
        resultado.valor_numerico,
      );
      rango = rangoEncontrado
        ? { nombreEtiqueta: rangoEncontrado.nombre_etiqueta, colorSugerido: rangoEncontrado.color_sugerido }
        : null;
    }

    return {
      ...resultado,
      rango,
      edadEvaluacion,
      evaluacion: {
        nombre: tipoEvaluacion?.nombre ?? 'Desconocido',
        unidadMedida: tipoEvaluacion?.unidad_medida ?? '',
        descripcion: tipoEvaluacion?.descripcion ?? null,
        fecha: sesion.fecha,
      },
    };
  }

  private calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }

    return edad;
  }

  // 🔥 MÉTODO CORREGIDO PARA EXPORTAR EXCEL
  async generarExcelPorSesion(sesionId: string, gruposPermitidos: number[] | null = null): Promise<Buffer> {
    // 1. Validamos acceso a la sesión (lanza error si no existe o no tiene permisos)
    await this.sesionesService.buscarPorId(sesionId, gruposPermitidos);

    // 2. Obtenemos los resultados planos de la base de datos para esa sesión
    const { data, error } = await this.supabase.client
      .from('evaluaciones_resultados')
      .select('*')
      .eq('sesion_id', sesionId);

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar los resultados: ${error.message}`);
    }

    const resultadosPlanos = (data ?? []) as ResultadoRow[];

    if (resultadosPlanos.length === 0) {
      throw new BadRequestException('No hay resultados registrados en esta sesión para exportar.');
    }

    // 3. ENRIQUECEMOS cada resultado usando tu propio método privado para obtener edad, rangos y nombres
    const resultadosEnriquecidos = await Promise.all(
      resultadosPlanos.map((r) => this.enriquecerConDetalle(r))
    );

    // 4. Extraemos los IDs de los estudiantes y buscamos sus nombres reales y RUTs
    const idsEstudiantes = resultadosEnriquecidos.map((r) => r.estudiante_id);
    const { data: perfiles } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('id_usuario, nombre, apellido, rut')
      .in('id_usuario', idsEstudiantes);

    const mapaPerfiles = new Map((perfiles || []).map((p) => [p.id_usuario, p]));

    // 5. Tomamos la información de la evaluación del primer elemento enriquecido
    const infoEvaluacion = resultadosEnriquecidos[0].evaluacion;

    // 6. Mapeamos los datos para que el Excel quede impecable
    const datosMapeados = resultadosEnriquecidos.map((r) => {
      const perfil = mapaPerfiles.get(r.estudiante_id);
      return {
        rut: perfil?.rut || 'Sin RUT',
        nombreCompleto: `${perfil?.nombre || ''} ${perfil?.apellido || ''}`.trim() || '-',
        edad: r.edadEvaluacion ?? 'N/A',
        resultado: `${r.valor_numerico} ${infoEvaluacion.unidadMedida}`.trim(),
        rango: r.rango?.nombreEtiqueta || 'Sin rango',
        observacion: r.observacion || '-',
      };
    });

    // 7. Definimos las columnas
    const columnas = [
      { header: 'RUT', key: 'rut', width: 15 },
      { header: 'Nombre Alumno', key: 'nombreCompleto', width: 30 },
      { header: 'Edad', key: 'edad', width: 10 },
      { header: 'Resultado', key: 'resultado', width: 15 },
      { header: 'Rango Alcanzado', key: 'rango', width: 25 },
      { header: 'Observación', key: 'observacion', width: 40 },
    ];

    const nombreHoja = (infoEvaluacion.nombre || 'Resultados').substring(0, 31);

    try {
      return await this.excelService.generarExcel(nombreHoja, columnas, datosMapeados);
    } catch (error) {
      throw new InternalServerErrorException('Error al generar el archivo Excel de resultados');
    }
  }
}