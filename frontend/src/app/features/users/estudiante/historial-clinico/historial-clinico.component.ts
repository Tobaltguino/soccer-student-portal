import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core'; // 🔥 Agregado ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { MessageService, ConfirmationService } from 'primeng/api'; 

// Módulos de PrimeNG
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog'; 

// Nuevos Servicios de Dominio
import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';
import { TipoHistorialClinico, EstadoHistorialClinico, HistorialClinico } from "../../../../core/domains/salud/kinesiologia/historial-clinico/models/historial-clinico.interface";

@Component({
  selector: 'app-estudiante-historial-clinico',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ToastModule,
    ConfirmDialogModule 
  ],
  providers: [MessageService, ConfirmationService], 
  templateUrl: './historial-clinico.component.html',
  styleUrls: ['./historial-clinico.component.scss'] 
})
export class EstudianteHistorialClinicoComponent implements OnInit {

  readonly TipoHistorialClinico = TipoHistorialClinico;
  readonly EstadoHistorialClinico = EstadoHistorialClinico;

  private historialService = inject(HistorialClinicoService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef); // 🔥 Inyectado

  listaLesiones: HistorialClinico[] = [];
  cargandoLesiones: boolean = false;

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

  cargarListaLesiones() {
    this.cargandoLesiones = true;
    this.cdr.detectChanges(); // 🔥 Forzamos detección al iniciar carga
    
    this.historialService.listarMiHistorial().subscribe({
      next: (data) => {
        this.listaLesiones = data || [];
        this.cargandoLesiones = false;
        this.cdr.detectChanges(); // 🔥 Forzamos detección al recibir datos
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar tu historial médico.' });
        this.cargandoLesiones = false;
        this.cdr.detectChanges(); // 🔥 Forzamos detección en caso de error
      }
    });
  }

  getTipoLabel(tipo: string): string {
    const opt = this.opcionesTipoLesion.find(o => o.value === tipo);
    return opt ? opt.label : tipo;
  }

  getEstadoLabel(estado: string): string {
    const opt = this.opcionesEstadoLesion.find(o => o.value === estado);
    return opt ? opt.label : estado;
  }
}