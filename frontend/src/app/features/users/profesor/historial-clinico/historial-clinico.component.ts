import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api'; 

// Módulos de PrimeNG
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag'; // 🔥 Agregado para usar p-tag

// Nuevos Servicios de Dominio
import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';
import {TipoHistorialClinico, EstadoHistorialClinico } from "../../../../core/domains/salud/kinesiologia/historial-clinico/models/historial-clinico.interface";
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';

@Component({
  selector: 'app-profesor-historial-clinico',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
    ToastModule,
    TagModule // 🔥 Importado
  ],
  providers: [MessageService],
  templateUrl: './historial-clinico.component.html',
  styleUrls: ['./historial-clinico.component.scss'] // 🔥 Cambiado a .scss
})
export class ProfesorHistorialClinicoComponent implements OnInit {

  // ✅ Exponemos los Enums para usarlos en el HTML
  readonly TipoHistorialClinico = TipoHistorialClinico;
  readonly EstadoHistorialClinico = EstadoHistorialClinico;

  private historialService = inject(HistorialClinicoService);
  private grupoService = inject(GrupoService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);

  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;

  listaLesiones: any[] = [];
  cargandoLesiones: boolean = false;

  // Diccionarios para mostrar etiquetas limpias
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
    this.cargarAlumnosDelProfesor();
  }

  // ==========================================
  // CARGA DE ALUMNOS (SOLO SUS GRUPOS)
  // ==========================================
  cargarAlumnosDelProfesor() {
    // 1. Obtenemos los grupos del profesor autenticado vía JWT
    this.grupoService.obtenerMisGrupos().subscribe({
      next: (grupos) => {
        const misGrupoIds = grupos.map(g => g.id).filter(id => id !== undefined) as number[];

        if (misGrupoIds.length === 0) {
          this.listaAlumnos = [];
          return;
        }

        // 2. Buscamos solo los estudiantes que pertenezcan a esos grupos
        this.estudianteService.listarEstudiantes({ grupoIds: misGrupoIds, limite: 2000, activo: true }).subscribe({
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
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus alumnos.' })
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus grupos.' });
      }
    });
  }

  onAlumnoChange() {
    if (this.alumnoSeleccionado) {
      this.cargarListaLesiones();
    } else {
      this.listaLesiones = [];
    }
  }

  // ==========================================
  // CARGA DE HISTORIAL (SOLO LECTURA)
  // ==========================================
  cargarListaLesiones() {
    this.cargandoLesiones = true;
    this.historialService.listarHistorialPorEstudiante(this.alumnoSeleccionado.id).subscribe({
      next: (data) => {
        this.listaLesiones = data || [];
        this.cargandoLesiones = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial clínico.' });
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