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

    // 1. CREAR EL USUARIO EN AUTH
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // Lo marcamos true para que no requiera validación por correo
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

    // Limpieza de datos (Evitar inyectar campos que no existen en otras tablas)
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

    // 🚀 EL ROLLBACK: Si la tabla falla, borramos al usuario de Auth
    if (dbError) {
      console.error("Error al guardar en tabla, iniciando rollback...", dbError);
      
      // Borramos al usuario fantasma
      await supabase.auth.admin.deleteUser(userId);
      
      throw new Error(`Error en BD: ${dbError.message}. Se canceló la creación del usuario.`);
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