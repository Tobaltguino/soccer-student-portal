import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { UsuariosService } from '../../../../core/services/modulos/administracion/usuarios.service';
import { GruposService } from '../../../../core/services/modulos/academico/grupos.service';
import { ClasesService } from '../../../../core/services/modulos/academico/clases.service';
import { EvaluacionFisicaService } from '../../../../core/services/modulos/academico/evaluacion-fisica.service';
import { KinesiologiaService } from '../../../../core/services/modulos/salud/kine.service';

@Component({
  selector: 'app-professor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './professor-dashboard.html',
  styleUrls: ['./professor-dashboard.css']
})
export class ProfessorDashboardComponent implements OnInit {
  
  // Datos KPIs
  misGrupos: any[] = [];
  clasesHoy: any[] = [];
  proximaClase: any = null;
  ultimaEvaluacion: any = null;
  totalAlumnos: number = 0;

  // KPIs DE SALUD
  pacientesEnTratamiento: number = 0;
  pacientesEnObservacion: number = 0;
  pacientesEnReintegro: number = 0;

  // Listas
  cumpleanosList: any[] = [];
  
  // Estados
  loading: boolean = true;
  supabaseStatus: 'online' | 'offline' | 'checking' = 'checking';

  constructor(
    private authService: AuthService,
    private usuariosService: UsuariosService,
    private gruposService: GruposService,
    private clasesService: ClasesService,
    private evaluacionFisicaService: EvaluacionFisicaService,
    private kinesiologiaService: KinesiologiaService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.verificarConexion();
    await this.cargarDatosProfe();
  }

  async verificarConexion() {
    try {
      this.supabaseStatus = 'checking';
      const { data: { user } } = await this.authService.getUser();
      if (!user) {
        this.supabaseStatus = 'offline';
        this.router.navigate(['/login']);
      } else {
        this.supabaseStatus = 'online';
      }
    } catch {
      this.supabaseStatus = 'offline';
    }
  }

  async cargarDatosProfe() {
    this.loading = true;
    // Reiniciar contadores
    this.pacientesEnTratamiento = 0;
    this.pacientesEnObservacion = 0;
    this.pacientesEnReintegro = 0;

    try {
      const { data: { user } } = await this.authService.getUser();
      if (!user?.email) return;

      const { data: prof } = await this.usuariosService.getProfesorByEmail(user.email);
      if (!prof) return;

      const { data: gruposData } = await this.gruposService.getGruposDeProfesor(prof.id);
      this.misGrupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
      const misGrupoIds = this.misGrupos.map(g => g.id);

      if (misGrupoIds.length > 0) {
        const hoyStr = new Date().toISOString().split('T')[0];

        const { data: clases } = await this.clasesService.getClasesPorGrupos(misGrupoIds, hoyStr);
        const todasClases = clases || [];
        this.clasesHoy = todasClases.filter((c: any) => c.fecha === hoyStr);
        this.proximaClase = todasClases.length > 0 ? todasClases[0] : null;

        const { data: evals } = await this.evaluacionFisicaService.getSesionesEvaluacionPorGrupos(misGrupoIds);
        if (evals && evals.length > 0) {
          this.ultimaEvaluacion = evals[0];
        }

        const { data: alumnos } = await this.usuariosService.getTodosEstudiantesPorGrupos(misGrupoIds, true);

        if (alumnos) {
          this.totalAlumnos = alumnos.length;
          this.cumpleanosList = this.filtrarProximosCumpleanos(alumnos);

          const alumnoIds = alumnos.map((a: any) => a.id);

          const { data: historiales } = await this.kinesiologiaService.getEstadosClinicosAlumnos(alumnoIds);

          if (historiales) {
              const setTratamiento = new Set();
              const setObservacion = new Set();
              const setReintegro = new Set();

              historiales.forEach((h: any) => {
                  if (h.estado === 'EN_TRATAMIENTO') setTratamiento.add(h.estudiante_id);
                  if (h.estado === 'EN_OBSERVACION') setObservacion.add(h.estudiante_id);
                  if (h.estado === 'EN_REINTEGRO_DEPORTIVO') setReintegro.add(h.estudiante_id);
              });

              this.pacientesEnTratamiento = setTratamiento.size;
              this.pacientesEnObservacion = setObservacion.size;
              this.pacientesEnReintegro = setReintegro.size;
          }
        }
      }
    } catch (error) {
      console.error('Error cargando dashboard del profesor:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  filtrarProximosCumpleanos(estudiantes: any[]): any[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return estudiantes
      .map(est => {
        if (!est.fecha_nacimiento) return null;
        const nacimiento = new Date(est.fecha_nacimiento + 'T00:00:00');
        const cumpleEsteAno = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
        let proximoCumple = cumpleEsteAno < hoy ? new Date(hoy.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate()) : cumpleEsteAno;
        const diasRestantes = Math.ceil((proximoCumple.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        return { ...est, proximoCumple, diasRestantes, nuevaEdad: proximoCumple.getFullYear() - nacimiento.getFullYear() };
      })
      .filter(item => item !== null && item.diasRestantes >= 0 && item.diasRestantes <= 7)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }
}