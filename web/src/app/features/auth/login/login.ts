import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { Role } from '../../../core/auth/role.enum'; // Nuestro flamante Enum

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  // Inyección de dependencias (estilo moderno de Angular)
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Configuración del formulario
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  errorMessage: string = '';
  isLoading: boolean = false;

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Llamamos a nuestro nuevo servicio
    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading = false;
        // Si el login es exitoso, redirigimos según su rol
        this.redirectByRole(response.user.role);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Credenciales inválidas o error de conexión.';
        console.error('Error en el login:', error);
      }
    });
  }

  // Aquí brilla nuestro Enum: el router sabe exactamente a dónde enviar a cada quien
  private redirectByRole(role: Role): void {
    switch (role) {
      case Role.STUDENT:
        this.router.navigate(['/student/student-dashboard']); 
        break;
      case Role.PROFESSOR:
        this.router.navigate(['/professor']);
        break;
      case Role.KINE:
        this.router.navigate(['/kine']);
        break;
      case Role.NUTRI:
        this.router.navigate(['/nutri']);
        break;
      case Role.ADMIN:
        this.router.navigate(['/admin']);
        break;
      default:
        this.router.navigate(['/home']);
    }
  }
}