import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-update-password',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, PasswordModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './update-password.html',
  styleUrls: ['./update-password.css']
})
export class UpdatePasswordComponent {
  nuevaPassword = '';
  confirmarPassword = '';
  loading = false;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private messageService: MessageService
  ) {}

  async actualizarPassword() {
    if (!this.nuevaPassword || !this.confirmarPassword) {
      this.messageService.add({ severity: 'warn', summary: 'Campos Vacíos', detail: 'Por favor completa ambos campos.' });
      return;
    }

    if (this.nuevaPassword !== this.confirmarPassword) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Las contraseñas no coinciden.' });
      return;
    }

    if (this.nuevaPassword.length < 6) {
      this.messageService.add({ severity: 'warn', summary: 'Contraseña Débil', detail: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    this.loading = true;

    try {
      const { error } = await this.supabaseService.updatePassword(this.nuevaPassword);

      if (error) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      } else {
        this.messageService.add({ severity: 'success', summary: '¡Éxito!', detail: 'Tu contraseña ha sido actualizada correctamente.' });
        
        // Cerramos la sesión temporal y mandamos al login
        await this.supabaseService.logout();
        
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      }
    } catch (e) {
      this.messageService.add({ severity: 'error', summary: 'Error Crítico', detail: 'No se pudo actualizar la contraseña.' });
    } finally {
      this.loading = false;
    }
  }

  irAlLogin() {
    this.router.navigate(['/login']);
  }
}