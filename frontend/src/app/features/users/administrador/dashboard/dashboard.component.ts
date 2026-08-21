import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// 🚀 SERVICIOS MODULARES (NestJS)
import { AuthService } from '../../../../core/auth/services/auth.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';
import { SesionEvaluacionService } from '../../../../core/domains/academico/evaluaciones/sesiones/services/sesion.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class AdministradorDashboardComponent implements OnInit {
  
  private authService = inject(AuthService);
  private estudianteService = inject(EstudianteService);
  private usuarioService = inject(UsuarioService); 
  private clasesService = inject(ClaseService);
  private historialClinicoService = inject(HistorialClinicoService);
  private evaluacionSesionService = inject(SesionEvaluacionService);
  
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  userEmail: string | undefined;
  totalEstudiantes: number = 0;
  clasesHoy: any[] = [];
  
  // 🔥 KPIs DE SALUD GLOBAL
  pacientesEnTratamiento: number = 0;
  pacientesEnObservacion: number = 0;
  pacientesEnReintegro: number = 0;

  ultimaEvaluacion: any = null; 
  cumpleanosList: any[] = [];    
  
  // 🔥 Variable que controlará el bloqueo de pantalla
  loading: boolean = true;
  apiStatus: 'online' | 'offline' | 'checking' = 'checking'; 

  async ngOnInit() {
    await this.verificarConexion();
    if (this.apiStatus === 'online') {
      await this.cargarDatos();
    }
  }

  // ==========================================
  // AUTENTICACIÓN Y ESTADO DE API
  // ==========================================
  async verificarConexion() {
    try {
      this.apiStatus = 'checking';
      const res = await firstValueFrom(this.authService.me());
      const user = res?.data ? res.data : res;

      if (!user || (!user.email && !user.nombre)) {
        this.apiStatus = 'offline';
        this.router.navigate(['/login']);
      } else {
        this.userEmail = user.email;
        this.apiStatus = 'online';
      }
    } catch {
      this.apiStatus = 'offline';
    }
  }

  // ==========================================
  // CARGA DE DATOS (Ultra Optimizada)
  // ==========================================
  async cargarDatos() {
    // Activa el overlay de carga
    this.loading = true;
    this.cdr.detectChanges();

    try {
      // 1. Total Estudiantes Activos 
      const resCount = await firstValueFrom(this.estudianteService.contarEstudiantesActivos());
      this.totalEstudiantes = resCount?.total || 0;

      // 2. Cumpleaños Globales 
      const resCumples = await firstValueFrom(this.usuarioService.obtenerCumpleanosGlobales(7));
      this.cumpleanosList = resCumples || [];

      // 3. Kinesiología
      const statsKine = await firstValueFrom(this.historialClinicoService.obtenerEstadisticasDashboard());
      if (statsKine) {
        this.pacientesEnTratamiento = statsKine.enTratamiento || 0;
        this.pacientesEnObservacion = statsKine.enObservacion || 0;
        this.pacientesEnReintegro = statsKine.enReintegro || 0;
      }

      // 4. Clases de Hoy
      const resClases = await firstValueFrom(this.clasesService.getClasesHoy());
      this.clasesHoy = resClases || [];

      // 5. Última Sesión de Evaluación Finalizada
      const resUltimaEval = await firstValueFrom(this.evaluacionSesionService.obtenerUltimaSesionFinalizada());
      this.ultimaEvaluacion = resUltimaEval || null;

    } catch (error) {
      console.error('Error Admin Dashboard:', error);
    } finally {
      // Pase lo que pase (éxito o error), quita el bloqueo
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async refrescar() {
    if (this.loading) return; // Evitar doble recarga

    await this.verificarConexion();
    if (this.apiStatus === 'online') {
      await this.cargarDatos();
    }
  } 
}