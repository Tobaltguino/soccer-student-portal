import { AbstractControl, ValidationErrors } from '@angular/forms';

export class RutValidator {
  static validar(control: AbstractControl): ValidationErrors | null {
    const rut = control.value;
    if (!rut) return null;

    // Limpiamos el RUT de puntos y guion para el cálculo
    const value = rut.replace(/\./g, '').replace(/-/g, '').trim();
    if (value.length < 2) return { rutInvalido: true };

    const cuerpo = value.slice(0, -1);
    const dv = value.slice(-1).toLowerCase();

    let suma = 0;
    let multiplo = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += multiplo * cuerpo.charAt(i);
      multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }

    const dvEsperado = 11 - (suma % 11);
    const dvReal = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'k' : dvEsperado.toString();

    return dvReal === dv ? null : { rutInvalido: true };
  }

  // Versión simple para usar con un IF (como en tu login)
  static esValido(rut: string): boolean {
  if (!rut) return false;

  // 1. Limpieza inicial
  const value = rut.replace(/\./g, '').replace(/-/g, '').replace(/\s/g, '').toLowerCase();
  
  // 🚀 EXCEPCIÓN: Si es "11", lo dejamos pasar de inmediato
  if (value === '11') return true;

  // 2. Validación normal para el resto de los RUTs
  if (value.length < 2) return false;

  const cuerpo = value.slice(0, -1);
  const dv = value.slice(-1);
  
  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += multiplo * Number(cuerpo.charAt(i));
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }

  const dvEsperado = 11 - (suma % 11);
  const dvReal = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'k' : dvEsperado.toString();

  return dvReal === dv;
}
}