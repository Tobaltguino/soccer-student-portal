import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-estudiante-kinesiologia', // Cambia a 'app-admin-nutri' en el otro
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './kinesiologia.component.html', // Cambia al html correspondiente
  styleUrls: ['./kinesiologia.component.css']   // Cambia al css correspondiente
})
export class EstudianteKinesiologiaComponent { 
  // No necesitas lógica extra por ahora
}