import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG 
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

// Servicios
import { AuthService } from '../../../core/auth/services/auth.service';
import { RutFormatDirective } from '../../../shared/directives/rut-format.directive';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    ToastModule, DialogModule, RutFormatDirective
  ],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  loginForm: FormGroup = this.fb.group({
    rut: ['', [Validators.required, Validators.pattern(/^\d{1,3}(\.\d{3})*-[\dkK]$/i)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading: boolean = false;
  showPassword = false;
  
  displayResetDialog: boolean = false;
  rutRecuperacion: string = '';
  loadingReset: boolean = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async ingresar() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { rut, password } = this.loginForm.value;

    try {
      // 🔥 Limpiamos los puntos y pasamos a mayúscula la 'K' para que coincida exactamente con la BD
      const rutLimpio = rut.replace(/\./g, '').trim().toUpperCase();

      // 1. Login en el servidor (Edge Function): el navegador nunca recibe el correo
      const session = await this.authService.iniciarSesionConRut(rutLimpio, password);

      // 2. Si aún usa la clave temporal (RUT), debe cambiarla antes de entrar
      if (this.authService.debeCambiarPassword(session)) {
        this.router.navigate(['/update-password']);
        return;
      }

      // 3. Redirigimos a la aplicación centralizada
      this.redirigirPorRol();

    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
    } finally {
      this.loading = false;
    }
  }

  // Como la arquitectura ahora es centralizada, todos van a la misma ruta base
  private redirigirPorRol(): void {
    this.router.navigate(['/inicio']);
  }

  abrirDialogoRecuperacion() {
    this.displayResetDialog = true;
    this.rutRecuperacion = this.loginForm.get('rut')?.value || '';
  }

  async enviarCorreoRecuperacion() {
    if (!this.rutRecuperacion) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Ingresa un RUT válido.' });
      return;
    }

    this.loadingReset = true;
    
    try {
      // 🔥 Limpiamos el RUT igual que en el login
      const rutLimpio = this.rutRecuperacion.replace(/\./g, '').trim().toUpperCase();

      // El servidor busca el correo y envía las instrucciones; la respuesta es la
      // misma exista o no el RUT
      const mensaje = await this.authService.recuperarPasswordPorRut(rutLimpio);

      this.messageService.add({ severity: 'success', summary: 'Solicitud enviada', detail: mensaje });
      this.displayResetDialog = false;

    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
    } finally {
      this.loadingReset = false;
    }
  }

  volverAlHome() {
    this.router.navigate(['/']);
  }
}