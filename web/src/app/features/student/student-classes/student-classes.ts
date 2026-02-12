import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-student-classes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, 
    DialogModule, InputTextModule, DatePickerModule, SelectModule, TooltipModule
  ],
  templateUrl: './student-classes.html',
  styleUrls: ['./student-classes.css']
})
export class StudentClassesComponent implements OnInit {
  clases: any[] = [];
  clasesOriginales: any[] = [];
  loading: boolean = true;
  
  filtroFecha: Date | null = null;
  filtroLugar: string = '';
  filtroAsistencia: any = null;

  opcionesAsistencia = [
    { label: 'Presente', value: true },
    { label: 'Ausente', value: false },
    { label: 'Pendiente', value: 'null' }
  ];

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
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
        const fechaLimiteStr = seisMesesAtras.toISOString().split('T')[0];

        const { data, error } = await this.supabaseService.getClasesAlumno(user.id, fechaLimiteStr);
        if (error) throw error;

        this.clasesOriginales = (data || []).sort((a, b) => {
          const tiempoA = new Date(`${a.fecha}T${a.hora}`).getTime();
          const tiempoB = new Date(`${b.fecha}T${b.hora}`).getTime();
          return tiempoB - tiempoA;
        });

        this.aplicarFiltros();
      }
    } catch (error) {
      console.error('Error al cargar clases:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  aplicarFiltros() {
    this.clases = this.clasesOriginales.filter(clase => {
      let cumpleFecha = true;
      let cumpleLugar = true;
      let cumpleAsistencia = true;

      if (this.filtroFecha) {
        const fechaBusqueda = this.formatearFecha(this.filtroFecha);
        const fechaClase = clase.fecha ? clase.fecha.substring(0, 10) : '';
        cumpleFecha = fechaClase === fechaBusqueda;
      }

      if (this.filtroLugar && this.filtroLugar.trim() !== '') {
        const lugarClase = (clase.lugar || '').toLowerCase();
        const busqueda = this.filtroLugar.toLowerCase();
        cumpleLugar = lugarClase.includes(busqueda);
      }

      if (this.filtroAsistencia !== null) {
        if (this.filtroAsistencia === 'null') {
          cumpleAsistencia = clase.presente === null || clase.presente === undefined;
        } else {
          cumpleAsistencia = clase.presente === this.filtroAsistencia;
        }
      }

      return cumpleFecha && cumpleLugar && cumpleAsistencia;
    });
    
    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroLugar = '';
    this.filtroAsistencia = null;
    this.clases = [...this.clasesOriginales];
    this.cdr.detectChanges();
  }

  formatearFecha(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
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