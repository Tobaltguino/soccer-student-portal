import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-student-classes',
  standalone: true,
  imports: [
    CommonModule, 
    TableModule, 
    TagModule, 
    ButtonModule, 
    DialogModule, 
    InputTextModule, 
    DatePickerModule, 
    FormsModule
  ],
  templateUrl: './student-classes.html',
  styleUrls: ['./student-classes.css']
})
export class StudentClassesComponent implements OnInit {
  clases: any[] = [];
  loading: boolean = true;
  filtroFecha: Date | null = null;
  
  displayPlan: boolean = false;
  selectedClase: any = null;

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarClases();
  }

  async cargarClases() {
    this.loading = true;
    try {
      const { data: { user } } = await this.supabaseService.getUser();
      if (user) {
        // 1. Calculamos la fecha límite (6 meses atrás desde hoy)
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
        const fechaLimiteStr = seisMesesAtras.toISOString().split('T')[0];

        // 2. Pedimos los datos filtrados por fecha desde el servidor
        const { data, error } = await this.supabaseService.getClasesAlumno(user.id, fechaLimiteStr);
        
        if (error) throw error;

        // 3. Ordenamiento cronológico descendente (Más reciente arriba)
        this.clases = (data || []).sort((a, b) => {
          const tiempoA = new Date(`${a.fecha}T${a.hora}`).getTime();
          const tiempoB = new Date(`${b.fecha}T${b.hora}`).getTime();
          return tiempoB - tiempoA;
        });
      }
    } catch (error) {
      console.error('Error al cargar clases:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  verPlanificacion(clase: any) {
    this.selectedClase = clase;
    this.displayPlan = true;
  }

  getAsistenciaLabel(presente: any): string {
    if (presente === true) return 'Presente';
    if (presente === false) return 'Ausente';
    return 'Pendiente';
  }

  getAsistenciaSeverity(presente: any): 'success' | 'danger' | 'secondary' {
    if (presente === true) return 'success';
    if (presente === false) return 'danger';
    return 'secondary';
  }
}