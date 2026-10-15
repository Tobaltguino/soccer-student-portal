import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de pre-flight (CORS) para que Angular pueda llamar a la función
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Inicializar el cliente de Supabase con permisos de administrador
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 2. Obtener el payload que envías desde Angular
    const dto = await req.json()

    // 3. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.passwordTemporal,
      email_confirm: true,
      user_metadata: {
        rut: dto.rut,
        nombre: dto.nombre,
        apellido: dto.apellido,
        rol: dto.rol,
        genero: dto.genero,
      },
    })

    if (authError) throw new Error(`Auth Error: ${authError.message}`)
    const usuarioId = authData.user.id

    // 4. Crear el perfil base en usu_perfiles
    const { error: perfilError } = await supabaseAdmin.from('usu_perfiles').insert({
      id_usuario: usuarioId,
      rut: dto.rut,
      nombre: dto.nombre,
      apellido: dto.apellido,
      email: dto.email,
      rol: dto.rol,
      genero: dto.genero,
      telefono: dto.telefono ?? null,
      fecha_nacimiento: dto.fechaNacimiento ?? null,
      activo: true
    })

    if (perfilError) {
      await supabaseAdmin.auth.admin.deleteUser(usuarioId) // Rollback si falla
      throw new Error(`Perfil Error: ${perfilError.message}`)
    }

    // 5. Crear la fila específica según el rol
    let rolError = null;
    switch (dto.rol) {
      case 'estudiantes':
        const { error: eError } = await supabaseAdmin.from('usu_estudiantes').insert({
          id_usuario: usuarioId,
          peso: dto.peso ?? null,
          altura: dto.altura ?? null,
          posiciones: dto.posiciones ?? null,
          direccion: dto.direccion ?? null,
          prevision: dto.prevision ?? null,
          grupo_id: dto.grupoId ?? null
        });
        rolError = eError;
        break;
      case 'profesores':
        const { error: pError } = await supabaseAdmin.from('usu_profesores').insert({
          id_usuario: usuarioId,
          tipo_profesor: dto.tipoProfesor ?? null
        });
        rolError = pError;
        break;
      case 'kinesiologos':
        const { error: kError } = await supabaseAdmin.from('usu_kinesiologos').insert({ id_usuario: usuarioId });
        rolError = kError;
        break;
      case 'nutricionistas':
        const { error: nError } = await supabaseAdmin.from('usu_nutricionistas').insert({ id_usuario: usuarioId });
        rolError = nError;
        break;
      case 'administradores':
        const { error: aError } = await supabaseAdmin.from('usu_administradores').insert({ id_usuario: usuarioId });
        rolError = aError;
        break;
    }

    if (rolError) {
      await supabaseAdmin.auth.admin.deleteUser(usuarioId) // Rollback
      throw new Error(`Rol Error: ${rolError.message}`)
    }

    // Respuesta exitosa a Angular
    return new Response(JSON.stringify({ id_usuario: usuarioId, mensaje: 'Usuario creado exitosamente' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})