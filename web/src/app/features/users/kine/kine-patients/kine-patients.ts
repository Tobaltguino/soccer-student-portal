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

import { SupabaseService } from '../../../../core/services/supabase.service';

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
    private supabase: SupabaseService,
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
    const resGrupos = await this.supabase.getGrupos();
    if(resGrupos.data) this.listaGrupos = resGrupos.data;
    
    const resPos = await this.supabase.getPosiciones();
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
      const authData = await this.supabase.getUser();
      const userId = authData.data.user?.id;

      if (!userId) return;

      const res = await this.supabase.getEstudiantesDeKine(userId); 
      
      if (res?.data) {
        this.dataList = res.data;
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

  // ✅ FUNCIÓN ACTUALIZADA PARA ABRIR LA FICHA Y CARGAR EL HISTORIAL
  async verDetalle(estudiante: any) {
    this.selectedEstudiante = estudiante;
    this.displayDetalle = true;
    this.loadingHistorial = true;
    this.historialClinico = [];
    this.cdr.detectChanges();

    try {
        const res = await this.supabase.getHistorialClinico(estudiante.id);
        this.historialClinico = res.data || [];
    } catch (error) {
        console.error("Error cargando historial", error);
    } finally {
        this.loadingHistorial = false;
        this.cdr.detectChanges();
    }
  }

  // ✅ HELPER PARA COLORES DEL HISTORIAL (Tipado estricto)
  getSeveridadHistorial(tipo: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
      if (tipo === 'LESION') return 'danger';
      if (tipo === 'ALERGIA') return 'warning';
      return 'info'; // PATOLOGIA
  }

  // ✅ HELPER PARA EL ESTADO DE LA LESIÓN (Tipado estricto)
  getSeveridadEstado(estado: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
      if (estado === 'RECUPERADO') return 'success';
      if (estado === 'ACTIVO') return 'danger';
      return 'warning'; // EN_TRATAMIENTO
  }
}