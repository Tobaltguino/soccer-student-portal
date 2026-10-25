import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';

// Servicio de Autenticación y Enums
import { AuthService } from '../../core/auth/services/auth.service';
import { Rol } from '../../shared/enums/rol.enum';

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
  isDarkMode: boolean = true; 

  userName: string = 'Cargando...';
  userRole: string = ''; 
  userInitial: string = '?';
  userPhotoUrl: string | null = null;

  menuGroups: MenuGroup[] = [];

  async ngOnInit() {
    this.checkThemePreference();
    await this.cargarUsuario();
    this.determinarRolYMenu();
  }

  // ==========================================
  // CARGA DE USUARIO DESDE LA API
  // ==========================================
  async cargarUsuario() {
    try {
      const session = await this.authService.obtenerSesionActual();
      
      if (!session?.user) {
        this.setFallbackUser();
        return;
      }

      const perfil = await this.authService.obtenerPerfilUsuario(session.user.id);

      if (!perfil) {
        this.setFallbackUser();
        return;
      }

      this.userName = `${perfil.nombre || ''} ${perfil.apellido || ''}`.trim() || 'Usuario Academia';
      this.userPhotoUrl = perfil.foto_url || null;
      this.userInitial = this.userName.charAt(0).toUpperCase();
      this.userRole = perfil.rol || '';

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      this.setFallbackUser();
    }
  }

  private setFallbackUser() {
    this.userName = 'Usuario Academia';
    this.userInitial = 'U';
    this.cdr.detectChanges();
  }

  // ==========================================
  // CONSTRUCCIÓN DINÁMICA DEL MENÚ
  // ==========================================
  determinarRolYMenu() {
    const rolActual = (this.userRole || '').toLowerCase();

    switch (rolActual) {
      case Rol.ADMINISTRADOR:
        this.userRole = 'Administrador';
        this.menuGroups = this.getAdminMenu();
        break;
      
      case Rol.ESTUDIANTE:
        this.userRole = 'Estudiante';
        this.menuGroups = this.getStudentMenu();
        break;
      
      case Rol.PROFESOR:
        this.userRole = 'Profesor';
        this.menuGroups = this.getProfessorMenu();
        break;
      
      case Rol.KINESIOLOGO:
        this.userRole = 'Kinesiólogo';
        this.menuGroups = this.getKineMenu();
        break;
      
      case Rol.NUTRICIONISTA:
        this.userRole = 'Nutricionista';
        this.menuGroups = this.getNutriMenu();
        break;
      
      default:
        this.userRole = 'Usuario';
        this.menuGroups = [];
        break;
    }
    
    this.cdr.detectChanges();
  }

  // ==========================================
  // GESTIÓN DE TEMA
  // ==========================================
  checkThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
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
    document.body.classList.remove('light-mode');
    localStorage.setItem('theme', 'dark');
  }

  disableDarkMode() {
    this.isDarkMode = false;
    document.body.classList.add('light-mode');
    localStorage.setItem('theme', 'light');
  }

  // ==========================================
  // NAVEGACIÓN Y LOGOUT
  // ==========================================
  toggleSidebar() { this.isCollapsed = !this.isCollapsed; }
  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu() { this.isMobileMenuOpen = false; }

  async logout() {
    try {
      await this.authService.signOut();
      localStorage.clear();
      this.router.navigate(['/login']);
    } catch (error) {
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }

  // ==========================================
  // DEFINICIÓN DE MENÚS POR ROL (RUTAS PLANAS)
  // ==========================================
  private getAdminMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/inicio' }] },
      { label: 'ADMINISTRACIÓN', items: [
          { label: 'Usuarios', icon: 'pi pi-users', route: '/usuarios' },
          { label: 'Grupos', icon: 'pi pi-th-large', route: '/grupos' },
          // { label: 'Pagos', icon: 'pi pi-wallet', route: '/pagos' },
          { label: 'Material', icon: 'pi pi-book', route: '/material' },
          { label: 'Configuración', icon: 'pi pi-globe', route: '/configuracion' }
      ]},
      { label: 'DEPORTIVO', items: [
          { label: 'Clases', icon: 'pi pi-calendar', route: '/clases' },
          { label: 'Asistencias', icon: 'pi pi-check-square', route: '/asistencias' },
          { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/evaluaciones' }
      ]},
      { label: 'ÁREA MÉDICA', items: [
          { label: 'Kine - Historial', icon: 'pi pi-heart-fill', route: '/historial-clinico' },
          { label: 'Kine - Fichas', icon: 'pi pi-file-edit', route: '/fichas-evolutivas' },
          { label: 'Kine - Pruebas', icon: 'pi pi-bolt', route: '/evaluaciones-kine' },
          { label: 'Nutrición', icon: 'pi pi-apple', route: '/evaluaciones-nutri' }
      ]}
    ];
  }

  private getStudentMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/inicio' }] },
      { label: 'DEPORTIVO', items: [
          { label: 'Horario', icon: 'pi pi-calendar', route: '/horario' },
          { label: 'Mis Clases', icon: 'pi pi-th-large', route: '/clases' },
          { label: 'Asistencia', icon: 'pi pi-check-square', route: '/asistencias' },
          { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/evaluaciones' },
          { label: 'Material', icon: 'pi pi-book', route: '/material' },
          { label: 'Cuerpo Técnico', icon: 'pi pi-users', route: '/cuerpo-tecnico' }
      ]},
      { label: 'ÁREA MÉDICA', items: [
          { label: 'Kine - Historial', icon: 'pi pi-heart-fill', route: '/historial-clinico' },
          { label: 'Kine - Fichas', icon: 'pi pi-file-edit', route: '/fichas-evolutivas' },
          { label: 'Kine - Pruebas', icon: 'pi pi-bolt', route: '/evaluaciones-kine' },
          { label: 'Nutrición', icon: 'pi pi-apple', route: '/evaluaciones-nutri' }
      ]}
    ];
  }

  private getProfessorMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/inicio' }] },
      { label: 'GESTIÓN', items: [
          { label: 'Horario', icon: 'pi pi-calendar', route: '/horario' },
          { label: 'Mis Clases', icon: 'pi pi-calendar', route: '/clases' },
          { label: 'Asistencia', icon: 'pi pi-check-square', route: '/asistencias' },
          { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/evaluaciones' },
          { label: 'Material', icon: 'pi pi-book', route: '/material' },
          { label: 'Estudiantes', icon: 'pi pi-users', route: '/estudiantes' }
      ]},
      { label: 'ÁREA MÉDICA', items: [
          { label: 'Kine - Historial', icon: 'pi pi-heart-fill', route: '/historial-clinico' },
          { label: 'Kine - Fichas', icon: 'pi pi-file-edit', route: '/fichas-evolutivas' },
          { label: 'Kine - Pruebas', icon: 'pi pi-bolt', route: '/evaluaciones-kine' },
          { label: 'Nutrición', icon: 'pi pi-apple', route: '/evaluaciones-nutri' }
      ]}
    ];
  }

  private getKineMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/inicio' }] },
      { label: 'DEPORTIVO', items: [
          { label: 'Horario', icon: 'pi pi-clock', route: '/horario' },
          { label: 'Clases', icon: 'pi pi-calendar', route: '/clases' },
          { label: 'Evaluaciones', icon: 'pi pi-chart-line', route: '/evaluaciones' },
          { label: 'Material', icon: 'pi pi-book', route: '/material' },
          { label: 'Pacientes', icon: 'pi pi-users', route: '/estudiantes' } // 🔥 Apunta a la ruta centralizada /estudiantes
      ]},
      { label: 'KINESIOLOGÍA', items: [
          { label: 'Historial Clínico', icon: 'pi pi-heart-fill', route: '/historial-clinico' },
          { label: 'Fichas Evolutivas', icon: 'pi pi-file-edit', route: '/fichas-evolutivas' },
          { label: 'Evaluaciones Kinésicas', icon: 'pi pi-bolt', route: '/evaluaciones-kine' },
          { label: 'Pautas Nutricionales', icon: 'pi pi-apple', route: '/evaluaciones-nutri' }
      ]}
    ];
  }

  private getNutriMenu(): MenuGroup[] {
    return [
      { label: 'PRINCIPAL', items: [{ label: 'Inicio', icon: 'pi pi-home', route: '/inicio' }] },
      { label: 'NUTRICIÓN', items: [
          { label: 'Evaluaciones', icon: 'pi pi-apple', route: '/evaluaciones-nutri' }, // 🔥 Apunta al nombre unificado
          { label: 'Material Complementario', icon: 'pi pi-book', route: '/material' }
      ]}
    ];
  }
}