import { Injectable } from '@angular/core';
import { SupabaseCoreService } from './supabase-core.service';

@Injectable({
  providedIn: 'root'
})
export class ContentService {

  constructor(private supabaseCore: SupabaseCoreService) {}

  // Getter privado para código limpio
  private get supabase() {
    return this.supabaseCore.client;
  }

  // ==========================================
  // 1. GUÍAS DE TRABAJO (Material de Estudio)
  // ==========================================

  /**
   * Obtiene TODAS las guías globales (o filtradas por tipo)
   * @param tipoMaterial Opcional (ej: 'NUTRICION', 'KINESIOLOGIA')
   */
  async getGuias(tipoMaterial?: string) {
    let query = this.supabase
      .from('work_guides')
      .select('*')
      .order('created_at', { ascending: false });

    if (tipoMaterial) {
      query = query.eq('tipo_material', tipoMaterial);
    }

    return await query;
  }

  /**
   * Guarda los datos de una nueva guía en la tabla
   */
  async createGuia(guia: any) {
    // Al insertar, Supabase tomará automáticamente el auth.uid() para 'creado_por'
    return await this.supabase.from('work_guides').insert(guia);
  }

  /**
   * Actualiza una guía existente
   */
  async updateGuia(id: string, guia: any) {
    return await this.supabase.from('work_guides').update(guia).eq('id', id);
  }

  /**
   * Elimina una guía (Solo admin, validado por RLS)
   */
  async deleteGuia(id: string) {
    return await this.supabase.from('work_guides').delete().eq('id', id);
  }

  // ==========================================
  // 2. CONFIGURACIÓN WEB (Landing Page Principal)
  // ==========================================

  /**
   * Obtiene los datos públicos para el Home (Título, Descripción general)
   */
  async getConfiguracionWeb() {
    return await this.supabase
      .from('configuracion_web')
      .select('*')
      .eq('id', 1)
      .single();
  }

  /**
   * Actualiza los datos principales de la web (Panel Admin)
   */
  async updateConfiguracionWeb(datos: any) {
    return await this.supabase
      .from('configuracion_web')
      .update(datos)
      .eq('id', 1);
  }

  // ==========================================
  // 3. SECCIONES DINÁMICAS (Landing Page)
  // ==========================================

  // --- GETTERS (Lectura Pública) ---
  
  async getWebMetodologias() {
    return await this.supabase.from('web_metodologias').select('*').order('orden', { ascending: true });
  }

  async getWebProgramas() {
    return await this.supabase.from('web_programas').select('*').order('orden', { ascending: true });
  }

  async getWebAlianzas() {
    return await this.supabase.from('web_alianzas').select('*').order('orden', { ascending: true });
  }

  async getWebAuspiciadores() {
    return await this.supabase
      .from('web_auspiciadores')
      .select('*')
      .order('orden', { ascending: true });
  }

  // --- CRUD METODOLOGÍAS (Panel Admin) ---
  
  async createWebMetodologia(datos: any) { return await this.supabase.from('web_metodologias').insert(datos); }
  async updateWebMetodologia(id: number, datos: any) { return await this.supabase.from('web_metodologias').update(datos).eq('id', id); }
  async deleteWebMetodologia(id: number) { return await this.supabase.from('web_metodologias').delete().eq('id', id); }

  // --- CRUD PROGRAMAS (Panel Admin) ---
  
  async createWebPrograma(datos: any) { return await this.supabase.from('web_programas').insert(datos); }
  async updateWebPrograma(id: number, datos: any) { return await this.supabase.from('web_programas').update(datos).eq('id', id); }
  async deleteWebPrograma(id: number) { return await this.supabase.from('web_programas').delete().eq('id', id); }

  // --- CRUD ALIANZAS (Panel Admin) ---
  
  async createWebAlianza(datos: any) { return await this.supabase.from('web_alianzas').insert(datos); }
  async updateWebAlianza(id: number, datos: any) { return await this.supabase.from('web_alianzas').update(datos).eq('id', id); }
  async deleteWebAlianza(id: number) { return await this.supabase.from('web_alianzas').delete().eq('id', id); }

  // --- CRUD AUSPICIADORES (Panel Admin) ---
  
  async createWebAuspiciador(datos: any) { return await this.supabase.from('web_auspiciadores').insert(datos); }
  async updateWebAuspiciador(id: number, datos: any) { return await this.supabase.from('web_auspiciadores').update(datos).eq('id', id); }
  async deleteWebAuspiciador(id: number) { return await this.supabase.from('web_auspiciadores').delete().eq('id', id); }

}