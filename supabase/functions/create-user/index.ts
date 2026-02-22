import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de CORS para llamadas desde Angular
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { email, password, datosPersonales, tabla, role } = await req.json()

    // 1. Crear el usuario en el sistema de autenticación
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // Se deja en false para permitir la verificación posterior
      user_metadata: {
        role: role,
        nombre: datosPersonales.nombre,
        apellido: datosPersonales.apellido,
        rut: datosPersonales.rut,
        tipo_profesor: datosPersonales.tipo_profesor
      }
    })

    if (authError) throw authError

    const userId = authData.user.id

    // 2. FORZAR EL ENVÍO DEL CORREO (Método de Invitación)
    // Esto disparará el correo usando la plantilla "Invite User" de tu panel
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)
    
    if (inviteError) {
      console.error("Error al enviar invitación:", inviteError.message)
      // No lanzamos error aquí para que al menos el usuario quede creado en la DB
    }

    // Limpieza de datos específicos de estudiantes para otras tablas
    if (tabla !== 'estudiantes') {
      delete datosPersonales.fecha_nacimiento;
      delete datosPersonales.grupo_id;
    }

    const datosParaGuardar = {
      id: userId,
      ...datosPersonales
    }

    // 3. Guardar información adicional en la tabla correspondiente (estudiantes, profesores, etc.)
    const { data: dbData, error: dbError } = await supabase
      .from(tabla)
      .upsert(datosParaGuardar)
      .select()
      .maybeSingle()

    if (dbError) throw dbError

    return new Response(
      JSON.stringify({ data: { user: authData.user, perfil: dbData }, error: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ data: null, error: { message: error.message } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})