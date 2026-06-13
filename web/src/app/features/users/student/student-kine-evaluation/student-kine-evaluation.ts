import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';

// Módulos de PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { AuthService } from '../../../../core/services/auth.service';
import { KinesiologiaService } from '../../../../core/services/modulos/salud/kine.service';
import { UsuariosService } from '../../../../core/services/modulos/administracion/usuarios.service';

@Component({
  selector: 'app-student-kine-evaluation',
  standalone: true,
  imports: [
    CommonModule, 
    TableModule, 
    ButtonModule, 
    DialogModule,
    TagModule, 
    ToastModule, 
    TooltipModule, 
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: './student-kine-evaluation.html',
  styleUrls: ['./student-kine-evaluation.css']
})
export class StudentKineEvaluationComponent implements OnInit {

  usuarioActualId: string | null = null;
  grupoId: number | null = null;

  sesiones: any[] = [];
  loading: boolean = false;
  rangos: any[] = [];

  // Modal de vista
  displayViewDialog: boolean = false;
  sesionVista: any = null;
  resultadosVista: any[] = [];
  cargandoResultados: boolean = false;

  constructor(
    private authService: AuthService,
    private kinesiologiaService: KinesiologiaService,
    private usuariosService: UsuariosService,
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
      const resRangos = await this.kinesiologiaService.getRangosEvaluacion();
      if (resRangos.data) this.rangos = resRangos.data;

      if (this.usuarioActualId) {
          const { data: est, error } = await this.usuariosService.getEstudianteById(this.usuarioActualId);
          if (error) throw error;
          if (est) this.grupoId = est.grupo_id;
      }

    } catch (error) {
      console.error('Error catálogos:', error);
    }
  }

  async cargarSesiones() {
    if (!this.grupoId) return;

    this.loading = true;
    this.cdr.detectChanges();
    
    try {
      const { data, error } = await this.kinesiologiaService.getSesionesKineFinalizadasPorGrupo(this.grupoId);

      if (error) throw error;
      
      this.sesiones = data || [];
    } catch (error) {
      console.error(error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus evaluaciones.' });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
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

  async verResultados(sesion: any) {
    this.sesionVista = { ...sesion };
    this.cargandoResultados = true;
    this.displayViewDialog = true;
    this.cdr.detectChanges();

    try {
      // 1. Obtener la estructura de la prueba (los parámetros)
      const { data: subs } = await this.kinesiologiaService.getSubEvaluacionesPorTipo(sesion.tipo_evaluacion_id);
      const subevaluacionesDefinidas = subs || [];

      if (!this.usuarioActualId) throw new Error("Usuario no identificado");
      
      const { data: res, error: errRes } = await this.kinesiologiaService.getResultadosAlumnoKine(sesion.id, this.usuarioActualId);

      if (errRes) throw errRes;
      const resultadosPrevios = res || [];

      // 3. Mapear los resultados con la estructura para la tabla
      this.resultadosVista = subevaluacionesDefinidas.map((sub: any) => {
        const resGuardado = resultadosPrevios.find((r: any) => r.subevaluacion_id === sub.id);
        
        return {
          subevaluacion_id: sub.id, 
          nombre_parametro: sub.nombre,
          resultado_unico: resGuardado?.resultado_unico != null ? Number(resGuardado.resultado_unico) : null,
          resultado_izquierdo: resGuardado?.resultado_izquierdo != null ? Number(resGuardado.resultado_izquierdo) : null,
          resultado_derecho: resGuardado?.resultado_derecho != null ? Number(resGuardado.resultado_derecho) : null,
          observacion: resGuardado ? resGuardado.observacion : '',
          tiene_datos: !!resGuardado 
        };
      }).filter(e => e.tiene_datos); // Solo mostramos lo que le evaluaron

    } catch (error) {
      console.error(error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar tus notas.' });
      this.displayViewDialog = false;
    } finally {
      this.cargandoResultados = false;
      this.cdr.detectChanges();
    }
  }
}