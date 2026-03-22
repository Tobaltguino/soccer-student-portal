import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment'; // Asegúrate de que la ruta sea correcta

@Injectable({
  providedIn: 'root' // Esto lo hace un "Singleton" (una sola instancia para toda la app)
})
export class SupabaseCoreService {
  
  // Exponemos el cliente de Supabase para que otros servicios lo consuman
  public client: SupabaseClient;

  constructor() {
    // Inicializamos la conexión usando las variables de entorno de Angular
    this.client = createClient(environment.supabaseUrl, environment.supabaseKey);
  }
  
}