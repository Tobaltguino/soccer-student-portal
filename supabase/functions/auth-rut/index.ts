import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { corsHeaders, crearClienteAdmin, errorResponse, HttpError, jsonResponse } from "../_shared/admin.ts"

// Login y recuperación de contraseña por RUT sin exponer el correo al navegador.
// Se llama sin sesión (anon). Las respuestas de error son genéricas para no
// revelar si un RUT está registrado.

const MENSAJE_LOGIN_INVALIDO = 'RUT o contraseña incorrectos.'
const MENSAJE_RECUPERACION = 'Si el RUT está registrado, enviamos las instrucciones a su correo.'

function normalizarRut(rut: unknown): string {
  return String(rut ?? '').replace(/\./g, '').trim().toUpperCase()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const { accion, rut, password, redirectTo } = await req.json()
    const rutLimpio = normalizarRut(rut)
    if (!rutLimpio) throw new HttpError(400, 'RUT requerido')

    const supabaseAdmin = crearClienteAdmin()
    const { data: perfil } = await supabaseAdmin
      .from('usu_perfiles')
      .select('email')
      .eq('rut', rutLimpio)
      .eq('activo', true)
      .maybeSingle()

    // ---------------- LOGIN ----------------
    if (accion === 'login') {
      if (typeof password !== 'string' || !password) throw new HttpError(400, MENSAJE_LOGIN_INVALIDO)
      if (!perfil?.email) throw new HttpError(401, MENSAJE_LOGIN_INVALIDO)

      // Cliente anon (no service role) para que el login pase por las reglas normales de Auth
      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { data, error } = await supabaseAnon.auth.signInWithPassword({ email: perfil.email, password })
      if (error || !data?.session) {
        if (error?.status === 429) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')
        throw new HttpError(401, MENSAJE_LOGIN_INVALIDO)
      }

      return jsonResponse(req, {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
    }

    // ------------- RECUPERAR CLAVE -------------
    if (accion === 'recuperar') {
      if (perfil?.email) {
        const supabaseAnon = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
        // Auth solo acepta redirectTo que estén en la lista de URLs permitidas del proyecto
        const { error } = await supabaseAnon.auth.resetPasswordForEmail(perfil.email, {
          redirectTo: typeof redirectTo === 'string' ? redirectTo : undefined,
        })
        if (error?.status === 429) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')
        if (error) console.error('resetPasswordForEmail:', error.message)
      }
      // Misma respuesta exista o no el RUT
      return jsonResponse(req, { mensaje: MENSAJE_RECUPERACION })
    }

    throw new HttpError(400, 'Acción inválida')

  } catch (error) {
    return errorResponse(req, error)
  }
})
