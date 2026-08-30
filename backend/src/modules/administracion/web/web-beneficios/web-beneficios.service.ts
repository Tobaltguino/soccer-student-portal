import 'multer';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { CrearWebBeneficioDto } from './dto/crear-web-beneficio.dto';
import { ActualizarWebBeneficioDto } from './dto/actualizar-web-beneficio.dto';
import { lanzarErrorSupabase } from '../../../../shared/utils/supabase-error.util';
import { randomUUID } from 'crypto';

const BUCKET = 'web-imagenes';
const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class WebBeneficiosService {
  constructor(private readonly supabase: SupabaseService) {}

  private mapear(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      orden: row.orden,
      imagenUrl: row.imagen_url,
      instagramUrl: row.instagram_url,
    };
  }

  async crear(dto: CrearWebBeneficioDto, imagen?: Express.Multer.File): Promise<any> {
    const imagenUrl = imagen ? await this.subirImagen(imagen) : null;

    const { data, error } = await this.supabase.client
      .from('web_beneficios')
      .insert({
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        orden: dto.orden ?? 0,
        imagen_url: imagenUrl,
        instagram_url: dto.instagramUrl ?? null,
      })
      .select()
      .single();

    if (error) lanzarErrorSupabase(error, 'No se pudo crear el beneficio');
    if (!data) throw new InternalServerErrorException('No se recibió el beneficio creado');

    return this.mapear(data);
  }

  async listar(): Promise<any[]> {
    const { data, error } = await this.supabase.client
      .from('web_beneficios')
      .select('*')
      .order('orden');

    if (error) lanzarErrorSupabase(error, 'No se pudo listar los beneficios');

    return (data ?? []).map(row => this.mapear(row));
  }

  async buscarPorId(id: number): Promise<any> {
    const { data, error } = await this.supabase.client
      .from('web_beneficios')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Beneficio no encontrado');

    return this.mapear(data);
  }

  async actualizar(id: number, dto: ActualizarWebBeneficioDto, imagen?: Express.Multer.File): Promise<any> {
    let imagenUrl: string | undefined;

    if (imagen) {
      const beneficioActual = await this.supabase.client.from('web_beneficios').select('*').eq('id', id).single();
      imagenUrl = await this.subirImagen(imagen);

      if (beneficioActual.data?.imagen_url) {
        await this.borrarImagen(beneficioActual.data.imagen_url);
      }
    }

    const { data, error } = await this.supabase.client
      .from('web_beneficios')
      .update({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.orden !== undefined && { orden: dto.orden }),
        ...(imagenUrl !== undefined && { imagen_url: imagenUrl }),
        ...(dto.instagramUrl !== undefined && { instagram_url: dto.instagramUrl }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) lanzarErrorSupabase(error, 'No se pudo actualizar el beneficio');
    if (!data) throw new InternalServerErrorException('No se recibió el beneficio actualizado');

    return this.mapear(data);
  }

  async eliminar(id: number): Promise<void> {
    const beneficio = await this.supabase.client.from('web_beneficios').select('*').eq('id', id).single();
    if (beneficio.data?.imagen_url) {
      await this.borrarImagen(beneficio.data.imagen_url);
    }

    const { error } = await this.supabase.client.from('web_beneficios').delete().eq('id', id);
    if (error) lanzarErrorSupabase(error, 'No se pudo eliminar el beneficio');
  }

  private async subirImagen(imagen: Express.Multer.File): Promise<string> {
    if (!TIPOS_PERMITIDOS.includes(imagen.mimetype)) throw new BadRequestException(`Tipo no permitido`);
    if (imagen.size > TAMANO_MAXIMO_BYTES) throw new BadRequestException('Tamaño máximo superado');

    const extension = imagen.originalname.split('.').pop();
    const nombreArchivo = `beneficios/${randomUUID()}.${extension}`;

    const { error } = await this.supabase.client.storage.from(BUCKET).upload(nombreArchivo, imagen.buffer, { contentType: imagen.mimetype });
    if (error) throw new InternalServerErrorException(`No se pudo subir: ${error.message}`);

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

  async eliminarImagen(id: number): Promise<any> {
    const beneficio = await this.supabase.client.from('web_beneficios').select('*').eq('id', id).single();
    if (beneficio.data?.imagen_url) {
      await this.borrarImagen(beneficio.data.imagen_url);
    }

    const { data, error } = await this.supabase.client
      .from('web_beneficios')
      .update({ imagen_url: null })
      .eq('id', id)
      .select()
      .single();

    if (error) lanzarErrorSupabase(error, 'No se pudo quitar la imagen');
    if (!data) throw new InternalServerErrorException('Error al actualizar');

    return this.mapear(data);
  }
}