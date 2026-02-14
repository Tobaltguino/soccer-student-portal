import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-professor-nutrition', // Cambia a 'app-admin-nutri' en el otro
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './professor-nutrition.html', // Cambia al html correspondiente
  styleUrls: ['./professor-nutrition.css']   // Cambia al css correspondiente
})
export class ProfessorNutritionComponent { 
  // No necesitas lógica extra por ahora
}