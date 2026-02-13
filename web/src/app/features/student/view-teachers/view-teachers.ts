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
    this.cdr.detectChanges(); // ✅ Despierta a Angular para mostrar el spinner

    try {
      const { data: { user } } = await this.supabaseService.getUser();
      if (!user) return;

      const { data, error } = await this.supabaseService.getProfesoresDeEstudiante(user.id);

      if (error) {
        this.errorMessage = 'Error al cargar profesores';
      } else {
        this.profesores = data || [];
        // ✅ IMPORTANTE: Despierta a Angular aquí para que cargue las imágenes
        this.cdr.detectChanges(); 
      }
    } catch (err) {
      this.errorMessage = 'Error de conexión';
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // ✅ Último despertar para quitar el spinner
    }
  }
}