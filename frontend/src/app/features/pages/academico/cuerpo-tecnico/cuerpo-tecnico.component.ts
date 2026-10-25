import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

// Servicios de Dominio (Ruta corregida según tu nuevo árbol)
import { UsuarioCentralService } from '../../administracion/usuarios/services/usuarios-central.service';

@Component({
  selector: 'app-cuerpo-tecnico',
  standalone: true,
  imports: [
    CommonModule, 
    ToastModule,
    TagModule,
    ButtonModule
  ],
  providers: [MessageService],
  templateUrl: './cuerpo-tecnico.component.html',
  styleUrls: ['./cuerpo-tecnico.component.scss']
})
export class CuerpoTecnicoComponent implements OnInit {

  // 🔥 Inyectamos correctamente usando el nombre importado
  private usuarioService = inject(UsuarioCentralService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  profesores: any[] = [];
  loading: boolean = true;
  errorMessage: string = '';

  async ngOnInit() {
    await this.cargarCuerpoTecnico();
  }

  async cargarCuerpoTecnico() {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      // 🔥 Llamamos directo a la Promesa sin usar firstValueFrom()
      // Nota: Asegúrate de que el método obtenerMiCuerpoTecnico() exista en tu UsuarioCentralService.
      const data = await this.usuarioService.obtenerMiCuerpoTecnico();
      this.profesores = data || [];
    } catch (error) {
      this.errorMessage = 'No se pudo cargar la información del cuerpo técnico.';
      this.messageService.add({ severity: 'error', summary: 'Error', detail: this.errorMessage });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Determina la etiqueta a mostrar según la especialidad o rol del profesional.
   */
  getEtiquetaRol(prof: any): string {
    if (prof.tipo_profesor) {
      return prof.tipo_profesor;
    }
    if (prof.rol) {
      return prof.rol;
    }
    return 'Profesor / Entrenador';
  }
}