import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

// Usamos tu servicio que conecta con NestJS
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-update-password',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    CardModule, 
    PasswordModule, 
    ButtonModule, 
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './update-password.html',
  styleUrls: ['./update-password.css']
})
export class UpdatePasswordComponent {
  
  private fb = inject(FormBuilder);
  private authService = inject(AuthService); // <-- Conectado a NestJS
  private router = inject(Router);
  private messageService = inject(MessageService);

  loading = false;

  updateForm: FormGroup = this.fb.group({
    nuevaPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmarPassword: ['', [Validators.required]]
  });

  actualizarPassword() {
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

    // Llamamos a NestJS para que cambie la clave y guarde la auditoría
    this.authService.updatePassword(nuevaPassword).subscribe({
      next: (res) => {
        this.loading = false;
        this.messageService.add({ severity: 'success', summary: '¡Éxito!', detail: 'Tu contraseña ha sido actualizada.' });
        
        // Redirigimos al login después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la contraseña.' });
        console.error(err);
      }
    });
  }

  irAlLogin() {
    this.router.navigate(['/login']);
  }
}