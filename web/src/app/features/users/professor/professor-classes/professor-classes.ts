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
import { CheckboxModule } from 'primeng/checkbox'; 
import { ToastModule } from 'primeng/toast'; 
import { MessageService } from 'primeng/api'; 

// 🚀 CAMBIO 1: Importamos los servicios de dominio (Adiós SupabaseService)
import { AuthService } from '../../../../core/services/auth.service';
import { AcademyService } from '../../../../shared/services/academy.service';

@Component({
  selector: 'app-professor-classes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, 
    DialogModule, InputTextModule, DatePickerModule, SelectModule, 
    TooltipModule, SelectButtonModule, CheckboxModule, ToastModule
  ],
  providers: [MessageService], 
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

  // Asistencia 
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
    // 🚀 CAMBIO 2: Inyectamos nuestros servicios especializados
    private authService: AuthService,
    private academyService: AcademyService,
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
      // 🚀 CAMBIO 3: AuthService para obtener usuario
      const { data: { user } } = await this.authService.getUser();
      if (!user || !user.email) return; // ✅ Ahora TypeScript sabe que el email existe

      // 🚀 CAMBIO 4: AcademyService para el perfil de profesor
      const { data: prof } = await this.academyService.getProfesorByEmail(user.email);

      if (prof) {
        // 🚀 CAMBIO 5: AcademyService para sus grupos
        const { data: gruposData } = await this.academyService.getGruposDeProfesor(prof.id);

        if (gruposData && gruposData.length > 0) {
          this.grupos = gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null);
          if (this.grupos.length > 0) {
            this.selectedGrupoId = this.grupos[0].id;
            await this.cargarClasesPorGrupo();
          }
        }
      }
    } catch (error) {
      console.error('Error cargando grupos:', error);
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
      // 🚀 CAMBIO 6: AcademyService para obtener las clases
      const { data, error } = await this.academyService.getClasesPorGrupo(this.selectedGrupoId);

      if (error) throw error;

      this.clasesOriginales = (data || []).sort((a: any, b: any) => {
        const tiempoA = new Date(`${a.fecha}T${a.hora}`).getTime();
        const tiempoB = new Date(`${b.fecha}T${b.hora}`).getTime();
        return tiempoB - tiempoA;
      });

      this.aplicarFiltros();
    } catch (error) {
      console.error('Error cargando clases:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onGrupoChange() {
    this.cargarClasesPorGrupo();
  }

  // --- ASISTENCIA ---
  async verAsistencia(clase: any) {
    this.claseSeleccionadaAsistencia = clase;
    this.displayAttendanceDialog = true;
    this.loadingAsistencia = true;

    try {
      // 🚀 CAMBIO 7: AcademyService para los alumnos
      const { data: alumnosGrupo } = await this.academyService.getAlumnosPorGrupo(clase.grupo_id);
      
      // 🚀 CAMBIO 8: AcademyService para la asistencia previa (usando la nueva función)
      const { data: asistenciaGuardada } = await this.academyService.getAsistenciaPorClase(clase.id);

      if (alumnosGrupo) {
        this.alumnosAsistencia = alumnosGrupo.map((alumno: any) => {
          const registro = asistenciaGuardada?.find((r: any) => r.estudiante_id === alumno.id);
          return { 
            ...alumno, 
            presente: registro ? registro.presente : false 
          };
        });
      }
    } catch (error) {
      console.error('Error cargando asistencia:', error);
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
      // 🚀 CAMBIO 9: AcademyService para guardar la asistencia masiva
      const { error } = await this.academyService.guardarAsistenciaMasiva(registros);
      
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
    
    this.claseForm = {
      grupo_id: this.selectedGrupoId,
      fecha: null, 
      hora: null,  
      lugar: '',   
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
    // 1. VALIDACIONES DE LOGÍSTICA
    if (!this.selectedGrupoId || !this.claseForm.fecha || !this.claseForm.hora || !this.claseForm.lugar || this.claseForm.lugar.trim() === '') {
        this.messageService.add({ 
            severity: 'warn', 
            summary: 'Faltan datos', 
            detail: 'Complete todos los campos obligatorios de Logística (*).' 
        });
        return;
    }

    // 2. Validar que la fecha sea correcta
    const fechaSeleccionada = new Date(this.claseForm.fecha);
    if (isNaN(fechaSeleccionada.getTime())) {
        this.messageService.add({ 
            severity: 'warn', 
            summary: 'Fecha Inválida', 
            detail: 'Ingrese una fecha válida para la clase.' 
        });
        return;
    }

    this.saving = true;
    this.cdr.detectChanges();

    try {
      const fechaGuardar = this.formatearFecha(fechaSeleccionada);
      
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
        // 🚀 CAMBIO 10: AcademyService para actualizar
        const { error } = await this.academyService.actualizarClase(this.claseForm.id, payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Clase actualizada correctamente.' });
      } else {
        // 🚀 CAMBIO 11: AcademyService para crear
        const { error } = await this.academyService.crearClase(payload);
        if (error) throw error;
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Clase creada correctamente.' });
      }

      this.displayForm = false;
      await this.cargarClasesPorGrupo();

    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al guardar la clase.' });
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