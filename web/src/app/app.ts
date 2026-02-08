import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ButtonModule],
  // Asegúrate de que estos nombres coincidan con tus archivos reales
  templateUrl: './app.html', 
  styleUrl: './app.css'
})
export class App implements OnInit { 
  title = 'ProFutbol';

  // Esta función se ejecuta apenas abres la página web
  ngOnInit() {
    this.checkThemePreference();
  }

  // Lógica para detectar el tema guardado
  checkThemePreference() {
    // 1. Revisar si el usuario ya guardó una preferencia antes
    const savedTheme = localStorage.getItem('theme');
    
    // 2. Revisar si el PC/Celular del usuario está en modo oscuro
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 3. Aplicar la clase al <body>
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
}