import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Componentes compartidos
import { SplatterComponent } from '../../shared/splatter/splatter.component';

// Servicios Locales / Feature-Based
import { WebConfiguracionService } from '../pages/administracion/web/services/web-configuracion.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, SplatterComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  // --- Inyección de dependencias ---
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private webConfigService = inject(WebConfiguracionService);

  // ==========================================
  // DATOS POR DEFECTO (Configuración General)
  // ==========================================
  telefonoAcademia = '+56 9 2372 1673';
  correoAcademia = 'profutbol@gmail.com';

  linkInstagram = 'https://www.instagram.com/pro_futbol2026';
  nombreInstagram = 'ProFutbol'; 

  linkFacebook = 'https://www.facebook.com/share/1BG7rABUks/';
  nombreFacebook = 'Pro Fútbol Arica'; 

  mensajeWhatsApp = 'Hola, vengo desde la página web y quiero información sobre la academia.';
  
  heroTitulo = 'Se entrena el cuerpo.<br />Se entrena la <span class="pf-hero__accent">cabeza</span>.';
  heroSubtitulo = 'Formamos niños y jóvenes de 8 a 16 años con un método que combina fútbol, acondicionamiento físico y trabajo cognitivo — respaldado por profesionales.';

  // ==========================================
  // LISTAS DINÁMICAS (Se llenarán con la BD)
  // ==========================================
  metodologias: any[] = [
    { icono: 'pi-star-fill', titulo: 'Formación Técnica', descripcion: 'Entrenamientos planificados enfocados en el desarrollo técnico, táctico y cognitivo del jugador moderno.' },
    { icono: 'pi-heart-fill', titulo: 'Área Médica', descripcion: 'Acompañamiento constante de kinesiólogos y nutricionistas para prevenir lesiones y optimizar el rendimiento.' },
    { icono: 'pi-desktop', titulo: 'Tecnología ProFutbol', descripcion: 'Portal exclusivo donde jugadores y apoderados pueden ver estadísticas, evaluaciones e historial de asistencia.' }
  ];

  programas: any[] = [
    { titulo: 'Iniciación (5 a 9 años)', descripcion: 'Enfoque en la psicomotricidad, el juego lúdico y los fundamentos básicos del fútbol.' },
    { titulo: 'Formación (10 a 14 años)', descripcion: 'Desarrollo técnico específico, comprensión táctica y preparación física orientada al crecimiento.' },
    { titulo: 'Proyección (15 a 18 años)', descripcion: 'Alto rendimiento, exigencia física, apoyo nutricional y preparación para competencias.' }
  ];

  auspiciadores: any[] = [];
  alianzas: any[] = [];

  readonly navLinks = ['Metodología', 'Categorías', 'Auspiciadores', 'Beneficios'];
  readonly currentYear = new Date().getFullYear();

  async ngOnInit() {
    await this.cargarDatosDinamicos();
  }

  // --- OBTENER DATOS DESDE EL ENDPOINT ---
  async cargarDatosDinamicos() {
    try {
      // 🔥 Llamada a Promesa nativa
      const res = await this.webConfigService.obtenerDatosLanding();
      
      if (res) {
        if (res.configuracion) {
          // Todo actualizado a camelCase
          this.telefonoAcademia = res.configuracion.telefono || this.telefonoAcademia;
          this.correoAcademia = res.configuracion.correo || this.correoAcademia;
          this.nombreInstagram = res.configuracion.instagramNombre || this.nombreInstagram;
          this.linkInstagram = res.configuracion.instagramUrl || this.linkInstagram;
          this.nombreFacebook = res.configuracion.facebookNombre || this.nombreFacebook;
          this.linkFacebook = res.configuracion.facebookUrl || this.linkFacebook;
          this.mensajeWhatsApp = res.configuracion.whatsappMensaje || this.mensajeWhatsApp;
          this.heroTitulo = res.configuracion.heroTitulo || this.heroTitulo;
          this.heroSubtitulo = res.configuracion.heroSubtitulo || this.heroSubtitulo;
        }

        if (res.metodologias?.length > 0) this.metodologias = res.metodologias;
        if (res.programas?.length > 0) this.programas = res.programas;
        if (res.auspiciadores?.length > 0) this.auspiciadores = res.auspiciadores;
        if (res.beneficios?.length > 0) this.alianzas = res.beneficios;
      }
    } catch (err) {
      console.error('Error cargando datos de la landing', err);
    } finally {
      this.cdr.detectChanges();
    }
  }

  get linkWhatsApp(): string {
    const numeroLimpio = this.telefonoAcademia.replace(/\D/g, ''); 
    const mensajeEncodeado = encodeURIComponent(this.mensajeWhatsApp);
    return `https://wa.me/${numeroLimpio}?text=${mensajeEncodeado}`;
  }

  irAlLogin() { this.router.navigate(['/login']); }
  irA(url: string) { if(url) window.open(url, '_blank'); }
  
  scrollTo(index: number) {
    const sections = ['metodologia', 'categorias', 'auspiciadores', 'beneficios'];
    const element = document.getElementById(sections[index]);
    if (element) {
      const navHeight = 80; 
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementPosition - navHeight, behavior: 'smooth' });
    }
  }
}