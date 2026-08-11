import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../../../../../../../backend/src/core/supabase/supabase.service';
import { FiltrarAuditoriaDto } from './dto/filtrar-auditoria.dto';
import type { AuditoriaRow } from './interfaces/auditoria.interface';

export interface AuditoriaPaginada {
  registros: AuditoriaRow[];
  total: number;
  pagina: number;
  limite: number;
}

@Injectable()
export class AuditoriaConsultaService {
  constructor(private readonly supabase: SupabaseService) {}

  async listar(filtros: FiltrarAuditoriaDto): Promise<AuditoriaPaginada> {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 50, 200); // tope de 200 por página
    const desdeIndex = (pagina - 1) * limite;
    const hastaIndex = desdeIndex + limite - 1;

    let query = this.supabase.client
      .from('auditoria')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(desdeIndex, hastaIndex);

    if (filtros.usuarioId) {
      query = query.eq('usuario_id', filtros.usuarioId);
    }

    if (filtros.metodo) {
      query = query.eq('metodo', filtros.metodo.toUpperCase());
    }

    if (filtros.ruta) {
      query = query.ilike('ruta', `%${filtros.ruta}%`);
    }

    if (filtros.desde) {
      query = query.gte('created_at', filtros.desde);
    }

    if (filtros.hasta) {
      query = query.lte('created_at', filtros.hasta);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar la auditoría: ${error.message}`);
    }

    return {
      registros: data ?? [],
      total: count ?? 0,
      pagina,
      limite,
    };
  }

  async buscarPorId(id: number): Promise<AuditoriaRow | null> {
    const { data, error } = await this.supabase.client
      .from('auditoria')
      .select('*')
      .eq('id', id)
      .maybeSingle<AuditoriaRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo obtener el registro: ${error.message}`);
    }

    return data;
  }
}