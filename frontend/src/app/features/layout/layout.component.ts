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
  styleUrls: ['./layout.component.css'] 
})
export class LayoutComponent implements OnInit {
  
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  isCollapsed: boolean = false;      
  isMobileMenuOpen: boolean = false; 
  isDarkMode: boolean = false;

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
    // Usamos el método de tu AuthService
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
      // Llamamos a tu método me() y lo convertimos a Promesa
      const userRes = await firstValueFrom(this.authService.me());
      
      // Dependiendo de cómo envíe NestJS, puede estar en userRes o userRes.data
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
  // GESTIÓN DE TEMA
  // ==========================================
  checkThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      this.enableDarkMode();
    } else {
      this.disableDarkMode();
    }
  }

  toggleTheme() {
    if (this.isDarkMode) this.disableDarkMode();
    else this.enableDarkMode();
  }

  enableDarkMode() {
    this.isDarkMode = true;
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  }

  disableDarkMode() {
    this.isDarkMode = false;
    document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
  }

  // ==========================================
  // NAVEGACIÓN Y LOGOUT
  // ==========================================
  toggleSidebar() { this.isCollapsed = !this.isCollapsed; }
  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu() { this.isMobileMenuOpen = false; }

  logout() {
    // Usamos el Observable de logout de tu AuthService
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        // Por si el servidor falla, forzamos salida local igual
        localStorage.clear();
        this.router.navigate(['/login']);
      }
    });
  }

  // ==========================================
  // DEFINICIÓN DE MENÚS POR ROL
  // ==========================================
  private getAdminMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/admin/dashboard' }] },
      { label: 'ADMINISTRACIÓN', items: [
          { label: 'Usuarios', icon: 'pi pi-users', route: '/admin/users' },
          { label: 'Grupos', icon: 'pi pi-th-large', route: '/admin/groups' },
          { label: 'Pagos', icon: 'pi pi-wallet', route: '/admin/payments' },
          { label: 'Material', icon: 'pi pi-book', route: '/admin/guides' },
          { label: 'Configuración', icon: 'pi pi-globe', route: '/admin/home-config' }
      ]},
      { label: 'DEPORTIVO', items: [
          { label: 'Clases', icon: 'pi pi-calendar', route: '/admin/classes' },
          { label: 'Asistencias', icon: 'pi pi-check-square', route: '/admin/attendance' },
          { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/admin/evaluations' }
      ]},
      { label: 'ÁREA MÉDICA', items: [
          { label: 'Kine - Historial', icon: 'pi pi-heart-fill', route: '/admin/kine-historial' },
          { label: 'Kine - Fichas', icon: 'pi pi-file-edit', route: '/admin/kine-fichas' },
          { label: 'Kine - Pruebas', icon: 'pi pi-bolt', route: '/admin/kine-evaluaciones' },
          { label: 'Nutrición', icon: 'pi pi-apple', route: '/admin/nutricion' }
      ]}
    ];
  }

  private getStudentMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/student/dashboard' }] },
      { label: 'DEPORTIVO', items: [
          { label: 'Horario', icon: 'pi pi-calendar', route: '/student/schedule' },
          { label: 'Mis Clases', icon: 'pi pi-th-large', route: '/student/classes' },
          { label: 'Asistencia', icon: 'pi pi-check-square', route: '/student/attendance' },
          { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/student/evaluations' },
          { label: 'Material', icon: 'pi pi-book', route: '/student/guides' },
          { label: 'Profesores', icon: 'pi pi-users', route: '/student/view-professor' }
      ]},
      { label: 'ÁREA MÉDICA', items: [
          { label: 'Kine - Historial', icon: 'pi pi-heart-fill', route: '/student/kine-historial' },
          { label: 'Kine - Fichas', icon: 'pi pi-file-edit', route: '/student/kine-fichas' },
          { label: 'Kine - Pruebas', icon: 'pi pi-bolt', route: '/student/kine-evaluaciones' },
          { label: 'Nutrición', icon: 'pi pi-apple', route: '/student/nutricion' }
      ]}
    ];
  }

  private getProfessorMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/professor/dashboard' }] },
      { label: 'GESTIÓN', items: [
          { label: 'Mis Clases', icon: 'pi pi-calendar', route: '/professor/classes' },
          { label: 'Asistencia', icon: 'pi pi-check-square', route: '/professor/attendance' },
          { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/professor/evaluations' },
          { label: 'Estudiantes', icon: 'pi pi-users', route: '/professor/students' },
          { label: 'Material', icon: 'pi pi-book', route: '/professor/guides' }
      ]},
      { label: 'ÁREA MÉDICA (Lectura)', items: [
          { label: 'Kine - Historial', icon: 'pi pi-heart-fill', route: '/professor/kine-historial' },
          { label: 'Kine - Fichas', icon: 'pi pi-file-edit', route: '/professor/kine-fichas' },
          { label: 'Kine - Pruebas', icon: 'pi pi-bolt', route: '/professor/kine-evaluaciones' },
          { label: 'Nutrición', icon: 'pi pi-apple', route: '/professor/nutricion' }
      ]}
    ];
  }

  private getKineMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/kine/dashboard' }] },
      { label: 'DEPORTIVO', items: [
          { label: 'Clases', icon: 'pi pi-calendar', route: '/kine/classes' },
          { label: 'Horarios', icon: 'pi pi-clock', route: '/kine/schedule' },
          { label: 'Material', icon: 'pi pi-book', route: '/kine/guides' },
          { label: 'Pacientes', icon: 'pi pi-users', route: '/kine/patients' }
      ]},
      { label: 'KINESIOLOGÍA', items: [
          { label: 'Historial Clínico', icon: 'pi pi-heart-fill', route: '/kine/kine-historial' },
          { label: 'Fichas Evolutivas', icon: 'pi pi-file-edit', route: '/kine/kine-fichas' },
          { label: 'Evaluaciones Físicas', icon: 'pi pi-bolt', route: '/kine/kine-evaluaciones' },
          { label: 'Pautas Nutricionales', icon: 'pi pi-apple', route: '/kine/nutricion' }
      ]}
    ];
  }

  private getNutriMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/nutri/dashboard' }] },
      { label: 'NUTRICIÓN', items: [
          { label: 'Evaluaciones', icon: 'pi pi-apple', route: '/nutri/evaluations' },
          { label: 'Material Complementario', icon: 'pi pi-book', route: '/nutri/guides' }
      ]}
    ];
  }
}