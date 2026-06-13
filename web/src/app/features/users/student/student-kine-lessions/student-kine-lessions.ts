import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api'; 

// Módulos de PrimeNG
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

// Servicios
import { HealthService } from '../../../../shared/services/health.service'; 
import { AuthService } from '../../../../core/services/auth.service';     

@Component({
  selector: 'app-student-kine-lessions',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './student-kine-lessions.html',
  styleUrls: ['./student-kine-lessions.css'] // Utiliza el mismo CSS
})
export class StudentKineLessionsComponent implements OnInit {

  usuarioActualId: string | null = null;
  listaLesiones: any[] = [];
  cargandoLesiones: boolean = false;

  constructor(
    private messageService: MessageService,
    private healthService: HealthService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.obtenerUsuarioActual();
    if (this.usuarioActualId) {
      this.cargarListaLesiones();
    }
  }

  async obtenerUsuarioActual() {
    try {
      const { data: { user } } = await this.authService.getUser();
      if (user) {
        this.usuarioActualId = user.id; 
      }
    } catch (error) {
      console.error("Error obteniendo usuario", error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo verificar tu sesión.' });
    }
  }

  async cargarListaLesiones() {
    if (!this.usuarioActualId) return;

    this.cargandoLesiones = true;
    this.cdr.detectChanges();

    try {
      // Pide el historial usando el ID del estudiante logueado
      const { data, error } = await this.healthService.getHistorialClinico(this.usuarioActualId);
      if (error) throw error;
      
      this.listaLesiones = data || [];
    } catch (error) {
      console.error('Error:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar tu historial médico.' });
    } finally {
      this.cargandoLesiones = false;
      this.cdr.detectChanges();
    }
  }
}