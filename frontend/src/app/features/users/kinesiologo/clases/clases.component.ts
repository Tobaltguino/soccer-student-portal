import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs'; 

// PrimeNG
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog'; 
import { CheckboxModule } from 'primeng/checkbox'; 
import { MessageService, ConfirmationService } from 'primeng/api'; 

// Dominios: Clases y Grupos
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { Clase, FiltrosClase } from '../../../../core/domains/academico/clases/models/clase.interface';
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { Grupo } from '../../../../core/domains/academico/grupos/models/grupo.interface';

// Dominios: Asistencia y Estudiantes
import { AsistenciaService } from '../../../../core/domains/academico/asistencias/services/asistencia.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

@Component({
  selector: 'app-kinesiologo-clases',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, 
    DialogModule, InputTextModule, DatePickerModule, SelectModule, 
    TooltipModule, ToastModule, ConfirmDialogModule, 
    CheckboxModule 
  ],
  providers: [MessageService, ConfirmationService], 
  templateUrl: './clases.component.html',
  styleUrls: ['./clases.component.scss'] 
})
export class KinesiologoClasesComponent implements OnInit {
  
  private claseService = inject(ClaseService);
  private grupoService = inject(GrupoService);
  private asistenciaService = inject(AsistenciaService); 
  private estudianteService = inject(EstudianteService); 
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);

  // Datos
  grupos: Grupo[] = [];
  selectedGrupoId: number | null = null;
  clases: Clase[] = [];
  totalRegistros: number = 0;
  
  // Estados
  loading: boolean = true;
  
  // Filtros
  filtroFecha: Date | null = null;
  filtroLugar: string = '';

  // Vista de detalles
  displayPlan: boolean = false;
  selectedClase: Clase | null = null;

  // Asistencia (Vista Solo Lectura)
  displayAttendanceDialog: boolean = false;
  alumnosAsistencia: any[] = [];
  loadingAsistencia: boolean = false;
  claseSeleccionadaAsistencia: Clase | null = null; // 🔥 VARIABLE RECUPERADA

  ngOnInit() {
    this.cargarGrupos();
  }

  cargarGrupos() {
    this.loading = true;
    
    this.grupoService.listarGrupos().subscribe({
      next: (data) => {
        this.grupos = data;
        this.cargarClases();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las categorías' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarClases() {
    this.loading = true;

    const filtros: FiltrosClase = {
      grupoId: this.selectedGrupoId || undefined,
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

  onGrupoChange() {
    this.cargarClases();
  }

  aplicarFiltros() {
    this.cargarClases();
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroLugar = '';
    this.selectedGrupoId = null;
    this.cargarClases();
  }

  // --- VISTAS ---
  verPlanificacion(clase: Clase) {
    this.selectedClase = clase;
    this.displayPlan = true;
  }

  // ✅ Ver Asistencia (Solo Lectura)
  verAsistencia(clase: Clase) {
    this.claseSeleccionadaAsistencia = clase;
    this.displayAttendanceDialog = true;
    this.loadingAsistencia = true;
    this.alumnosAsistencia = [];

    if (!clase.grupo_id || !clase.id) {
      this.loadingAsistencia = false;
      return;
    }

    forkJoin({
      estudiantes: this.estudianteService.obtenerEstudiantesDeMiGrupo(),
      asistenciasGuardadas: this.asistenciaService.listarPorClase(clase.id)
    }).subscribe({
      next: ({ estudiantes, asistenciasGuardadas }) => {

        const asistenciasMap = new Map();
        asistenciasGuardadas.forEach(a => asistenciasMap.set(a.estudiante_id, a.presente));

        this.alumnosAsistencia = estudiantes
          .filter((est: any) => est.grupo_id === clase.grupo_id) // 👈 de-mi-grupo trae TODOS los grupos del kine, filtramos al de esta clase
          .map((est: any) => {
            const idUsuario = est.perfil ? est.perfil.id_usuario : est.usuario_id;
            const nombre = est.perfil ? est.perfil.nombre : est.nombre;
            const apellido = est.perfil ? est.perfil.apellido : est.apellido;

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

  formatearFecha(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
}