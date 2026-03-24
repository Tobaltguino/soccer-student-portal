import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';

// 🚀 Importamos nuestro AuthService
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-professor-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive], 
  templateUrl: './professor-layout.html',
  styleUrls: ['./professor-layout.css']
})
export class ProfessorLayoutComponent implements OnInit {
  
  isCollapsed: boolean = false;      
  isMobileMenuOpen: boolean = false; 
  isDarkMode: boolean = false;

  userName: string = 'Cargando...';
  userRole: string = 'Profesor'; 
  userInitial: string = '?';
  userPhotoUrl: string | null = null;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.checkThemePreference();
    await this.cargarUsuario();
  }

  // --- GESTIÓN DE TEMA ---
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
    if (this.isDarkMode) { this.disableDarkMode(); } 
    else { this.enableDarkMode(); }
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

  // --- CARGA DE PERFIL ---
  async cargarUsuario() {
    try {
      // Obtenemos el usuario actual autenticado
      const { data: { user } } = await this.authService.getUser();
      
      if (!user || !user.email) {
        this.userName = 'Invitado';
        this.cdr.detectChanges();
        return;
      }

      // Llamamos a nuestra función centralizada indicando el rol 'professor'
      const { data: perfil } = await this.authService.getPerfilCompleto(user.email, 'professor');

      if (perfil) {
          this.userName = `${perfil.nombre} ${perfil.apellido}`;
          
          // ✅ APLICAMOS LA CORRECCIÓN DE TYPESCRIPT AQUÍ (as any)
          this.userRole = (perfil as any).tipo_profesor || 'Profesor'; 
          
          this.userInitial = perfil.nombre ? perfil.nombre.charAt(0).toUpperCase() : 'P';
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

  // --- NAVEGACIÓN ---
  toggleSidebar() { this.isCollapsed = !this.isCollapsed; }
  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu() { this.isMobileMenuOpen = false; }

  async logout() {
    // Logout a través del authService
    await this.authService.logout();
    localStorage.removeItem('userRole');
    this.router.navigate(['/login']);
  }
}