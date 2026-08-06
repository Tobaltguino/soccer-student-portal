import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { SesionesService } from '../sesiones/sesiones.service';
import { RangosService } from '../rangos/rangos.service';
import { CrearResultadoDto } from './dto/crear-resultado.dto';
import { ActualizarResultadoDto } from './dto/actualizar-resultado.dto';
import type { ResultadoRow, ResultadoConRango, ResultadoConDetalle } from './interfaces/resultado.interface';
import { lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';

@Injectable()
export class ResultadosService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sesionesService: SesionesService,
    private readonly rangosService: RangosService,
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
      .select('nombre, unidad_medida')
      .eq('id', sesion.tipo_evaluacion_id)
      .single<{ nombre: string; unidad_medida: string }>();

    const { data: perfil } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('fecha_nacimiento')
      .eq('id_usuario', resultado.estudiante_id)
      .maybeSingle<{ fecha_nacimiento: string | null }>();

    let rango: { nombreEtiqueta: string; colorSugerido: string | null } | null = null;

    if (perfil?.fecha_nacimiento) {
      const edad = this.calcularEdad(perfil.fecha_nacimiento);
      const rangoEncontrado = await this.rangosService.encontrarRango(
        sesion.tipo_evaluacion_id,
        edad,
        resultado.valor_numerico,
      );
      rango = rangoEncontrado
        ? { nombreEtiqueta: rangoEncontrado.nombre_etiqueta, colorSugerido: rangoEncontrado.color_sugerido }
        : null;
    }

    return {
      ...resultado,
      rango,
      evaluacion: {
        nombre: tipoEvaluacion?.nombre ?? 'Desconocido',
        unidadMedida: tipoEvaluacion?.unidad_medida ?? '',
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
}