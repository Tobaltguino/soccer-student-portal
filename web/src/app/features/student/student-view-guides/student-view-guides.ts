import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase.service'; // Ajusta tu ruta
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-student-view-guides',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TooltipModule, TableModule],
  templateUrl: './student-view-guides.html',
  styleUrls: ['./student-view-guides.css']
})
export class StudentViewGuidesComponent implements OnInit {
  guias: any[] = [];
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
    this.cdr.detectChanges(); // Avisamos que empezó a cargar

    try {
      const { data, error } = await this.supabase.getGuias();
      if (error) throw error;
      this.guias = data || [];
    } catch (error) {
      console.error('Error al cargar material de estudio:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // ✅ "Pellizcamos" a Angular para que dibuje la tabla con los datos
    }
  }
}