import { Injectable } from '@angular/core';
import { SupabaseCoreService } from '../../../../core/services/supabase-core.service';

@Injectable({
  providedIn: 'root'
})
export class InicioService {

  constructor(private supabaseCore: SupabaseCoreService) {}

  private get supabase() {
    return this.supabaseCore.client;
  }

  // ==========================================
  // CONFIGURACIÓN WEB (Landing Page General)
  // ==========================================

  async getConfiguracionWeb() {
    return await this.supabase.from('configuracion_web').select('*').eq('id', 1).single();
  }

  async updateConfiguracionWeb(datos: any) {
    return await this.supabase.from('configuracion_web').update(datos).eq('id', 1);
  }

  // ==========================================
  // SECCIONES DINÁMICAS (Landing Page)
  // ==========================================

  // --- METODOLOGÍAS ---
  async getWebMetodologias() { return await this.supabase.from('web_metodologias').select('*').order('orden', { ascending: true }); }
  async createWebMetodologia(datos: any) { return await this.supabase.from('web_metodologias').insert(datos); }
  async updateWebMetodologia(id: number, datos: any) { return await this.supabase.from('web_metodologias').update(datos).eq('id', id); }
  async deleteWebMetodologia(id: number) { return await this.supabase.from('web_metodologias').delete().eq('id', id); }

  // --- CATEGORÍAS (PROGRAMAS) ---
  async getWebProgramas() { return await this.supabase.from('web_programas').select('*').order('orden', { ascending: true }); }
  async createWebPrograma(datos: any) { return await this.supabase.from('web_programas').insert(datos); }
  async updateWebPrograma(id: number, datos: any) { return await this.supabase.from('web_programas').update(datos).eq('id', id); }
  async deleteWebPrograma(id: number) { return await this.supabase.from('web_programas').delete().eq('id', id); }

  // --- ALIANZAS ---
  async getWebAlianzas() { return await this.supabase.from('web_alianzas').select('*').order('orden', { ascending: true }); }
  async createWebAlianza(datos: any) { return await this.supabase.from('web_alianzas').insert(datos); }
  async updateWebAlianza(id: number, datos: any) { return await this.supabase.from('web_alianzas').update(datos).eq('id', id); }
  async deleteWebAlianza(id: number) { return await this.supabase.from('web_alianzas').delete().eq('id', id); }

  // --- AUSPICIADORES ---
  async getWebAuspiciadores() { return await this.supabase.from('web_auspiciadores').select('*').order('orden', { ascending: true }); }
  async createWebAuspiciador(datos: any) { return await this.supabase.from('web_auspiciadores').insert(datos); }
  async updateWebAuspiciador(id: number, datos: any) { return await this.supabase.from('web_auspiciadores').update(datos).eq('id', id); }
  async deleteWebAuspiciador(id: number) { return await this.supabase.from('web_auspiciadores').delete().eq('id', id); }

}