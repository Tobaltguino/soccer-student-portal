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

// Servicios y Directivas
import { SupabaseService } from '../../../core/services/supabase.service';
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
    private supabaseService: SupabaseService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    // 1. Verificar el tema al cargar la pantalla
    this.actualizarLogoTema();

    // 2. Escuchar si el usuario cambia el tema en tiempo real
    this.themeObserver = new MutationObserver(() => {
      this.actualizarLogoTema();
    });
    
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  ngOnDestroy() {
    // Apagar el observador cuando salimos del login para ahorrar memoria
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }

  // --- FUNCIÓN QUE DECIDE QUÉ LOGO MOSTRAR ---
  actualizarLogoTema() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    if (isDarkMode) {
      // Logo para fondo oscuro (letras blancas/claras)
      this.logoUrl = 'assets/images/ProFutbol_Transparenteblanco.png';
    } else {
      // Logo para fondo claro (letras oscuras)
      // ⚠️ Asegúrate de que este archivo exista en tu carpeta assets/images/
      this.logoUrl = 'assets/images/ProFutbol_Transparentenegro.png'; 
    }
  }

  /**
   * Proceso de inicio de sesión usando el RUT como identificador.
   * Incluye verificación de estado de cuenta (Activo/Inactivo).
   */
  async ingresar() {
    // 1. Validación básica de campos vacíos
    if (!this.rut || !this.password) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Atención', 
        detail: 'Por favor, ingresa tu RUT y contraseña.' 
      });
      return;
    }

    if (!RutValidator.esValido(this.rut)) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'RUT Incorrecto', 
        detail: 'El RUT ingresado no es válido legalmente.' 
      });
      return;
    }

    this.loading = true;

    try {
      // 2. Preparar el RUT (limpieza de espacios)
      const rutBusqueda = this.rut.trim();

      // 3. Llamada al servicio con desestructuración de respuesta
      const { data, error, role } = await this.supabaseService.loginConRut(rutBusqueda, this.password);

      // 4. Manejo de Errores (Credenciales incorrectas o Cuenta Desactivada)
      if (error) {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Acceso Denegado', 
          detail: error.message || 'Credenciales inválidas o usuario no encontrado.' 
        });
        this.loading = false;
        return;
      }

      // 5. Éxito: Redirección según el Rol detectado
      if (data?.user && role) {
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Acceso Autorizado', 
          detail: 'Cargando tu perfil, por favor espera...' 
        });

        // Mapeamos los roles de la BD a los roles de las Rutas
        const mapRoles: any = {
          'admins': 'admin',
          'estudiantes': 'student',
          'profesores': 'professor',
          'kinesiologos': 'kine',
          'nutricionistas': 'nutri'
        };

        const rolEstandarizado = mapRoles[role] || 'student';

        // Guardamos el rol en el navegador
        localStorage.setItem('userRole', rolEstandarizado);

        // Armamos la ruta destino basándonos en el rol estandarizado
        const rutaDestino = `/${rolEstandarizado}/dashboard`; 

        // Pequeño delay para que el usuario vea el mensaje de éxito antes de saltar
        setTimeout(() => {
          this.router.navigate([rutaDestino]);
        }, 1200);
        
      } else {
        throw new Error('No se pudo recuperar la sesión del usuario.');
      }

    } catch (e: any) {
      console.error('Error Crítico de Login:', e);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error de Sistema', 
        detail: 'Ocurrió un problema al conectar con el servidor.' 
      });
      this.loading = false;
    }
  }

  // --- Métodos de Recuperación de Contraseña ---

  abrirDialogoRecuperacion() {
    this.rutRecuperacion = ''; 
    this.displayResetDialog = true;
  }

  async enviarCorreoRecuperacion() {
    // 1. Validar que no esté vacío
    if (!this.rutRecuperacion) {
      this.messageService.add({ severity: 'warn', summary: 'Falta RUT', detail: 'Ingresa tu RUT para continuar.' });
      return;
    }

    // 2. Validar que el RUT sea real usando tu validador
    if (!RutValidator.esValido(this.rutRecuperacion)) {
      this.messageService.add({ severity: 'error', summary: 'RUT Incorrecto', detail: 'El formato del RUT no es válido.' });
      return;
    }

    this.loadingReset = true;

    try {
      // 3. Llamar a la nueva función del servicio que busca por RUT
      const { error } = await this.supabaseService.resetPasswordPorRut(this.rutRecuperacion);

      if (error) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      } else {
        this.displayResetDialog = false;
        this.messageService.add({ 
            severity: 'success', 
            summary: 'Correo Enviado', 
            detail: 'Hemos enviado un enlace de recuperación al correo asociado a este RUT.' 
        });
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