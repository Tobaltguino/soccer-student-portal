import { Component, OnInit, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
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

// Nuevos Servicios de Dominio
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';
import { Grupo } from '../../../../core/domains/academico/grupos/models/grupo.interface';
import { HistorialClinico } from '../../../../core/domains/salud/kinesiologia/historial-clinico/models/historial-clinico.interface';

@Component({
  selector: 'app-profesor-ver-estudiantes',
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
  templateUrl: './ver-estudiantes.component.html',
  styleUrls: ['./ver-estudiantes.component.scss'] // 🔥 Cambiado a .scss
})
export class ProfesorVerEstudiantesComponent implements OnInit {
  @ViewChild('dt') dt: Table | undefined;

  // --- SERVICIOS INYECTADOS ---
  private estudianteService = inject(EstudianteService);
  private grupoService = inject(GrupoService);
  private historialClinicoService = inject(HistorialClinicoService);
  private cdr = inject(ChangeDetectorRef);
  private filterService = inject(FilterService);

  // --- DATOS ---
  dataList: any[] = []; 
  listaGrupos: Grupo[] = [];
  listaPosiciones: any[] = [
    { id: 'portero', nombre: 'Portero' },
    { id: 'defensa', nombre: 'Defensa' },
    { id: 'mediocampista', nombre: 'Mediocampista' },
    { id: 'delantero', nombre: 'Delantero' }
  ];
  
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
  historialClinico: HistorialClinico[] = [];
  loadingHistorial: boolean = false;

  ngOnInit() {
    this.configurarFiltrosPersonalizados();
    this.cargarMaestros();
    this.cargarDatos();
  }

  configurarFiltrosPersonalizados() {
    this.filterService.register('contienePosicion', (value: any, filter: any): boolean => {
      if (!filter || filter.length === 0) return true;
      if (!value) return false;
      return value.some((p: string) => filter.includes(p));
    });
  }

  cargarMaestros() {
    this.grupoService.listarGrupos().subscribe({
      next: (data) => {
        this.listaGrupos = data;
        this.cdr.detectChanges();
      }
    });
  }

  limpiarFiltros() {
    this.filtros = { global: '', grupo: null, posicion: null, estado: null };
    if (this.dt) this.dt.reset();
  }

  cargarDatos() {
    this.loading = true;
    this.dataList = [];

    // Llamamos al endpoint veloz que devuelve solo los estudiantes del profesor
    this.estudianteService.obtenerEstudiantesDeMiGrupo().subscribe({
      next: (data) => {
        // Aplanamos la data si viene estructurada como EstudianteConPerfil
        this.dataList = data.map((est: any) => {
          const flatEst = {
            ...est,
            ...(est.perfil ? est.perfil : {})
          };
          
          // Por defecto asumimos que están sanos si el backend no manda un estado general
          if (!flatEst.estado_salud) {
            flatEst.estado_salud = 'SANO';
          }
          return flatEst;
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar alumnos del profesor:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
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

  verDetalle(estudiante: any) {
    this.selectedEstudiante = estudiante;
    this.displayDetalle = true;
    this.loadingHistorial = true;
    this.historialClinico = [];
    this.cdr.detectChanges();

    const userId = estudiante.id_usuario || estudiante.usuario_id || estudiante.id;

    this.historialClinicoService.listarHistorialPorEstudiante(userId).subscribe({
      next: (data) => {
        this.historialClinico = data || [];
        this.loadingHistorial = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error cargando historial", err);
        this.loadingHistorial = false;
        this.cdr.detectChanges();
      }
    });
  }

  getGrupoNombre(grupoId: number): string {
    const grupo = this.listaGrupos.find(g => g.id === grupoId);
    return grupo ? grupo.nombre : 'Sin Grupo';
  }

  getSeveridadHistorial(tipo: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
      if (tipo === 'LESION') return 'danger';
      if (tipo === 'ALERGIA') return 'warn';
      return 'info'; 
  }

  getSeveridadEstado(estado: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
      if (!estado || estado.toUpperCase() === 'SANO' || estado.toUpperCase() === 'RECUPERADO') return 'success';
      
      switch (estado.toUpperCase()) {
          case 'EN_REINTEGRO_DEPORTIVO': return 'info';
          case 'EN_OBSERVACION': return 'warn'; // 🔥 CORREGIDO para evitar el error de PrimeNG
          case 'EN_TRATAMIENTO': return 'danger';
          default: return 'secondary'; 
      }
  }

  formatEstadoSalud(estado: string): string {
      if (!estado || estado === 'SANO') return 'Sano';
      return estado.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  }
}