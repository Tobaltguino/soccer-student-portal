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
import { AceptacionLegalService } from '../../core/domains/administracion/aceptaciones-legales/services/aceptaacion-legal.service';
import { Rol } from '../../shared/enums/rol.enum';

@Component({
  selector: 'app-terminos',
  standalone: true,
  imports: [CommonModule, FormsModule, CheckboxModule, ToastModule],
  providers: [MessageService],
  templateUrl: './terminos.html',
  styleUrls: ['./terminos.scss']
})
export class TerminosComponent implements OnInit {
  
  private authService = inject(AuthService);
  private aceptacionLegalService = inject(AceptacionLegalService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  acepto: boolean = false;
  guardando: boolean = false;
  userRole: string | null = null;

  ngOnInit() {
    this.authService.me().subscribe({
      next: (res: any) => {
        // 🔥 SOLUCIÓN: Buscamos el rol en todas las formas posibles que tu backend pueda enviarlo
        this.userRole = res.role || res.rol || res.user?.role || res.user?.rol; 
        
        // Imprimimos en consola para que puedas verificar que sí llegó
        console.log('Rol detectado en Términos:', this.userRole);
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  confirmarAceptacion() {
    // Si no marcó la casilla, no hace nada (aunque el HTML ya bloquea el botón)
    if (!this.acepto) return;

    // 🔥 NUEVO: Si no detectó el rol, ya no falla en silencio, te avisa en pantalla.
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
    
    this.aceptacionLegalService.aceptarTerminos(payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '¡Éxito!', detail: 'Términos aceptados correctamente.' });
        
        setTimeout(() => {
          this.redirigirPorRol(this.userRole!);
        }, 1000);
      },
      error: (err) => {
        this.guardando = false;
        // Si el backend (NestJS/Supabase) falla, entrará aquí y verás el error
        const mensajeError = err.error?.message || 'No se pudo registrar la aceptación. Intente nuevamente.';
        this.messageService.add({ severity: 'error', summary: 'Error de Servidor', detail: mensajeError });
        console.error('Error de BD:', err);
      }
    });
  }

  redirigirPorRol(rol: string) {
    // Normalizamos a minúsculas por si el backend lo envía con mayúsculas
    const rolNormalizado = rol ? rol.toLowerCase() : '';

    switch (rolNormalizado) {
      case Rol.ESTUDIANTE: // O 'student' según como evalúes tu enum
      case 'student':
      case 'estudiante':
        this.router.navigate(['/student/dashboard']); 
        break;

      case Rol.PROFESOR:
      case 'professor':
      case 'profesor':
        this.router.navigate(['/professor/dashboard']);
        break;

      case Rol.KINESIOLOGO:
      case 'kine':
      case 'kinesiologo':
        this.router.navigate(['/kine/dashboard']);
        break;

      case Rol.NUTRICIONISTA:
      case 'nutri':
      case 'nutricionista':
        this.router.navigate(['/nutri/dashboard']);
        break;

      case Rol.ADMINISTRADOR:
      case 'admin':
      case 'administrador':
        this.router.navigate(['/admin/dashboard']);
        break;

      default:
        this.router.navigate(['/']);
    }
  }

  rechazar() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}