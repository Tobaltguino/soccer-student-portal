import 'multer';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { SesionesService } from '../sesiones/sesiones.service';
import { CrearResultadoDto } from './dto/crear-resultado.dto';
import { ActualizarResultadoDto } from './dto/actualizar-resultado.dto';
import type { NutriResultadoRow, NutriResultadoConDetalle } from './interfaces/resultado.interface';
import { lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';
import { randomUUID } from 'crypto';

const BUCKET = 'nutri-informes';
const TIPOS_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg'];
const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class ResultadosService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sesionesService: SesionesService,
  ) {}

  async crear(
    dto: CrearResultadoDto,
    solicitanteId: string,
    esAdmin: boolean,
    archivo?: Express.Multer.File,
    gruposPermitidos?: number[] | null,
  ): Promise<NutriResultadoConDetalle> {
    // Si es nutricionista (no admin), solo puede cargar resultados en SUS PROPIAS sesiones
    const soloDeNutricionista = esAdmin ? null : solicitanteId;
    await this.sesionesService.buscarPorId(dto.evaluacionId, soloDeNutricionista);

    // Verifica que el estudiante esté dentro del alcance de grupo (si aplica)
    if (gruposPermitidos !== undefined && gruposPermitidos !== null) {
      await this.verificarEstudianteEnAlcance(dto.estudianteId, gruposPermitidos);
    }

    const archivoUrl = archivo ? await this.subirArchivo(archivo) : null;

    const { data, error } = await this.supabase.client
      .from('nutri_evaluacion_resultados')
      .insert({
        evaluacion_id: dto.evaluacionId,
        estudiante_id: dto.estudianteId,
        archivo_url: archivoUrl,
        observaciones: dto.observaciones ?? null,
      })
      .select()
      .single<NutriResultadoRow>();

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
    evaluacionId: string,
    gruposPermitidos: number[] | null,
  ): Promise<NutriResultadoConDetalle[]> {
    let query = this.supabase.client
      .from('nutri_evaluacion_resultados')
      .select('*, estudiantes!inner(grupo_id)')
      .eq('evaluacion_id', evaluacionId);

    if (gruposPermitidos !== null) {
      query = query.in('estudiantes.grupo_id', gruposPermitidos);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar los resultados: ${error.message}`);
    }

    const resultados = (data ?? []).map(
      ({ estudiantes, ...resto }: any) => resto,
    ) as NutriResultadoRow[];

    return Promise.all(resultados.map((r) => this.enriquecerConDetalle(r)));
  }

  async listarPorEstudianteFinalizados(estudianteId: string): Promise<NutriResultadoConDetalle[]> {
    const { data, error } = await this.supabase.client
      .from('nutri_evaluacion_resultados')
      .select('*, nutri_evaluacion_sesiones!inner(estado)')
      .eq('estudiante_id', estudianteId)
      .eq('nutri_evaluacion_sesiones.estado', 'FINALIZADA')
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar los resultados: ${error.message}`);
    }

    const resultados = (data ?? []).map(
      ({ nutri_evaluacion_sesiones, ...resto }: any) => resto,
    ) as NutriResultadoRow[];

    return Promise.all(resultados.map((r) => this.enriquecerConDetalle(r)));
  }

  async actualizar(
    id: string,
    dto: ActualizarResultadoDto,
    archivo?: Express.Multer.File,
  ): Promise<NutriResultadoConDetalle> {
    const actual = await this.buscarPorId(id);

    let archivoUrl: string | undefined;
    if (archivo) {
      archivoUrl = await this.subirArchivo(archivo);
      if (actual.archivo_url) {
        await this.borrarArchivo(actual.archivo_url);
      }
    }

    const { data, error } = await this.supabase.client
      .from('nutri_evaluacion_resultados')
      .update({
        ...(dto.observaciones !== undefined && { observaciones: dto.observaciones }),
        ...(archivoUrl !== undefined && { archivo_url: archivoUrl }),
      })
      .eq('id', id)
      .select()
      .single<NutriResultadoRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo actualizar el resultado: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Resultado no encontrado');
    }

    return this.enriquecerConDetalle(data);
  }

  async eliminar(id: string): Promise<void> {
    const { data: resultado, error: errorBusqueda } = await this.supabase.client
      .from('nutri_evaluacion_resultados')
      .select('archivo_url')
      .eq('id', id)
      .single<{ archivo_url: string | null }>();

    if (errorBusqueda || !resultado) {
      throw new NotFoundException('Resultado no encontrado');
    }

    if (resultado.archivo_url) {
      await this.borrarArchivo(resultado.archivo_url);
    }

    const { error } = await this.supabase.client
      .from('nutri_evaluacion_resultados')
      .delete()
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar el resultado: ${error.message}`);
    }
  }

  private async buscarPorId(id: string): Promise<NutriResultadoRow> {
    const { data, error } = await this.supabase.client
      .from('nutri_evaluacion_resultados')
      .select('*')
      .eq('id', id)
      .single<NutriResultadoRow>();

    if (error || !data) {
      throw new NotFoundException('Resultado no encontrado');
    }

    return data;
  }

  private async verificarEstudianteEnAlcance(
    estudianteId: string,
    gruposPermitidos: number[],
  ): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('estudiantes')
      .select('grupo_id')
      .eq('usuario_id', estudianteId)
      .single<{ grupo_id: number | null }>();

    if (error || !data || data.grupo_id === null || !gruposPermitidos.includes(data.grupo_id)) {
      throw new ForbiddenException('El estudiante no pertenece a tu grupo asignado');
    }
  }

  private async enriquecerConDetalle(resultado: NutriResultadoRow): Promise<NutriResultadoConDetalle> {
    const { data: sesion } = await this.supabase.client
      .from('nutri_evaluacion_sesiones')
      .select('fecha, tipo_id')
      .eq('id', resultado.evaluacion_id)
      .single<{ fecha: string; tipo_id: string }>();

    const { data: tipo } = await this.supabase.client
      .from('nutri_tipo_evaluacion')
      .select('nombre')
      .eq('id', sesion?.tipo_id)
      .single<{ nombre: string }>();

    return {
      ...resultado,
      evaluacion: {
        nombre: tipo?.nombre ?? 'Desconocido',
        fecha: sesion?.fecha ?? '',
      },
    };
  }

  private async subirArchivo(archivo: Express.Multer.File): Promise<string> {
    if (!TIPOS_PERMITIDOS.includes(archivo.mimetype)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${archivo.mimetype}`);
    }

    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      throw new BadRequestException('El archivo supera el tamaño máximo permitido (10 MB)');
    }

    const extension = archivo.originalname.split('.').pop();
    const nombreArchivo = `${randomUUID()}.${extension}`;

    const { error } = await this.supabase.client.storage
      .from(BUCKET)
      .upload(nombreArchivo, archivo.buffer, { contentType: archivo.mimetype });

    if (error) {
      throw new InternalServerErrorException(`No se pudo subir el archivo: ${error.message}`);
    }

    const { data } = this.supabase.client.storage.from(BUCKET).getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  private async borrarArchivo(url: string): Promise<void> {
    const marcador = `/${BUCKET}/`;
    const index = url.indexOf(marcador);
    if (index === -1) return;

    const path = url.substring(index + marcador.length);
    await this.supabase.client.storage.from(BUCKET).remove([path]);
  }
}