import { Component, OnInit, ChangeDetectorRef, Renderer2, RendererFactory2 } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';

// 🚀 CAMBIO 1: Solo necesitamos AuthService. Adiós SupabaseCoreService.
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive], 
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.css']
})
export class AdminLayoutComponent implements OnInit {
  
  isCollapsed: boolean = false;      
  isMobileMenuOpen: boolean = false; 
  
  isDarkMode: boolean = false;

  userName: string = 'Cargando...';
  userRole: string = ''; 
  userInitial: string = '?';
  userPhotoUrl: string | null = null;

  private renderer: Renderer2;

  constructor(
    // 🚀 CAMBIO 2: Limpieza de inyecciones
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    rendererFactory: RendererFactory2
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.checkThemePreference(); 
  }

  async ngOnInit() {
    await this.cargarUsuario();  
  }

  // ==========================================
  // LÓGICA DE TEMA OSCURO
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
    if (this.isDarkMode) {
      this.disableDarkMode();
    } else {
      this.enableDarkMode();
    }
  }

  enableDarkMode() {
    this.isDarkMode = true;
    this.renderer.addClass(document.body, 'dark-mode');
    localStorage.setItem('theme', 'dark');
  }

  disableDarkMode() {
    this.isDarkMode = false;
    this.renderer.removeClass(document.body, 'dark-mode');
    localStorage.setItem('theme', 'light');
  }

  // ==========================================
  // CARGA DE USUARIO (Súper Optimizada)
  // ==========================================
  async cargarUsuario() {
    try {
      const { data: { user } } = await this.authService.getUser();
      
      if (!user || !user.email) {
        this.setFallbackUser('Invitado', 'Sin Rol');
        return;
      }

      const rolGuardado = localStorage.getItem('userRole');
      
      // 🚀 CAMBIO 3: Delegamos TODO el bucle y búsqueda al AuthService
      const { data: perfil } = await this.authService.getPerfilCompleto(user.email, rolGuardado);

      if (perfil) {
        this.setUserData(perfil.nombre, perfil.apellido, perfil.rol_display, perfil.foto_url);
      } else {
        this.setFallbackUser(user.email.split('@')[0], 'Sin Rol');
      }

    } catch (error) {
      console.error('Error al cargar perfil:', error);
      this.setFallbackUser('Error', '');
    }
  }

  // --- HELPERS PARA SETEAR ESTADOS ---
  private setUserData(nombre: string, apellido: string, rol: string, fotoUrl: string | null) {
    this.userName = `${nombre} ${apellido}`;
    this.userRole = rol;
    this.userInitial = nombre ? nombre.charAt(0).toUpperCase() : 'U';
    this.userPhotoUrl = fotoUrl;
    this.cdr.detectChanges();
  }

  private setFallbackUser(nombre: string, rol: string) {
    this.userName = nombre;
    this.userRole = rol;
    this.userInitial = nombre.charAt(0).toUpperCase();
    this.userPhotoUrl = null;
    this.cdr.detectChanges();
  }

  // ==========================================
  // MENU ACTIONS
  // ==========================================
  toggleSidebar() { this.isCollapsed = !this.isCollapsed; }
  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu() { this.isMobileMenuOpen = false; }

  async logout() {
    await this.authService.logout();
    localStorage.removeItem('userRole');
    localStorage.removeItem('theme');
    this.router.navigate(['/login']);
  }
}