import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, crearClienteAdmin, errorResponse, HttpError, jsonResponse, requireAdmin } from "../_shared/admin.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const supabaseAdmin = crearClienteAdmin()
    await requireAdmin(req, supabaseAdmin)

    const { id_usuario, email } = await req.json()
    if (!id_usuario || typeof id_usuario !== 'string') throw new HttpError(400, 'id_usuario es obligatorio')
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, 'Email inválido')
    }

    const { data: actual, error: actualError } = await supabaseAdmin.auth.admin.getUserById(id_usuario)
    if (actualError || !actual?.user) throw new HttpError(404, 'Usuario no encontrado')

    // Sin cambios: no hacemos nada
    if (actual.user.email?.toLowerCase() === email.toLowerCase()) {
      return jsonResponse(req, { mensaje: 'Sin cambios' })
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id_usuario, {
      email,
      email_confirm: true,
    })
    if (authError) throw new Error(`Auth Error: ${authError.message}`)

    const { error: perfilError } = await supabaseAdmin
      .from('usu_perfiles')
      .update({ email })
      .eq('id_usuario', id_usuario)

    if (perfilError) {
      // Rollback del email en Auth para no dejar ambos desincronizados
      await supabaseAdmin.auth.admin.updateUserById(id_usuario, { email: actual.user.email, email_confirm: true })
      throw new Error(`Perfil Error: ${perfilError.message}`)
    }

    return jsonResponse(req, { mensaje: 'Email actualizado exitosamente' })

  } catch (error) {
    return errorResponse(req, error)
  }
})
