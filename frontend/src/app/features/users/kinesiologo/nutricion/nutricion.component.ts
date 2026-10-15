import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

// Enum
import { EstadoSesion } from '../../../../shared/enums/estado-sesion.enum';

// Importaciones de PrimeNG
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select'; 
import { DatePickerModule } from 'primeng/datepicker'; 
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

// Servicios de Dominio
import { NutriTipoEvaluacionService } from '../../../../core/domains/salud/nutricion/evaluaciones/tipos/services/tipo-evaluacion.service';
import { NutriSesionService } from '../../../../core/domains/salud/nutricion/evaluaciones/sesiones/services/sesion.service';
import { NutriResultadoService } from '../../../../core/domains/salud/nutricion/evaluaciones/resultados/services/resultado.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

@Component({
  selector: 'app-kine-nutricion',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule, 
    SelectModule, DatePickerModule, TagModule, TooltipModule, ToastModule,
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: './nutricion.component.html',
  styleUrls: ['./nutricion.component.scss']
})
export class KineNutritionComponent implements OnInit {
  
  // ✅ Exponemos el Enum para el HTML
  readonly EstadoSesion = EstadoSesion;

  // Inyección de Servicios
  private nutriTipoService = inject(NutriTipoEvaluacionService);
  private nutriSesionService = inject(NutriSesionService);
  private nutriResultadoService = inject(NutriResultadoService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  // Datos
  sesiones: any[] = [];
  sesionesFiltradas: any[] = [];
  tiposEvaluacion: any[] = [];
  estudiantes: any[] = [];

  // Filtros
  filtroFecha: Date | null = null;
  filtroPrueba: any = null;

  // Modales y Estado
  displayGradesDialog = false;
  loading = false;
  cargandoResultados = false;

  evalLogistica: any = {};

  ngOnInit() {
    // 🔥 FIX: Permitimos que Angular dibuje la pantalla vacía primero
    Promise.resolve().then(() => {
      this.cargarDatosBase();
    });
  }

  // ==========================================
  // CARGA DE DATOS PRINCIPALES
  // ==========================================
  cargarDatosBase() {
    this.loading = true;
    this.cdr.markForCheck();

    forkJoin({
      tipos: this.nutriTipoService.listarTiposEvaluacion(),
      sesionesData: this.nutriSesionService.listarSesiones({ limite: 1000 })
    }).subscribe({
      next: (data) => {
        this.tiposEvaluacion = data.tipos || [];
        
        const todasLasSesiones = data.sesionesData.registros || [];
        
        // ✅ Regla estricta: Solo guardamos en memoria las que están FINALIZADAS
        const sesionesFinalizadas = todasLasSesiones.filter((s: any) => s.estado === EstadoSesion.FINALIZADA);

        this.sesiones = sesionesFinalizadas.map((s: any) => ({
          ...s,
          tipoObj: this.tiposEvaluacion.find(t => t.id === s.tipo_id) || { nombre: 'Desconocido' }
        }));

        this.aplicarFiltros();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.mostrarError('No se pudieron cargar los datos de nutrición.');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ==========================================
  // LÓGICA DE FILTROS
  // ==========================================
  aplicarFiltros() {
    this.sesionesFiltradas = this.sesiones.filter(s => {
      let cumpleFecha = true;
      let cumplePrueba = true;

      const tId = s.tipo_id;

      if (this.filtroFecha) {
        const dFiltro = this.formatearFechaIso(this.filtroFecha);
        cumpleFecha = (s.fecha || '').substring(0, 10) === dFiltro;
      }
      if (this.filtroPrueba) {
        cumplePrueba = tId === this.filtroPrueba.id;
      }

      return cumpleFecha && cumplePrueba;
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroPrueba = null;
    this.aplicarFiltros();
  }

  private formatearFechaIso(fecha: any): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
  }

  // ==========================================
  // LÓGICA MODAL: VER RESULTADOS
  // ==========================================
  verResultados(sesion: any) {
    this.evalLogistica = sesion;
    this.cargandoResultados = true;
    this.displayGradesDialog = true;
    this.cdr.detectChanges(); // Se permite porque ocurre tras interacción de usuario

    forkJoin({
      alumnos: this.estudianteService.listarEstudiantes({ limite: 2000, activo: true }),
      resultados: this.nutriResultadoService.listarResultadosPorSesion(sesion.id)
    }).subscribe({
      next: (res) => {
        const alumnosBD = res.alumnos.registros || [];
        const resultadosPrevios = res.resultados || [];

        this.estudiantes = alumnosBD.map((est: any) => {
          const idUsuario = est.perfil ? est.perfil.id_usuario : est.usuario_id || est.id;
          const nombre = est.perfil ? est.perfil.nombre : est.nombre;
          const apellido = est.perfil ? est.perfil.apellido : est.apellido;

          const resultadoGuardado: any = resultadosPrevios.find((r: any) => r.estudianteId === idUsuario || r.estudiante_id === idUsuario);

          const estudianteConResultados = {
            id: idUsuario,
            nombre: nombre,
            apellido: apellido,
            archivo_url_previo: resultadoGuardado ? (resultadoGuardado.archivo_url || resultadoGuardado.archivoUrl) : null,
            nombre_archivo_previo: null as string | null,
            observacion: resultadoGuardado ? (resultadoGuardado.observaciones || resultadoGuardado.observacion) : ''
          };

          if (estudianteConResultados.archivo_url_previo) {
            const urlParts = estudianteConResultados.archivo_url_previo.split('/');
            const rawName = decodeURIComponent(urlParts[urlParts.length - 1]);
            const underscoreIndex = rawName.indexOf('_');
            estudianteConResultados.nombre_archivo_previo = underscoreIndex !== -1 ? rawName.substring(underscoreIndex + 1) : rawName;
          }

          return estudianteConResultados;
        });

        // ✅ FIX IMPORTANTE: Filtramos para que NO salgan los 2000 alumnos vacíos
        this.estudiantes = this.estudiantes.filter(e => e.archivo_url_previo || e.observacion);

        this.cargandoResultados = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarError('Error al cargar los resultados de los estudiantes.');
        this.cargandoResultados = false;
        this.displayGradesDialog = false;
        this.cdr.detectChanges();
      }
    });
  }

  mostrarError(mensaje: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
  }
}