import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../../../core/services/auth.service';
import { UsuariosService } from '../../../../core/services/modulos/administracion/usuarios.service';
import { KinesiologiaService } from '../../../../core/services/modulos/salud/kine.service';

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
    private authService: AuthService,
    private usuariosService: UsuariosService,
    private kinesiologiaService: KinesiologiaService,
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
      const { data: { user } } = await this.authService.getUser();
      
      if (!user) {
        this.errorMessage = 'No se pudo identificar al usuario.';
        return;
      }

      const [profesoresResponse, kinesResponse] = await Promise.all([
        this.usuariosService.getProfesoresDeEstudiante(user.id),
        this.kinesiologiaService.getKinesiologosDeEstudiante(user.id)
      ]);

      // Si falla la búsqueda principal de profes, lanzamos error
      if (profesoresResponse.error) {
        this.errorMessage = 'Error al cargar los datos del cuerpo técnico.';
        return;
      }

      const profes = profesoresResponse.data || [];
      const kinesBrutos = kinesResponse.data || [];

      // Mapeamos a los kinesiólogos para que el HTML los renderice igual que a los profes
      const kinesMapeados = kinesBrutos.map((kine: any) => ({
        id: kine.id,
        nombre: kine.nombre,
        apellido: kine.apellido,
        email: kine.email,
        foto_url: kine.foto_url, 
        tipo_profesor: 'Kinesiólogo' 
      }));

      // Unimos ambos mundos
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