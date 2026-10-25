import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Servicios
import { AuthService } from '../../core/auth/services/auth.service';
import { AceptacionLegalService } from '../pages/auditoria/aceptaciones-legales/services/aceptaciones-legales.service';
import { Rol } from '../../shared/enums/rol.enum';

@Component({
  selector: 'app-terminos',
  standalone: true,
  imports: [CommonModule, FormsModule, CheckboxModule, ToastModule],
  providers: [MessageService],
  templateUrl: './terminos.component.html',
  styleUrls: ['./terminos.component.scss']
})
export class TerminosComponent implements OnInit {
  
  private authService = inject(AuthService);
  private aceptacionLegalService = inject(AceptacionLegalService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  acepto: boolean = false;
  guardando: boolean = false;
  userRole: string | null = null;

  async ngOnInit() {
    try {
      // 🔥 Usamos las promesas nativas estandarizadas de tu AuthService
      const session = await this.authService.obtenerSesionActual();
      if (session?.user) {
        const perfil = await this.authService.obtenerPerfilUsuario(session.user.id);
        this.userRole = (perfil?.rol || '').toLowerCase();
        console.log('Rol detectado en Términos:', this.userRole);
      } else {
        this.router.navigate(['/login']);
      }
    } catch (error) {
      this.router.navigate(['/login']);
    }
  }

  async confirmarAceptacion() {
    if (!this.acepto) return;

    if (!this.userRole) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error de Perfil', 
        detail: 'No pudimos detectar tu rol. Por favor, recarga la página o inicia sesión nuevamente.' 
      });
      return;
    }

    this.guardando = true;
    
    const payload = {
      versionTerminos: '1.0', 
      versionPolitica: '1.0' 
    };
    
    try {
      // 🔥 Llamada a promesa nativa
      await this.aceptacionLegalService.aceptarTerminos(payload);
      
      this.messageService.add({ severity: 'success', summary: '¡Éxito!', detail: 'Términos aceptados correctamente.' });
      
      setTimeout(() => {
        this.redirigirPorRol(this.userRole!);
      }, 1000);

    } catch (err: any) {
      this.guardando = false;
      const mensajeError = err.error?.message || err.message || 'No se pudo registrar la aceptación. Intente nuevamente.';
      this.messageService.add({ severity: 'error', summary: 'Error de Servidor', detail: mensajeError });
      console.error('Error de BD:', err);
    }
  }

  // 🔥 REDIRECCIONES EN ESPAÑOL Y A /inicio 🔥
  redirigirPorRol(rol: string) {
    const rolNormalizado = rol ? rol.toLowerCase() : '';

    switch (rolNormalizado) {
      case Rol.ESTUDIANTE:
      case 'student':
      case 'estudiante':
        this.router.navigate(['/estudiante/inicio']); 
        break;

      case Rol.PROFESOR:
      case 'professor':
      case 'profesor':
        this.router.navigate(['/profesor/inicio']);
        break;

      case Rol.KINESIOLOGO:
      case 'kine':
      case 'kinesiologo':
        this.router.navigate(['/kinesiologo/inicio']);
        break;

      case Rol.NUTRICIONISTA:
      case 'nutri':
      case 'nutricionista':
        this.router.navigate(['/nutricionista/inicio']);
        break;

      case Rol.ADMINISTRADOR:
      case 'admin':
      case 'administrador':
        this.router.navigate(['/admin/inicio']);
        break;

      default:
        this.router.navigate(['/']);
    }
  }

  async rechazar() {
    try {
      // 🔥 Promesa nativa
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      this.router.navigate(['/login']);
    }
  }
}