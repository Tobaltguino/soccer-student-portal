import { BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import type { PostgrestError, AuthError } from '@supabase/supabase-js';

const MENSAJES_DUPLICADO: Record<string, string> = {
  rut: 'Ya existe un usuario registrado con ese RUT',
  email: 'Ya existe un usuario registrado con ese correo electrónico',
};

function detectarColumnaDuplicada(mensaje: string): string | undefined {
  return Object.keys(MENSAJES_DUPLICADO).find((columna) =>
    mensaje.toLowerCase().includes(columna),
  );
}

/**
 * Traduce un PostgrestError (viene de .from().insert()/.update()) a una
 * excepción HTTP legible. Usar en operaciones directas a tablas.
 */
export function lanzarErrorSupabase(
  error: PostgrestError,
  contexto: string,
): never {
  if (error.code === '23505') {
    const columna = detectarColumnaDuplicada(error.message);
    throw new ConflictException(
      columna
        ? MENSAJES_DUPLICADO[columna]
        : 'Ya existe un registro con ese valor único',
    );
  }

  throw new InternalServerErrorException(`${contexto}: ${error.message}`);
}

/**
 * Traduce un AuthError (viene de auth.admin.createUser/updateUserById) a una
 * excepción HTTP legible. El AuthError no trae un `code` de Postgres
 * confiable, así que inspeccionamos el mensaje en busca de "duplicate key".
 */
export function lanzarErrorAuth(error: AuthError, contexto: string): never {
  const esDuplicado = error.message.toLowerCase().includes('duplicate key');

  if (esDuplicado) {
    const columna = detectarColumnaDuplicada(error.message);
    throw new ConflictException(
      columna
        ? MENSAJES_DUPLICADO[columna]
        : 'Ya existe un usuario registrado con ese valor único',
    );
  }

  throw new InternalServerErrorException(`${contexto}: ${error.message}`);
}

export function lanzarErrorSupabaseConFk(
  error: PostgrestError,
  contexto: string,
  mensajeFkInvalida: string,
): never {
  if (error.code === '23503') {
    // 23503 = foreign_key_violation
    throw new BadRequestException(mensajeFkInvalida);
  }

  lanzarErrorSupabase(error, contexto);
}