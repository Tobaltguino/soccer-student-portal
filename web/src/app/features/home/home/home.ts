import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// PrimeNG & Servicios
import { ButtonModule } from 'primeng/button';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {

  isDarkMode: boolean = false;

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
  
  heroTitulo = 'Formamos a los líderes del <span>mañana</span>';
  heroSubtitulo = 'Descubre tu máximo potencial. En ProFutbol unimos pasión, disciplina y tecnología deportiva para llevar tu talento al siguiente nivel, dentro y fuera de la cancha.';

  // ==========================================
  // LISTAS POR DEFECTO (Se sobrescriben si hay datos en DB)
  // ==========================================
  metodologias: any[] = [
    { icono: 'pi-star-fill', titulo: 'Formación Técnica', descripcion: 'Entrenamientos planificados enfocados en el desarrollo técnico, táctico y cognitivo del jugador moderno.' },
    { icono: 'pi-heart-fill', titulo: 'Área Médica', descripcion: 'Acompañamiento constante de kinesiólogos y nutricionistas para prevenir lesiones y optimizar el rendimiento.' },
    { icono: 'pi-desktop', titulo: 'Tecnología ProFutbol', descripcion: 'Portal exclusivo donde jugadores y apoderados pueden ver estadísticas, evaluaciones e historial de asistencia.' }
  ];

  programas: any[] = [
    { icono: 'pi-bolt', color_fondo: 'bg-blue-100', color_texto: 'text-blue-500', titulo: 'Iniciación (5 a 9 años)', descripcion: 'Enfoque en la psicomotricidad, el juego lúdico y los fundamentos básicos del fútbol. ¡Aprender jugando!' },
    { icono: 'pi-directions', color_fondo: 'bg-green-100', color_texto: 'text-green-500', titulo: 'Formación (10 a 14 años)', descripcion: 'Desarrollo técnico específico, comprensión táctica y preparación física orientada al crecimiento.' },
    { icono: 'pi-shield', color_fondo: 'bg-orange-100', color_texto: 'text-orange-500', titulo: 'Proyección (15 a 18 años)', descripcion: 'Alto rendimiento, exigencia física, apoyo nutricional y preparación para competencias exigentes.' }
  ];

  // ✅ ALIANZAS ACTUALIZADAS PARA USAR IMÁGENES
  alianzas: any[] = [
    { imagen_url: 'assets/images/default-sponsor.png', nombre: 'SportFit Store', descripcion: '20% de descuento en zapatos de fútbol, canilleras e indumentaria deportiva para todos nuestros alumnos activos.' },
    { imagen_url: 'assets/images/default-sponsor.png', nombre: 'Clínica Traumatológica', descripcion: 'Convenio con atención preferencial, urgencias sin costo de ingreso y descuentos en Rayos X y Resonancias.' },
    { imagen_url: 'assets/images/default-sponsor.png', nombre: 'Agua Pura', descripcion: 'Patrocinador oficial de hidratación. Garantiza estaciones de agua mineralizada en entrenamientos y partidos.' },
    { imagen_url: 'assets/images/default-sponsor.png', nombre: 'NutriLife Supplements', descripcion: 'Charlas nutricionales gratuitas para padres y precios de mayorista en suplementos vitamínicos y deportivos.' }
  ];

  constructor(
    private router: Router,
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef // ✅ Agregado aquí
  ) {}

  ngOnInit() {
    this.checkThemePreference();
    this.cargarDatosDinamicos();
  }

  // --- OBTENER DATOS DE SUPABASE ---
  async cargarDatosDinamicos() {
    try {
      const [config, met, prog, ali] = await Promise.all([
        this.supabase.getConfiguracionWeb(),
        this.supabase.getWebMetodologias(),
        this.supabase.getWebProgramas(),
        this.supabase.getWebAlianzas()
      ]);

      if (config.data && !config.error) {
        this.telefonoAcademia = config.data.telefono || this.telefonoAcademia;
        this.correoAcademia = config.data.correo || this.correoAcademia;
        this.nombreInstagram = config.data.instagram_nombre || this.nombreInstagram;
        this.linkInstagram = config.data.instagram_url || this.linkInstagram;
        this.nombreFacebook = config.data.facebook_nombre || this.nombreFacebook;
        this.linkFacebook = config.data.facebook_url || this.linkFacebook;
        this.mensajeWhatsApp = config.data.whatsapp_mensaje || this.mensajeWhatsApp;
        this.heroTitulo = config.data.hero_titulo || this.heroTitulo;
        this.heroSubtitulo = config.data.hero_subtitulo || this.heroSubtitulo;
      }

      if (met.data && met.data.length > 0) this.metodologias = met.data;
      if (prog.data && prog.data.length > 0) this.programas = prog.data;
      if (ali.data && ali.data.length > 0) this.alianzas = ali.data;

    } catch (error) {
      console.error('Error cargando datos dinámicos de la web, usando predeterminados.', error);
    } finally {
      // ✅ Le avisamos a Angular que ya llegaron los datos y debe dibujar la pantalla
      this.cdr.detectChanges(); 
    }
  }

  get linkWhatsApp(): string {
    const numeroLimpio = this.telefonoAcademia.replace(/\D/g, ''); 
    const mensajeEncodeado = encodeURIComponent(this.mensajeWhatsApp);
    return `https://wa.me/${numeroLimpio}?text=${mensajeEncodeado}`;
  }

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

  irAlLogin() {
    this.router.navigate(['/login']);
  }

  scrollTo(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  irA(url: string) {
    if(url) window.open(url, '_blank'); 
  }
}