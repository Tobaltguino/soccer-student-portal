import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// Servicios de Dominio
import { AuthService } from '../../core/auth/services/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive], 
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'] 
})
export class LayoutComponent implements OnInit {
  
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  isCollapsed: boolean = false;      
  isMobileMenuOpen: boolean = false; 
  isDarkMode: boolean = true; // 🔥 Empezamos asumiendo oscuro

  userName: string = 'Cargando...';
  userRole: string = ''; 
  userInitial: string = '?';
  userPhotoUrl: string | null = null;

  menuGroups: MenuGroup[] = [];

  async ngOnInit() {
    this.checkThemePreference();
    this.determinarRolYMenu();
    await this.cargarUsuario();
  }

  // ==========================================
  // CONSTRUCCIÓN DINÁMICA DEL MENÚ
  // ==========================================
  determinarRolYMenu() {
    const rolActual = (this.authService.getUserRole() || '').toUpperCase();

    if (rolActual.includes('ADMIN')) {
      this.userRole = 'Administrador';
      this.menuGroups = this.getAdminMenu();
    } 
    else if (rolActual.includes('STUDENT') || rolActual.includes('ESTUDIANTE')) {
      this.userRole = 'Estudiante';
      this.menuGroups = this.getStudentMenu();
    } 
    else if (rolActual.includes('PROFESSOR') || rolActual.includes('PROFESOR')) {
      this.userRole = 'Profesor';
      this.menuGroups = this.getProfessorMenu();
    } 
    else if (rolActual.includes('KINE')) {
      this.userRole = 'Kinesiólogo';
      this.menuGroups = this.getKineMenu();
    } 
    else if (rolActual.includes('NUTRI')) {
      this.userRole = 'Nutricionista';
      this.menuGroups = this.getNutriMenu();
    } 
    else {
      this.userRole = 'Usuario';
      this.menuGroups = [];
    }
  }

  // ==========================================
  // CARGA DE USUARIO DESDE NESTJS
  // ==========================================
  async cargarUsuario() {
    try {
      const userRes = await firstValueFrom(this.authService.me());
      const user = userRes?.data ? userRes.data : userRes;
      
      if (!user || (!user.email && !user.nombre)) {
        this.userName = 'Invitado';
        this.cdr.detectChanges();
        return;
      }

      this.userName = user.nombre ? `${user.nombre} ${user.apellido}` : user.email.split('@')[0];
      this.userPhotoUrl = user.foto_url || user.fotoUrl || null;
      this.userInitial = this.userName.charAt(0).toUpperCase();
      
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      this.userName = 'Usuario';
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // GESTIÓN DE TEMA (Actualizado para Global CSS)
  // ==========================================
  checkThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Si guardó 'light' explícitamente, o si no hay nada y el sistema prefiere claro
    if (savedTheme === 'light' || (!savedTheme && !systemPrefersDark)) {
      this.disableDarkMode();
    } else {
      this.enableDarkMode();
    }
  }

  toggleTheme() {
    if (this.isDarkMode) this.disableDarkMode();
    else this.enableDarkMode();
  }

  enableDarkMode() {
    this.isDarkMode = true;
    document.body.classList.remove('light-mode'); // Quitamos la clase de luz (queda el oscuro por defecto)
    localStorage.setItem('theme', 'dark');
  }

  disableDarkMode() {
    this.isDarkMode = false;
    document.body.classList.add('light-mode'); // Añadimos la clase de luz
    localStorage.setItem('theme', 'light');
  }

  // ==========================================
  // NAVEGACIÓN Y LOGOUT
  // ==========================================
  toggleSidebar() { this.isCollapsed = !this.isCollapsed; }
  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu() { this.isMobileMenuOpen = false; }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        localStorage.clear();
        this.router.navigate(['/login']);
      }
    });
  }

  // ==========================================
  // DEFINICIÓN DE MENÚS POR ROL (RUTAS ESTANDARIZADAS)
  // ==========================================
  private getAdminMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/admin/inicio' }] },
      { label: 'ADMINISTRACIÓN', items: [
          { label: 'Usuarios', icon: 'pi pi-users', route: '/admin/usuarios' },
          { label: 'Grupos', icon: 'pi pi-th-large', route: '/admin/grupos' },
          { label: 'Pagos', icon: 'pi pi-wallet', route: '/admin/pagos' },
          { label: 'Material', icon: 'pi pi-book', route: '/admin/material' },
          { label: 'Configuración', icon: 'pi pi-globe', route: '/admin/configuracion' }
      ]},
      { label: 'DEPORTIVO', items: [
          { label: 'Clases', icon: 'pi pi-calendar', route: '/admin/clases' },
          { label: 'Asistencias', icon: 'pi pi-check-square', route: '/admin/asistencias' },
          { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/admin/evaluaciones' }
      ]},
      { label: 'ÁREA MÉDICA', items: [
          { label: 'Kine - Historial', icon: 'pi pi-heart-fill', route: '/admin/historial-clinico' },
          { label: 'Kine - Fichas', icon: 'pi pi-file-edit', route: '/admin/fichas-evolutivas' },
          { label: 'Kine - Pruebas', icon: 'pi pi-bolt', route: '/admin/evaluaciones-kine' },
          { label: 'Nutrición', icon: 'pi pi-apple', route: '/admin/nutricion' }
      ]}
    ];
  }

  private getStudentMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/estudiante/inicio' }] },
      { label: 'DEPORTIVO', items: [
          { label: 'Horario', icon: 'pi pi-calendar', route: '/estudiante/horario' },
          { label: 'Mis Clases', icon: 'pi pi-th-large', route: '/estudiante/clases' },
          { label: 'Asistencia', icon: 'pi pi-check-square', route: '/estudiante/asistencias' },
          { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/estudiante/evaluaciones' },
          { label: 'Material', icon: 'pi pi-book', route: '/estudiante/material' },
          { label: 'Cuerpo Técnico', icon: 'pi pi-users', route: '/estudiante/cuerpo-tecnico' }
      ]},
      { label: 'ÁREA MÉDICA', items: [
          { label: 'Kine - Historial', icon: 'pi pi-heart-fill', route: '/estudiante/historial-clinico' },
          { label: 'Kine - Fichas', icon: 'pi pi-file-edit', route: '/estudiante/fichas-evolutivas' },
          { label: 'Kine - Pruebas', icon: 'pi pi-bolt', route: '/estudiante/evaluaciones-kine' },
          { label: 'Nutrición', icon: 'pi pi-apple', route: '/estudiante/nutricion' }
      ]}
    ];
  }

  private getProfessorMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/profesor/inicio' }] },
      { label: 'GESTIÓN', items: [
          { label: 'Horario', icon: 'pi pi-calendar', route: '/profesor/horario' },
          { label: 'Mis Clases', icon: 'pi pi-calendar', route: '/profesor/clases' },
          { label: 'Asistencia', icon: 'pi pi-check-square', route: '/profesor/asistencias' },
          { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/profesor/evaluaciones' },
          { label: 'Material', icon: 'pi pi-book', route: '/profesor/material' },
          { label: 'Estudiantes', icon: 'pi pi-users', route: '/profesor/estudiantes' }
      ]},
      { label: 'ÁREA MÉDICA', items: [
          { label: 'Kine - Historial', icon: 'pi pi-heart-fill', route: '/profesor/historial-clinico' },
          { label: 'Kine - Fichas', icon: 'pi pi-file-edit', route: '/profesor/fichas-evolutivas' },
          { label: 'Kine - Pruebas', icon: 'pi pi-bolt', route: '/profesor/evaluaciones-kine' },
          { label: 'Nutrición', icon: 'pi pi-apple', route: '/profesor/nutricion' }
      ]}
    ];
  }

  private getKineMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/kinesiologo/inicio' }] },
      { label: 'DEPORTIVO', items: [
          { label: 'Horario', icon: 'pi pi-clock', route: '/kinesiologo/horario' },
          { label: 'Clases', icon: 'pi pi-calendar', route: '/kinesiologo/clases' },
          { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/kinesiologo/evaluaciones' },
          { label: 'Material', icon: 'pi pi-book', route: '/kinesiologo/material' },
          { label: 'Pacientes', icon: 'pi pi-users', route: '/kinesiologo/pacientes' }
      ]},
      { label: 'KINESIOLOGÍA', items: [
          { label: 'Historial Clínico', icon: 'pi pi-heart-fill', route: '/kinesiologo/historial-clinico' },
          { label: 'Fichas Evolutivas', icon: 'pi pi-file-edit', route: '/kinesiologo/fichas-evolutivas' },
          { label: 'Evaluaciones Kinésicas', icon: 'pi pi-bolt', route: '/kinesiologo/evaluaciones-kine' },
          { label: 'Pautas Nutricionales', icon: 'pi pi-apple', route: '/kinesiologo/nutricion' }
      ]}
    ];
  }

  private getNutriMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/nutricionista/inicio' }] },
      { label: 'NUTRICIÓN', items: [
          { label: 'Evaluaciones', icon: 'pi pi-apple', route: '/nutricionista/evaluaciones' },
          { label: 'Material Complementario', icon: 'pi pi-book', route: '/nutricionista/material' }
      ]}
    ];
  }
}