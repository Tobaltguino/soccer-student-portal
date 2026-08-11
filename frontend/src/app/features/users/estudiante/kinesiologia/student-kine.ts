import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-student-kine', // Cambia a 'app-admin-nutri' en el otro
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './student-kine.html', // Cambia al html correspondiente
  styleUrls: ['./student-kine.css']   // Cambia al css correspondiente
})
export class StudentKineComponent { 
  // No necesitas lógica extra por ahora
}