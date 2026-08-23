import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG 
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

// Servicios de Angular
import { AuthService } from '../../../core/auth/services/auth.service';
import { Rol } from '../../../shared/enums/rol.enum';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    ToastModule, 
    DialogModule
  ],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  // Configuración del formulario
  loginForm: FormGroup = this.fb.group({
    rut: ['', [Validators.required, Validators.minLength(8)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading: boolean = false;
  showPassword = false;
  
  // Variables para el modal de recuperación
  displayResetDialog: boolean = false;
  rutRecuperacion: string = '';
  loadingReset: boolean = false;

  ngOnInit() {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  ingresar() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor, completa todos los campos correctamente.' });
      return;
    }

    this.loading = true;

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response.user.necesitaAceptarTerminos) {
          this.router.navigate(['/terminos']);
        } else {
          this.redirectByRole(response.user.role);
        }
      },
      error: (error) => {
        this.loading = false;
        const mensajeError = error.error?.message || 'Error al conectar con el servidor';
        
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Acceso Denegado', 
          detail: mensajeError 
        });
        console.error('Error en el login:', error);
      }
    });
  }

  // 🔥 RUTAS ACTUALIZADAS AL ESPAÑOL Y A /inicio 🔥
  private redirectByRole(rol: string): void {
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
        console.warn('Rol no reconocido en el login:', rol);
        this.router.navigate(['/']);
    }
  }

  volverAlHome() {
    this.router.navigate(['/']);
  }

  abrirDialogoRecuperacion() {
    this.displayResetDialog = true;
    this.rutRecuperacion = '';
  }

  enviarCorreoRecuperacion() {
    if (!this.rutRecuperacion) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Ingresa un RUT válido.' });
      return;
    }

    this.loadingReset = true;
    
    this.authService.recuperarPassword(this.rutRecuperacion).subscribe({
      next: (response) => {
        this.loadingReset = false;
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Se han enviado las instrucciones a tu correo.' });
        this.displayResetDialog = false;
      },
      error: (error) => {
        this.loadingReset = false;
        const mensajeError = error.error?.message || 'No se pudo procesar la solicitud.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: mensajeError });
      }
    });
  }
}