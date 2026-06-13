import { Injectable } from '@angular/core';
import { SupabaseCoreService } from '../../../../core/services/supabase-core.service'; 

@Injectable({
  providedIn: 'root'
})
export class MaterialCompService {

  constructor(private supabaseCore: SupabaseCoreService) {}

  private get supabase() {
    return this.supabaseCore.client;
  }

  // ==========================================
  // GUÍAS DE TRABAJO (Material de Estudio)
  // ==========================================

  async getGuias(tipoMaterial?: string) {
    let query = this.supabase.from('work_guides').select('*').order('created_at', { ascending: false });
    if (tipoMaterial) query = query.eq('tipo_material', tipoMaterial);
    return await query;
  }

  async createGuia(guia: any) {
    return await this.supabase.from('work_guides').insert(guia);
  }

  async updateGuia(id: string, guia: any) {
    return await this.supabase.from('work_guides').update(guia).eq('id', id);
  }

  async deleteGuia(id: string) {
    return await this.supabase.from('work_guides').delete().eq('id', id);
  }
}