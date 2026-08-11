import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SupabaseService } from '../../../../../core/services/supabase.service';

@Component({
  selector: 'app-view-teachers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-teachers.html',
  styleUrl: './view-teachers.css'
})
export class ViewTeachersComponent implements OnInit {
  loading: boolean = true;
  profesores: any[] = []; // Aquí guardaremos a todo el cuerpo técnico unido
  errorMessage: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarCuerpoTecnico();
  }

  async cargarCuerpoTecnico() {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges(); // Despierta a Angular para mostrar el spinner

    try {
      const { data: { user } } = await this.supabaseService.getUser();
      
      if (!user) {
        this.errorMessage = 'No se pudo identificar al usuario.';
        return;
      }

      // 🚀 Disparamos ambas búsquedas a la base de datos AL MISMO TIEMPO
      const [profesoresResponse, kinesResponse] = await Promise.all([
        this.supabaseService.getProfesoresDeEstudiante(user.id),
        this.supabaseService.getKinesiologosDeEstudiante(user.id)
      ]);

      // Si falla la búsqueda principal de profes, lanzamos error
      if (profesoresResponse.error) {
        this.errorMessage = 'Error al cargar los datos del cuerpo técnico.';
        return;
      }

      // Extraemos los datos de las respuestas (si vienen vacíos, usamos arreglos vacíos [])
      const profes = profesoresResponse.data || [];
      const kinesBrutos = kinesResponse.data || [];

      // 🎭 "Disfrazamos" a los kinesiólogos para que el HTML los lea igual que a los profes
      const kinesMapeados = kinesBrutos.map((kine: any) => ({
        id: kine.id,
        nombre: kine.nombre,
        apellido: kine.apellido,
        email: kine.email,
        foto_url: kine.foto_url, 
        tipo_profesor: 'Kinesiólogo' // Forzamos la etiqueta para la tarjeta
      }));

      // 🤝 Unimos ambos arreglos en uno solo
      this.profesores = [...profes, ...kinesMapeados];
      
      // Despierta a Angular para que dibuje las tarjetas
      this.cdr.detectChanges(); 

    } catch (err) {
      console.error(err);
      this.errorMessage = 'Error de conexión con el servidor.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // Último despertar para quitar el spinner
    }
  }
}