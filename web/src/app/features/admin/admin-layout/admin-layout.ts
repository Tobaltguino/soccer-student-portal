import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

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

  constructor(
    private supabase: SupabaseService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.checkThemePreference(); // 1. Aplicar tema guardado
    await this.cargarUsuario();  // 2. Cargar usuario
  }

  // --- LÓGICA DE TEMA OSCURO ---
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
    document.body.classList.add('dark-mode'); // Agrega la clase al body
    localStorage.setItem('theme', 'dark');
  }

  disableDarkMode() {
    this.isDarkMode = false;
    document.body.classList.remove('dark-mode'); // Quita la clase del body
    localStorage.setItem('theme', 'light');
  }

  // --- CARGA DE USUARIO ---
  async cargarUsuario() {
    try {
      const { data: { user } } = await this.supabase.getUser();
      
      if (!user || !user.email) {
        this.userName = 'Invitado';
        this.cdr.detectChanges();
        return;
      }

      const tablas = [
        { tabla: 'admins',         rol: 'Administrador' },
        { tabla: 'profesores',     rol: 'Profesor' },
        { tabla: 'estudiantes',    rol: 'Estudiante' },
        { tabla: 'kinesiologos',   rol: 'Kinesiólogo' },
        { tabla: 'nutricionistas', rol: 'Nutricionista' }
      ];

      let encontrado = false;

      for (const t of tablas) {
        const { data } = await this.supabase.supabase
          .from(t.tabla)
          .select('nombre, apellido')
          .eq('email', user.email)
          .maybeSingle();

        if (data) {
          this.userName = `${data.nombre} ${data.apellido}`;
          this.userRole = t.rol;
          this.userInitial = data.nombre ? data.nombre.charAt(0).toUpperCase() : 'U';
          encontrado = true;
          this.cdr.detectChanges();
          break; 
        }
      }

      if (!encontrado) {
        this.userName = user.email.split('@')[0];
        this.userRole = 'Sin Rol';
        this.userInitial = this.userName.charAt(0).toUpperCase();
        this.cdr.detectChanges();
      }

    } catch (error) {
      console.error('Error perfil:', error);
      this.userName = 'Error';
      this.cdr.detectChanges();
    }
  }

  // --- MENU ACTIONS ---
  toggleSidebar() { this.isCollapsed = !this.isCollapsed; }
  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu() { this.isMobileMenuOpen = false; }

  async logout() {
    await this.supabase.logout();
    this.router.navigate(['/login']);
  }
}