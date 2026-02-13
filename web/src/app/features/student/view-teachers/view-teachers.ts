import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-view-teachers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-teachers.html',
  styleUrl: './view-teachers.css'
})
export class ViewTeachersComponent implements OnInit {
  loading: boolean = true;
  profesores: any[] = [];
  errorMessage: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarProfesores();
  }

  async cargarProfesores() {
    this.loading = true;
    this.errorMessage = '';

    try {
      // 1. Obtener usuario actual
      const { data: { user } } = await this.supabaseService.getUser();
      
      if (!user) {
        this.errorMessage = 'Sesión no válida.';
        return;
      }

      // 2. Usar la NUEVA función del servicio
      const { data, error } = await this.supabaseService.getProfesoresDeEstudiante(user.id);

      if (error) {
        this.errorMessage = 'No pudimos cargar la información de tus profesores.';
      } else {
        this.profesores = data || [];
      }

    } catch (err) {
      console.error('Error inesperado:', err);
      this.errorMessage = 'Ocurrió un error de conexión.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}