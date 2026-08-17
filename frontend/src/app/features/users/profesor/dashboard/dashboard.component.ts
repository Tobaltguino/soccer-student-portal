import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// 🚀 SERVICIOS MODULARES (NestJS)
import { AuthService } from '../../../../core/auth/services/auth.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { SesionEvaluacionService } from '../../../../core/domains/academico/evaluaciones/sesiones/services/sesion.service';

@Component({
  selector: 'app-profesor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html', // Ajusta si se llama dashboard.component.html
  styleUrls: ['./dashboard.component.css']   // Ajusta si se llama dashboard.component.css
})
export class ProfessorDashboardComponent implements OnInit {
  
  private authService = inject(AuthService);
  private estudianteService = inject(EstudianteService);
  private usuarioService = inject(UsuarioService);
  private clasesService = inject(ClaseService);
  private evaluacionSesionService = inject(SesionEvaluacionService);
  
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // 🔥 KPIs ultra-optimizados
  misGrupos: number = 0;
  totalAlumnos: number = 0;
  clasesHoy: any[] = [];
  proximaClase: any = null;
  ultimaEvaluacion: any = null;

  // Listas
  cumpleanosList: any[] = [];
  
  // Estados
  loading: boolean = true;
  apiStatus: 'online' | 'offline' | 'checking' = 'checking';

  async ngOnInit() {
    await this.verificarConexion();
    if (this.apiStatus === 'online') {
      await this.cargarDatosProfe();
    }
  }

  async verificarConexion() {
    try {
      this.apiStatus = 'checking';
      const res = await firstValueFrom(this.authService.me());
      const user = res?.data ? res.data : res;

      if (!user) {
        this.apiStatus = 'offline';
        this.router.navigate(['/login']);
      } else {
        this.apiStatus = 'online';
      }
    } catch {
      this.apiStatus = 'offline';
    }
  }

  async cargarDatosProfe() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      // 1. Grupos y Alumnos a cargo (El endpoint genérico que inventaste)
      const stats = await firstValueFrom(this.estudianteService.obtenerMisEstadisticas());
      if (stats) {
        this.misGrupos = stats.totalGrupos;
        this.totalAlumnos = stats.totalAlumnos;
      }

      // 2. Clases de Hoy y Próxima Clase
      const resClases = await firstValueFrom(this.clasesService.getClasesHoy());
      this.clasesHoy = resClases || [];
      
      if (this.clasesHoy.length > 0) {
        const ahora = new Date();
        const futuras = this.clasesHoy.filter((c: any) => {
          const horaStr = c.hora_inicio || c.hora || '00:00';
          const [h, m] = horaStr.split(':');
          const horaClase = new Date();
          horaClase.setHours(parseInt(h, 10), parseInt(m, 10), 0);
          return horaClase >= ahora;
        });
        this.proximaClase = futuras.length > 0 ? futuras[0] : this.clasesHoy[this.clasesHoy.length - 1];
      }

      // 3. Última Evaluación Finalizada (Mismo endpoint que el Admin)
      const resUltimaEval = await firstValueFrom(this.evaluacionSesionService.obtenerUltimaSesionFinalizada());
      this.ultimaEvaluacion = resUltimaEval || null;

      // 4. Cumpleaños Globales (Procesados en el Backend)
      const resCumples = await firstValueFrom(this.usuarioService.obtenerCumpleanosGlobales(7));
      this.cumpleanosList = resCumples || [];

    } catch (error) {
      console.error('Error Profe Dashboard:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async refrescar() {
    await this.verificarConexion();
    if (this.apiStatus === 'online') {
      await this.cargarDatosProfe();
    }
  }
}