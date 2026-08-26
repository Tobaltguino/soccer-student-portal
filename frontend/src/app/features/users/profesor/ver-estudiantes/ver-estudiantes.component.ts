import { Component, OnInit, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { FilterService } from 'primeng/api';

import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';
import { Grupo } from '../../../../core/domains/academico/grupos/models/grupo.interface';

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
  styleUrls: ['./ver-estudiantes.component.scss']
})
export class ProfesorVerEstudiantesComponent implements OnInit {
  @ViewChild('dt') dt: Table | undefined;

  private estudianteService = inject(EstudianteService);
  private grupoService = inject(GrupoService);
  private historialClinicoService = inject(HistorialClinicoService);
  private cdr = inject(ChangeDetectorRef);
  private filterService = inject(FilterService);

  dataList: any[] = []; 
  listaGrupos: Grupo[] = [];
  listaPosiciones: any[] = [
    { id: 'portero', nombre: 'Portero' },
    { id: 'defensa', nombre: 'Defensa' },
    { id: 'mediocampista', nombre: 'Mediocampista' },
    { id: 'delantero', nombre: 'Delantero' }
  ];
  
  opcionesEstado = [
    { label: 'Activos', value: true },
    { label: 'Inactivos', value: false }
  ];

  filtros: any = {
    global: '',
    grupo: null,
    posicion: null,
    estado: null
  };

  loading: boolean = false;
  displayDetalle: boolean = false;
  selectedEstudiante: any = null;

  // Ahora solo estado general, sin detalle clínico
  loadingEstadoSalud: boolean = false;
  estadoSaludDetalle: string = 'SANO';

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

    this.estudianteService.obtenerEstudiantesDeMiGrupo().subscribe({
      next: (data) => {
        const listaBase = data.map((est: any) => ({
          ...est,
          ...(est.perfil ? est.perfil : {})
        }));

        // Traemos el estado de salud general real de todos de una vez
        this.historialClinicoService.obtenerEstadoSaludGrupal().subscribe({
          next: (mapaEstados) => {
            this.dataList = listaBase.map((est: any) => {
              const userId = est.id_usuario || est.usuario_id || est.id;
              return {
                ...est,
                estado_salud: mapaEstados[userId] || 'SANO'
              };
            });
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            // Si falla el estado de salud, igual mostramos la lista con "SANO" por defecto
            this.dataList = listaBase.map((est: any) => ({ ...est, estado_salud: 'SANO' }));
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
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
    this.loadingEstadoSalud = true;
    this.estadoSaludDetalle = 'SANO';
    this.cdr.detectChanges();

    const userId = estudiante.id_usuario || estudiante.usuario_id || estudiante.id;

    this.historialClinicoService.obtenerEstadoSalud(userId).subscribe({
      next: (res) => {
        this.estadoSaludDetalle = res.estado || 'SANO';
        this.loadingEstadoSalud = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error cargando estado de salud", err);
        this.loadingEstadoSalud = false;
        this.cdr.detectChanges();
      }
    });
  }

  getGrupoNombre(grupoId: number): string {
    const grupo = this.listaGrupos.find(g => g.id === grupoId);
    return grupo ? grupo.nombre : 'Sin Grupo';
  }

  getSeveridadEstado(estado: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
      if (!estado || estado.toUpperCase() === 'SANO' || estado.toUpperCase() === 'RECUPERADO') return 'success';
      
      switch (estado.toUpperCase()) {
          case 'EN_REINTEGRO_DEPORTIVO': return 'info';
          case 'EN_OBSERVACION': return 'warn';
          case 'EN_TRATAMIENTO': return 'danger';
          default: return 'secondary'; 
      }
  }

  formatEstadoSalud(estado: string): string {
      if (!estado || estado === 'SANO') return 'Sano';
      return estado.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  }
}