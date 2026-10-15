import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// 🔥 Módulos de PrimeNG agregados
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { MessageService, ConfirmationService } from 'primeng/api';

// 🚀 SERVICIOS MODULARES (NestJS)
import { AuthService } from '../../../../core/auth/services/auth.service';
import { EstudianteService } from '../../../../core/domains/usuarios/estudiantes/services/estudiante.service';
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';
// 👇 Importamos el servicio específico de SESIONES de Nutrición
import { NutriSesionService } from '../../../../core/domains/salud/nutricion/evaluaciones/sesiones/services/sesion.service';

@Component({
  selector: 'app-nutri-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    TooltipModule,
    ButtonModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './dashboard.component.html', 
  styleUrls: ['./dashboard.component.scss'], // 🔥 Cambiado a .scss
})
export class NutricionistaDashboardComponent implements OnInit {
  
  private authService = inject(AuthService);
  private estudianteService = inject(EstudianteService);
  private usuarioService = inject(UsuarioService);
  private nutriSesionService = inject(NutriSesionService);
  
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Estados
  loading: boolean = true;
  apiStatus: 'online' | 'offline' | 'checking' = 'checking'; 
  
  // KPIs
  totalEstudiantes: number = 0;
  ultimaEvaluacionGlobal: any = null;
  proximosCumpleanos: any[] = [];
  
  async ngOnInit() {
    await this.verificarConexion();
    if (this.apiStatus === 'online') {
      await this.cargarDatosDashboard();
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

  async cargarDatosDashboard() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      // 1. Total de Estudiantes Activos (Toda la academia)
      const resCount = await firstValueFrom(this.estudianteService.contarEstudiantesActivos());
      this.totalEstudiantes = resCount?.total || 0;

      // 2. Última Evaluación Nutricional Finalizada
      const resUltimaEval = await firstValueFrom(this.nutriSesionService.obtenerUltimaFinalizada());
      this.ultimaEvaluacionGlobal = resUltimaEval || null;

      // 3. Cumpleaños Globales
      const resCumples = await firstValueFrom(this.usuarioService.obtenerCumpleanosGlobales(7));
      this.proximosCumpleanos = resCumples || [];

    } catch (error) {
      console.error('Error Nutri Dashboard:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async refrescar() {
    await this.verificarConexion();
    if (this.apiStatus === 'online') {
      await this.cargarDatosDashboard();
    }
  }
}