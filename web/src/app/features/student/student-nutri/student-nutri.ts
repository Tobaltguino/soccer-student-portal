import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-student-nutri', // Cambia a 'app-admin-nutri' en el otro
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './student-nutri.html', // Cambia al html correspondiente
  styleUrls: ['./student-nutri.css']   // Cambia al css correspondiente
})
export class StudentNutriComponent { 
  // No necesitas lógica extra por ahora
}