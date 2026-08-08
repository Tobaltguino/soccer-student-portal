import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../../core/supabase/supabase.service';
import { SesionesService } from '../sesiones/sesiones.service';
import { CrearResultadoDto } from './dto/crear-resultado.dto';
import { ActualizarResultadoDto } from './dto/actualizar-resultado.dto';
import type { KineResultadoRow, KineResultadoConDetalle } from './interfaces/resultado.interface';
import { lanzarErrorSupabaseConFk } from '../../../../../shared/utils/supabase-error.util';

@Injectable()
export class ResultadosService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sesionesService: SesionesService,
  ) {}

  async crear(
    dto: CrearResultadoDto,
    gruposPermitidos: number[] | null,
  ): Promise<KineResultadoConDetalle> {
    // Valida acceso a la sesión (y por lo tanto al grupo)
    await this.sesionesService.buscarPorId(dto.sesionId, gruposPermitidos);

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
    return Promise.all(resultados.map((r) => this.enriquecerConDetalle(r)));
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

    return Promise.all(resultados.map((r) => this.enriquecerConDetalle(r)));
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
  ): Promise<{ nombre: string; evalua_lados: boolean }> {
    const { data, error } = await this.supabase.client
      .from('kine_subevaluaciones')
      .select('nombre, evalua_lados')
      .eq('id', id)
      .single<{ nombre: string; evalua_lados: boolean }>();

    if (error || !data) {
      throw new BadRequestException('La subevaluación indicada no existe');
    }

    return data;
  }

  private async enriquecerConDetalle(resultado: KineResultadoRow): Promise<KineResultadoConDetalle> {
    const subevaluacion = await this.obtenerSubevaluacion(resultado.subevaluacion_id);

    let rango: { etiqueta: string; color: string | null } | null = null;

    const valorParaRango = subevaluacion.evalua_lados
      ? null // con lados, no hay un "puntaje único" directo para buscar rango automáticamente
      : resultado.resultado_unico;

    if (valorParaRango !== null) {
      const puntajeNumerico = Number(valorParaRango);
      if (!Number.isNaN(puntajeNumerico)) {
        const { data: rangoData } = await this.supabase.client
          .from('kine_evaluacion_rangos')
          .select('etiqueta, color')
          .eq('subevaluacion_id', resultado.subevaluacion_id)
          .eq('puntaje', puntajeNumerico)
          .maybeSingle<{ etiqueta: string; color: string | null }>();

        rango = rangoData ?? null;
      }
    }

    return {
      ...resultado,
      subevaluacion: {
        nombre: subevaluacion.nombre,
        evaluaLados: subevaluacion.evalua_lados,
      },
      rango,
    };
  }
}