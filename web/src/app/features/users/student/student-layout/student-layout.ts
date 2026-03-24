import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';

// 🚀 CAMBIO 1: Importamos AuthService (Adiós SupabaseService)
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive], 
  templateUrl: './student-layout.html',
  styleUrls: ['./student-layout.css']
})
export class StudentLayoutComponent implements OnInit {
  
  isCollapsed: boolean = false;      
  isMobileMenuOpen: boolean = false; 
  isDarkMode: boolean = false;

  userName: string = 'Cargando...';
  userRole: string = 'Estudiante'; 
  userInitial: string = '?';
  userPhotoUrl: string | null = null;

  constructor(
    // 🚀 CAMBIO 2: Inyectamos AuthService
    private authService: AuthService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.checkThemePreference();
    await this.cargarUsuario();
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

  // --- USUARIO ---
  async cargarUsuario() {
    try {
      // 🚀 CAMBIO 3: Usamos authService para obtener el usuario autenticado
      const { data: { user } } = await this.authService.getUser();
      
      if (!user || !user.email) {
        this.userName = 'Invitado';
        this.cdr.detectChanges();
        return;
      }

      // 🚀 CAMBIO 4: Usamos la función centralizada para el perfil del estudiante
      const { data: perfil } = await this.authService.getPerfilCompleto(user.email, 'student');

      if (perfil) {
          this.userName = `${perfil.nombre} ${perfil.apellido}`;
          this.userRole = 'Estudiante';
          this.userInitial = perfil.nombre ? perfil.nombre.charAt(0).toUpperCase() : 'E';
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
    // 🚀 CAMBIO 5: Logout centralizado
    await this.authService.logout();
    localStorage.removeItem('userRole');
    this.router.navigate(['/login']);
  }
}