import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

// Servicios de Dominio (Ajusta la ruta según tu proyecto)
import { WebConfiguracionService } from '../../../core/domains/administracion/web/web-configuracion/services/web-configuracion.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  isDarkMode: boolean = false;
  isScrolled: boolean = false;

  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private webConfigService = inject(WebConfiguracionService);

  // ==========================================
  // DATOS POR DEFECTO (Configuración General)
  // ==========================================
  telefonoAcademia = '+56 9 2372 1673';
  correoAcademia = 'profutbol@gmail.com';

  linkInstagram = 'https://www.instagram.com/pro_futbol2026?igsh=ZWN2aDVvMW50dW15';
  nombreInstagram = 'ProFutbol'; 

  linkFacebook = 'https://www.facebook.com/share/1BG7rABUks/';
  nombreFacebook = 'Pro Fútbol Arica'; 

  mensajeWhatsApp = 'Hola, vengo desde la página web y quiero información sobre la academia.';
  
  heroTitulo = 'TU MEJOR VERSIÓN COMIENZA AQUÍ';
  heroSubtitulo = 'Trabajamos con un grupo de profesionales expertos en el área para mejorar tu rendimiento deportivo de manera integral.';

  // ==========================================
  // LISTAS POR DEFECTO (Con Colores Hexadecimales)
  // ==========================================
  metodologias: any[] = [
    { icono: 'pi-star-fill', color: '#3B82F6', titulo: 'Formación Técnica', descripcion: 'Entrenamientos planificados enfocados en el desarrollo técnico, táctico y cognitivo del jugador moderno.' },
    { icono: 'pi-heart-fill', color: '#EF4444', titulo: 'Área Médica', descripcion: 'Acompañamiento constante de kinesiólogos y nutricionistas para prevenir lesiones y optimizar el rendimiento.' },
    { icono: 'pi-desktop', color: '#8B5CF6', titulo: 'Tecnología ProFutbol', descripcion: 'Portal exclusivo donde jugadores y apoderados pueden ver estadísticas, evaluaciones e historial de asistencia.' }
  ];

  programas: any[] = [
    { icono: 'pi-bolt', color: '#3B82F6', titulo: 'Iniciación (5 a 9 años)', descripcion: 'Enfoque en la psicomotricidad, el juego lúdico y los fundamentos básicos del fútbol. ¡Aprender jugando!' },
    { icono: 'pi-directions', color: '#10B981', titulo: 'Formación (10 a 14 años)', descripcion: 'Desarrollo técnico específico, comprensión táctica y preparación física orientada al crecimiento.' },
    { icono: 'pi-shield', color: '#F59E0B', titulo: 'Proyección (15 a 18 años)', descripcion: 'Alto rendimiento, exigencia física, apoyo nutricional y preparación para competencias exigentes.' }
  ];

  auspiciadores: any[] = [
    { imagen_url: 'assets/images/default-sponsor.png', nombre: 'Barbería & Tattoo', descripcion: 'Descuentos en cortes para jugadores.', instagram_url: 'https://instagram.com' }
  ];

  alianzas: any[] = [
    { imagen_url: 'assets/images/default-sponsor.png', nombre: 'SportFit Store', descripcion: '20% de descuento en zapatos de fútbol, canilleras e indumentaria deportiva para todos nuestros alumnos activos.' },
    { imagen_url: 'assets/images/default-sponsor.png', nombre: 'Clínica Traumatológica', descripcion: 'Convenio con atención preferencial, urgencias sin costo de ingreso y descuentos en Rayos X y Resonancias.' }
  ];

  ngOnInit() {
    this.checkThemePreference();
    this.cargarDatosDinamicos();
    this.detectScroll();
  }

  // --- OBTENER DATOS DESDE EL ENDPOINT ---
  cargarDatosDinamicos() {
    this.webConfigService.obtenerDatosLanding().subscribe({
      next: (res) => {
        if (res.configuracion) {
          this.telefonoAcademia = res.configuracion.telefono || this.telefonoAcademia;
          this.correoAcademia = res.configuracion.correo || this.correoAcademia;
          this.nombreInstagram = res.configuracion.instagram_nombre || this.nombreInstagram;
          this.linkInstagram = res.configuracion.instagram_url || this.linkInstagram;
          this.nombreFacebook = res.configuracion.facebook_nombre || this.nombreFacebook;
          this.linkFacebook = res.configuracion.facebook_url || this.linkFacebook;
          this.mensajeWhatsApp = res.configuracion.whatsapp_mensaje || this.mensajeWhatsApp;
          this.heroTitulo = res.configuracion.hero_titulo || this.heroTitulo;
          this.heroSubtitulo = res.configuracion.hero_subtitulo || this.heroSubtitulo;
        }

        if (res.metodologias && res.metodologias.length > 0) this.metodologias = res.metodologias;
        if (res.programas && res.programas.length > 0) this.programas = res.programas;
        if (res.auspiciadores && res.auspiciadores.length > 0) this.auspiciadores = res.auspiciadores;
        if (res.beneficios && res.beneficios.length > 0) this.alianzas = res.beneficios;
      },
      error: (err) => {
        console.error('Error cargando datos de la landing', err);
      },
      complete: () => {
        this.cdr.detectChanges(); 
      }
    });
  }

  get linkWhatsApp(): string {
    const numeroLimpio = this.telefonoAcademia.replace(/\D/g, ''); 
    const mensajeEncodeado = encodeURIComponent(this.mensajeWhatsApp);
    return `https://wa.me/${numeroLimpio}?text=${mensajeEncodeado}`;
  }

  // --- EVENTO DE SCROLL PARA NAVBAR GLASSMORPHISM ---
  detectScroll() {
    window.addEventListener('scroll', () => {
      this.isScrolled = window.scrollY > 50;
    });
  }

  // --- MANEJO DE TEMA (DARK/LIGHT MODE) ---
  checkThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      this.enableDarkMode();
    } else {
      this.disableDarkMode();
    }
  }

  toggleTheme() {
    if (this.isDarkMode) {
      this.disableDarkMode();
    } else {
      this.enableDarkMode();
    }
  }

  enableDarkMode() {
    this.isDarkMode = true;
    document.body.classList.add('dark-mode'); 
    localStorage.setItem('theme', 'dark');
  }

  disableDarkMode() {
    this.isDarkMode = false;
    document.body.classList.remove('dark-mode'); 
    localStorage.setItem('theme', 'light');
  }

  // --- NAVEGACIÓN Y UTILIDADES ---
  irAlLogin() {
    this.router.navigate(['/login']);
  }

  scrollTo(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      const navHeight = 80; // Compensación por la navbar fija
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementPosition - navHeight, behavior: 'smooth' });
    }
  }

  irA(url: string) {
    if(url) window.open(url, '_blank'); 
  }
}