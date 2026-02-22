import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// PrimeNG
import { ButtonModule } from 'primeng/button';

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
  // DATOS DE CONTACTO Y REDES SOCIALES
  // ==========================================
  telefonoAcademia = '+56 9 2372 1673';
  correoAcademia = 'profutbol@gmail.com';

  linkInstagram = 'https://www.instagram.com/pro_futbol2026?igsh=ZWN2aDVvMW50dW15';
  nombreInstagram = 'ProFutbol'; 

  linkFacebook = 'https://www.facebook.com/share/1BG7rABUks/';
  nombreFacebook = 'Pro Fútbol Arica'; 

  // Link de WhatsApp con mensaje predeterminado
  linkWhatsApp = 'https://wa.me/56923721673?text=Hola,%20vengo%20desde%20la%20página%20web%20y%20quiero%20información%20sobre%20la%20academia.';

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkThemePreference();
  }

  // --- LÓGICA DE TEMA OSCURO ---
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

  // --- NAVEGACIÓN INTERNA ---
  irAlLogin() {
    this.router.navigate(['/login']);
  }

  scrollTo(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // --- NAVEGACIÓN EXTERNA (REDES Y WHATSAPP) ---
  irA(url: string) {
    window.open(url, '_blank'); 
  }
}