import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ Importante para ngModel
import { SupabaseService } from '../../../core/services/supabase.service'; 
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext'; // ✅ Importante para pInputText

@Component({
  selector: 'app-professor-view-guides',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CardModule, 
    ButtonModule, 
    TooltipModule, 
    TableModule, 
    InputTextModule
  ],
  templateUrl: './professor-view-guides.html',
  styleUrls: ['./professor-view-guides.css']
})
export class ProfessorViewGuidesComponent implements OnInit {
  
  guias: any[] = [];
  guiasOriginales: any[] = []; // ✅ Respaldo para los filtros
  
  filtroTitulo: string = ''; // ✅ Variable del buscador
  loading: boolean = true;

  constructor(
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarGuias();
  }

  async cargarGuias() {
    this.loading = true;
    this.cdr.detectChanges(); 

    try {
      const { data, error } = await this.supabase.getGuias();
      if (error) throw error;
      
      this.guiasOriginales = data || [];
      this.aplicarFiltros(); // ✅ Aplicamos filtro inicial por si hay algo escrito
      
    } catch (error) {
      console.error('Error al cargar material de estudio:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); 
    }
  }

  // ✅ Función que realiza la búsqueda
  aplicarFiltros() {
    if (this.filtroTitulo && this.filtroTitulo.trim() !== '') {
      const busqueda = this.filtroTitulo.toLowerCase().trim();
      this.guias = this.guiasOriginales.filter(guia => 
        (guia.titulo || '').toLowerCase().includes(busqueda)
      );
    } else {
      // Si el input está vacío, restauramos la lista original
      this.guias = [...this.guiasOriginales];
    }
    this.cdr.detectChanges();
  }
}