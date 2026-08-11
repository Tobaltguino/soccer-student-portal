import { Directive, HostListener, ElementRef, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appRutFormat]',
  standalone: true
})
export class RutFormatDirective {

  constructor(
    private el: ElementRef,
    @Optional() @Self() private ngControl: NgControl
  ) {}

  @HostListener('input', ['$event'])
  onInputChange(event: any) {
    let valor = this.el.nativeElement.value;

    // 1. Limpiar: Dejar solo números y la letra K
    let cuerpo = valor.replace(/[^0-9kK]/g, '');
    
    // Si está vacío, no hacemos nada
    if (cuerpo.length === 0) {
      this.actualizarValor('');
      return;
    }

    // 2. Separar cuerpo y dígito verificador
    // Si tiene más de 1 carácter, el último es el DV
    let dv = cuerpo.slice(-1).toUpperCase();
    let numeros = cuerpo.slice(0, -1);

    // Si solo hay 1 carácter, es solo un número (aún no hay guion)
    if (cuerpo.length === 1) {
        numeros = cuerpo;
        dv = '';
    }

    // 3. Formatear los números con puntos
    // (Expresión regular mágica para poner puntos de miles)
    let numerosFormateados = numeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // 4. Armar el RUT final
    let rutFinal = numerosFormateados;
    if (dv) {
        rutFinal += '-' + dv;
    }

    // 5. Asignar el valor SOLO si es diferente para romper el bucle
    if (this.el.nativeElement.value !== rutFinal) {
        this.actualizarValor(rutFinal);
    }
  }

  // Helper para actualizar tanto el input visual como el formulario de Angular
  private actualizarValor(valor: string) {
    this.el.nativeElement.value = valor;
    
    // Si estamos usando Reactive Forms o ngModel, avisar al control del cambio
    // pero SIN emitir el evento 'input' de nuevo en el DOM
    if (this.ngControl) {
      this.ngControl.control?.setValue(valor, { 
        emitEvent: false, 
        emitModelToViewChange: false,
        emitViewToModelChange: false 
      });

    // 5. ¡ESTO ES LO MÁS IMPORTANTE! 
      // Notifica a Angular que el valor cambió para que lo guarde bien en la BD
    this.el.nativeElement.dispatchEvent(new Event('input'));  
    }
  }
}