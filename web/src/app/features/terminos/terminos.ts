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
    const { data: { user } } = await this.authService.getUser();
    if (user && user.email) {
      this.userId = user.id;
      this.userEmail = user.email;
      
      // 🔥 CAMBIO 1: Le pasamos user.email (igual que en tu authGuard)
      this.userRole = await this.authService.getRolSeguro(user.email); 
      
      // Para que veas en tu consola exactamente qué palabra está detectando
    } else {
      this.router.navigate(['/login']);
    }
  }

  async confirmarAceptacion() {
    if (!this.acepto || !this.userId || !this.userRole) return;

    this.guardando = true;
    try {
      let tabla = 'estudiantes'; // Valor por defecto
      
      // Convertimos a minúsculas por si acaso viene como 'Admin' o 'ADMIN'
      const rolNormalizado = this.userRole.toLowerCase();

      // 🔥 CAMBIO 2: Atrapamos todas las variantes posibles de tu BD
      if (rolNormalizado === 'admin' || rolNormalizado === 'administrador') {
          tabla = 'admins';
      } else if (rolNormalizado === 'professor' || rolNormalizado === 'profesor') {
          tabla = 'profesores';
      } else if (rolNormalizado === 'kine' || rolNormalizado === 'kinesiologo') {
          tabla = 'kinesiologos';
      } else if (rolNormalizado === 'nutri' || rolNormalizado === 'nutricionista') {
          tabla = 'nutricionistas';
      }


      // Guardamos en la BD que ya aceptó los términos
      const { error } = await this.authService.registrarFirmaTerminos(tabla, this.userId);
      
      if (error) throw error;

      // Redirige de forma absoluta a la ruta protegida
      this.router.navigate(['/update-password']); 

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