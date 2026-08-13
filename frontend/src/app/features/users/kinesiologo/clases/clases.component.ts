import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Dominios
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { Clase, FiltrosClase } from '../../../../core/domains/academico/clases/models/clase.interface';

@Component({
  selector: 'app-kinesiologo-clases',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, 
    DialogModule, InputTextModule, DatePickerModule, SelectModule, 
    TooltipModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './clases.component.html',
  styleUrls: ['./clases.component.css']
})
export class KinesiologoClasesComponent implements OnInit {
  
  // Inyección moderna de dependencias
  private claseService = inject(ClaseService);
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);

  // Datos
  grupos: any[] = []; // TODO: Reemplazar con la interfaz Grupo cuando se cree el GrupoService
  selectedGrupoId: number | null = null;
  clases: Clase[] = [];
  totalRegistros: number = 0;
  
  // Estados
  loading: boolean = true;
  
  // Filtros
  filtroFecha: Date | null = null;
  filtroLugar: string = '';

  // Vista de detalles
  displayPlan: boolean = false;
  selectedClase: Clase | null = null;

  ngOnInit() {
    this.cargarGrupos();
  }

  // --- CARGA DE DATOS ---
  cargarGrupos() {
    this.loading = true;
    
    // TODO: Aquí llamaremos al futuro GrupoService para llenar el dropdown.
    // ej: this.grupoService.obtenerMisGrupos().subscribe(...)
    // Por ahora, procedemos a cargar todas las clases permitidas para este Kine.
    
    this.cargarClases();
  }

  cargarClases() {
    this.loading = true;

    const filtros: FiltrosClase = {
      grupoId: this.selectedGrupoId || undefined,
      desde: this.filtroFecha ? this.formatearFecha(this.filtroFecha) : undefined,
      lugar: this.filtroLugar?.trim() || undefined,
    };

    this.claseService.listarClases(filtros).subscribe({
      next: (response) => {
        this.clases = response.registros;
        this.totalRegistros = response.total;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las clases' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onGrupoChange() {
    this.cargarClases();
  }

  aplicarFiltros() {
    // Al aplicar filtros, volvemos a consultar al backend con los nuevos parámetros
    this.cargarClases();
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroLugar = '';
    this.selectedGrupoId = null;
    this.cargarClases();
  }

  // --- UTILIDADES Y VISTAS ---
  verPlanificacion(clase: Clase) {
    this.selectedClase = clase;
    this.displayPlan = true;
  }

  formatearFecha(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
}