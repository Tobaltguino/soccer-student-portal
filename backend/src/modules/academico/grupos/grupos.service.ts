import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { CrearGrupoDto } from './dto/crear-grupo.dto';
import { ActualizarGrupoDto } from './dto/actualizar-grupo.dto';
import type { GrupoRow } from './interfaces/grupo.interface';
import { lanzarErrorSupabase } from '../../../shared/utils/supabase-error.util';
import { ExcelService } from '../../../shared/services/excel.service'; // 🔥 IMPORTAR

@Injectable()
export class GruposService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly excelService: ExcelService, // 🔥 INYECTAR EXCEL SERVICE
  ) {}

  async crear(dto: CrearGrupoDto): Promise<GrupoRow> {
    const { data, error } = await this.supabase.client
      .from('grupos')
      .insert({ nombre: dto.nombre, descripcion: dto.descripcion ?? null })
      .select()
      .single<GrupoRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo crear el grupo');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el grupo creado');
    }

    return data;
  }

  async listar(
    incluirEliminados: boolean = false,
    gruposPermitidos: number[] | null = null,
  ): Promise<GrupoRow[]> {
    let query = this.supabase.client.from('grupos').select('*, estudiantes(count)').order('nombre');

    if (!incluirEliminados) {
      query = query.is('eliminado_at', null);
    }

    if (gruposPermitidos !== null) {
      query = query.in('id', gruposPermitidos);
    }

    const { data, error } = await query;

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo listar los grupos');
    }

    return data ?? [];
  }

  // 🔥 NUEVO MÉTODO PARA EXPORTAR EXCEL
  async generarExcelGrupos(
    incluirEliminados: boolean = false,
    gruposPermitidos: number[] | null = null,
  ): Promise<Buffer> {
    const grupos = await this.listar(incluirEliminados, gruposPermitidos);

    const datosMapeados = grupos.map((g: any) => ({
      id: g.id,
      nombre: g.nombre,
      descripcion: g.descripcion || 'Sin descripción',
      cantidadEstudiantes: g.estudiantes?.[0]?.count ?? 0, // Obtenemos el count de la relación
      estado: g.eliminado_at ? 'Eliminado' : 'Activo',
    }));

    const columnas = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 25 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Alumnos Inscritos', key: 'cantidadEstudiantes', width: 20 },
      { header: 'Estado', key: 'estado', width: 15 },
    ];

    try {
      return await this.excelService.generarExcel('Grupos', columnas, datosMapeados);
    } catch (error) {
      throw new InternalServerErrorException('Error al generar el archivo Excel de grupos');
    }
  }

  async buscarPorId(id: number, gruposPermitidos: number[] | null = null): Promise<GrupoRow> {
    const { data, error } = await this.supabase.client
      .from('grupos')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single<GrupoRow>();

    if (error || !data) {
      throw new NotFoundException('Grupo no encontrado');
    }

    if (gruposPermitidos !== null && !gruposPermitidos.includes(data.id)) {
      throw new NotFoundException('Grupo no encontrado');
    }

    return data;
  }

  async actualizar(id: number, dto: ActualizarGrupoDto): Promise<GrupoRow> {
    const { data, error } = await this.supabase.client
      .from('grupos')
      .update({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
      })
      .eq('id', id)
      .select()
      .single<GrupoRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo actualizar el grupo');
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el grupo actualizado');
    }

    return data;
  }

  async eliminar(id: number): Promise<GrupoRow> {
    const { data, error } = await this.supabase.client
      .from('grupos')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single<GrupoRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo eliminar el grupo');
    }

    if (!data) {
      throw new NotFoundException('Grupo no encontrado');
    }

    return data;
  }

  async restaurar(id: number): Promise<GrupoRow> {
    const { data, error } = await this.supabase.client
      .from('grupos')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single<GrupoRow>();

    if (error) {
      lanzarErrorSupabase(error, 'No se pudo restaurar el grupo');
    }

    if (!data) {
      throw new NotFoundException('Grupo no encontrado');
    }

    return data;
  }
}