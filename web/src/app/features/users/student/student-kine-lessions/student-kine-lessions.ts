import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api'; 

// Módulos de PrimeNG
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { AuthService } from '../../../../core/services/auth.service';     
import { KinesiologiaService } from '../../../../core/services/modulos/salud/kine.service';

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
  styleUrls: ['./student-kine-lessions.css']
})
export class StudentKineLessionsComponent implements OnInit {

  usuarioActualId: string | null = null;
  listaLesiones: any[] = [];
  cargandoLesiones: boolean = false;

  constructor(
    private messageService: MessageService,
    private kinesiologiaService: KinesiologiaService,
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
      const { data, error } = await this.kinesiologiaService.getHistorialClinico(this.usuarioActualId);
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