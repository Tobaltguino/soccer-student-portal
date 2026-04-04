import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api'; 

// Módulos de PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog'; 
import { DatePickerModule } from 'primeng/datepicker'; 

// Servicios
import { HealthService } from '../../../../core/services/health.service'; 
import { AuthService } from '../../../../core/services/auth.service';     

@Component({
  selector: 'app-kine-injuries',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    TableModule,
    SelectModule,
    ToastModule,
    TooltipModule,
    DialogModule,
    DatePickerModule
  ],
  providers: [MessageService], // Ya no necesitamos ConfirmationService
  templateUrl: './kine-injuries.html',
  styleUrls: ['./kine-injuries.css']
})
export class KineInjuriesComponent implements OnInit {

  usuarioActualId: string | null = null;
  listaAlumnos: any[] = [];
  alumnoSeleccionado: any = null;

  listaLesiones: any[] = [];
  cargandoLesiones: boolean = false;
  mostrarDialogoLesion: boolean = false;
  lesionActual: any = {};

  opcionesTipoLesion: any[] = [
    { label: 'Lesión', value: 'LESION' },
    { label: 'Patología', value: 'PATOLOGIA' },
    { label: 'Alergia', value: 'ALERGIA' }
  ];

  opcionesEstadoLesion: any[] = [
    { label: 'En Observación', value: 'EN_OBSERVACION' },
    { label: 'En Tratamiento', value: 'EN_TRATAMIENTO' },
    { label: 'En Reintegro Deportivo', value: 'EN_REINTEGRO_DEPORTIVO' },
    { label: 'Recuperado', value: 'RECUPERADO' }
];

  constructor(
    private messageService: MessageService,
    private healthService: HealthService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.obtenerUsuarioActual();
    this.cargarAlumnosDelKine(); 
  }

  async obtenerUsuarioActual() {
    try {
      const { data: { user } } = await this.authService.getUser();
      if (user) this.usuarioActualId = user.id; 
    } catch (error) {
      console.error("Error obteniendo usuario", error);
    }
  }

  async cargarAlumnosDelKine() {
    try {
      if (!this.usuarioActualId) return;

      const { data: kineGrupos } = await this.healthService.getGruposDeKine(this.usuarioActualId);
      
      if (!kineGrupos || kineGrupos.length === 0) {
        this.listaAlumnos = [];
        return; 
      }

      const grupoIds = kineGrupos.map((g: any) => g.grupo_id);

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
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus pacientes.' });
    }
  }

  onAlumnoChange() {
    if (this.alumnoSeleccionado) {
      this.cargarListaLesiones();
    } else {
      this.listaLesiones = [];
    }
  }

  async cargarListaLesiones() {
    this.cargandoLesiones = true;
    try {
      const { data, error } = await this.healthService.getHistorialClinico(this.alumnoSeleccionado.id);
      if (error) throw error;
      this.listaLesiones = data || [];
    } catch (error) {
      console.error('Error:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial.' });
    } finally {
      this.cargandoLesiones = false;
    }
  }

  abrirNuevaLesion() {
    this.lesionActual = { 
      tipo: 'LESION', 
      estado: 'ACTIVO', 
      fecha_evento: new Date() 
    };
    this.mostrarDialogoLesion = true;
  }

  abrirEditarLesion(lesion: any) {
    this.lesionActual = { ...lesion };
    
    if (this.lesionActual.fecha_evento) {
      const partes = this.lesionActual.fecha_evento.split('-');
      this.lesionActual.fecha_evento = new Date(partes[0], partes[1] - 1, partes[2]);
    }
    
    this.mostrarDialogoLesion = true;
  }

  async guardarLesion() {
    try {
      if (!this.lesionActual.tipo || !this.lesionActual.diagnostico || !this.lesionActual.fecha_evento) {
        this.messageService.add({ severity: 'warn', summary: 'Requerido', detail: 'Complete fecha, tipo y diagnóstico.' });
        return;
      }

      let fechaFormateada = this.lesionActual.fecha_evento;
      if (this.lesionActual.fecha_evento instanceof Date) {
        const d = this.lesionActual.fecha_evento;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        fechaFormateada = `${year}-${month}-${day}`;
      }

      const payload = {
        ...this.lesionActual,
        estudiante_id: this.alumnoSeleccionado.id,
        fecha_evento: fechaFormateada
      };

      if (payload.id) {
        const { error } = await this.healthService.updateHistorialClinico(payload.id, payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado.' });
      } else {
        const { error } = await this.healthService.crearHistorialClinico(payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Nuevo registro añadido.' });
      }

      this.mostrarDialogoLesion = false;
      this.cargarListaLesiones();

    } catch (error) {
      console.error('Error:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el registro.' });
    }
  }
  
}