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
import { DialogModule } from 'primeng/dialog'; // ✅ Importante para el modal

import { SupabaseService } from '../../../core/services/supabase.service';

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
    DialogModule
  ],
  providers: [MessageService],
  templateUrl: './login.html', // Asegúrate que coincida con tu archivo
  styleUrls: ['./login.css']
})
export class LoginComponent {

  email = '';
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

  // ✅ 1. FUNCIÓN DE LOGIN (Restaurada)
  async ingresar() {
    if (!this.email || !this.password) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Completa los campos.' });
      return;
    }

    this.loading = true;

    try {
      // Login con Supabase
      const { data, error } = await this.supabaseService.login(this.email, this.password);

      if (error) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Credenciales incorrectas.' });
        this.loading = false;
        return;
      }

      // Verificar Rol y Redirigir
      if (data.user) {
        const esAdministrador = await this.supabaseService.esAdmin(data.user.id);
        
        this.messageService.add({ severity: 'success', summary: 'Bienvenido', detail: 'Ingresando...' });

        setTimeout(() => {
          if (esAdministrador) {
            this.router.navigate(['admin/dashboard']);
          } else {
            this.router.navigate(['/dashboard']); 
          }
        }, 1000);
      }

    } catch (e) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo de conexión.' });
      this.loading = false;
    }
  }

  // ✅ 2. ABRIR DIÁLOGO DE RECUPERACIÓN
  abrirDialogoRecuperacion() {
    this.resetEmail = this.email; // Copia el email si ya lo escribió
    this.displayResetDialog = true;
  }

  // ✅ 3. ENVIAR CORREO DE RECUPERACIÓN
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