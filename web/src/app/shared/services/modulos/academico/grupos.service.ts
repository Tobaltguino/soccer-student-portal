import { Injectable } from '@angular/core';
import { SupabaseCoreService } from '../../../../core/services/supabase-core.service'; 

@Injectable({ providedIn: 'root' })
export class GruposService {
  constructor(private supabaseCore: SupabaseCoreService) {}
  private get supabase() { return this.supabaseCore.client; }

  async getGrupos() {
    return await this.supabase.from('grupos').select('*, estudiantes(count)').order('nombre', { ascending: true });
  }

  async createGrupo(datos: any) { return await this.supabase.from('grupos').insert(datos); }
  async updateGrupo(id: number, datos: any) { return await this.supabase.from('grupos').update(datos).eq('id', id); }
  async deleteGrupo(id: number) { return await this.supabase.from('grupos').delete().eq('id', id); }

  async getPosiciones() {
    return await this.supabase.from('posiciones').select('*').order('orden', { ascending: true });
  }
}