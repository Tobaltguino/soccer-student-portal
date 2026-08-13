import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

// Servicios de Angular
import { AuthService } from '../../../core/auth/auth.service';
import { Rol } from '../../../shared/enums/rol.enum';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    CardModule, 
    InputTextModule, 
    PasswordModule, 
    ButtonModule, 
    ToastModule, 
    DialogModule
  ],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService); // Conectado 100% a tu backend NestJS
  private router = inject(Router);
  private messageService = inject(MessageService);

  logoUrl: string = 'assets/images/ProFutbol_Transparentenegro.png';

  // Configuración del formulario
  loginForm: FormGroup = this.fb.group({
    rut: ['', [Validators.required, Validators.minLength(8)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading: boolean = false;
  
  // Variables para recuperación de contraseña
  displayResetDialog: boolean = false;
  rutRecuperacion: string = '';
  loadingReset: boolean = false;

  ngOnInit() {
    this.checkTheme();
  }

  checkTheme() {
    const isDark = document.body.classList.contains('dark-mode') || localStorage.getItem('theme') === 'dark';
    this.logoUrl = isDark 
      ? 'assets/images/ProFutbol_Transparenteblanco.png' 
      : 'assets/images/ProFutbol_Transparentenegro.png';
  }

  ingresar() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor, completa todos los campos correctamente.' });
      return;
    }

    this.loading = true;

    // Llamamos al AuthService que se conecta con POST /auth/login en NestJS
    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.loading = false;
        // Tu backend ya devuelve response.user.role directamente
        this.redirectByRole(response.user.role);
      },
      error: (error) => {
        this.loading = false;
        // El backend lanzará "El RUT ingresado no está registrado" o "Contraseña incorrecta"
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

  private redirectByRole(rol: string): void {
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
    
    // Llamamos a nuestro backend en NestJS
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