import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Anillo de progreso circular — reinterpreta el isotipo circular del logo
 * Pro Fútbol como componente de datos. Se usa en el hero y en los
 * dashboards del portal (asistencia, índice cognitivo, etc).
 */
@Component({
  selector: 'pf-ring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ring.component.html',
  styleUrl: './ring.component.scss',
})
export class RingComponent {
  @Input() percent = 70;
  @Input() size = 88;
  @Input() stroke = 7;
  @Input() color = 'var(--pf-teal)';
  @Input() track = 'rgba(234,242,240,0.14)';
  @Input() value?: string;
  @Input() label?: string;

  get radius(): number {
    return (this.size - this.stroke) / 2;
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  get offset(): number {
    const p = Math.min(100, Math.max(0, this.percent));
    return this.circumference - (p / 100) * this.circumference;
  }

  get center(): number {
    return this.size / 2;
  }

  get displayValue(): string {
    return this.value ?? `${this.percent}%`;
  }
}
