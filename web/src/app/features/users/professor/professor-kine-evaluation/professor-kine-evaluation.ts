import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

// Módulos de PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

// Servicios
import { HealthService } from '../../../../core/services/health.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AcademyService } from '../../../../core/services/academy.service';

@Component({
  selector: 'app-professor-kine-evaluation',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    TableModule, 
    ButtonModule, 
    DialogModule,
    SelectModule,
    DatePickerModule,
    TagModule, 
    ToastModule, 
    TooltipModule, 
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: './professor-kine-evaluation.html',
  styleUrls: ['./professor-kine-evaluation.css'] // Utiliza el mismo CSS
})
export class ProfessorKineEvaluationComponent implements OnInit {

  usuarioActualId: string | null = null;
  
  // --- DATOS PRINCIPALES ---
  sesiones: any[] = [];
  sesionesFiltradas: any[] = [];
  grupos: any[] = []; // Solo los grupos del profe
  tiposEvaluacion: any[] = [];
  loading: boolean = false;
  rangos: any[] = [];

  // --- FILTROS ---
  filtroFecha: Date | null = null;
  filtroGrupo: any = null;
  filtroPrueba: any = null;
  filtroEstado: string | null = null;
  opcionesEstadoFiltro = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Finalizado', value: 'FINALIZADO' }
  ];

  // --- MODAL VER RESULTADOS ---
  displayViewDialog: boolean = false;
  sesionVista: any = null;
  resultadosVista: any[] = [];
  estudianteVistaSeleccionado: any = null;
  cargandoResultados: boolean = false;

  constructor(
    private healthService: HealthService,
    private authService: AuthService,
    private academyService: AcademyService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.obtenerUsuarioActual();
    if (this.usuarioActualId) {
      await this.cargarCatalogos();
      await this.cargarSesiones();
    }
  }

  async obtenerUsuarioActual() {
    try {
      const { data: { user } } = await this.authService.getUser();
      if (user) {
        this.usuarioActualId = user.id;
      }
    } catch (error) {
      console.error("Error obteniendo usuario", error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo verificar tu sesión.' });
    }
  }

  async cargarCatalogos() {
    try {
      // 1. Tipos de Evaluación
      const resTipos = await this.healthService.getTiposEvaluacionKine();
      if (resTipos.data) this.tiposEvaluacion = resTipos.data;

      // 2. Rangos de colores para las notas
      const resRangos = await this.healthService.getRangosEvaluacion();
      if (resRangos.data) this.rangos = resRangos.data;

      // 3. Obtener solo los grupos asignados a este profesor
      const { data: gruposProfe, error } = await this.healthService['supabase']
        .from('grupos_profesores')
        .select(`
          grupo_id,
          grupos ( id, nombre )
        `)
        .eq('profesor_id', this.usuarioActualId);
      
      if (error) throw error;
      if (gruposProfe) {
        this.grupos = gruposProfe.map((g: any) => g.grupos).filter(g => g != null);
      }

    } catch (error) {
      console.error('Error catálogos:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar los catálogos.' });
    }
  }

  async cargarSesiones() {
    if (this.grupos.length === 0) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();
    
    try {
      const grupoIds = this.grupos.map(g => g.id);

      // Traemos las sesiones que pertenezcan a los grupos del profesor
      const { data, error } = await this.healthService['supabase']
        .from('evaluaciones_sesiones_kine')
        .select('*, tipo_evaluacion:tipo_evaluacion_id(nombre)')
        .in('grupo_id', grupoIds)
        .order('fecha', { ascending: false });

      if (error) throw error;
      
      if (data) {
        this.sesiones = data.map((s: any) => ({
            ...s,
            grupos: this.grupos.find(g => g.id === s.grupo_id) || { nombre: 'Desconocido' }
        }));
        this.aplicarFiltros();
      }
    } catch (error) {
      console.error(error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las evaluaciones.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // FILTROS
  // ==========================================
  aplicarFiltros() {
    this.sesionesFiltradas = this.sesiones.filter(sesion => {
      let cumpleFecha = true;
      let cumpleGrupo = true;
      let cumplePrueba = true;
      let cumpleEstado = true;

      if (this.filtroFecha) {
        const fechaFiltroStr = this.formatearFechaIso(this.filtroFecha);
        cumpleFecha = sesion.fecha === fechaFiltroStr;
      }
      if (this.filtroGrupo) cumpleGrupo = sesion.grupo_id === this.filtroGrupo.id;
      if (this.filtroPrueba) cumplePrueba = sesion.tipo_evaluacion_id === this.filtroPrueba.id;
      if (this.filtroEstado) cumpleEstado = sesion.estado === this.filtroEstado;

      return cumpleFecha && cumpleGrupo && cumplePrueba && cumpleEstado;
    });
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroGrupo = null;
    this.filtroPrueba = null;
    this.filtroEstado = null;
    this.aplicarFiltros();
  }

  private formatearFechaIso(fecha: any): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
  }

  getSeverityPuntaje(puntaje: number | string | null, subevaluacionId: number): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    if (puntaje === null || puntaje === undefined || puntaje === '') return 'secondary';
    
    const puntajeNum = Number(puntaje);
    const rango = this.rangos.find(r => r.puntaje === puntajeNum && r.subevaluacion_id === subevaluacionId);
    
    switch (rango?.color) {
      case 'rojo': return 'danger';
      case 'amarillo': return 'warn';
      case 'verde': return 'success';
      default: return 'info';
    }
  }

  // ==========================================
  // VISTA DE RESULTADOS
  // ==========================================
  async verResultados(sesion: any) {
    this.sesionVista = { ...sesion };
    this.cargandoResultados = true;
    this.displayViewDialog = true;
    this.cdr.detectChanges();

    try {
      // 1. Alumnos de este grupo
      const { data: alumnos, error: errAlumnos } = await this.academyService.getAlumnosPorGrupo(sesion.grupo_id);
      if (errAlumnos) throw errAlumnos;

      // 2. Parámetros de la evaluación
      const { data: subs } = await this.healthService.getSubEvaluacionesPorTipo(sesion.tipo_evaluacion_id);
      const subevaluacionesDefinidas = subs || [];
      
      // 3. Resultados guardados
      const { data: res } = await this.healthService.getResultadosPorSesionKine(sesion.id);
      const resultadosPrevios = res || [];

      // 4. Mapeo de la vista (Solo mostramos alumnos que tengan al menos 1 nota en esta sesión)
      this.resultadosVista = (alumnos || []).map(alumno => {
        const evaluacionesDelAlumno = subevaluacionesDefinidas.map((sub: any) => {
          const resGuardado = resultadosPrevios.find((r: any) => 
            r.estudiante_id === alumno.id && r.subevaluacion_id === sub.id
          );
          return {
            subevaluacion_id: sub.id, 
            nombre_parametro: sub.nombre,
            resultado_unico: resGuardado?.resultado_unico != null ? Number(resGuardado.resultado_unico) : null,
            resultado_izquierdo: resGuardado?.resultado_izquierdo != null ? Number(resGuardado.resultado_izquierdo) : null,
            resultado_derecho: resGuardado?.resultado_derecho != null ? Number(resGuardado.resultado_derecho) : null,
            observacion: resGuardado ? resGuardado.observacion : '',
            tiene_datos: !!resGuardado 
          };
        }).filter(e => e.tiene_datos); 

        return {
          id: alumno.id, 
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          evaluaciones: evaluacionesDelAlumno
        };
      });

      // Seleccionamos por defecto al primer alumno de la lista
      if (this.resultadosVista.length > 0) {
        this.estudianteVistaSeleccionado = this.resultadosVista[0];
      } else {
        this.estudianteVistaSeleccionado = null;
      }

    } catch (error) {
      console.error(error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar los resultados de la sesión.' });
      this.displayViewDialog = false;
    } finally {
      this.cargandoResultados = false;
      this.cdr.detectChanges();
    }
  }
}