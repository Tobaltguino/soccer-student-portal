import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';

// Servicios de Dominio
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';
import { UsuarioPerfil } from '../../../../core/domains/usuarios/central/models/usuario.interface';
import { Rol } from '../../../../core/domains/usuarios/central/models/usuario.interface';

@Component({
  selector: 'app-estudiante-cuerpo-tecnico',
  standalone: true,
  imports: [
    CommonModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule // 🔥 Añadido para mostrar el rol del profesor
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './cuerpo-tecnico.component.html',
  styleUrls: ['./cuerpo-tecnico.component.scss'] // 🔥 Cambiado a .scss
})
export class EstudianteCuerpoTecnicoComponent implements OnInit {
  
  private usuarioService = inject(UsuarioService);
  private cdr = inject(ChangeDetectorRef);

  loading: boolean = true;
  profesores: UsuarioPerfil[] = []; 
  errorMessage: string = '';

  ngOnInit() {
    this.cargarCuerpoTecnico();
  }

  cargarCuerpoTecnico() {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges(); 

    this.usuarioService.obtenerMiEquipoTecnico().subscribe({
      next: (data) => {
        this.profesores = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al cargar los datos del cuerpo técnico.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Obtiene la etiqueta correcta para mostrar en la tarjeta según el rol.
   */
  getEtiquetaRol(profesor: any): string {
    if (profesor.rol === Rol.KINESIOLOGO) {
      return 'Kinesiólogo';
    }
    return profesor.tipo_profesor || 'Entrenador';
  }
}