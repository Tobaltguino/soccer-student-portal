import 'multer';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { CrearMaterialDto } from './dto/crear-material.dto';
import { ActualizarMaterialDto } from './dto/actualizar-material.dto';
import type { MaterialRow } from './interfaces/material.interface';
import { lanzarErrorSupabaseConFk } from '../../../shared/utils/supabase-error.util';
import { randomUUID } from 'crypto';
import { FiltrarMaterialDto } from './dto/filtrar-material.dto';

// Importaciones para validación de permisos
import { Rol } from '../../../shared/enums/rol.enum';
import { TipoMaterial } from '../../../shared/enums/tipo-material.enum';
import type { RequestUser } from '../../../core/auth/strategies/jwt.strategy';

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
    user: RequestUser, 
    archivo: Express.Multer.File,
  ): Promise<MaterialRow> {
    this.validarArchivo(archivo);

    this.validarPermisosArea(user.rol, dto.tipoMaterial);

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
        creado_por: user.id, 
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

  async listar(filtros: FiltrarMaterialDto): Promise<{
    registros: MaterialRow[];
    total: number;
    pagina: number;
    limite: number;
  }> {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let query = this.supabase.client
      .from('material_complementario')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(desde, hasta);

    if (filtros.grupoId !== undefined) {
      query = query.eq('grupo_id', filtros.grupoId);
    }

    if (filtros.claseId !== undefined) {
      query = query.eq('clase_id', filtros.claseId);
    }

    if (filtros.tipoMaterial) {
      query = query.eq('tipo_material', filtros.tipoMaterial);
    }

    if (filtros.busqueda) {
      const b = filtros.busqueda.replace(/[%_]/g, '');
      query = query.or(`titulo.ilike.%${b}%,descripcion.ilike.%${b}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar el material: ${error.message}`);
    }

    return {
      registros: data ?? [],
      total: count ?? 0,
      pagina,
      limite,
    };
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

  async actualizar(id: string, dto: ActualizarMaterialDto, user: RequestUser): Promise<MaterialRow> {
    const materialExistente = await this.buscarPorId(id);

    // Verificamos si tiene permiso para tocar el área actual del archivo
    this.validarPermisosArea(user.rol, materialExistente.tipo_material as TipoMaterial);

    // Si intenta cambiar la categoría del archivo, validamos que tenga permiso para esa nueva categoría
    if (dto.tipoMaterial) {
      this.validarPermisosArea(user.rol, dto.tipoMaterial);
    }

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

  /**
   * Valida que el Rol del usuario tenga permisos sobre el Tipo de Material
   */
  private validarPermisosArea(rol: string, tipoMaterial: TipoMaterial): void {
    if (rol === Rol.ADMINISTRADOR) return; // Admin puede todo

    let tienePermiso = false;

    switch (rol) {
      case Rol.PROFESOR:
        tienePermiso = (tipoMaterial === TipoMaterial.FISICO);
        break;
      case Rol.KINESIOLOGO:
        tienePermiso = (tipoMaterial === TipoMaterial.KINESIOLOGICO);
        break;
      case Rol.NUTRICIONISTA:
        tienePermiso = (tipoMaterial === TipoMaterial.NUTRICION);
        break;
    }

    if (!tienePermiso) {
      throw new ForbiddenException(`Tu rol no tiene permisos para crear o modificar material del área asignada.`);
    }
  }

  private validarArchivo(archivo: Express.Multer.File): void {
    if (!archivo) {
      throw new BadRequestException('Debes adjuntar un archivo');
    }

    if (!TIPOS_PERMITIDOS.includes(archivo.mimetype)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${archivo.mimetype}`);
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