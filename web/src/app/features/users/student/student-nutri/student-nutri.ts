import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Importaciones de PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker'; 
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { AuthService } from '../../../../core/services/auth.service';
import { UsuariosService } from '../../../../core/services/modulos/administracion/usuarios.service';
import { NutricionService } from '../../../../core/services/modulos/salud/nutri.service';

@Component({
  selector: 'app-student-nutri',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    DatePickerModule, SelectModule, TooltipModule
  ],
  templateUrl: './student-nutri.html',
  styleUrls: ['./student-nutri.css']
})
export class StudentNutriComponent implements OnInit {
  
  loading = false;
  estudianteId: string | null = null;
  
  misResultados: any[] = [];
  resultadosFiltrados: any[] = [];
  
  tiposEvaluacionDisponibles: any[] = []; 
  
  filtroFecha: Date | null = null;
  filtroPrueba: any = null;

  constructor(
    private authService: AuthService,
    private usuariosService: UsuariosService,
    private nutricionService: NutricionService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarMisResultados();
  }

  async cargarMisResultados() {
    try {
      this.loading = true;
      this.cdr.detectChanges();

      const { data: { user } } = await this.authService.getUser();
      if (!user || !user.email) return;

      // 🚀 CAMBIO 4: Obtenemos el ID del estudiante desde UsuariosService
      const { data: estudiante } = await this.usuariosService.getEstudianteByEmail(user.email);
      this.estudianteId = estudiante?.id;

      if (!this.estudianteId) return;

      const res = await this.nutricionService.getResultadosNutriEstudiante(this.estudianteId);
      const rawData: any[] = res.data || [];

      // 3. Mapear y procesar datos
      this.misResultados = rawData
        .map(r => {
          // Normalizamos la relación (por si viene como objeto o array de un elemento)
          const ev = Array.isArray(r.evaluacion) ? r.evaluacion[0] : r.evaluacion;
          const tipoEv = ev ? (Array.isArray(ev.tipo_evaluacion) ? ev.tipo_evaluacion[0] : ev.tipo_evaluacion) : null;
          
          // Limpiar nombre de URL para mostrar el nombre del archivo PDF
          let nombreLimpio = 'Documento PDF';
          if (r.archivo_url) {
            const urlParts = r.archivo_url.split('/');
            const rawName = decodeURIComponent(urlParts[urlParts.length - 1]);
            const underscoreIndex = rawName.indexOf('_');
            nombreLimpio = underscoreIndex !== -1 ? rawName.substring(underscoreIndex + 1) : rawName;
          }

          return {
            fecha: ev?.fecha,
            tipo_nombre: tipoEv?.nombre,
            observacion: r.observaciones,
            archivo_url: r.archivo_url,
            nombre_archivo: nombreLimpio,
            estado: ev?.estado
          };
        })
        .filter(r => r.estado === 'FINALIZADO') // Solo mostrar lo que el nutri ya liberó
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      // 4. Extraer tipos únicos para filtros
      const tiposUnicos = new Set(this.misResultados.map(r => r.tipo_nombre));
      this.tiposEvaluacionDisponibles = Array.from(tiposUnicos).map(nombre => ({ nombre }));

      this.aplicarFiltros();

    } catch (error) {
      console.error('Error al cargar resultados nutricionales:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  aplicarFiltros() {
    this.resultadosFiltrados = this.misResultados.filter(r => {
      let cumpleFecha = true;
      let cumplePrueba = true;

      if (this.filtroFecha) {
        // Formateo manual para evitar desfases de zona horaria en la comparación
        const anio = this.filtroFecha.getFullYear();
        const mes = ('0' + (this.filtroFecha.getMonth() + 1)).slice(-2);
        const dia = ('0' + this.filtroFecha.getDate()).slice(-2);
        const dFiltro = `${anio}-${mes}-${dia}`;
        cumpleFecha = r.fecha === dFiltro;
      }
      if (this.filtroPrueba) {
        cumplePrueba = r.tipo_nombre === this.filtroPrueba.nombre;
      }

      return cumpleFecha && cumplePrueba;
    });
    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.filtroFecha = null;
    this.filtroPrueba = null;
    this.aplicarFiltros();
  }
}