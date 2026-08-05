import 'multer';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { CrearWebAuspiciadorDto } from './dto/crear-web-auspiciador.dto';
import { ActualizarWebAuspiciadorDto } from './dto/actualizar-web-auspiciador.dto';
import type { WebAuspiciadorRow } from './interfaces/web-auspiciador.interface';
import { lanzarErrorSupabase } from '../../../../shared/utils/supabase-error.util';
import { randomUUID } from 'crypto';

const BUCKET = 'web-imagenes';
const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class WebAuspiciadoresService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(
    dto: CrearWebAuspiciadorDto,
    imagen?: Express.Multer.File,
  ): Promise<WebAuspiciadorRow> {
    const imagenUrl = imagen ? await this.subirImagen(imagen) : null;

    const { data, error } = await this.supabase.client
      .from('web_auspiciadores')
      .insert({
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        orden: dto.orden ?? 0,
        imagen_url: imagenUrl,
        instagram_url: dto.instagramUrl ?? null,
      })
      .select()
      .single<WebAuspiciadorRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo crear el auspiciador');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el auspiciador creado');
    }

    return data;
  }

  async listar(): Promise<WebAuspiciadorRow[]> {
    const { data, error } = await this.supabase.client
      .from('web_auspiciadores')
      .select('*')
      .order('orden');

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo listar los auspiciadores');
    }

    return data ?? [];
  }

  async buscarPorId(id: number): Promise<WebAuspiciadorRow> {
    const { data, error } = await this.supabase.client
      .from('web_auspiciadores')
      .select('*')
      .eq('id', id)
      .single<WebAuspiciadorRow>();

    if (error || !data) {
      throw new NotFoundException('Auspiciador no encontrado');
    }

    return data;
  }

  async actualizar(
    id: number,
    dto: ActualizarWebAuspiciadorDto,
    imagen?: Express.Multer.File,
  ): Promise<WebAuspiciadorRow> {
    let imagenUrl: string | undefined;

    if (imagen) {
      const auspiciadorActual = await this.buscarPorId(id);
      imagenUrl = await this.subirImagen(imagen);

      if (auspiciadorActual.imagen_url) {
        await this.borrarImagen(auspiciadorActual.imagen_url);
      }
    }

    const { data, error } = await this.supabase.client
      .from('web_auspiciadores')
      .update({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.orden !== undefined && { orden: dto.orden }),
        ...(imagenUrl !== undefined && { imagen_url: imagenUrl }),
        ...(dto.instagramUrl !== undefined && { instagram_url: dto.instagramUrl }),
      })
      .eq('id', id)
      .select()
      .single<WebAuspiciadorRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo actualizar el auspiciador');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el auspiciador actualizado');
    }

    return data;
  }

  async eliminar(id: number): Promise<void> {
    const auspiciador = await this.buscarPorId(id);

    if (auspiciador.imagen_url) {
      await this.borrarImagen(auspiciador.imagen_url);
    }

    const { error } = await this.supabase.client
      .from('web_auspiciadores')
      .delete()
      .eq('id', id);

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo eliminar el auspiciador');
    }
  }

  async eliminarImagen(id: number): Promise<WebAuspiciadorRow> {
    const auspiciador = await this.buscarPorId(id);

    if (auspiciador.imagen_url) {
      await this.borrarImagen(auspiciador.imagen_url);
    }

    const { data, error } = await this.supabase.client
      .from('web_auspiciadores')
      .update({ imagen_url: null })
      .eq('id', id)
      .select()
      .single<WebAuspiciadorRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo quitar la imagen del auspiciador');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el auspiciador actualizado');
    }

    return data;
  }

  private async subirImagen(imagen: Express.Multer.File): Promise<string> {
    if (!TIPOS_PERMITIDOS.includes(imagen.mimetype)) {
      throw new BadRequestException(`Tipo de imagen no permitido: ${imagen.mimetype}`);
    }

    if (imagen.size > TAMANO_MAXIMO_BYTES) {
      throw new BadRequestException('La imagen supera el tamaño máximo permitido (5 MB)');
    }

    const extension = imagen.originalname.split('.').pop();
    const nombreArchivo = `auspiciadores/${randomUUID()}.${extension}`;

    const { error } = await this.supabase.client.storage
      .from(BUCKET)
      .upload(nombreArchivo, imagen.buffer, { contentType: imagen.mimetype });

    if (error) {
      throw new InternalServerErrorException(`No se pudo subir la imagen: ${error.message}`);
    }

    const { data } = this.supabase.client.storage.from(BUCKET).getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  private async borrarImagen(url: string): Promise<void> {
    const marcador = `/${BUCKET}/`;
    const index = url.indexOf(marcador);
    if (index === -1) return;

    const path = url.substring(index + marcador.length);
    await this.supabase.client.storage.from(BUCKET).remove([path]);
  }
}