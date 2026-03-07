import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 

import { SupabaseService } from '../../../../core/services/supabase.service';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext'; 

@Component({
  selector: 'app-kine-view-guides',
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
  templateUrl: './kine-view-guides.html',
  styleUrls: ['./kine-view-guides.css']
})
export class KineViewGuidesComponent implements OnInit {
  
  guias: any[] = [];
  guiasOriginales: any[] = []; 
  
  filtroTitulo: string = ''; 
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
      // ✅ El Kinesiólogo también puede ver las guías compartidas por la administración
      const { data, error } = await this.supabase.getGuias();
      if (error) throw error;
      
      this.guiasOriginales = data || [];
      this.aplicarFiltros(); 
      
    } catch (error) {
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); 
    }
  }

  aplicarFiltros() {
    if (this.filtroTitulo && this.filtroTitulo.trim() !== '') {
      const busqueda = this.filtroTitulo.toLowerCase().trim();
      this.guias = this.guiasOriginales.filter(guia => 
        (guia.titulo || '').toLowerCase().includes(busqueda)
      );
    } else {
      this.guias = [...this.guiasOriginales];
    }
    this.cdr.detectChanges();
  }
}