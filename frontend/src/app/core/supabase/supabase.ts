import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    // Aquí inicializamos el cliente directo con la URL y la Anon Key de tu Proyecto Profutbol
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }

  // Método para exponer el cliente al resto de la app
  get client(): SupabaseClient {
    return this.supabase;
  }
}