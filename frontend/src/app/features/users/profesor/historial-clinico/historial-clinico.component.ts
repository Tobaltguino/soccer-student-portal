import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api'; 

import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';

import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';
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
    TagModule
  ],
  providers: [MessageService],
  templateUrl: './historial-clinico.component.html',
  styleUrls: ['./historial-clinico.component.scss']
})
export class ProfesorHistorialClinicoComponent implements OnInit {

  private historialService = inject(HistorialClinicoService);
  private estudianteService = inject(EstudianteService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  loading: boolean = false;
  listaAlumnos: any[] = [];

  ngOnInit() {
    this.cargarEstadoSaludGrupal();
  }

  cargarEstadoSaludGrupal() {
    this.loading = true;

    this.estudianteService.obtenerEstudiantesDeMiGrupo().subscribe({
      next: (alumnosBD: any) => {
        const listaBase = (alumnosBD || []).map((a: any) => {
          const nombre = a.perfil ? a.perfil.nombre : a.nombre;
          const apellido = a.perfil ? a.perfil.apellido : a.apellido;
          const rut = a.perfil?.rut || a.rut;
          const idUsuario = a.perfil ? a.perfil.id_usuario : a.usuario_id || a.id;

          return { id: idUsuario, nombreCompleto: `${nombre} ${apellido}`, rut };
        });

        this.historialService.obtenerEstadoSaludGrupal().subscribe({
          next: (mapaEstados) => {
            this.listaAlumnos = listaBase.map((a: any) => ({
              ...a,
              estado: mapaEstados[a.id] || 'SANO'
            }));
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.listaAlumnos = listaBase.map((a: any) => ({ ...a, estado: 'SANO' }));
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus alumnos.' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatEstado(estado: string): string {
    if (!estado || estado === 'SANO') return 'Sano';
    return estado.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  getSeveridadEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (estado) {
      case 'EN_TRATAMIENTO': return 'danger';
      case 'EN_OBSERVACION': return 'warn';
      case 'EN_REINTEGRO_DEPORTIVO': return 'info';
      default: return 'success';
    }
  }
}