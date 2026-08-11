import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-admin-payments', // Cambia a 'app-admin-nutri' en el otro
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './admin-payments.html', // Cambia al html correspondiente
  styleUrls: ['./admin-payments.css']   // Cambia al css correspondiente
})
export class AdminPaymentsComponent { 
  // No necesitas lógica extra por ahora
}