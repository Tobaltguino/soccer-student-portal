import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, crearClienteAdmin, errorResponse, HttpError, jsonResponse, requireUser } from "../_shared/admin.ts"

const LARGO_MINIMO = 8

// Cambia la contraseña del usuario autenticado y quita la marca debe_cambiar_password.
// Sirve tanto para el primer login (clave = RUT) como para el enlace de recuperación.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const supabaseAdmin = crearClienteAdmin()
    const user = await requireUser(req, supabaseAdmin)

    const { password } = await req.json()
    if (typeof password !== 'string' || password.length < LARGO_MINIMO) {
      throw new HttpError(400, `La contraseña debe tener al menos ${LARGO_MINIMO} caracteres`)
    }

    // No permitir volver a usar el RUT como contraseña
    const { data: perfil } = await supabaseAdmin
      .from('usu_perfiles')
      .select('rut')
      .eq('id_usuario', user.id)
      .single()

    const normalizar = (valor: string) => valor.replace(/[.\-\s]/g, '').toUpperCase()
    if (perfil?.rut && normalizar(perfil.rut) === normalizar(password)) {
      throw new HttpError(400, 'La contraseña no puede ser tu RUT')
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
      app_metadata: { ...user.app_metadata, debe_cambiar_password: false },
    })
    if (error) throw new Error(`No se pudo actualizar la contraseña: ${error.message}`)

    return jsonResponse(req, { mensaje: 'Contraseña actualizada' })

  } catch (error) {
    return errorResponse(req, error)
  }
})
