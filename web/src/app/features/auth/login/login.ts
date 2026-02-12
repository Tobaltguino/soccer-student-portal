import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';

// Servicios y Directivas
import { SupabaseService } from '../../../core/services/supabase.service';
import { RutFormatDirective } from '../../../shared/directives/rut-format.directive';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CardModule, 
    PasswordModule, 
    ButtonModule, 
    InputTextModule, 
    ToastModule,
    DialogModule,
    RutFormatDirective
  ],
  providers: [MessageService],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {

  rut = '';
  password = '';
  loading = false;

  // Variables para Recuperación de Contraseña
  displayResetDialog = false;
  resetEmail = '';
  loadingReset = false;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private messageService: MessageService
  ) {}

  /**
   * Proceso de inicio de sesión usando el RUT como identificador
   */
  async ingresar() {
    if (!this.rut || !this.password) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Atención', 
        detail: 'Por favor, completa todos los campos.' 
      });
      return;
    }

    this.loading = true;

    try {
      // Limpiamos el RUT: removemos puntos y espacios pero mantenemos el guion para coincidir con la BD (ej: 1-1)
      const rutBusqueda = this.rut.replace(/[\.\s]/g, '').toUpperCase().trim();

      // Buscamos el email asociado al RUT e intentamos el login
      const { data, error } = await this.supabaseService.loginConRut(rutBusqueda, this.password);

      if (error) {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Acceso Denegado', 
          detail: error.message || 'Credenciales inválidas.' 
        });
        this.loading = false;
        return;
      }

      if (data?.user) {
        // Verificamos si es administrador para redirigir a la ruta correcta
        const esAdministrador = await this.supabaseService.esAdmin(data.user.id);
        
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Bienvenido', 
          detail: 'Validando acceso al sistema...' 
        });

        setTimeout(() => {
          if (esAdministrador) {
            this.router.navigate(['admin/dashboard']);
          } else {
            this.router.navigate(['/dashboard']); 
          }
        }, 1000);
      }

    } catch (e: any) {
      console.error('Error de Login:', e);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Fallo de conexión con el servidor.' 
      });
      this.loading = false;
    }
  }

  // --- Métodos de Recuperación de Contraseña ---

  abrirDialogoRecuperacion() {
    this.resetEmail = ''; 
    this.displayResetDialog = true;
  }

  async enviarCorreoRecuperacion() {
    if (!this.resetEmail) {
      this.messageService.add({ severity: 'warn', summary: 'Falta Email', detail: 'Ingresa tu correo para continuar.' });
      return;
    }

    this.loadingReset = true;

    try {
      const { error } = await this.supabaseService.resetPassword(this.resetEmail);

      if (error) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      } else {
        this.displayResetDialog = false;
        this.messageService.add({ 
            severity: 'success', 
            summary: 'Correo Enviado', 
            detail: 'Revisa tu bandeja de entrada para restablecer tu contraseña.' 
        });
      }
    } catch (e) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error de conexión.' });
    } finally {
      this.loadingReset = false;
    }
  }
}