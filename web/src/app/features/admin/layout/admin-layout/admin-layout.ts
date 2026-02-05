import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para ngClass, ngIf
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive], 
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.css']
})
export class AdminLayoutComponent {
  
  isCollapsed: boolean = false; // Estado del menú

  constructor(private supabase: SupabaseService, private router: Router) {}

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  async logout() {
    await this.supabase.logout();
    this.router.navigate(['/login']);
  }
}