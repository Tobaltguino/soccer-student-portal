import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service'; // Ajusta tu ruta

@Component({
  selector: 'app-nutri-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive], 
  templateUrl: './nutri-layout.html',
  styleUrls: ['./nutri-layout.css']
})
export class NutriLayoutComponent implements OnInit {
  
  isCollapsed: boolean = false;      
  isMobileMenuOpen: boolean = false; 
  isDarkMode: boolean = false;

  userName: string = 'Cargando...';
  userRole: string = 'Nutricionista'; 
  userInitial: string = '?';
  userPhotoUrl: string | null = null;

  constructor(
    private supabase: SupabaseService, 
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
      const { data: { user } } = await this.supabase.getUser();
      
      if (!user || !user.email) {
        this.userName = 'Invitado';
        this.cdr.detectChanges();
        return;
      }

      // ✅ Buscamos en la tabla de nutricionistas
      const { data } = await this.supabase.supabase
          .from('nutricionistas')
          .select('nombre, apellido, foto_url')
          .eq('email', user.email)
          .maybeSingle();

      if (data) {
          this.userName = `${data.nombre} ${data.apellido}`;
          this.userRole = 'Nutricionista';
          this.userInitial = data.nombre ? data.nombre.charAt(0).toUpperCase() : 'N';
          this.userPhotoUrl = data.foto_url;
      } else {
          this.userName = user.email.split('@')[0];
          this.userPhotoUrl = null;
      }
      this.cdr.detectChanges();

    } catch (error) {
      console.error('Error perfil:', error);
      this.userName = 'Usuario';
      this.cdr.detectChanges();
    }
  }

  // --- MENU ---
  toggleSidebar() { this.isCollapsed = !this.isCollapsed; }
  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu() { this.isMobileMenuOpen = false; }

  async logout() {
    await this.supabase.logout();
    localStorage.removeItem('userRole');
    this.router.navigate(['/login']);
  }
}