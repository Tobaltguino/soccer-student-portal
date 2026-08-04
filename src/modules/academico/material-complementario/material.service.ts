import 'multer';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { CrearMaterialDto } from './dto/crear-material.dto';
import { ActualizarMaterialDto } from './dto/actualizar-material.dto';
import type { MaterialRow } from './interfaces/material.interface';
import { lanzarErrorSupabaseConFk } from '../../../shared/utils/supabase-error.util';
import { randomUUID } from 'crypto';

const BUCKET = 'material-complementario';
const TIPOS_PERMITIDOS = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'video/mp4',
];
const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB

@Injectable()
export class MaterialService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(
    dto: CrearMaterialDto,
    creadoPor: string,
    archivo: Express.Multer.File,
  ): Promise<MaterialRow> {
    this.validarArchivo(archivo);

    const archivoUrl = await this.subirArchivo(archivo);

    const { data, error } = await this.supabase.client
      .from('material_complementario')
      .insert({
        titulo: dto.titulo,
        descripcion: dto.descripcion ?? null,
        archivo_url: archivoUrl,
        tipo_material: dto.tipoMaterial,
        grupo_id: dto.grupoId ?? null,
        clase_id: dto.claseId ?? null,
        creado_por: creadoPor,
      })
      .select()
      .single<MaterialRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear el material',
        'El grupo o la clase indicada no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el material creado');
    }

    return data;
  }

  async listar(grupoId?: number, claseId?: number): Promise<MaterialRow[]> {
    let query = this.supabase.client
      .from('material_complementario')
      .select('*')
      .order('created_at', { ascending: false });

    if (grupoId !== undefined) {
      query = query.eq('grupo_id', grupoId);
    }

    if (claseId !== undefined) {
      query = query.eq('clase_id', claseId);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar el material: ${error.message}`);
    }

    return data ?? [];
  }

  async buscarPorId(id: string): Promise<MaterialRow> {
    const { data, error } = await this.supabase.client
      .from('material_complementario')
      .select('*')
      .eq('id', id)
      .single<MaterialRow>();

    if (error || !data) {
      throw new NotFoundException('Material no encontrado');
    }

    return data;
  }

  async actualizar(id: string, dto: ActualizarMaterialDto): Promise<MaterialRow> {
    const { data, error } = await this.supabase.client
      .from('material_complementario')
      .update({
        ...(dto.titulo !== undefined && { titulo: dto.titulo }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.tipoMaterial !== undefined && { tipo_material: dto.tipoMaterial }),
        ...(dto.grupoId !== undefined && { grupo_id: dto.grupoId }),
        ...(dto.claseId !== undefined && { clase_id: dto.claseId }),
      })
      .eq('id', id)
      .select()
      .single<MaterialRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo actualizar el material',
        'El grupo o la clase indicada no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el material actualizado');
    }

    return data;
  }

  async eliminar(id: string): Promise<void> {
    const material = await this.buscarPorId(id);

    // Borrar también el archivo del bucket, no solo la fila de la tabla
    const path = this.extraerPathDesdeUrl(material.archivo_url);
    if (path) {
      await this.supabase.client.storage.from(BUCKET).remove([path]);
    }

    const { error } = await this.supabase.client
      .from('material_complementario')
      .delete()
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar el material: ${error.message}`);
    }
  }

  private validarArchivo(archivo: Express.Multer.File): void {
    if (!archivo) {
      throw new BadRequestException('Debes adjuntar un archivo');
    }

    if (!TIPOS_PERMITIDOS.includes(archivo.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${archivo.mimetype}`,
      );
    }

    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      throw new BadRequestException('El archivo supera el tamaño máximo permitido (20 MB)');
    }
  }

  private async subirArchivo(archivo: Express.Multer.File): Promise<string> {
    const extension = archivo.originalname.split('.').pop();
    const nombreArchivo = `${randomUUID()}.${extension}`;

    const { error } = await this.supabase.client.storage
      .from(BUCKET)
      .upload(nombreArchivo, archivo.buffer, {
        contentType: archivo.mimetype,
      });

    if (error) {
      throw new InternalServerErrorException(`No se pudo subir el archivo: ${error.message}`);
    }

    const { data } = this.supabase.client.storage.from(BUCKET).getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  private extraerPathDesdeUrl(url: string): string | null {
    const marcador = `/${BUCKET}/`;
    const index = url.indexOf(marcador);
    if (index === -1) return null;
    return url.substring(index + marcador.length);
  }
}