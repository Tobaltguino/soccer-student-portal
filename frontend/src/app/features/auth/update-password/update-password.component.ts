import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
    CommonModule, 
    ReactiveFormsModule, 
    CardModule, 
    PasswordModule, 
    ButtonModule, 
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './update-password.component.html',
  styleUrls: ['./update-password.component.scss']
})
export class UpdatePasswordComponent implements OnInit {
  
  private fb = inject(FormBuilder);
  private authService = inject(AuthService); 
  private router = inject(Router);
  private route = inject(ActivatedRoute); // 🔥 Inyectamos ActivatedRoute para leer la URL
  private messageService = inject(MessageService);

  loading = false;

  updateForm: FormGroup = this.fb.group({
    nuevaPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmarPassword: ['', [Validators.required]]
  });

  ngOnInit() {
    // 🔥 Capturamos el token que manda Supabase en la URL (Fragmento)
    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        const urlParams = new URLSearchParams(fragment);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');

        // Guardamos el token en localStorage para que el interceptor HTTP de Angular 
        // se lo envíe al backend de NestJS en la petición de updatePassword
        if (accessToken) {
          localStorage.setItem('access_token', accessToken);
        }
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
      }
    });
  }

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

    this.authService.updatePassword(nuevaPassword).subscribe({
      next: (res) => {
        this.loading = false;
        this.messageService.add({ severity: 'success', summary: '¡Éxito!', detail: 'Tu contraseña ha sido actualizada.' });
        
        // Limpiamos los tokens de recuperación por seguridad y mandamos a login
        setTimeout(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la contraseña. El enlace puede haber expirado.' });
        console.error(err);
      }
    });
  }

  irAlLogin() {
    this.router.navigate(['/login']);
  }
}