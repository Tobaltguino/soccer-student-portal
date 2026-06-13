import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api'; 

// Módulos de PrimeNG
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';

import { AuthService } from '../../../../core/services/auth.service';     
import { KinesiologiaService } from '../../../../core/services/modulos/salud/kine.service';
import { UsuariosService } from '../../../../core/services/modulos/administracion/usuarios.service';
import { GruposService } from '../../../../core/services/modulos/academico/grupos.service';

@Component({
  selector: 'app-professor-kine-lessions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './professor-kine-lessions.html',
  styleUrls: ['./professor-kine-lessions.css']
})
export class ProfessorKineLessionsComponent implements OnInit {

  usuarioActualId: string | null = null;
  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;

  listaLesiones: any[] = [];
  cargandoLesiones: boolean = false;

  constructor(
    private messageService: MessageService,
    private authService: AuthService,
    private kinesiologiaService: KinesiologiaService,
    private usuariosService: UsuariosService,
    private gruposService: GruposService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.obtenerUsuarioActual();
    await this.cargarAlumnos();
  }

  async obtenerUsuarioActual() {
    try {
      const { data: { user } } = await this.authService.getUser();
      if (user && user.email) {
        const { data: prof } = await this.usuariosService.getProfesorByEmail(user.email);
        if (prof) {
          this.usuarioActualId = prof.id; 
        }
      }
    } catch (error) {
      console.error("Error obteniendo usuario", error);
    }
  }

  async cargarAlumnos() {
    try {
      if (!this.usuarioActualId) return;

      const { data: gruposProfe, error: errGrupos } = await this.gruposService.getGruposDeProfesor(this.usuarioActualId);

      if (errGrupos) throw errGrupos;

      if (!gruposProfe || gruposProfe.length === 0) {
        this.listaAlumnos = [];
        return;
      }

      const grupoIds = gruposProfe.map((g: any) => g.grupo_id);

      const { data, error } = await this.usuariosService.getTodosEstudiantesPorGrupos(grupoIds);

      if (error) throw error;

      if (data) {
        this.listaAlumnos = data.map((a: any) => ({
          ...a,
          nombreCompleto: `${a.nombre} ${a.apellido} ${a.rut ? '('+a.rut+')' : ''}`
        }));
      }
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los alumnos.' });
    } finally {
      this.cdr.detectChanges();
    }
  }

  onAlumnoChange() {
    if (this.alumnoSeleccionado) {
      this.cargarListaLesiones();
    } else {
      this.listaLesiones = [];
      this.cdr.detectChanges();
    }
  }

  async cargarListaLesiones() {
    this.cargandoLesiones = true;
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.kinesiologiaService.getHistorialClinico(this.alumnoSeleccionado.id);
      if (error) throw error;
      this.listaLesiones = data || [];
    } catch (error) {
      console.error('Error:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial de lesiones.' });
    } finally {
      this.cargandoLesiones = false;
      this.cdr.detectChanges();
    }
  }
}