import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CheckboxModule } from 'primeng/checkbox'; // Añadido
import { ToastModule } from 'primeng/toast'; // Añadido
import { MessageService } from 'primeng/api'; // Añadido
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-professor-classes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, 
    DialogModule, InputTextModule, DatePickerModule, SelectModule, 
    TooltipModule, SelectButtonModule, CheckboxModule, ToastModule
  ],
  providers: [MessageService], // Añadido
  templateUrl: './professor-classes.html',
  styleUrls: ['./professor-classes.css']
})
export class ProfessorClassesComponent implements OnInit {
  // Datos
  grupos: any[] = [];
  selectedGrupoId: string = '';
  clases: any[] = [];
  clasesOriginales: any[] = [];
  
  // Estados
  loading: boolean = true;
  saving: boolean = false;
  
  // Filtros
  filtroFecha: Date | null = null;
  filtroLugar: string = '';

  // Vista de detalles
  displayPlan: boolean = false;
  selectedClase: any = null;

  // Formulario Crear/Editar
  displayForm: boolean = false;
  isEditing: boolean = false;
  claseForm: any = {};

  // Asistencia (NUEVO)
  displayAttendanceDialog: boolean = false;
  alumnosAsistencia: any[] = [];
  loadingAsistencia: boolean = false;
  claseSeleccionadaAsistencia: any = null;
  
  // Pestañas del Formulario
  vistaFormulario: string = 'logistica';
  opcionesVistaForm = [
    { label: 'Logística', value: 'logistica', icon: 'pi pi-calendar' },
    { label: 'Planificación', value: 'planificacion', icon: 'pi pi-list' }
  ];

  constructor(
    private supabaseService: SupabaseService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarGrupos();
  }

  // --- CARGA DE DATOS ---
  async cargarGrupos() {
    this.loading = true;
    try {
      const { data: { user } } = await this.supabaseService.getUser();
      if (!user) return;

      const { data: prof } = await this.supabaseService.supabase
        .from('profesores')
        .select('id')
        .eq('email', user.email)
        .single();

      if (prof) {
        const { data: gruposData } = await this.supabaseService.supabase
          .from('grupos_profesores')
          .select('grupo_id, grupos(id, nombre)')
          .eq('profesor_id', prof.id);

        if (gruposData && gruposData.length > 0) {
          this.grupos = gruposData.map((g: any) => g.grupos).filter(g => g !== null);
          if (this.grupos.length > 0) {
            this.selectedGrupoId = this.grupos[0].id;
            await this.cargarClasesPorGrupo();
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar grupos:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async cargarClasesPorGrupo() {
    if (!this.selectedGrupoId) return;
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabaseService.supabase
        .from('clases')
        .select('*')
        .eq('grupo_id', this.selectedGrupoId);

      if (error) throw error;

      this.clasesOriginales = (data || []).sort((a, b) => {
        const tiempoA = new Date(`${a.fecha}T${a.hora}`).getTime();
        const tiempoB = new Date(`${b.fecha}T${b.hora}`).getTime();
        return tiempoB - tiempoA;
      });

      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar clases:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onGrupoChange() {
    this.cargarClasesPorGrupo();
  }

  // --- ASISTENCIA (NUEVO) ---
  async verAsistencia(clase: any) {
    this.claseSeleccionadaAsistencia = clase;
    this.displayAttendanceDialog = true;
    this.loadingAsistencia = true;

    try {
      // 1. Obtener alumnos del grupo usando el servicio existente
      const { data: alumnosGrupo } = await this.supabaseService.getAlumnosPorGrupo(clase.grupo_id);
      
      // 2. Obtener asistencia ya guardada
      const { data: asistenciaGuardada } = await this.supabaseService.getAsistenciaPorClase(clase.id);

      if (alumnosGrupo) {
        this.alumnosAsistencia = alumnosGrupo.map(alumno => {
          const registro = asistenciaGuardada?.find((r: any) => r.estudiante_id === alumno.id);
          return { 
            ...alumno, 
            presente: registro ? registro.presente : false 
          };
        });
      }
    } catch (error) {
      console.error('Error al cargar asistencia:', error);
    } finally {
      this.loadingAsistencia = false;
      this.cdr.detectChanges();
    }
  }

  async guardarAsistencia() {
    this.loadingAsistencia = true;
    const registros = this.alumnosAsistencia.map(a => ({
      clase_id: this.claseSeleccionadaAsistencia.id,
      estudiante_id: a.id,
      presente: a.presente
    }));

    try {
      const { error } = await this.supabaseService.saveAsistencia(registros);
      
      if (!error) {
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Asistencia actualizada' });
        this.displayAttendanceDialog = false;
      } else {
        throw error;
      }
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la asistencia' });
    } finally {
      this.loadingAsistencia = false;
      this.cdr.detectChanges();
    }
  }

  // --- FORMULARIO CREAR / EDITAR ---
  abrirNuevaClase() {
    if (!this.selectedGrupoId) return;
    this.isEditing = false;
    this.vistaFormulario = 'logistica';
    
    const ahora = new Date();
    const horaDefault = ('0' + ahora.getHours()).slice(-2) + ':' + ('0' + ahora.getMinutes()).slice(-2);

    this.claseForm = {
      grupo_id: this.selectedGrupoId,
      fecha: new Date(),
      hora: horaDefault,
      lugar: 'Cancha Principal',
      objetivo: '',
      calentamiento: '',
      parte_principal: '',
      vuelta_calma: ''
    };
    this.displayForm = true;
  }

  abrirEditarClase(clase: any) {
    this.isEditing = true;
    this.vistaFormulario = 'logistica';
    
    let dateObj = new Date();
    if (clase.fecha) {
      const parts = clase.fecha.split('-');
      dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }

    this.claseForm = {
      ...clase,
      fecha: dateObj
    };
    this.displayForm = true;
  }

  async guardarClase() {
    this.saving = true;
    this.cdr.detectChanges();

    try {
      const fechaGuardar = this.formatearFecha(this.claseForm.fecha);
      
      const payload = {
        grupo_id: this.selectedGrupoId,
        fecha: fechaGuardar,
        hora: this.claseForm.hora,
        lugar: this.claseForm.lugar,
        objetivo: this.claseForm.objetivo,
        calentamiento: this.claseForm.calentamiento,
        parte_principal: this.claseForm.parte_principal,
        vuelta_calma: this.claseForm.vuelta_calma
      };

      if (this.isEditing) {
        const { error } = await this.supabaseService.supabase
          .from('clases')
          .update(payload)
          .eq('id', this.claseForm.id);
        if (error) throw error;
      } else {
        const { error } = await this.supabaseService.supabase
          .from('clases')
          .insert(payload);
        if (error) throw error;
      }

      this.displayForm = false;
      await this.cargarClasesPorGrupo();

    } catch (error) {
      console.error('Error guardando clase:', error);
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  // --- UTILIDADES ---
  verPlanificacion(clase: any) {
    this.selectedClase = clase;
    this.displayPlan = true;
  }

  aplicarFiltros() {
    this.clases = this.clasesOriginales.filter(clase => {
      let cumpleFecha = true;
      let cumpleLugar = true;

      if (this.filtroFecha) {
        cumpleFecha = (clase.fecha ? clase.fecha.substring(0, 10) : '') === this.formatearFecha(this.filtroFecha);
      }
      if (this.filtroLugar && this.filtroLugar.trim() !== '') {
        cumpleLugar = (clase.lugar || '').toLowerCase().includes(this.filtroLugar.toLowerCase());
      }
      return cumpleFecha && cumpleLugar;
    });
    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroLugar = '';
    this.clases = [...this.clasesOriginales];
    this.cdr.detectChanges();
  }

  formatearFecha(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
}