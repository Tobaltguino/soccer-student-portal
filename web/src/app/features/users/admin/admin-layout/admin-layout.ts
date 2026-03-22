import { Component, OnInit, ChangeDetectorRef, Renderer2, RendererFactory2 } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';

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
  
  // Estado del tema
  isDarkMode: boolean = false;

  userName: string = 'Cargando...';
  userRole: string = ''; 
  userInitial: string = '?';
  userPhotoUrl: string | null = null;

  private renderer: Renderer2;

  constructor(
    private supabase: SupabaseService, 
    private router: Router,
    private cdr: ChangeDetectorRef,
    rendererFactory: RendererFactory2
  ) {
    // Inicializamos el Renderer2 de forma segura
    this.renderer = rendererFactory.createRenderer(null, null);
    
    // 1. Aplicar tema guardado lo antes posible (evita el pestañeo blanco)
    this.checkThemePreference(); 
  }

  async ngOnInit() {
    // 2. Cargar usuario una vez que el componente ya está inicializado
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
    this.renderer.addClass(document.body, 'dark-mode'); // Uso correcto en Angular
    localStorage.setItem('theme', 'dark');
  }

  disableDarkMode() {
    this.isDarkMode = false;
    this.renderer.removeClass(document.body, 'dark-mode');
    localStorage.setItem('theme', 'light');
  }

  // ==========================================
  // CARGA DE USUARIO (Optimizada)
  // ==========================================
  async cargarUsuario() {
    try {
      const { data: { user } } = await this.supabase.getUser();
      
      if (!user || !user.email) {
        this.setFallbackUser('Invitado', 'Sin Rol');
        return;
      }

      // 💡 OPTIMIZACIÓN: Buscamos primero según el rol guardado en caché al loguearse
      const rolGuardado = localStorage.getItem('userRole');
      
      const roleMap: Record<string, { tabla: string, display: string }> = {
        'admin': { tabla: 'admins', display: 'Administrador' },
        'profesor': { tabla: 'profesores', display: 'Profesor' },
        'estudiante': { tabla: 'estudiantes', display: 'Estudiante' },
        'kine': { tabla: 'kinesiologos', display: 'Kinesiólogo' },
        'nutri': { tabla: 'nutricionistas', display: 'Nutricionista' },
        // Fallbacks de idioma por si en tu Auth los guardaste diferente:
        'professor': { tabla: 'profesores', display: 'Profesor' },
        'student': { tabla: 'estudiantes', display: 'Estudiante' }
      };

      if (rolGuardado && roleMap[rolGuardado]) {
        const config = roleMap[rolGuardado];
        const { data } = await this.supabase.supabase
          .from(config.tabla)
          .select('nombre, apellido, foto_url') 
          .eq('email', user.email)
          .maybeSingle();

        if (data) {
          this.setUserData(data.nombre, data.apellido, config.display, data.foto_url);
          return; // Salimos de la función, nos ahorramos el bucle
        }
      }

      // 🔄 FALLBACK: Si no había caché o falló, hacemos el bucle por seguridad
      const tablasFallback = [
        { tabla: 'admins',        rol: 'Administrador' },
        { tabla: 'profesores',    rol: 'Profesor' },
        { tabla: 'estudiantes',   rol: 'Estudiante' },
        { tabla: 'kinesiologos',  rol: 'Kinesiólogo' },
        { tabla: 'nutricionistas',rol: 'Nutricionista' }
      ];

      let encontrado = false;

      for (const t of tablasFallback) {
        const { data } = await this.supabase.supabase
          .from(t.tabla)
          .select('nombre, apellido, foto_url') 
          .eq('email', user.email)
          .maybeSingle();

        if (data) {
          this.setUserData(data.nombre, data.apellido, t.rol, data.foto_url);
          encontrado = true;
          break; 
        }
      }

      if (!encontrado) {
        this.setFallbackUser(user.email.split('@')[0], 'Sin Rol');
      }

    } catch (error) {
      console.error('Error al cargar perfil de Supabase:', error);
      this.setFallbackUser('Error', '');
    }
  }

  // --- HELPERS PARA SETEAR ESTADOS (Mantienen el código DRY) ---
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
    await this.supabase.logout();
    // Limpiamos todo rastro de la sesión
    localStorage.removeItem('userRole');
    localStorage.removeItem('theme'); // Opcional: si quieres que olvide el tema al salir
    this.router.navigate(['/login']);
  }
}