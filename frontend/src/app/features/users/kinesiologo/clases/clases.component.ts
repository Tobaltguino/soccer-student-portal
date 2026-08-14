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

// Clases
import { ClaseService } from '../../../../core/domains/academico/clases/services/clase.service';
import { Clase, FiltrosClase } from '../../../../core/domains/academico/clases/models/clase.interface';

// Grupos
import { GrupoService } from '../../../../core/domains/academico/grupos/services/grupo.service';
import { Grupo } from '../../../../core/domains/academico/grupos/models/grupo.interface';

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
  
  private claseService = inject(ClaseService);
  private grupoService = inject(GrupoService); // ✅ Inyectado
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);

  // Datos
  grupos: Grupo[] = []; // ✅ Ahora usa la interfaz Grupo
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
  // ✅ Modificado para cargar los grupos reales desde el backend
  cargarGrupos() {
    this.loading = true;
    
    this.grupoService.listarGrupos().subscribe({
      next: (data) => {
        this.grupos = data;
        this.cargarClases(); // Cargamos la agenda una vez que tenemos los grupos
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las categorías' });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarClases() {
    this.loading = true;

    const filtros: FiltrosClase = {
      grupoId: this.selectedGrupoId || undefined,
      desde: this.filtroFecha ? this.formatearFecha(this.filtroFecha) : undefined,
      lugar: this.filtroLugar?.trim() || undefined,
      limite: 100 // ✅ Obtenemos un buen bloque para delegar la paginación a PrimeNG
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