import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { CrearFichaDto } from './dto/crear-ficha.dto';
import { ActualizarFichaDto } from './dto/actualizar-ficha.dto';
import type { FichaEvolutivaRow } from './interfaces/ficha-evolutiva.interface';
import { lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';

@Injectable()
export class FichasEvolutivasService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(
    dto: CrearFichaDto,
    kinesiologoId: string,
    gruposPermitidos: number[] | null,
  ): Promise<FichaEvolutivaRow> {
    if (gruposPermitidos !== null) {
      await this.verificarEstudianteEnAlcance(dto.estudianteId, gruposPermitidos);
    }

    const { data, error } = await this.supabase.client
      .from('kine_fichas_evolutivas')
      .insert({
        estudiante_id: dto.estudianteId,
        kinesiologo_id: kinesiologoId,
        fecha_evaluacion: dto.fechaEvaluacion,
        antecedentes_personales: dto.antecedentesPersonales ?? null,
        antecedentes_remotos: dto.antecedentesRemotos ?? null,
        diagnostico_medico: dto.diagnosticoMedico ?? null,
        inspeccion_estatica: dto.inspeccionEstatica ?? null,
        inspeccion_dinamica: dto.inspeccionDinamica ?? null,
        rango_movimiento: dto.rangoMovimiento ?? null,
        fuerza_movimientos: dto.fuerzaMovimientos ?? null,
        postura: dto.postura ?? null,
        sensibilidad: dto.sensibilidad ?? null,
        marcha: dto.marcha ?? null,
        coordinacion: dto.coordinacion ?? null,
        balance_romberg: dto.balanceRomberg ?? null,
        observacion: dto.observacion ?? null,
        no_evaluable: dto.noEvaluable ?? null,
      })
      .select()
      .single<FichaEvolutivaRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear la ficha evolutiva',
        'El estudiante indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la ficha creada');
    }

    return data;
  }

  async listarPorEstudiante(
    estudianteId: string,
    gruposPermitidos: number[] | null,
    incluirEliminadas: boolean = false,
  ): Promise<FichaEvolutivaRow[]> {
    if (gruposPermitidos !== null) {
      await this.verificarEstudianteEnAlcance(estudianteId, gruposPermitidos, true);   // 👈 agregado
    }

    let query = this.supabase.client
      .from('kine_fichas_evolutivas')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .order('fecha_evaluacion', { ascending: false });

    if (!incluirEliminadas) {
      query = query.is('eliminado_at', null);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar las fichas: ${error.message}`);
    }

    return data ?? [];
  }

  async buscarPorId(id: string, gruposPermitidos: number[] | null): Promise<FichaEvolutivaRow> {
    const { data, error } = await this.supabase.client
      .from('kine_fichas_evolutivas')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single<FichaEvolutivaRow>();

    if (error || !data) {
      throw new NotFoundException('Ficha no encontrada');
    }

    if (gruposPermitidos !== null) {
      await this.verificarEstudianteEnAlcance(data.estudiante_id, gruposPermitidos, true);
    }

    return data;
  }

  async actualizar(
    id: string,
    dto: ActualizarFichaDto,
    gruposPermitidos: number[] | null,
  ): Promise<FichaEvolutivaRow> {
    await this.buscarPorId(id, gruposPermitidos); // valida existencia + alcance

    const { data, error } = await this.supabase.client
      .from('kine_fichas_evolutivas')
      .update({
        ...(dto.fechaEvaluacion !== undefined && { fecha_evaluacion: dto.fechaEvaluacion }),
        ...(dto.antecedentesPersonales !== undefined && { antecedentes_personales: dto.antecedentesPersonales }),
        ...(dto.antecedentesRemotos !== undefined && { antecedentes_remotos: dto.antecedentesRemotos }),
        ...(dto.diagnosticoMedico !== undefined && { diagnostico_medico: dto.diagnosticoMedico }),
        ...(dto.inspeccionEstatica !== undefined && { inspeccion_estatica: dto.inspeccionEstatica }),
        ...(dto.inspeccionDinamica !== undefined && { inspeccion_dinamica: dto.inspeccionDinamica }),
        ...(dto.rangoMovimiento !== undefined && { rango_movimiento: dto.rangoMovimiento }),
        ...(dto.fuerzaMovimientos !== undefined && { fuerza_movimientos: dto.fuerzaMovimientos }),
        ...(dto.postura !== undefined && { postura: dto.postura }),
        ...(dto.sensibilidad !== undefined && { sensibilidad: dto.sensibilidad }),
        ...(dto.marcha !== undefined && { marcha: dto.marcha }),
        ...(dto.coordinacion !== undefined && { coordinacion: dto.coordinacion }),
        ...(dto.balanceRomberg !== undefined && { balance_romberg: dto.balanceRomberg }),
        ...(dto.observacion !== undefined && { observacion: dto.observacion }),
        ...(dto.noEvaluable !== undefined && { no_evaluable: dto.noEvaluable }),
      })
      .eq('id', id)
      .select()
      .single<FichaEvolutivaRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo actualizar la ficha: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Ficha no encontrada');
    }

    return data;
  }

  async eliminar(id: string): Promise<FichaEvolutivaRow> {
    const { data, error } = await this.supabase.client
      .from('kine_fichas_evolutivas')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single<FichaEvolutivaRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar la ficha: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Ficha no encontrada');
    }

    return data;
  }

  async restaurar(id: string): Promise<FichaEvolutivaRow> {
    const { data, error } = await this.supabase.client
      .from('kine_fichas_evolutivas')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single<FichaEvolutivaRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo restaurar la ficha: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Ficha no encontrada');
    }

    return data;
  }

  private async verificarEstudianteEnAlcance(
    estudianteId: string,
    gruposPermitidos: number[],
    esNotFound: boolean = false,
  ): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('estudiantes')
      .select('grupo_id')
      .eq('usuario_id', estudianteId)
      .single<{ grupo_id: number | null }>();

    const fueraDeAlcance =
      error || !data || data.grupo_id === null || !gruposPermitidos.includes(data.grupo_id);

    if (fueraDeAlcance) {
      if (esNotFound) {
        throw new NotFoundException('Ficha no encontrada');
      }
      throw new ForbiddenException('El estudiante no pertenece a tu grupo asignado');
    }
  }
}