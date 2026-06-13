import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { FilterService } from 'primeng/api';

import { AuthService } from '../../../../core/services/auth.service';
import { AcademyService } from '../../../../shared/services/academy.service';
import { HealthService } from '../../../../shared/services/health.service';

@Component({
  selector: 'app-professor-view-students',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TableModule, 
    ButtonModule, 
    DialogModule, 
    InputTextModule, 
    SelectModule, 
    MultiSelectModule, 
    TagModule, 
    TooltipModule
  ],
  providers: [FilterService],
  templateUrl: './professor-view-students.html',
  styleUrls: ['./professor-view-students.css']
})
export class ProfessorViewStudentsComponent implements OnInit {
  @ViewChild('dt') dt: Table | undefined;

  // --- DATOS ---
  dataList: any[] = []; 
  listaGrupos: any[] = [];
  listaPosiciones: any[] = [];
  
  // --- CONFIGURACIÓN DE VISTA ---
  opcionesEstado = [
    { label: 'Activos', value: true },
    { label: 'Inactivos', value: false }
  ];

  // --- FILTROS ---
  filtros: any = {
    global: '',
    grupo: null,
    posicion: null,
    estado: null
  };

  // --- ESTADOS UI ---
  loading: boolean = false;
  displayDetalle: boolean = false;
  selectedEstudiante: any = null;

  // --- VARIABLES PARA LA FICHA MÉDICA ---
  historialClinico: any[] = [];
  loadingHistorial: boolean = false;

  constructor(
    private authService: AuthService,
    private academyService: AcademyService,
    private healthService: HealthService,
    private cdr: ChangeDetectorRef,
    private filterService: FilterService
  ) {}

  ngOnInit() {
    this.configurarFiltrosPersonalizados();
    this.cargarMaestros();
    this.cargarDatos();
  }

  configurarFiltrosPersonalizados() {
    this.filterService.register('contienePosicion', (value: any, filter: any): boolean => {
      if (filter === undefined || filter === null || filter.length === 0) return true;
      if (value === undefined || value === null) return false;
      return value.some((p: any) => filter.includes(p.posicion_id));
    });
  }

  async cargarMaestros() {
    const resGrupos = await this.academyService.getGrupos();
    if(resGrupos.data) this.listaGrupos = resGrupos.data;
    
    const resPos = await this.academyService.getPosiciones();
    if(resPos.data) this.listaPosiciones = resPos.data;

    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.filtros = { global: '', grupo: null, posicion: null, estado: null };
    if (this.dt) this.dt.reset();
  }

  async cargarDatos() {
    this.loading = true;
    this.dataList = [];
    this.cdr.detectChanges();

    try {
      const { data: { user } } = await this.authService.getUser();
      if (!user || !user.email) return;

      const { data: prof } = await this.academyService.getProfesorByEmail(user.email);
      if (!prof) return;

      const res = await this.academyService.getEstudiantesPorEncargado('grupos_profesores', 'profesor_id', prof.id); 
      
      if (res?.data) {
          const now = new Date().getTime();
          
          // Mapeamos los estudiantes para ir a buscar su salud
          const promesasConSalud = res.data.map(async (estudiante: any) => {
              try {
                  const historialRes = await this.healthService.getHistorialClinico(estudiante.id);
                  const historial = historialRes.data || [];
                  
                  if (historial.length > 0) {
                      // Ordenamos para dejar el evento más reciente primero
                      historial.sort((a: any, b: any) => {
                          const diffA = Math.abs(now - new Date(a.fecha_evento).getTime());
                          const diffB = Math.abs(now - new Date(b.fecha_evento).getTime());
                          return diffA - diffB;
                      });
                      
                      estudiante.estado_salud = historial[0].estado;
                  } else {
                      estudiante.estado_salud = 'SANO';
                  }
              } catch (e) {
                  estudiante.estado_salud = 'SANO'; // Fallback de seguridad
              }
              return estudiante;
          });
          
          this.dataList = await Promise.all(promesasConSalud);
      }
    } catch (error) {
      console.error('Error al cargar alumnos del profesor:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  calcularEdad(fecha: string | Date): number | null {
    if (!fecha) return null;
    const born = new Date(fecha);
    const today = new Date();
    let age = today.getFullYear() - born.getFullYear();
    const monthDiff = today.getMonth() - born.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age--;
    return age;
  }

  async verDetalle(estudiante: any) {
    this.selectedEstudiante = estudiante;
    this.displayDetalle = true;
    this.loadingHistorial = true;
    this.historialClinico = [];
    this.cdr.detectChanges();

    try {
        const res = await this.healthService.getHistorialClinico(estudiante.id);
        this.historialClinico = res.data || [];
    } catch (error) {
        console.error("Error cargando historial", error);
    } finally {
        this.loadingHistorial = false;
        this.cdr.detectChanges();
    }
  }

  getSeveridadHistorial(tipo: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
      if (tipo === 'LESION') return 'danger';
      if (tipo === 'ALERGIA') return 'warn';
      return 'info'; 
  }

  // --- Funciones de Salud actualizadas ---
  getSeveridadEstado(estado: any): any {
      if (!estado || estado.toUpperCase() === 'SANO' || estado.toUpperCase() === 'RECUPERADO') return 'success';
      
      switch (estado.toUpperCase()) {
          case 'EN_REINTEGRO_DEPORTIVO': return 'info';
          case 'EN_OBSERVACION': return 'warning';
          case 'EN_TRATAMIENTO': return 'danger';
          default: return 'secondary'; 
      }
  }

  formatEstadoSalud(estado: string): string {
      if (!estado || estado === 'SANO') return 'Sano';
      return estado.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  }
}