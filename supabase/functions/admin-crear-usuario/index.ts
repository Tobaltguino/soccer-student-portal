import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, crearClienteAdmin, errorResponse, HttpError, jsonResponse, requireAdmin } from "../_shared/admin.ts"

// Deben coincidir con frontend/src/app/shared/enums/rol.enum.ts (en singular)
const ROLES_VALIDOS = ['administrador', 'estudiante', 'profesor', 'kinesiologo', 'nutricionista']

serve(async (req) => {
  // Manejo de pre-flight (CORS) para que Angular pueda llamar a la función
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    // 1. Inicializar el cliente de Supabase con permisos de administrador
    const supabaseAdmin = crearClienteAdmin()

    // 2. Solo un administrador activo puede crear usuarios
    await requireAdmin(req, supabaseAdmin)

    // 3. Obtener y validar el payload que envías desde Angular
    const dto = await req.json()

    if (!ROLES_VALIDOS.includes(dto.rol)) throw new HttpError(400, 'Rol inválido')
    if (!dto.email || !dto.rut || !dto.nombre || !dto.apellido) {
      throw new HttpError(400, 'Faltan campos obligatorios')
    }
    if (typeof dto.passwordTemporal !== 'string' || dto.passwordTemporal.length < 6) {
      throw new HttpError(400, 'La contraseña temporal debe tener al menos 6 caracteres')
    }

    // Revisar duplicados antes de crear la cuenta (mensaje claro y sin crear/borrar en Auth)
    const { data: existentes, error: existentesError } = await supabaseAdmin
      .from('usu_perfiles')
      .select('rut, email')
      .or(`rut.eq."${dto.rut}",email.eq."${dto.email}"`)
    if (existentesError) throw new Error(`No se pudo validar el usuario: ${existentesError.message}`)
    if (existentes?.some((p) => p.rut === dto.rut)) {
      throw new HttpError(409, `Ya existe un usuario con el RUT ${dto.rut} (puede estar desactivado)`)
    }
    if (existentes?.some((p) => p.email?.toLowerCase() === String(dto.email).toLowerCase())) {
      throw new HttpError(409, `Ya existe un usuario con el email ${dto.email}`)
    }

    // 4. Crear usuario en Supabase Auth
    // El rol NO va en user_metadata: el usuario puede editar su propio metadata.
    // app_metadata solo lo puede modificar el service role: obliga a cambiar la clave temporal.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.passwordTemporal,
      email_confirm: true,
      app_metadata: { debe_cambiar_password: true },
      user_metadata: {
        rut: dto.rut,
        nombre: dto.nombre,
        apellido: dto.apellido,
        genero: dto.genero,
      },
    })

    if (authError) throw new Error(`Auth Error: ${authError.message}`)
    const usuarioId = authData.user.id

    // 5. Crear el perfil base en usu_perfiles
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

    // 6. Crear la fila específica según el rol
    let rolError = null;
    switch (dto.rol) {
      case 'estudiante': {
        const { error } = await supabaseAdmin.from('usu_estudiantes').insert({
          id_usuario: usuarioId,
          peso: dto.peso ?? null,
          altura: dto.altura ?? null,
          posiciones: dto.posiciones ?? null,
          direccion: dto.direccion ?? null,
          prevision: dto.prevision ?? null,
          grupo_id: dto.grupoId ?? null
        });
        rolError = error;
        break;
      }
      case 'profesor': {
        const { error } = await supabaseAdmin.from('usu_profesores').insert({
          id_usuario: usuarioId,
          tipo_profesor: dto.tipoProfesor ?? null
        });
        rolError = error;
        break;
      }
      case 'kinesiologo': {
        const { error } = await supabaseAdmin.from('usu_kinesiologos').insert({ id_usuario: usuarioId });
        rolError = error;
        break;
      }
      case 'nutricionista': {
        const { error } = await supabaseAdmin.from('usu_nutricionistas').insert({ id_usuario: usuarioId });
        rolError = error;
        break;
      }
      case 'administrador': {
        const { error } = await supabaseAdmin.from('usu_administradores').insert({ id_usuario: usuarioId });
        rolError = error;
        break;
      }
    }

    if (rolError) {
      await supabaseAdmin.from('usu_perfiles').delete().eq('id_usuario', usuarioId)
      await supabaseAdmin.auth.admin.deleteUser(usuarioId) // Rollback
      throw new Error(`Rol Error: ${rolError.message}`)
    }

    // Respuesta exitosa a Angular
    return jsonResponse(req, { id_usuario: usuarioId, mensaje: 'Usuario creado exitosamente' })

  } catch (error) {
    return errorResponse(req, error)
  }
})
