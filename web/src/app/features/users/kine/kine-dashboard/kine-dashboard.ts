import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { KinesiologiaService } from '../../../../core/services/modulos/salud/kine.service';
import { ClasesService } from '../../../../core/services/modulos/academico/clases.service';
import { UsuariosService } from '../../../../core/services/modulos/administracion/usuarios.service';

@Component({
  selector: 'app-kine-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './kine-dashboard.html',
  styleUrls: ['./kine-dashboard.css']
})
export class KineDashboardComponent implements OnInit {
  
  // Datos KPIs Generales
  misGrupos: any[] = [];
  clasesHoy: any[] = [];
  proximaClase: any = null;
  totalAlumnos: number = 0;

  // NUEVOS KPIs DETALLADOS DE SALUD
  pacientesEnTratamiento: number = 0;    // Rojo (Urgente)
  pacientesEnObservacion: number = 0;     // Amarillo (Cuidado)
  pacientesEnReintegro: number = 0;       // Azul (Casi listos)

  // Listas
  cumpleanosList: any[] = [];
  
  // Estados
  loading: boolean = true;
  supabaseStatus: 'online' | 'offline' | 'checking' = 'checking';

  constructor(
    private authService: AuthService,
    private kinesiologiaService: KinesiologiaService,
    private clasesService: ClasesService,
    private usuariosService: UsuariosService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.verificarConexion();
    await this.cargarDatosKine();
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

  async cargarDatosKine() {
    this.loading = true;
    // Reiniciamos contadores
    this.pacientesEnTratamiento = 0;
    this.pacientesEnObservacion = 0;
    this.pacientesEnReintegro = 0;
    
    try {
      const { data: { user } } = await this.authService.getUser();
      if (!user?.email) return;

      const { data: kine } = await this.kinesiologiaService.getKineByEmail(user.email);
      if (!kine) return;

      const { data: gruposData } = await this.kinesiologiaService.getGruposDeKine(kine.id);
      
      this.misGrupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
      const misGrupoIds = this.misGrupos.map(g => g.id);

      if (misGrupoIds.length > 0) {
        const hoyStr = new Date().toISOString().split('T')[0];

        const { data: clases } = await this.clasesService.getClasesPorGrupos(misGrupoIds, hoyStr);
        const todasClases = clases || [];
        this.clasesHoy = todasClases.filter((c: any) => c.fecha === hoyStr);
        this.proximaClase = todasClases.length > 0 ? todasClases[0] : null;

        const { data: alumnos } = await this.usuariosService.getTodosEstudiantesPorGrupos(misGrupoIds, true);

        if (alumnos) {
          this.totalAlumnos = alumnos.length;
          this.cumpleanosList = this.filtrarProximosCumpleanos(alumnos);
          
          const alumnoIds = alumnos.map((a: any) => a.id);
          
          const { data: historiales } = await this.kinesiologiaService.getEstadosClinicosAlumnos(alumnoIds);

          if (historiales) {
              const setTratamiento = new Set<string>();
              const setObservacion = new Set<string>();
              const setReintegro = new Set<string>();

              historiales.forEach((h: any) => {
                  switch (h.estado) {
                      case 'EN_TRATAMIENTO': setTratamiento.add(h.estudiante_id); break;
                      case 'EN_OBSERVACION': setObservacion.add(h.estudiante_id); break;
                      case 'EN_REINTEGRO_DEPORTIVO': setReintegro.add(h.estudiante_id); break;
                  }
              });

              this.pacientesEnTratamiento = setTratamiento.size;
              this.pacientesEnObservacion = setObservacion.size;
              this.pacientesEnReintegro = setReintegro.size;
          }
        }
      }

    } catch (error) {
      console.error('Error al cargar datos del dashboard kine', error);
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
        let proximoCumple = cumpleEsteAno;
        
        if (proximoCumple < hoy) {
            proximoCumple = new Date(hoy.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate());
        }
        
        const diffTime = proximoCumple.getTime() - hoy.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return { ...est, proximoCumple, diasRestantes, nuevaEdad: proximoCumple.getFullYear() - nacimiento.getFullYear() };
      })
      .filter(item => item !== null && item.diasRestantes >= 0 && item.diasRestantes <= 7)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }
}