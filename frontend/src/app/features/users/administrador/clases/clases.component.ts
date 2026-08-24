import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';

import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { Clase, FiltrosClase } from '../../../../core/domains/academico/clases/models/clase.interface';

import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { Grupo } from '../../../../core/domains/academico/grupos/models/grupo.interface';

import { AsistenciaService } from '../../../../core/domains/academico/asistencias/services/asistencia.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

@Component({
  selector: 'app-administrador-clases',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, SelectModule, TagModule, ToastModule,
    ConfirmDialogModule, DatePickerModule, CheckboxModule, TooltipModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './clases.component.html',
  styleUrls: ['./clases.component.scss']
})
export class AdministradorClasesComponent implements OnInit {

  private claseService = inject(ClaseService);
  private grupoService = inject(GrupoService);
  private asistenciaService = inject(AsistenciaService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  clases: Clase[] = [];
  totalRegistros: number = 0;
  grupos: Grupo[] = [];

  loading: boolean = true;
  displayAttendanceDialog: boolean = false;
  displayPlan: boolean = false;

  filtroFecha: Date | null = null;
  filtroGrupoId: number | null = null;
  filtroLugar: string = '';

  claseSeleccionada: Clase | null = null;
  selectedClase: Clase | null = null;
  alumnosAsistencia: any[] = [];

  loadingAsistencia: boolean = false;

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading = true;
    this.cdr.detectChanges();

    this.grupoService.listarGrupos().subscribe({
      next: (data) => {
        this.grupos = data;
        this.aplicarFiltros();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros() {
    this.loading = true;
    this.cdr.detectChanges();

    const filtros: FiltrosClase = {
      grupoId: this.filtroGrupoId || undefined,
      desde: this.filtroFecha ? this.formatearFecha(this.filtroFecha) : undefined,
      lugar: this.filtroLugar?.trim() || undefined,
      limite: 100
    };

    this.claseService.listarClases(filtros).subscribe({
      next: (response) => {
        this.clases = response.registros;
        this.totalRegistros = response.total;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las clases' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroGrupoId = null;
    this.filtroLugar = '';
    this.aplicarFiltros();
  }

  obtenerNombreGrupo(grupoId: number): string {
    return this.grupos.find(g => g.id === grupoId)?.nombre || `Grupo #${grupoId}`;
  }

  // --- VER PLANIFICACIÓN (SOLO LECTURA) ---
  verPlanificacion(clase: Clase) {
    this.selectedClase = clase;
    this.displayPlan = true;
  }

  // --- VER ASISTENCIA (SOLO LECTURA) ---
  verAsistencia(clase: Clase) {
    this.claseSeleccionada = clase;
    this.displayAttendanceDialog = true;
    this.loadingAsistencia = true;
    this.alumnosAsistencia = [];
    this.cdr.detectChanges();

    if (!clase.grupo_id || !clase.id) {
      this.loadingAsistencia = false;
      this.cdr.detectChanges();
      return;
    }

    forkJoin({
      estudiantes: this.estudianteService.listarEstudiantes({ grupoIds: [clase.grupo_id], limite: 1000, activo: true }),
      asistenciasGuardadas: this.asistenciaService.listarPorClase(clase.id)
    }).subscribe({
      next: ({ estudiantes, asistenciasGuardadas }) => {

        const asistenciasMap = new Map();
        asistenciasGuardadas.forEach(a => asistenciasMap.set(a.estudiante_id, a.presente));

        this.alumnosAsistencia = estudiantes.registros.map(est => {
          const idUsuario = est.perfil ? est.perfil.id_usuario : est.usuario_id;
          const nombre = est.perfil ? est.perfil.nombre : (est as any).nombre;
          const apellido = est.perfil ? est.perfil.apellido : (est as any).apellido;

          return {
            estudianteId: idUsuario,
            nombre: nombre,
            apellido: apellido,
            presente: asistenciasMap.has(idUsuario) ? asistenciasMap.get(idUsuario) : false
          };
        });

        this.loadingAsistencia = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la asistencia' });
        this.loadingAsistencia = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- ELIMINAR (ÚNICA ACCIÓN DE ESCRITURA PERMITIDA) ---
  eliminarClase(id: number) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar esta clase y su asistencia? Esta acción no se puede deshacer.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.claseService.eliminarClase(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'Clase eliminada' });
            this.aplicarFiltros();
          },
          error: (err) => {
            const msg = err.error?.message || 'No se pudo eliminar la clase';
            this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
          }
        });
      }
    });
  }

  formatearFecha(date: any): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-${('0' + d.getDate()).slice(-2)}`;
    } catch (e) {
      return '';
    }
  }
}