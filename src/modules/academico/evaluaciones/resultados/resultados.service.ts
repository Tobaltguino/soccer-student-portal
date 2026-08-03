import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { SesionesService } from '../sesiones/sesiones.service';
import { RangosService } from '../rangos/rangos.service';
import { CrearResultadoDto } from './dto/crear-resultado.dto';
import { ActualizarResultadoDto } from './dto/actualizar-resultado.dto';
import type { ResultadoRow, ResultadoConRango } from './interfaces/resultado.interface';
import { lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';

@Injectable()
export class ResultadosService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sesionesService: SesionesService,
    private readonly rangosService: RangosService,
  ) {}

  async crear(dto: CrearResultadoDto): Promise<ResultadoConRango> {
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

    return this.enriquecerConRango(data);
  }

  async listarPorSesion(sesionId: string): Promise<ResultadoConRango[]> {
    const { data, error } = await this.supabase.client
      .from('evaluaciones_resultados')
      .select('*')
      .eq('sesion_id', sesionId);

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar los resultados: ${error.message}`);
    }

    const resultados = (data ?? []) as ResultadoRow[];
    return Promise.all(resultados.map((r) => this.enriquecerConRango(r)));
  }

  async listarPorEstudiante(estudianteId: string): Promise<ResultadoConRango[]> {
    const { data, error } = await this.supabase.client
      .from('evaluaciones_resultados')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar los resultados: ${error.message}`);
    }

    const resultados = (data ?? []) as ResultadoRow[];
    return Promise.all(resultados.map((r) => this.enriquecerConRango(r)));
  }

  async actualizar(id: number, dto: ActualizarResultadoDto): Promise<ResultadoConRango> {
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

    return this.enriquecerConRango(data);
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('evaluaciones_resultados')
      .delete()
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar el resultado: ${error.message}`);
    }
  }

  /**
   * Calcula en qué rango cae el resultado, buscando la sesión (para saber el
   * tipo de evaluación) y la fecha de nacimiento del estudiante (para la edad).
   */
  private async enriquecerConRango(resultado: ResultadoRow): Promise<ResultadoConRango> {
    const sesion = await this.sesionesService.buscarPorId(resultado.sesion_id);

    const { data: perfil } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('fecha_nacimiento')
      .eq('id_usuario', resultado.estudiante_id)
      .maybeSingle<{ fecha_nacimiento: string | null }>();

    if (!perfil?.fecha_nacimiento) {
      return { ...resultado, rango: null };
    }

    const edad = this.calcularEdad(perfil.fecha_nacimiento);

    const rango = await this.rangosService.encontrarRango(
      sesion.tipo_evaluacion_id,
      edad,
      resultado.valor_numerico,
    );

    return {
      ...resultado,
      rango: rango
        ? { nombreEtiqueta: rango.nombre_etiqueta, colorSugerido: rango.color_sugerido }
        : null,
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