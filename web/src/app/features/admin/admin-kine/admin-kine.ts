import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-admin-kine', // Cambia a 'app-admin-nutri' en el otro
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './admin-kine.html', // Cambia al html correspondiente
  styleUrls: ['./admin-kine.css']   // Cambia al css correspondiente
})
export class AdminKineComponent { 
  // No necesitas lógica extra por ahora
}