import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

// 🚀 CAMBIO 1: Importamos la triada de servicios de dominio
import { AuthService } from '../../../../core/services/auth.service';
import { AcademyService } from '../../../../core/services/academy.service';
import { HealthService } from '../../../../core/services/health.service';

@Component({
  selector: 'app-view-teachers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-teachers.html',
  styleUrl: './view-teachers.css'
})
export class ViewTeachersComponent implements OnInit {
  loading: boolean = true;
  profesores: any[] = []; // Aquí guardaremos a todo el cuerpo técnico unido
  errorMessage: string = '';

  constructor(
    // 🚀 CAMBIO 2: Inyectamos los servicios especializados
    private authService: AuthService,
    private academyService: AcademyService,
    private healthService: HealthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarCuerpoTecnico();
  }

  async cargarCuerpoTecnico() {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges(); 

    try {
      // 🚀 CAMBIO 3: Validación segura con AuthService
      const { data: { user } } = await this.authService.getUser();
      
      if (!user) {
        this.errorMessage = 'No se pudo identificar al usuario.';
        return;
      }

      // 🚀 CAMBIO 4: Usamos los servicios de dominio correspondientes
      const [profesoresResponse, kinesResponse] = await Promise.all([
        this.academyService.getProfesoresDeEstudiante(user.id as string),
        this.healthService.getKinesiologosDeEstudiante(user.id as string)
      ]);

      // Si falla la búsqueda principal de profes, lanzamos error
      if (profesoresResponse.error) {
        this.errorMessage = 'Error al cargar los datos del cuerpo técnico.';
        return;
      }

      const profes = profesoresResponse.data || [];
      const kinesBrutos = kinesResponse.data || [];

      // 🎭 Mapeamos a los kinesiólogos para que el HTML los renderice igual que a los profes
      const kinesMapeados = kinesBrutos.map((kine: any) => ({
        id: kine.id,
        nombre: kine.nombre,
        apellido: kine.apellido,
        email: kine.email,
        foto_url: kine.foto_url, 
        tipo_profesor: 'Kinesiólogo' 
      }));

      // 🤝 Unimos ambos mundos
      this.profesores = [...profes, ...kinesMapeados];
      
      this.cdr.detectChanges(); 

    } catch (err) {
      console.error('Error en el directorio técnico:', err);
      this.errorMessage = 'Error de conexión con el servidor.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); 
    }
  }
}