import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag'; // ✅ Agregamos TagModule para que se vea bonito
import { ConfirmationService } from 'primeng/api';

import { SupabaseService } from '../../../../core/services/supabase.service';

@Component({
  selector: 'app-admin-groups',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    TableModule, 
    ButtonModule, 
    DialogModule, 
    InputTextModule, 
    TextareaModule, 
    ConfirmDialogModule,
    TagModule
  ],
  providers: [ConfirmationService],
  templateUrl: './admin-groups.html',
  styleUrls: ['./admin-groups.css']
})
export class AdminGroupsComponent implements OnInit {

  grupos: any[] = [];
  loading: boolean = true;
  displayDialog: boolean = false;
  tituloDialogo: string = '';
  isEditing: boolean = false;

  grupoForm: any = { id: null, nombre: '', descripcion: '' };

  constructor(
    private supabase: SupabaseService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarGrupos();
  }

  async cargarGrupos() {
    this.loading = true;
    const { data, error } = await this.supabase.getGrupos();
    
    if (data) {
      // ✅ PROCESAMOS LA DATA
      // Supabase devuelve: { nombre: 'A', estudiantes: [{ count: 5 }] }
      // Lo transformamos a: { nombre: 'A', cantidad_alumnos: 5 }
      this.grupos = data.map((g: any) => ({
          ...g,
          cantidad_alumnos: g.estudiantes ? g.estudiantes[0].count : 0
      }));
    } else {
      console.error('Error cargando grupos:', error);
    }
    
    this.loading = false;
    this.cdr.detectChanges();
  }

  // --- ABRIR DIÁLOGOS ---
  abrirNuevo() {
    this.isEditing = false;
    this.tituloDialogo = 'Nuevo Grupo';
    this.limpiarForm();
    this.displayDialog = true;
  }

  abrirEditar(grupo: any) {
    this.isEditing = true;
    this.tituloDialogo = 'Editar Grupo';
    this.grupoForm = { ...grupo }; 
    this.displayDialog = true;
  }

  // --- GUARDAR ---
  async guardarGrupo() {
    if (!this.grupoForm.nombre) {
      alert('El nombre es obligatorio');
      return;
    }

    const datos = { 
      nombre: this.grupoForm.nombre,
      descripcion: this.grupoForm.descripcion
    };

    let result;
    if (this.isEditing) {
      result = await this.supabase.updateGrupo(this.grupoForm.id, datos);
    } else {
      result = await this.supabase.createGrupo(datos);
    }

    if (result.error) {
      alert('Error: ' + result.error.message);
    } else {
      this.displayDialog = false;
      this.cargarGrupos();
    }
  }

  // --- ELIMINAR ---
  eliminarGrupo(id: number) {
    this.confirmationService.confirm({
      message: '¿Seguro que quieres borrar este grupo?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, borrar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      accept: async () => {
        const { error } = await this.supabase.deleteGrupo(id);
        if (!error) {
            this.cargarGrupos();
        } else {
            alert('Error: ' + error.message);
        }
      }
    });
  }

  limpiarForm() {
    this.grupoForm = { id: null, nombre: '', descripcion: '' };
  }
}