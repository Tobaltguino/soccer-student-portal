import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Dot {
  x: number;
  y: number;
  r: number;
}

/**
 * Textura jaspeada tomada del uniforme del equipo (splatter).
 * Se usa como fondo decorativo en tarjetas y franjas de color.
 */
@Component({
  selector: 'pf-splatter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splatter.component.html',
  styleUrl: './splatter.component.scss',
})
export class SplatterComponent {
  @Input() opacityValue = 1;

  readonly dots: Dot[] = Array.from({ length: 70 }).map((_, i) => ({
    x: (i * 53.7) % 400,
    y: (i * 97.3) % 300,
    r: 1 + ((i * 31) % 5),
  }));
}
