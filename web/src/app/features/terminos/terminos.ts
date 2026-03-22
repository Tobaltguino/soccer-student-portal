import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// 🚀 CAMBIO 1: Importamos el nuevo AuthService
import { AuthService } from '../../core/services/auth.service';

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
    // 🚀 CAMBIO 2: Inyectamos el AuthService
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

  async ngOnInit() {
    // 🚀 CAMBIO 3: Usamos this.authService.getUser()
    const { data: { user } } = await this.authService.getUser();
    if (user && user.email) {
      this.userId = user.id;
      this.userEmail = user.email;
      
      // 🚀 CAMBIO 4: Usamos this.authService.getRolSeguro()
      this.userRole = await this.authService.getRolSeguro(user.id);
    } else {
      this.router.navigate(['/login']);
    }
  }

  async confirmarAceptacion() {
    if (!this.acepto || !this.userId || !this.userRole) return;

    this.guardando = true;
    try {
      let tabla = 'estudiantes';
      if (this.userRole === 'admin') tabla = 'admins';
      else if (this.userRole === 'professor') tabla = 'profesores';
      else if (this.userRole === 'kine') tabla = 'kinesiologos';
      else if (this.userRole === 'nutri') tabla = 'nutricionistas';

      // 🚀 CAMBIO 5: Usamos this.authService.registrarFirmaTerminos()
      const { error } = await this.authService.registrarFirmaTerminos(tabla, this.userId);
      
      if (error) throw error;

      this.redirigirPorRol(this.userRole);

    } catch (error) {
      console.error(error); 
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
    // 🚀 CAMBIO 6: Usamos this.authService.logout()
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}