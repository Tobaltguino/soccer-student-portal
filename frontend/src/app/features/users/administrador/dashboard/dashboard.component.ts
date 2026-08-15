import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// 🚀 SERVICIOS MODULARES (NestJS)
import { AuthService } from '../../../../core/auth/services/auth.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';
import { EstadoHistorialClinico } from '../../../../core/domains/salud/kinesiologia/historial-clinico/models/historial-clinico.interface';

// 🚀 TUS 4 SERVICIOS DE EVALUACIONES (Importamos los que necesitamos para el Dashboard)
import { SesionEvaluacionService } from '../../../../core/domains/academico/evaluaciones/sesiones/services/sesion.service';
import { ResultadoEvaluacionService } from '../../../../core/domains/academico/evaluaciones/resultados/services/resultado.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdministradorDashboardComponent implements OnInit {
  
  private authService = inject(AuthService);
  private estudianteService = inject(EstudianteService);
  private clasesService = inject(ClaseService);
  private historialClinicoService = inject(HistorialClinicoService);
  
  // Inyectamos tus servicios reales de Evaluaciones Físicas
  private evaluacionSesionService = inject(SesionEvaluacionService);
  private evaluacionResultadoService = inject(ResultadoEvaluacionService);
  
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  userEmail: string | undefined;
  totalEstudiantes: number = 0;
  clasesHoy: any[] = [];
  
  // 🔥 KPIs DE SALUD GLOBAL
  pacientesEnTratamiento: number = 0;
  pacientesEnObservacion: number = 0;
  pacientesEnReintegro: number = 0;

  actividadReciente: any[] = []; 
  cumpleanosList: any[] = [];    
  
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
  // CARGA DE DATOS (Múltiples Endpoints)
  // ==========================================
  async cargarDatos() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      // 1. Estudiantes Activos y Cumpleaños
      const resEstudiantes = await firstValueFrom(this.estudianteService.listarEstudiantes({ limite: 2000, activo: true }));
      const estudiantes = resEstudiantes.registros || [];
      this.totalEstudiantes = estudiantes.length;
      this.cumpleanosList = this.filtrarProximosCumpleanos(estudiantes);

      // 2. Kinesiología: Historial Clínico Global
      const historiales = await firstValueFrom(this.historialClinicoService.listarTodo());
      
      if (historiales) {
        const setTratamiento = new Set();
        const setObservacion = new Set();
        const setReintegro = new Set();

        historiales.forEach((h: any) => {
          const idAlumno = h.estudiante_id || h.estudianteId;
          if (h.estado === EstadoHistorialClinico.EN_TRATAMIENTO) setTratamiento.add(idAlumno);
          if (h.estado === EstadoHistorialClinico.EN_OBSERVACION) setObservacion.add(idAlumno);
          if (h.estado === EstadoHistorialClinico.EN_REINTEGRO_DEPORTIVO) setReintegro.add(idAlumno);
        });

        this.pacientesEnTratamiento = setTratamiento.size;
        this.pacientesEnObservacion = setObservacion.size;
        this.pacientesEnReintegro = setReintegro.size;
      }

      // 3. Clases de Hoy
      const resClases = await firstValueFrom(this.clasesService.getClasesHoy());
      this.clasesHoy = resClases || [];

      // 4. 🔥 Evaluaciones (Usando tu EvaluacionResultadoService)
      // Buscamos los últimos resultados subidos a la plataforma
      const resResultados = await firstValueFrom(this.evaluacionResultadoService.listarResultadosRecientes());
      this.actividadReciente = resResultados || [];

    } catch (error) {
      console.error('Error Admin Dashboard:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // LÓGICA DE NEGOCIO (Cumpleaños)
  // ==========================================
  filtrarProximosCumpleanos(estudiantes: any[]): any[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return estudiantes
      .map(est => {
        const fechaNac = est.perfil?.fecha_nacimiento || est.fecha_nacimiento;
        if (!fechaNac) return null;

        const nacimiento = new Date(fechaNac + 'T00:00:00');
        const cumpleEsteAno = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
        
        let proximoCumple = cumpleEsteAno < hoy 
            ? new Date(hoy.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate()) 
            : cumpleEsteAno;
            
        const diasRestantes = Math.ceil((proximoCumple.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        
        const nombre = est.perfil?.nombre || est.nombre;
        const apellido = est.perfil?.apellido || est.apellido;

        return { 
            ...est, 
            nombreCompleto: `${nombre} ${apellido}`,
            proximoCumple, 
            diasRestantes, 
            nuevaEdad: proximoCumple.getFullYear() - nacimiento.getFullYear() 
        };
      })
      .filter(item => item !== null && item.diasRestantes >= 0 && item.diasRestantes <= 7)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }

  async refrescar() {
    await this.verificarConexion();
    if (this.apiStatus === 'online') {
      await this.cargarDatos();
    }
  } 
}