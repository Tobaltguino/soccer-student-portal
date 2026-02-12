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
    // 1. Validación básica de campos vacíos
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
      // 2. Preparar el RUT:
      // Solo hacemos trim() para quitar espacios al inicio/final por si acaso.
      // YA NO quitamos los puntos, se envía tal cual (ej: "12.345.678-9")
      const rutBusqueda = this.rut.trim();

      console.log("Enviando a Supabase:", rutBusqueda); 

      // 3. Llamada al servicio
      // Recuerda que tu servicio ahora debe devolver { data, error, role }
      const { data, error, role } = await this.supabaseService.loginConRut(rutBusqueda, this.password);

      if (error) {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Credenciales inválidas o usuario no encontrado.' 
        });
        this.loading = false;
        return;
      }

      // 4. Éxito: Redirección según Rol
      if (data?.user && role) {
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Bienvenido', 
          detail: 'Ingresando al sistema...' 
        });

        // Mapa de rutas: Nombre de la Tabla -> Ruta de Angular
        const rutasPorRol: any = {
            'admins': '/admin/dashboard',
            'estudiantes': '/student/dashboard',
            'profesores': '/professor/dashboard',
            'kinesiologos': '/kine/dashboard',
            'nutricionistas': '/nutri/dashboard'
        };

        const rutaDestino = rutasPorRol[role] || '/login'; 

        setTimeout(() => {
            this.router.navigate([rutaDestino]);
        }, 1000);
      }

    } catch (e: any) {
      console.error('Error de Login:', e);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Fallo de conexión inesperado.' 
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