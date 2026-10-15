import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-update-password',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, CardModule, 
    PasswordModule, ButtonModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './update-password.component.html',
  styleUrls: ['./update-password.component.scss']
})
export class UpdatePasswordComponent {
  
  private fb = inject(FormBuilder);
  private authService = inject(AuthService); 
  private router = inject(Router);
  private messageService = inject(MessageService);

  loading = false;

  updateForm: FormGroup = this.fb.group({
    nuevaPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmarPassword: ['', [Validators.required]]
  });

  // Ya no necesitamos capturar el fragmento de la URL. Supabase lo procesa automáticamente.
  
  async actualizarPassword() {
    if (this.updateForm.invalid) {
      this.updateForm.markAllAsTouched();
      return;
    }

    const { nuevaPassword, confirmarPassword } = this.updateForm.value;

    if (nuevaPassword !== confirmarPassword) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Las contraseñas no coinciden.' });
      return;
    }

    this.loading = true;

    const { error } = await this.authService.updatePassword(nuevaPassword);

    this.loading = false;

    if (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la contraseña. El enlace puede haber expirado.' });
      console.error(error.message);
    } else {
      this.messageService.add({ severity: 'success', summary: '¡Éxito!', detail: 'Tu contraseña ha sido actualizada.' });
      
      // Cerramos sesión por seguridad para forzar un inicio de sesión limpio con la nueva clave
      await this.authService.signOut();
      
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
  }

  irAlLogin() {
    this.router.navigate(['/login']);
  }
}