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
import { KinesiologiaService } from '../../../../core/services/modulos/salud/kine.service';
import { UsuariosService } from '../../../../core/services/modulos/administracion/usuarios.service';
import { GruposService } from '../../../../core/services/modulos/academico/grupos.service';

@Component({
  selector: 'app-kine-patients',
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
  templateUrl: './kine-patients.html',
  styleUrls: ['./kine-patients.css']
})
export class KinePatientsComponent implements OnInit {
  @ViewChild('dt') dt: Table | undefined;

  dataList: any[] = []; 
  listaGrupos: any[] = [];
  listaPosiciones: any[] = [];
  
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
  
  // --- VARIABLES PARA LA FICHA MÉDICA ---
  displayDetalle: boolean = false;
  selectedEstudiante: any = null;
  historialClinico: any[] = [];
  loadingHistorial: boolean = false;

  constructor(
    private authService: AuthService,
    private kinesiologiaService: KinesiologiaService,
    private usuariosService: UsuariosService,
    private gruposService: GruposService,
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
    const resGrupos = await this.gruposService.getGrupos();
    if(resGrupos.data) this.listaGrupos = resGrupos.data;
    
    const resPos = await this.usuariosService.getPosiciones();
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

      const { data: kine } = await this.kinesiologiaService.getKineByEmail(user.email);
      if (!kine) return;

      const { data: gruposData } = await this.kinesiologiaService.getGruposDeKine(kine.id);
      if (!gruposData || gruposData.length === 0) return;

      const grupoIds = gruposData.map((g: any) => g.grupo_id);

      const res = await this.usuariosService.getTodosEstudiantesPorGrupos(grupoIds); 
      
      if (res?.data) {
          const estudiantes = res.data;
          const alumnoIds = estudiantes.map((e: any) => e.id);

          const { data: historiales } = await this.kinesiologiaService.getEstadosClinicosAlumnos(alumnoIds);
          
          this.dataList = estudiantes.map((est: any) => {
              const miHistorial = historiales?.filter((h: any) => h.estudiante_id === est.id) || [];
              
              if (miHistorial.length > 0) {
                 // Si la persona tiene más de un estado clínico activo, le damos prioridad al peor estado para la alerta visual en tabla
                 if (miHistorial.some((h: any) => h.estado === 'EN_TRATAMIENTO')) est.estado_salud = 'EN_TRATAMIENTO';
                 else if (miHistorial.some((h: any) => h.estado === 'EN_OBSERVACION')) est.estado_salud = 'EN_OBSERVACION';
                 else if (miHistorial.some((h: any) => h.estado === 'EN_REINTEGRO_DEPORTIVO')) est.estado_salud = 'EN_REINTEGRO_DEPORTIVO';
                 else est.estado_salud = 'SANO';
              } else {
                 est.estado_salud = 'SANO';
              }
              return est;
          });
      }
    } catch (error) {
      console.error('Error al cargar pacientes del kine:', error);
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
        const res = await this.kinesiologiaService.getHistorialClinico(estudiante.id);
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