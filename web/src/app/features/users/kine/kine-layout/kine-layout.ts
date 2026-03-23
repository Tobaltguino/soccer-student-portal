import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';

// 🚀 CAMBIO 1: Solo necesitamos el AuthService. ¡Adiós SupabaseService!
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-kine-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive], 
  templateUrl: './kine-layout.html',
  styleUrls: ['./kine-layout.css']
})
export class KineLayoutComponent implements OnInit {
  
  isCollapsed: boolean = false;      
  isMobileMenuOpen: boolean = false; 
  isDarkMode: boolean = false;

  userName: string = 'Cargando...';
  userRole: string = 'Kinesiólogo'; 
  userInitial: string = '?';
  userPhotoUrl: string | null = null;

  constructor(
    // 🚀 CAMBIO 2: Inyectamos el AuthService
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

  // --- CARGA DE PERFIL KINESIÓLOGO ---
  async cargarUsuario() {
    try {
      // 🚀 CAMBIO 3: Obtenemos el usuario autenticado
      const { data: { user } } = await this.authService.getUser();
      
      if (!user || !user.email) {
        this.userName = 'Invitado';
        this.cdr.detectChanges();
        return;
      }

      // 🚀 CAMBIO 4: Usamos nuestro método global indicándole que busque directamente el rol 'kine'
      const { data: perfil } = await this.authService.getPerfilCompleto(user.email, 'kine');

      if (perfil) {
          this.userName = `${perfil.nombre} ${perfil.apellido}`;
          this.userInitial = perfil.nombre ? perfil.nombre.charAt(0).toUpperCase() : 'K';
          this.userPhotoUrl = perfil.foto_url;
      } else {
          this.userName = user.email.split('@')[0];
          this.userPhotoUrl = null;
      }
      this.cdr.detectChanges();

    } catch (error) {
      this.userName = 'Usuario Médico';
      this.cdr.detectChanges();
    }
  }

  // --- NAVEGACIÓN ---
  toggleSidebar() { this.isCollapsed = !this.isCollapsed; }
  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu() { this.isMobileMenuOpen = false; }

  async logout() {
    // 🚀 CAMBIO 5: Logout a través del authService
    await this.authService.logout();
    localStorage.removeItem('userRole');
    this.router.navigate(['/login']);
  }
}