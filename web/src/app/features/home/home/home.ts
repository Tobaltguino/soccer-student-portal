import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// PrimeNG & Servicios
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip'; 

import { InicioService } from '../../../shared/services/modulos/administracion/inicio.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
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
  
  heroTitulo = 'TU MEJOR VERSIÓN COMIENZA AQUÍ';
  heroSubtitulo = 'Trabajamos con un grupo de profesionales expertos en el área para mejorar tu rendimiento deportivo de manera integral.';

  // ==========================================
  // LISTAS POR DEFECTO
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

  auspiciadores: any[] = [
    { imagen_url: 'assets/images/default-sponsor.png', nombre: 'Barbería & Tattoo', descripcion: 'Descuentos en cortes para jugadores.', instagram_url: 'https://instagram.com' }
  ];

  alianzas: any[] = [
    { imagen_url: 'assets/images/default-sponsor.png', nombre: 'SportFit Store', descripcion: '20% de descuento en zapatos de fútbol, canilleras e indumentaria deportiva para todos nuestros alumnos activos.' },
    { imagen_url: 'assets/images/default-sponsor.png', nombre: 'Clínica Traumatológica', descripcion: 'Convenio con atención preferencial, urgencias sin costo de ingreso y descuentos en Rayos X y Resonancias.' }
  ];

  constructor(
    private router: Router,
    // 🚀 CAMBIO 2: Inyectamos InicioService en lugar de ContentService
    private inicioService: InicioService,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit() {
    this.checkThemePreference();
    this.cargarDatosDinamicos();
  }

  // --- OBTENER DATOS DE SUPABASE ---
  async cargarDatosDinamicos() {
    try {
      // 🚀 CAMBIO 3: Actualizamos las llamadas usando this.inicioService
      const [config, met, prog, ali, aus] = await Promise.all([
        this.inicioService.getConfiguracionWeb(),
        this.inicioService.getWebMetodologias(),
        this.inicioService.getWebProgramas(),
        this.inicioService.getWebAlianzas(),
        this.inicioService.getWebAuspiciadores() 
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
      if (aus.data && aus.data.length > 0) this.auspiciadores = aus.data; 

    } catch (error) {
      // Mantiene datos por defecto si falla
    } finally {
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