import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// Orígenes permitidos separados por coma (ej: "https://profutbol.cl,http://localhost:4200").
// Si no se define, se permite cualquiera; la protección real es el chequeo de admin.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin = ALLOWED_ORIGINS.length === 0
    ? '*'
    : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0])

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    status,
  })
}

export function errorResponse(req: Request, error: unknown): Response {
  if (error instanceof HttpError) {
    return jsonResponse(req, { error: error.message }, error.status)
  }
  console.error(error)
  return jsonResponse(req, { error: (error as Error)?.message ?? 'Error interno' }, 400)
}

export function crearClienteAdmin(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Devuelve el usuario dueño del JWT del header Authorization.
 */
export async function requireUser(req: Request, supabaseAdmin: SupabaseClient): Promise<User> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  if (!jwt) throw new HttpError(401, 'No autenticado')

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt)
  if (userError || !userData?.user) throw new HttpError(401, 'Sesión inválida')

  return userData.user
}

/**
 * Verifica que quien llama sea un administrador activo.
 * Usa el JWT del header Authorization (no confía en nada del body).
 */
export async function requireAdmin(req: Request, supabaseAdmin: SupabaseClient): Promise<string> {
  const user = await requireUser(req, supabaseAdmin)

  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from('usu_perfiles')
    .select('rol, activo')
    .eq('id_usuario', user.id)
    .single()

  if (perfilError || !perfil || perfil.rol !== 'administrador' || perfil.activo !== true) {
    throw new HttpError(403, 'No autorizado')
  }

  return user.id
}
