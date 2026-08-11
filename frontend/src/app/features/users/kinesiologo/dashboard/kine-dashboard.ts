import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { SupabaseService } from '../../../../../core/services/supabase.service';

@Component({
  selector: 'app-kine-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './kine-dashboard.html',
  styleUrls: ['./kine-dashboard.css']
})
export class KineDashboardComponent implements OnInit {
  
  // Datos KPIs
  misGrupos: any[] = [];
  clasesHoy: any[] = [];
  proximaClase: any = null;
  totalAlumnos: number = 0;

  // Listas
  cumpleanosList: any[] = [];
  
  // Estados
  loading: boolean = true;
  supabaseStatus: 'online' | 'offline' | 'checking' = 'checking';

  constructor(
    private supabase: SupabaseService,
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
      const { data: { user } } = await this.supabase.getUser();
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
    try {
      const { data: { user } } = await this.supabase.getUser();
      if (!user?.email) return;

      // 1. Obtener ID del Kinesiólogo
      const { data: kine } = await this.supabase.supabase
          .from('kinesiologos')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

      if (!kine) return;

      // 2. Obtener sus Grupos Asignados
      const { data: gruposData } = await this.supabase.getGruposDeKine(kine.id);
      this.misGrupos = gruposData ? gruposData.map((g: any) => g.grupos).filter((g: any) => g !== null) : [];
      const misGrupoIds = this.misGrupos.map(g => g.id);

      if (misGrupoIds.length > 0) {
        // 3. Clases de Hoy y Próxima Clase (Para saber qué entrenan sus alumnos)
        const hoyStr = new Date().toISOString().split('T')[0];
        const { data: clases } = await this.supabase.supabase
          .from('clases')
          .select('*, grupos(nombre)')
          .in('grupo_id', misGrupoIds)
          .gte('fecha', hoyStr)
          .order('fecha', { ascending: true })
          .order('hora', { ascending: true });

        const todasClases = clases || [];
        this.clasesHoy = todasClases.filter(c => c.fecha === hoyStr);
        this.proximaClase = todasClases.length > 0 ? todasClases[0] : null;

        // 4. Alumnos y Cumpleaños (Solo de sus grupos)
        const { data: alumnos } = await this.supabase.supabase
          .from('estudiantes')
          .select('*, grupos(nombre)')
          .in('grupo_id', misGrupoIds)
          .eq('activo', true);

        if (alumnos) {
          this.totalAlumnos = alumnos.length;
          this.cumpleanosList = this.filtrarProximosCumpleanos(alumnos);
        }
      }

    } catch (error) {
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
        if (proximoCumple < hoy) proximoCumple = new Date(hoy.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate());
        
        const diffTime = proximoCumple.getTime() - hoy.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return { ...est, proximoCumple, diasRestantes, nuevaEdad: proximoCumple.getFullYear() - nacimiento.getFullYear() };
      })
      .filter(item => item !== null && item.diasRestantes >= 0 && item.diasRestantes <= 7)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }
}