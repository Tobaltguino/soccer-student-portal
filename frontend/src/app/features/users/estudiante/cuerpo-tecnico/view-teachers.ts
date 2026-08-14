import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// Nuevos Servicios de Dominio
import { UsuarioService } from '../../../../core/domains/usuarios/central/services/usuario.service';
import { UsuarioPerfil } from '../../../../core/domains/usuarios/central/models/usuario.interface';
import { Rol } from '../../../../core/domains/usuarios/central/models/usuario.interface';

@Component({
  selector: 'app-view-teachers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-teachers.html',
  styleUrls: ['./view-teachers.css']
})
export class ViewTeachersComponent implements OnInit {
  
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
    // Si es profesor, intentamos mostrar su especialidad (preparador físico, etc.), si la mandó el backend
    return profesor.tipo_profesor || 'Entrenador';
  }
}