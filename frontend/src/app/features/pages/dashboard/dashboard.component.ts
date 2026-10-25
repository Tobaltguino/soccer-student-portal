import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

// Servicios de Core y Feature-Based
import { AuthService } from '../../../core/auth/services/auth.service';
import { UsuarioCentralService } from '../administracion/usuarios/services/usuarios-central.service';
import { ClaseService } from '../academico/clases/services/clases.service';
import { GrupoService } from '../academico/grupos/services/grupo.service';

// Enums
import { Rol } from '../administracion/usuarios/models/usuario-central.interface';
import { hoyChile, horaActualChile } from '../../../shared/utils/fechas.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, ConfirmDialogModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioCentralService);
  private claseService = inject(ClaseService);
  private grupoService = inject(GrupoService);
  
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  // Estados UI
  loading: boolean = true;
  apiStatus: 'online' | 'checking' | 'offline' = 'checking';

  // Roles
  rolActual: string = '';
  esAdmin: boolean = false;
  esProfesor: boolean = false;
  esKinesiologo: boolean = false;
  esNutricionista: boolean = false;
  esEstudiante: boolean = false;
  esStaff: boolean = false;

  // ==========================================
  // MÉTRICAS Y DATOS GLOBALES
  // ==========================================
  
  // Compartidos
  cumpleanosList: any[] = [];
  
  // Admin & Staff
  totalEstudiantes: number = 0;
  clasesHoy: any[] = [];
  proximaClase: any = null;
  ultimaEvaluacion: any = null;
  pacientesEnTratamiento: number = 0;
  pacientesEnObservacion: number = 0;
  pacientesEnReintegro: number = 0;
  misGrupos: number = 0;
  totalAlumnos: number = 0;

  // Estudiante Específico
  fechaFormateada: string = '';
  asistenciaAnual: number = 0;
  proximosEventos: any[] = [];

  async ngOnInit() {
    await this.verificarRol();
    await this.refrescar();
  }

  async verificarRol() {
    this.apiStatus = 'checking';
    try {
      const session = await this.authService.obtenerSesionActual();
      if (session?.user) {
        const perfil = await this.authService.obtenerPerfilUsuario(session.user.id);
        this.rolActual = (perfil?.rol || '').toLowerCase();
      }

      this.esAdmin = this.rolActual === 'administrador';
      this.esProfesor = this.rolActual === 'profesor';
      this.esKinesiologo = this.rolActual === 'kinesiologo';
      this.esNutricionista = this.rolActual === 'nutricionista';
      this.esEstudiante = this.rolActual === 'estudiante';
      this.esStaff = this.esProfesor || this.esKinesiologo || this.esNutricionista;

      this.apiStatus = 'online';
    } catch (error) {
      this.apiStatus = 'offline';
      this.mostrarError('Error al autenticar sesión.');
    }
  }

  private ordenarPorHora(clases: any[]): any[] {
    return [...clases].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  }

  /** Primera clase de hoy que aún no comienza (listarClases ordena por fecha, no por hora). */
  private siguienteClaseDeHoy(clasesOrdenadas: any[]): any | null {
    const ahora = horaActualChile();
    return clasesOrdenadas.find(c => (c.hora || '') >= ahora) ?? null;
  }

  async refrescar() {
    if (this.apiStatus === 'offline') return;
    
    this.loading = true;
    this.apiStatus = 'checking';
    this.cdr.detectChanges();

    try {
      // Fecha de Chile: toISOString() da la UTC, que después de las ~21h ya es mañana
      const hoy = hoyChile();

      // ==========================================
      // LÓGICA PARA ADMINISTRADOR
      // ==========================================
      if (this.esAdmin) {
        const [usuariosRes, clasesRes] = await Promise.all([
          this.usuarioService.listarUsuarios({ rol: Rol.ESTUDIANTE, limite: 1, activo: true }),
          this.claseService.listarClases({ desde: hoy, hasta: hoy, limite: 100 })
        ]);

        this.totalEstudiantes = usuariosRes.total || 0;
        this.clasesHoy = this.ordenarPorHora(clasesRes.registros || []);
        this.proximaClase = this.siguienteClaseDeHoy(this.clasesHoy);

        // Aquí puedes agregar la llamada a HistorialClinicoService si la necesitas para los lesionados
        this.pacientesEnTratamiento = 0; 
      }
      
      // ==========================================
      // LÓGICA PARA STAFF (Profesor, Kine, Nutri)
      // ==========================================
      else if (this.esStaff) {
        const misGrupos = await this.grupoService.obtenerMisGrupos() || [];
        this.misGrupos = misGrupos.length;
        
        // Sumamos la cantidad de alumnos de cada grupo
        this.totalAlumnos = misGrupos.reduce((acc: number, g: any) => {
          return acc + (g.estudiantes && g.estudiantes.length > 0 ? g.estudiantes[0].count : 0);
        }, 0);

        const clasesRes = await this.claseService.listarClases({ desde: hoy, hasta: hoy, limite: 50 });
        this.clasesHoy = this.ordenarPorHora(clasesRes.registros || []);
        this.proximaClase = this.siguienteClaseDeHoy(this.clasesHoy);
      }

      // ==========================================
      // LÓGICA PARA ESTUDIANTE
      // ==========================================
      else if (this.esEstudiante) {
        const misClases = await this.claseService.obtenerMisClases() || [];
        
        // Filtramos las de hoy
        this.clasesHoy = misClases.filter((c: any) => c.fecha && c.fecha.startsWith(hoy));
        
        // Buscamos la clase más próxima en el futuro
        const futuras = misClases.filter((c: any) => {
          if(!c.fecha || !c.hora) return false;
          const fechaHoraClase = new Date(`${c.fecha.split('T')[0]}T${c.hora}`).getTime();
          return fechaHoraClase >= new Date().getTime();
        }).sort((a: any, b: any) => {
          return new Date(`${a.fecha.split('T')[0]}T${a.hora}`).getTime() - new Date(`${b.fecha.split('T')[0]}T${b.hora}`).getTime();
        });

        this.proximaClase = futuras.length > 0 ? futuras[0] : null;
        this.fechaFormateada = this.proximaClase ? this.formatearFechaHumana(this.proximaClase.fecha, this.proximaClase.hora) : '';
        
        // Asistencia mockeada hasta que conectes el AsistenciaService
        this.asistenciaAnual = 100; 
      }

      this.apiStatus = 'online';

    } catch (error) {
      this.apiStatus = 'offline';
      this.mostrarError('Error al conectar con el servidor.');
      console.error(error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // Utilidad para mostrar fecha amigable
  formatearFechaHumana(fecha: string, hora: string): string {
    if (!fecha) return 'Próximamente';
    const f = new Date(`${fecha.split('T')[0]}T${hora || '00:00:00'}`);
    const hoy = new Date();
    
    if (f.toDateString() === hoy.toDateString()) {
      return `Hoy, ${hora.slice(0, 5)} hrs`;
    }
    
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    if (f.toDateString() === manana.toDateString()) {
      return `Mañana, ${hora.slice(0, 5)} hrs`;
    }

    return `${f.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })}, ${hora.slice(0, 5)} hrs`;
  }

  mostrarError(mensaje: string) {
    this.messageService.add({ severity: 'error', summary: 'Error de Conexión', detail: mensaje });
  }
}