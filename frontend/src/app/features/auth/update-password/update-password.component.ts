import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

import { AuthService } from '../../../core/auth/services/auth.service';

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

  // true cuando llega aquí obligado por usar la clave temporal (RUT)
  esPrimerIngreso = this.authService.debeCambiarPassword();

  updateForm: FormGroup = this.fb.group({
    nuevaPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmarPassword: ['', [Validators.required]]
  });

  // Ya no necesitamos capturar el fragmento de la URL. Supabase lo procesa automáticamente.

  async ngOnInit() {
    await this.authService.ready();
    this.esPrimerIngreso = this.authService.debeCambiarPassword();
  }

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

    try {
      await this.authService.cambiarPassword(nuevaPassword);
    } catch (err: any) {
      this.loading = false;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message || 'No se pudo actualizar la contraseña. El enlace puede haber expirado.' });
      return;
    }

    this.loading = false;
    this.messageService.add({ severity: 'success', summary: '¡Éxito!', detail: 'Tu contraseña ha sido actualizada.' });

    // Cerramos sesión por seguridad para forzar un inicio de sesión limpio con la nueva clave
    // (además así el nuevo token ya no trae la marca debe_cambiar_password).
    // 'local': al cambiar la clave el servidor ya invalidó la sesión.
    await this.authService.signOut('local');

    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 2000);
  }

  async irAlLogin() {
    // Si estaba obligado a cambiar la clave, cerramos la sesión para no dejarla a medias
    if (this.esPrimerIngreso) await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}