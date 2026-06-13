import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api'; 

// Módulos de PrimeNG
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';

// Servicios
import { HealthService } from '../../../../shared/services/health.service'; 
import { AuthService } from '../../../../core/services/auth.service';     

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
  styleUrls: ['./professor-kine-lessions.css'] // Utiliza el mismo CSS
})
export class ProfessorKineLessionsComponent implements OnInit {

  usuarioActualId: string | null = null;
  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;

  listaLesiones: any[] = [];
  cargandoLesiones: boolean = false;

  constructor(
    private messageService: MessageService,
    private healthService: HealthService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.obtenerUsuarioActual();
    await this.cargarAlumnos();
  }

  async obtenerUsuarioActual() {
    try {
      const { data: { user } } = await this.authService.getUser();
      if (user) this.usuarioActualId = user.id; 
    } catch (error) {
      console.error("Error obteniendo usuario", error);
    }
  }

  async cargarAlumnos() {
    try {
      if (!this.usuarioActualId) return;

      // 1. Obtenemos los grupos asignados al profesor
      const { data: gruposProfe, error: errGrupos } = await this.healthService['supabase']
        .from('grupos_profesores') 
        .select('grupo_id')
        .eq('profesor_id', this.usuarioActualId);

      if (errGrupos) throw errGrupos;

      if (!gruposProfe || gruposProfe.length === 0) {
        this.listaAlumnos = [];
        return;
      }

      const grupoIds = gruposProfe.map((g: any) => g.grupo_id);

      // 2. Buscamos los estudiantes que pertenecen a esos grupos
      const { data, error }: any = await this.healthService['supabase']
        .from('estudiantes')
        .select('id, nombre, apellido, rut, grupo_id')
        .in('grupo_id', grupoIds);

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
      const { data, error } = await this.healthService.getHistorialClinico(this.alumnoSeleccionado.id);
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