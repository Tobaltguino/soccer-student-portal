import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ButtonModule],
  // ⚠️ VERIFICA: ¿Tu archivo HTML se llama 'app.component.html' o 'app.html'?
  // Pon aquí el nombre EXACTO que tiene el archivo en tu carpeta:
  templateUrl: './app.html', 
  styleUrl: './app.css'
})
export class App {  // <--- Aquí definimos la clase como 'App'
  title = 'ProFutbol';
}