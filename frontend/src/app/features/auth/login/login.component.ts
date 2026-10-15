import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG 
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

// Servicios
import { AuthService } from '../../../core/auth/auth.service';
import { Rol } from '../../../shared/enums/rol.enum';
import { IdleService } from '../../../core/services/idle.service';
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
  private idleService = inject(IdleService);

  loginForm: FormGroup = this.fb.group({
    rut: ['', [Validators.required, Validators.pattern(/^\d{1,3}(\.\d{3})*-[\dkK]$/i)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading: boolean = false;
  showPassword = false;
  
  displayResetDialog: boolean = false;
  rutRecuperacion: string = '';
  loadingReset: boolean = false;
  
  // Dominio interno para convertir el RUT en un correo válido para Supabase Auth
  private readonly DOMINIO_APP = '@profutbol.cl';

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async ingresar() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor, completa todos los campos correctamente.' });
      return;
    }

    this.loading = true;

    // Limpiamos el RUT y le agregamos el dominio para Supabase
    let rutLimpio = this.loginForm.value.rut.replace(/\./g, '').trim();
    const emailSupabase = `${rutLimpio}${this.DOMINIO_APP}`;

    const { data, error } = await this.authService.signIn(emailSupabase, this.loginForm.value.password);

    this.loading = false;

    if (error) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Acceso Denegado', 
        detail: 'Credenciales incorrectas o usuario no encontrado.' 
      });
      console.error('Error en el login:', error.message);
      return;
    }

    if (data.user) {
      this.idleService.iniciarMonitoreo();
      
      // Supabase guarda metadatos personalizados en user_metadata
      const metadata = data.user.user_metadata;
      
      if (metadata?.['necesitaAceptarTerminos']) {
        this.router.navigate(['/terminos']);
      } else {
        this.redirectByRole(metadata?.['role'] || '');
      }
    }
  }

  private redirectByRole(rol: string): void {
    const rolNormalizado = rol ? rol.toLowerCase() : '';

    switch (rolNormalizado) {
      case Rol.ESTUDIANTE:
        this.router.navigate(['/estudiante/inicio']); 
        break;
      case Rol.PROFESOR:
        this.router.navigate(['/profesor/inicio']);
        break;
      case Rol.KINESIOLOGO:
        this.router.navigate(['/kinesiologo/inicio']);
        break;
      case Rol.NUTRICIONISTA:
        this.router.navigate(['/nutricionista/inicio']);
        break;
      case Rol.ADMINISTRADOR:
        this.router.navigate(['/admin/inicio']);
        break;
      default:
        console.warn('Rol no reconocido o faltante en user_metadata:', rol);
        this.router.navigate(['/']);
    }
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
    
    const rutLimpio = this.rutRecuperacion.replace(/\./g, '').trim();
    const emailSupabase = `${rutLimpio}${this.DOMINIO_APP}`;
    
    const { error } = await this.authService.recuperarPassword(emailSupabase);

    this.loadingReset = false;

    if (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo procesar la solicitud.' });
    } else {
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Se han enviado las instrucciones a tu correo.' });
      this.displayResetDialog = false;
    }
  }
}