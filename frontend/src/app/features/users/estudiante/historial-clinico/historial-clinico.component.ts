import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api'; 

// Módulos de PrimeNG
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

// Nuevos Servicios de Dominio
import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';
import {TipoHistorialClinico, EstadoHistorialClinico, HistorialClinico } from "../../../../core/domains/salud/kinesiologia/historial-clinico/models/historial-clinico.interface";


@Component({
  selector: 'app-estudiante-historial-clinico',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './historial-clinico.component.html',
  styleUrls: ['./historial-clinico.component.css']
})
export class EstudianteHistorialClinicoComponent implements OnInit {

  // ✅ Exponemos los Enums para usarlos en el HTML
  readonly TipoHistorialClinico = TipoHistorialClinico;
  readonly EstadoHistorialClinico = EstadoHistorialClinico;

  private historialService = inject(HistorialClinicoService);
  private messageService = inject(MessageService);

  listaLesiones: HistorialClinico[] = [];
  cargandoLesiones: boolean = false;

  // Diccionarios para etiquetas limpias
  opcionesTipoLesion = [
    { label: 'Lesión', value: TipoHistorialClinico.LESION },
    { label: 'Patología', value: TipoHistorialClinico.PATOLOGIA },
    { label: 'Alergia', value: TipoHistorialClinico.ALERGIA }
  ];

  opcionesEstadoLesion = [
    { label: 'En Observación', value: EstadoHistorialClinico.EN_OBSERVACION },
    { label: 'En Tratamiento', value: EstadoHistorialClinico.EN_TRATAMIENTO },
    { label: 'En Reintegro Deportivo', value: EstadoHistorialClinico.EN_REINTEGRO_DEPORTIVO },
    { label: 'Recuperado', value: EstadoHistorialClinico.RECUPERADO }
  ];

  ngOnInit() {
    this.cargarListaLesiones();
  }

  // ==========================================
  // CARGA DE HISTORIAL (AUTOMÁTICA POR JWT)
  // ==========================================
  cargarListaLesiones() {
    this.cargandoLesiones = true;
    
    // ✅ El backend ya sabe quién soy por mi Token
    this.historialService.listarMiHistorial().subscribe({
      next: (data) => {
        this.listaLesiones = data || [];
        this.cargandoLesiones = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar tu historial médico.' });
        this.cargandoLesiones = false;
      }
    });
  }

  // ==========================================
  // HELPERS UI
  // ==========================================
  getTipoLabel(tipo: string): string {
    const opt = this.opcionesTipoLesion.find(o => o.value === tipo);
    return opt ? opt.label : tipo;
  }

  getEstadoLabel(estado: string): string {
    const opt = this.opcionesEstadoLesion.find(o => o.value === estado);
    return opt ? opt.label : estado;
  }
}