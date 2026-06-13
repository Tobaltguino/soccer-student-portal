import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';

// Servicios de dominio
import { AuthService } from '../../core/services/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive], 
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.css'] // Solo necesitas 1 archivo CSS para todos
})
export class MainLayoutComponent implements OnInit {
  
  isCollapsed: boolean = false;      
  isMobileMenuOpen: boolean = false; 
  isDarkMode: boolean = false;

  userName: string = 'Cargando...';
  userRoleCode: string = 'student'; // Código de sistema (admin, student, etc)
  displayRole: string = 'Estudiante'; // Nombre legible para la UI
  portalName: string = 'PORTAL';
  userInitial: string = '?';
  userPhotoUrl: string | null = null;

  // Menú dinámico que se llenará según el rol
  menuSections: MenuSection[] = [];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.checkThemePreference();
    this.userRoleCode = localStorage.getItem('userRole') || 'student';
    this.configurarMenuYPortal();
    await this.cargarUsuario();
  }

  // --- CONFIGURACIÓN DINÁMICA DE ROL ---
  configurarMenuYPortal() {
    switch (this.userRoleCode) {
      case 'admin':
        this.portalName = 'ADMIN PANEL';
        this.displayRole = 'Administrador';
        this.menuSections = [
          { title: 'PRINCIPAL', items: [ { label: 'Inicio', icon: 'pi pi-home', route: '/admin/dashboard' } ] },
          { title: 'ADMINISTRACIÓN', items: [
            { label: 'Usuarios', icon: 'pi pi-users', route: '/admin/users' },
            { label: 'Grupos', icon: 'pi pi-th-large', route: '/admin/groups' },
            { label: 'Pagos', icon: 'pi pi-wallet', route: '/admin/payments' },
            { label: 'Home Config', icon: 'pi pi-globe', route: '/admin/home-config' },
            { label: 'Material Complementario', icon: 'pi pi-book', route: '/admin/guides' }
          ]},
          { title: 'DEPORTIVO', items: [
            { label: 'Clases', icon: 'pi pi-calendar', route: '/admin/classes' },
            { label: 'Asistencias', icon: 'pi pi-check-square', route: '/admin/attendance' },
            { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/admin/evaluations' }
          ]},
          { title: 'ÁREA KINESIOLOGÍA', items: [
            { label: 'Eval. Kinesiológicas', icon: 'pi pi-file-edit', route: '/admin/kine-evaluation' },
            { label: 'Lesiones y Ant.', icon: 'pi pi-heart', route: '/admin/kine-lessions' },
            { label: 'Ficha Evolutiva', icon: 'pi pi-clipboard', route: '/admin/kine-evolution' }
          ]},
          { title: 'ÁREA NUTRICIÓN', items: [ { label: 'Nutrición', icon: 'pi pi-apple', route: '/admin/nutri' } ] }
        ];
        break;

      case 'kine':
        this.portalName = 'ÁREA MÉDICA';
        this.displayRole = 'Kinesiólogo';
        this.menuSections = [
          { title: 'PRINCIPAL', items: [
            { label: 'Inicio', icon: 'pi pi-home', route: '/kine/dashboard' },
            { label: 'Mi Horario', icon: 'pi pi-calendar-times', route: '/kine/schedule' }
          ]},
          { title: 'PACIENTES Y FICHAS', items: [
            { label: 'Directorio de Alumnos', icon: 'pi pi-users', route: '/kine/patients' },
            { label: 'Eval. Kinesiológicas', icon: 'pi pi-file-edit', route: '/kine/evaluation-kine' },
            { label: 'Lesiones y Ant.', icon: 'pi pi-heart', route: '/kine/injuries-kine' },
            { label: 'Ficha Evolutiva', icon: 'pi pi-clipboard', route: '/kine/evolution-record-kine' }
          ]},
          { title: 'INTERDISCIPLINARIO', items: [
            { label: 'Ver Clases', icon: 'pi pi-calendar-plus', route: '/kine/classes' },
            { label: 'Pruebas Físicas', icon: 'pi pi-chart-line', route: '/kine/evaluations' },
            { label: 'Material Complementario', icon: 'pi pi-folder-open', route: '/kine/guides' },
            { label: 'Nutrición', icon: 'pi pi-apple', route: '/kine/nutrition' }
          ]}
        ];
        break;

      case 'nutri':
        this.portalName = 'PORTAL NUTRICIÓN';
        this.displayRole = 'Nutricionista';
        this.menuSections = [
          { title: 'PRINCIPAL', items: [ { label: 'Inicio', icon: 'pi pi-home', route: '/nutri/dashboard' } ] },
          { title: 'GESTIÓN MÉDICA', items: [
            { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/nutri/evaluations' },
            { label: 'Material Nutricional', icon: 'pi pi-book', route: '/nutri/guides' }
          ]}
        ];
        break;

      case 'professor':
        this.portalName = 'CUERPO TÉCNICO';
        this.displayRole = 'Profesor';
        this.menuSections = [
          { title: 'PANEL CONTROL', items: [
            { label: 'Inicio', icon: 'pi pi-home', route: '/professor/dashboard' },
            { label: 'Mi Horario', icon: 'pi pi-calendar', route: '/professor/schedule' },
            { label: 'Mis Estudiantes', icon: 'pi pi-users', route: '/professor/students' }
          ]},
          { title: 'GESTIÓN GRUPOS', items: [
            { label: 'Clases', icon: 'pi pi-calendar-plus', route: '/professor/classes' },
            { label: 'Asistencias', icon: 'pi pi-check-square', route: '/professor/attendance' },
            { label: 'Evaluaciones', icon: 'pi pi-chart-bar', route: '/professor/evaluations' },
            { label: 'Material Complementario', icon: 'pi pi-folder-open', route: '/professor/guides' }
          ]},
          { title: 'ÁREA KINESIOLOGÍA', items: [
            { label: 'Eval. Kinesiológicas', icon: 'pi pi-file-edit', route: '/professor/kine-evaluation' },
            { label: 'Lesiones y Ant.', icon: 'pi pi-heart', route: '/professor/kine-lessions' },
            { label: 'Ficha Evolutiva', icon: 'pi pi-clipboard', route: '/professor/kine-evolution' }
          ]},
          { title: 'ÁREA NUTRICIÓN', items: [ { label: 'Nutrición', icon: 'pi pi-apple', route: '/professor/nutrition' } ] }
        ];
        break;

      case 'student':
      default:
        this.portalName = 'PORTAL ALUMNO';
        this.displayRole = 'Estudiante';
        this.menuSections = [
          { title: 'PRINCIPAL', items: [
            { label: 'Inicio', icon: 'pi pi-home', route: '/student/dashboard' },
            { label: 'Mi Horario', icon: 'pi pi-calendar', route: '/student/schedule' }
          ]},
          { title: 'ACADÉMICO', items: [
            { label: 'Mis Clases', icon: 'pi pi-book', route: '/student/classes' },
            { label: 'Mi Asistencia', icon: 'pi pi-check-circle', route: '/student/attendance' },
            { label: 'Mis Profesores', icon: 'pi pi-users', route: '/student/view-professor' },
            { label: 'Mis Evaluaciones', icon: 'pi pi-chart-line', route: '/student/evaluations' },
            { label: 'Material Complementario', icon: 'pi pi-folder-open', route: '/student/guides' }
          ]},
          { title: 'ÁREA KINESIOLOGÍA', items: [
            { label: 'Mis Eval. Kinésicas', icon: 'pi pi-file-edit', route: '/student/kine-evaluation' },
            { label: 'Lesiones y Ant.', icon: 'pi pi-heart', route: '/student/kine-lessions' },
            { label: 'Mi Ficha Evolutiva', icon: 'pi pi-clipboard', route: '/student/kine-evolution' }
          ]},
          { title: 'ÁREA NUTRICIÓN', items: [ { label: 'Mi Nutrición', icon: 'pi pi-apple', route: '/student/nutri' } ] }
        ];
        break;
    }
  }

  // --- TEMA ---
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

  // --- USUARIO ---
  async cargarUsuario() {
    try {
      const { data: { user } } = await this.authService.getUser();
      
      if (!user || !user.email) {
        this.userName = 'Invitado';
        this.cdr.detectChanges();
        return;
      }

      // Usamos getPerfilCompleto pasando el rol dinámicamente
      const { data: perfil } = await this.authService.getPerfilCompleto(user.email, this.userRoleCode);

      if (perfil) {
          this.userName = `${perfil.nombre} ${perfil.apellido}`;
          this.userInitial = perfil.nombre ? perfil.nombre.charAt(0).toUpperCase() : 'U';
          this.userPhotoUrl = perfil.foto_url;
      } else {
          this.userName = user.email.split('@')[0];
          this.userPhotoUrl = null;
      }
      this.cdr.detectChanges();

    } catch (error) {
      this.userName = 'Usuario';
      this.cdr.detectChanges();
    }
  }

  // --- MENU ---
  toggleSidebar() { this.isCollapsed = !this.isCollapsed; }
  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu() { this.isMobileMenuOpen = false; }

  async logout() {
    await this.authService.logout();
    localStorage.removeItem('userRole');
    this.router.navigate(['/login']);
  }
}