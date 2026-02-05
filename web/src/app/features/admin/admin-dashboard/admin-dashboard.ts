import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule], 
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {

  userEmail: string | undefined;
  nombreAdmin: string = 'Carlos Admin'; // Puedes dinamizar esto más adelante con la BD

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    try {
      // 1. Obtener el usuario autenticado actualmente
      const { data: { user } } = await this.supabaseService.getUser();
      
      if (user) {
        this.userEmail = user.email;
        console.log('Admin logueado:', this.userEmail);
      } else {
        // Si no hay usuario, devolver al login (Seguridad extra)
        this.router.navigate(['/login']);
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario', error);
    }
  }

  async salir() {
    try {
      await this.supabaseService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}