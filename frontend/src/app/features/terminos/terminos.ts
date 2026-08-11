import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

// PrimeNG
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-terminos',
  standalone: true,
  imports: [CommonModule, FormsModule, CheckboxModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './terminos.html',
  styleUrls: ['./terminos.css']
})
export class TerminosComponent implements OnInit {
  
  acepto: boolean = false;
  guardando: boolean = false;
  
  userId: string | null = null;
  userRole: string | null = null;
  userEmail: string = '';

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private messageService: MessageService
  ) {}

  async ngOnInit() {
    // Obtenemos el usuario actual para saber a quién actualizar
    const { data: { user } } = await this.supabase.getUser();
    if (user && user.email) {
      this.userId = user.id;
      this.userEmail = user.email;
      // Usamos la función segura que creaste para obtener el rol/tabla
      this.userRole = await this.supabase.getRolSeguro(user.id);
    } else {
      this.router.navigate(['/login']);
    }
  }

  async confirmarAceptacion() {
    if (!this.acepto || !this.userId || !this.userRole) return;

    this.guardando = true;
    try {
      // Determinamos la tabla real basada en el rol
      let tabla = 'estudiantes';
      if (this.userRole === 'admin') tabla = 'admins';
      else if (this.userRole === 'professor') tabla = 'profesores';
      else if (this.userRole === 'kine') tabla = 'kinesiologos';
      else if (this.userRole === 'nutri') tabla = 'nutricionistas';

      // ✅ Usamos el nuevo método seguro y directo
      const { error } = await this.supabase.registrarFirmaTerminos(tabla, this.userId);
      
      if (error) throw error;

      // ¡Firmado! Lo mandamos a su panel correspondiente
      this.redirigirPorRol(this.userRole);

    } catch (error) {
      console.error(error); // Para que veas si hay problemas de permisos (RLS) en el desarrollo local
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar la aceptación. Intente nuevamente.' });
    } finally {
      this.guardando = false;
    }
  }

  redirigirPorRol(role: string) {
    switch (role) {
      case 'admin': this.router.navigate(['/admin/dashboard']); break;
      case 'professor': this.router.navigate(['/professor/dashboard']); break;
      case 'kine': this.router.navigate(['/kine/dashboard']); break;
      case 'nutri': this.router.navigate(['/nutri/dashboard']); break;
      default: this.router.navigate(['/student/dashboard']); break;
    }
  }

  rechazar() {
    this.supabase.logout();
    this.router.navigate(['/login']);
  }
}