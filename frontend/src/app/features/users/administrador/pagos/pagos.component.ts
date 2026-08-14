import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-administrador-pagos', // Cambia a 'app-admin-nutri' en el otro
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './pagos.component.html', // Cambia al html correspondiente
  styleUrls: ['./pagos.component.css']   // Cambia al css correspondiente
})
export class AdministradorPagosComponent { 
  // No necesitas lógica extra por ahora
}