import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, crearClienteAdmin, errorResponse, HttpError, jsonResponse, requireAdmin } from "../_shared/admin.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const supabaseAdmin = crearClienteAdmin()
    const adminId = await requireAdmin(req, supabaseAdmin)

    const { id_usuario } = await req.json()
    if (!id_usuario || typeof id_usuario !== 'string') throw new HttpError(400, 'id_usuario es obligatorio')
    if (id_usuario === adminId) throw new HttpError(400, 'No puedes eliminar tu propia cuenta')

    // usu_perfiles NO tiene FK a auth.users, así que borrar en Auth no limpia el perfil.
    // Primero el perfil (cascada a usu_* y sus registros; falla si hay FK RESTRICT,
    // ej. un kinesiólogo con sesiones o fichas), y solo si funcionó, la cuenta de Auth.
    const { error: perfilError } = await supabaseAdmin
      .from('usu_perfiles')
      .delete()
      .eq('id_usuario', id_usuario)
    if (perfilError) {
      throw new HttpError(409, `No se pudo eliminar el perfil (puede tener registros asociados): ${perfilError.message}`)
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id_usuario)
    if (error) throw new Error(`Perfil eliminado, pero no se pudo eliminar la cuenta de acceso: ${error.message}`)

    return jsonResponse(req, { mensaje: 'Usuario eliminado exitosamente' })

  } catch (error) {
    return errorResponse(req, error)
  }
})
