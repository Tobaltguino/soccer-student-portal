import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api'; 

import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog'; 
import { TagModule } from 'primeng/tag';

import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';
import { TipoHistorialClinico, EstadoHistorialClinico } from "../../../../core/domains/salud/kinesiologia/historial-clinico/models/historial-clinico.interface";
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

@Component({
  selector: 'app-administrador-historial-clinico',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    TagModule
  ],
  providers: [MessageService, ConfirmationService], 
  templateUrl: './historial-clinico.component.html',
  styleUrls: ['./historial-clinico.component.scss']
})
export class AdministradorHistorialClinicoComponent implements OnInit {

  readonly TipoHistorialClinico = TipoHistorialClinico;
  readonly EstadoHistorialClinico = EstadoHistorialClinico;

  private historialService = inject(HistorialClinicoService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;

  listaLesiones: any[] = [];
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
    this.cargarTodosLosAlumnos(); 
  }

  cargarTodosLosAlumnos() {
    this.estudianteService.listarEstudiantes({ limite: 2000, activo: true }).subscribe({
      next: (res) => {
        const alumnosBD = res.registros || [];
        this.listaAlumnos = alumnosBD.map((a: any) => {
          const nombre = a.perfil ? a.perfil.nombre : a.nombre;
          const apellido = a.perfil ? a.perfil.apellido : a.apellido;
          const rut = a.perfil?.rut || a.rut;
          const idUsuario = a.perfil ? a.perfil.id_usuario : a.usuario_id || a.id;
          
          return {
            id: idUsuario,
            nombreCompleto: `${nombre} ${apellido} ${rut ? '('+rut+')' : ''}`
          };
        });
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los pacientes.' });
        this.cdr.detectChanges();
      }
    });
  }

  onAlumnoChange() {
    if (this.alumnoSeleccionado) {
      this.cargarListaLesiones();
    } else {
      this.listaLesiones = [];
      this.cdr.detectChanges();
    }
  }

  cargarListaLesiones() {
    this.cargandoLesiones = true;
    this.cdr.detectChanges();

    this.historialService.listarHistorialPorEstudiante(this.alumnoSeleccionado.id).subscribe({
      next: (data) => {
        this.listaLesiones = data || [];
        this.cargandoLesiones = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial clínico.' });
        this.cargandoLesiones = false;
        this.cdr.detectChanges();
      }
    });
  }

  confirmarEliminarLesion(lesion: any) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar este registro de ${this.getTipoLabel(lesion.tipo)}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.historialService.eliminarHistorial(lesion.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro eliminado exitosamente.' });
            this.cargarListaLesiones(); 
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el registro.' });
          }
        });
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

  getSeveridadEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (estado) {
        case EstadoHistorialClinico.RECUPERADO: return 'success';
        case EstadoHistorialClinico.EN_REINTEGRO_DEPORTIVO: return 'info';
        case EstadoHistorialClinico.EN_TRATAMIENTO: return 'danger';
        case EstadoHistorialClinico.EN_OBSERVACION: return 'warn';
        default: return 'secondary';
    }
  }
}