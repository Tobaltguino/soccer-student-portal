import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// 🔥 Módulos y Servicios de PrimeNG (AQUÍ FALTABAN LOS SERVICIOS)
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api'; // ✅ IMPORTANTE

// 🚀 SERVICIOS MODULARES (NestJS)
import { AuthService } from '../../../../core/auth/services/auth.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { HistorialClinicoService } from '../../../../core/domains/salud/kinesiologia/historial-clinico/services/historial-clinico.service';

@Component({
  selector: 'app-kinesiologo-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService], // 🔥 ESTO ERA LO QUE FALTABA
  templateUrl: './dashboard.component.html', 
  styleUrls: ['./dashboard.component.scss']
})
export class KinesiologoDashboardComponent implements OnInit {
  
  private authService = inject(AuthService);
  private estudianteService = inject(EstudianteService);
  private usuarioService = inject(UsuarioService);
  private clasesService = inject(ClaseService);
  private historialClinicoService = inject(HistorialClinicoService);
  
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // KPIs ultra-optimizados
  misGrupos: number = 0;
  totalAlumnos: number = 0;
  clasesHoy: any[] = [];
  proximaClase: any = null;

  // KPIs Clínicos Reales
  pacientesEnTratamiento: number = 0;
  pacientesEnObservacion: number = 0;
  pacientesEnReintegro: number = 0;

  // Listas
  cumpleanosList: any[] = [];
  
  // Estados
  loading: boolean = true;
  apiStatus: 'online' | 'offline' | 'checking' = 'checking';

  async ngOnInit() {
    await this.verificarConexion();
    if (this.apiStatus === 'online') {
      await this.cargarDatosKine();
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

  async cargarDatosKine() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      // 1. Grupos y Alumnos del Kinesiólogo
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

      // 3. Cumpleaños Globales
      const resCumples = await firstValueFrom(this.usuarioService.obtenerCumpleanosGlobales(7));
      this.cumpleanosList = resCumples || [];

      // 4. Estadísticas Clínicas Reales
      const statsKine = await firstValueFrom(this.historialClinicoService.obtenerEstadisticasDashboard());
      if (statsKine) {
        this.pacientesEnTratamiento = statsKine.enTratamiento || 0;
        this.pacientesEnObservacion = statsKine.enObservacion || 0;
        this.pacientesEnReintegro = statsKine.enReintegro || 0;
      }

    } catch (error) {
      console.error('Error Kine Dashboard:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async refrescar() {
    await this.verificarConexion();
    if (this.apiStatus === 'online') {
      await this.cargarDatosKine();
    }
  }
}