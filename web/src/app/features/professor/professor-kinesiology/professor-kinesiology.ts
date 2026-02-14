import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-professor-kinesiology',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './professor-kinesiology.html',
  styleUrls: ['./professor-kinesiology.css']
})
export class ProfessorKinesiologyComponent { 
  // No necesitas lógica extra por ahora
}