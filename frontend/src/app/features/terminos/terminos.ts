import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Servicios
import { AuthService } from '../../core/auth/services/auth.service';
// 👇 Importamos tu servicio dedicado (Ajusta la ruta según tu estructura de carpetas)
import { AceptacionLegalService } from '../../core/domains/administracion/aceptaciones-legales/services/aceptaacion-legal.service';
import { Rol } from '../../shared/enums/rol.enum';

@Component({
  selector: 'app-terminos',
  standalone: true,
  imports: [CommonModule, FormsModule, CheckboxModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './terminos.html',
  styleUrls: ['./terminos.css']
})
export class TerminosComponent implements OnInit {
  
  private authService = inject(AuthService);
  private aceptacionLegalService = inject(AceptacionLegalService); // Inyectamos el servicio
  private router = inject(Router);
  private messageService = inject(MessageService);

  acepto: boolean = false;
  guardando: boolean = false;
  userRole: string | null = null;

  ngOnInit() {
    // Obtenemos el perfil del usuario logueado para saber a dónde redirigirlo después
    this.authService.me().subscribe({
      next: (user: any) => {
        this.userRole = user.role; // O user.rol, según tu backend
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  confirmarAceptacion() {
    if (!this.acepto || !this.userRole) return;

    this.guardando = true;
    
    const payload = {
      versionTerminos: '1.0', // Puedes cambiar esto si en el futuro actualizas los términos
      versionPolitica: '1.0' 
    };
    
    // Llamamos a tu servicio dedicado de aceptaciones legales
    this.aceptacionLegalService.aceptarTerminos(payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '¡Éxito!', detail: 'Términos aceptados correctamente.' });
        
        // Esperamos 1 segundo para que el usuario vea el mensaje verde y redirigimos
        setTimeout(() => {
          this.redirigirPorRol(this.userRole!);
        }, 1000);
      },
      error: (err) => {
        this.guardando = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar la aceptación. Intente nuevamente.' });
        console.error(err);
      }
    });
  }

  redirigirPorRol(rol: string) {
    switch (rol) {
      case Rol.ESTUDIANTE:
        this.router.navigate(['/estudiante']); 
        break;
      case Rol.PROFESOR:
        this.router.navigate(['/profesor']);
        break;
      case Rol.KINESIOLOGO:
        this.router.navigate(['/salud/kinesiologia']);
        break;
      case Rol.NUTRICIONISTA:
        this.router.navigate(['/salud/nutricion']);
        break;
      case Rol.ADMINISTRADOR:
        this.router.navigate(['/admin']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  rechazar() {
    // Si rechaza, cerramos sesión y lo devolvemos al login
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}