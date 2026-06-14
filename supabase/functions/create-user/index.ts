import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { email, password, datosPersonales, tabla, role } = await req.json()

    // 1. CREAR EL USUARIO EN AUTH (Sin confirmarlo automáticamente)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // false = DEBE validar su correo
      user_metadata: {
        role: role || 'USER',
        nombre: datosPersonales.nombre,
        apellido: datosPersonales.apellido,
        rut: datosPersonales.rut,
        tipo_profesor: datosPersonales.tipo_profesor
      }
    })

    if (authError) {
      throw new Error(`Error Auth: ${authError.message}`)
    }

    const userId = authData.user.id

    // Limpieza de datos
    if (tabla !== 'estudiantes') {
      delete datosPersonales.fecha_nacimiento;
      delete datosPersonales.grupo_id;
      delete datosPersonales.direccion;
      delete datosPersonales.prevision;
      delete datosPersonales.peso;
      delete datosPersonales.altura;
    }

    const datosParaGuardar = {
      id: userId,
      ...datosPersonales
    }

    // 2. GUARDAR EN LA TABLA CORRESPONDIENTE
    const { data: dbData, error: dbError } = await supabase
      .from(tabla)
      .upsert(datosParaGuardar)
      .select()
      .maybeSingle()

    // 🚀 EL ROLLBACK
    if (dbError) {
      console.error("Error al guardar en tabla, iniciando rollback...", dbError);
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Error en BD: ${dbError.message}. Se canceló la creación del usuario.`);
    }

    // 💌 3. ENVIAR EL CORREO DE CONFIRMACIÓN (Solo si todo lo anterior funcionó)
    const { error: emailError } = await supabase.auth.resend({
      type: 'signup',
      email: email
    })

    if (emailError) {
      console.warn("El usuario se creó, pero falló el envío del correo:", emailError.message);
      // No hacemos un throw error aquí porque el usuario ya existe y está guardado, 
      // pero dejamos el log por si necesitas reenviarlo manualmente.
    }

    // Todo salió perfecto
    return new Response(
      JSON.stringify({ data: { user: authData.user, perfil: dbData }, error: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Function Error:", error.message);
    return new Response(
      JSON.stringify({ data: null, error: { message: error.message } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})