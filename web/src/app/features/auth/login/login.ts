import { Component, OnInit, OnDestroy } from '@angular/core';
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

// 🚀 CAMBIO 1: Importamos el nuevo AuthService en lugar de SupabaseService
import { AuthService } from '../../../core/services/auth.service'; 
import { RutFormatDirective } from '../../../shared/directives/rut-format.directive';
import { RutValidator } from '../../../shared/directives/rut-validator.directive';

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
export class LoginComponent implements OnInit, OnDestroy {

  rut = '';
  password = '';
  loading = false;

  // Variables para Recuperación de Contraseña
  displayResetDialog = false;
  rutRecuperacion = ''; 
  loadingReset = false;

  // --- VARIABLES PARA EL LOGO DINÁMICO ---
  logoUrl: string = 'assets/images/ProFutbol_Transparenteblanco.png';
  private themeObserver!: MutationObserver;

  constructor(
    // 🚀 CAMBIO 2: Inyectamos el authService
    private authService: AuthService, 
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.actualizarLogoTema();
    this.themeObserver = new MutationObserver(() => {
      this.actualizarLogoTema();
    });
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  ngOnDestroy() {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }

  actualizarLogoTema() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    if (isDarkMode) {
      this.logoUrl = 'assets/images/ProFutbol_Transparenteblanco.png';
    } else {
      this.logoUrl = 'assets/images/ProFutbol_Transparentenegro.png'; 
    }
  }

  async ingresar() {
    if (!this.rut || !this.password) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Por favor, ingresa tu RUT y contraseña.' });
      return;
    }

    if (!RutValidator.esValido(this.rut)) {
      this.messageService.add({ severity: 'error', summary: 'RUT Incorrecto', detail: 'El RUT ingresado no es válido legalmente.' });
      return;
    }

    this.loading = true;

    try {
      const rutBusqueda = this.rut.trim();

      // 🚀 CAMBIO 3: Usamos this.authService
      const { data, error, role, aceptoTerminos } = await this.authService.loginConRut(rutBusqueda, this.password);

      if (error) {
        this.messageService.add({ severity: 'error', summary: 'Acceso Denegado', detail: error.message || 'Credenciales inválidas o usuario no encontrado.' });
        this.loading = false;
        return;
      }

      if (data?.user && role) {
        
        const mapRoles: any = {
          'admins': 'admin',
          'estudiantes': 'student',
          'profesores': 'professor',
          'kinesiologos': 'kine',
          'nutricionistas': 'nutri'
        };

        const rolEstandarizado = mapRoles[role] || 'student';
        localStorage.setItem('userRole', rolEstandarizado);

        if (aceptoTerminos === false || aceptoTerminos === null) {
          this.messageService.add({ severity: 'info', summary: 'Atención Requerida', detail: 'Debes aceptar los Términos y Condiciones para continuar.' });
          setTimeout(() => { this.router.navigate(['/terminos']); }, 1200);
        } else {
          this.messageService.add({ severity: 'success', summary: 'Acceso Autorizado', detail: 'Cargando tu perfil, por favor espera...' });
          const rutaDestino = `/${rolEstandarizado}/dashboard`; 
          setTimeout(() => { this.router.navigate([rutaDestino]); }, 1200);
        }
        
      } else {
        throw new Error('No se pudo recuperar la sesión del usuario.');
      }

    } catch (e: any) {
      this.messageService.add({ severity: 'error', summary: 'Error de Sistema', detail: 'Ocurrió un problema al conectar con el servidor.' });
      this.loading = false;
    }
  }

  abrirDialogoRecuperacion() {
    this.rutRecuperacion = ''; 
    this.displayResetDialog = true;
  }

  async enviarCorreoRecuperacion() {
    if (!this.rutRecuperacion) {
      this.messageService.add({ severity: 'warn', summary: 'Falta RUT', detail: 'Ingresa tu RUT para continuar.' });
      return;
    }

    if (!RutValidator.esValido(this.rutRecuperacion)) {
      this.messageService.add({ severity: 'error', summary: 'RUT Incorrecto', detail: 'El formato del RUT no es válido.' });
      return;
    }

    this.loadingReset = true;

    try {
      // 🚀 CAMBIO 4: Usamos this.authService
      const { error } = await this.authService.resetPasswordPorRut(this.rutRecuperacion);

      if (error) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      } else {
        this.displayResetDialog = false;
        this.messageService.add({ severity: 'success', summary: 'Correo Enviado', detail: 'Hemos enviado un enlace de recuperación al correo asociado a este RUT.' });
      }
    } catch (e) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error de conexión con el servidor.' });
    } finally {
      this.loadingReset = false;
    }
  }

  volverAlHome() {
    this.router.navigate(['/']);
  }
}