import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { AuthService } from '../../../../core/services/auth.service';
import { KinesiologiaService } from '../../../../core/services/modulos/salud/kine.service';
import { ClasesService } from '../../../../core/services/modulos/academico/clases.service';

@Component({
  selector: 'app-kine-classes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, 
    DialogModule, InputTextModule, DatePickerModule, SelectModule, 
    TooltipModule
  ],
  templateUrl: './kine-classes.html',
  styleUrls: ['./kine-classes.css']
})
export class KineClassesComponent implements OnInit {
  // Datos
  grupos: any[] = [];
  selectedGrupoId: string = '';
  clases: any[] = [];
  clasesOriginales: any[] = [];
  
  // Estados
  loading: boolean = true;
  
  // Filtros
  filtroFecha: Date | null = null;
  filtroLugar: string = '';

  // Vista de detalles (Planificación)
  displayPlan: boolean = false;
  selectedClase: any = null;

  constructor(
    private authService: AuthService,
    private kinesiologiaService: KinesiologiaService,
    private clasesService: ClasesService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarGrupos();
  }

  // --- CARGA DE DATOS ---
  async cargarGrupos() {
    this.loading = true;
    try {
      const { data: { user } } = await this.authService.getUser();
      if (!user || !user.email) return;

      const { data: kine } = await this.kinesiologiaService.getKineByEmail(user.email);

      if (kine) {
        const { data: gruposData } = await this.kinesiologiaService.getGruposDeKine(kine.id);

        if (gruposData && gruposData.length > 0) {
          this.grupos = gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null);
          if (this.grupos.length > 0) {
            this.selectedGrupoId = this.grupos[0].id;
            await this.cargarClasesPorGrupo();
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar grupos del kine:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async cargarClasesPorGrupo() {
    if (!this.selectedGrupoId) return;
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.clasesService.getClasesPorGrupo(this.selectedGrupoId);

      if (error) throw error;

      this.clasesOriginales = (data || []).sort((a: any, b: any) => {
        const tiempoA = new Date(`${a.fecha}T${a.hora}`).getTime();
        const tiempoB = new Date(`${b.fecha}T${b.hora}`).getTime();
        return tiempoB - tiempoA;
      });

      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar clases:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onGrupoChange() {
    this.cargarClasesPorGrupo();
  }

  // --- UTILIDADES Y VISTAS ---
  verPlanificacion(clase: any) {
    this.selectedClase = clase;
    this.displayPlan = true;
  }

  aplicarFiltros() {
    this.clases = this.clasesOriginales.filter(clase => {
      let cumpleFecha = true;
      let cumpleLugar = true;

      if (this.filtroFecha) {
        cumpleFecha = (clase.fecha ? clase.fecha.substring(0, 10) : '') === this.formatearFecha(this.filtroFecha);
      }
      if (this.filtroLugar && this.filtroLugar.trim() !== '') {
        cumpleLugar = (clase.lugar || '').toLowerCase().includes(this.filtroLugar.toLowerCase());
      }
      return cumpleFecha && cumpleLugar;
    });
    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroLugar = '';
    this.clases = [...this.clasesOriginales];
    this.cdr.detectChanges();
  }

  formatearFecha(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
}