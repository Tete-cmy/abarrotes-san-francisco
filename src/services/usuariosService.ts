import { supabase } from "../lib/supabase";

export type RolUsuario =
  | "Administrador"
  | "Cajero";

export interface Usuario {
  id: number;
  nombreCompleto: string;
  usuario: string;
  rol: RolUsuario;
  activo: boolean;
  fechaCreacion: string;
  tienePin: boolean;
}

export interface UsuarioSesion {
  id: number;
  nombreCompleto: string;
  usuario: string;
  rol: RolUsuario;
}

interface UsuarioFila {
  id: number;
  nombre_completo: string;
  usuario: string;
  rol: RolUsuario;
  activo: boolean;
  fecha_creacion?: string;
  created_at?: string;
  tiene_pin?: boolean;
}

function convertirUsuario(
  fila: UsuarioFila
): Usuario {
  return {
    id: Number(fila.id),
    nombreCompleto: fila.nombre_completo,
    usuario: fila.usuario,
    rol: fila.rol,
    activo: Boolean(fila.activo),
    fechaCreacion:
      fila.fecha_creacion ??
      fila.created_at ??
      new Date().toISOString(),
    tienePin: Boolean(fila.tiene_pin),
  };
}

function obtenerMensaje(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase.rpc(
    "listar_usuarios"
  );

  if (error) {
    throw new Error(error.message);
  }

  const usuarios =
    ((data ?? []) as UsuarioFila[]).map(
      convertirUsuario
    );

  const {
    data: estadosPin,
    error: errorPin,
  } = await supabase.rpc(
    "listar_estado_pin_usuarios"
  );

  if (errorPin) {
    throw new Error(errorPin.message);
  }

  const mapaPin = new Map<number, boolean>(
    (
      (estadosPin ?? []) as Array<{
        usuario_id: number;
        tiene_pin: boolean;
      }>
    ).map((fila) => [
      Number(fila.usuario_id),
      Boolean(fila.tiene_pin),
    ])
  );

  return usuarios.map((usuario) => ({
    ...usuario,
    tienePin:
      mapaPin.get(usuario.id) ?? false,
  }));
}

export async function validarLogin(
  usuario: string,
  contrasena: string
): Promise<UsuarioSesion> {
  const { data, error } = await supabase.rpc(
    "validar_login",
    {
      p_usuario: usuario,
      p_contrasena: contrasena,
    }
  );

  if (error) throw new Error(error.message);

  const filas = (data ?? []) as UsuarioFila[];
  const encontrado = filas[0];

  if (!encontrado) {
    throw new Error(
      "El usuario o la contraseña son incorrectos."
    );
  }

  if (!encontrado.activo) {
    throw new Error(
      "Esta cuenta está inactiva. Contacta al administrador."
    );
  }

  return {
    id: Number(encontrado.id),
    nombreCompleto: encontrado.nombre_completo,
    usuario: encontrado.usuario,
    rol: encontrado.rol,
  };
}

export async function crearUsuario(
  datos: {
    nombreCompleto: string;
    usuario: string;
    contrasena: string;
    rol: RolUsuario;
    activo: boolean;
  }
): Promise<Usuario> {
  const { data, error } = await supabase.rpc(
    "crear_usuario",
    {
      p_nombre_completo: datos.nombreCompleto,
      p_usuario: datos.usuario,
      p_contrasena: datos.contrasena,
      p_rol: datos.rol,
      p_activo: datos.activo,
    }
  );

  if (error) throw new Error(error.message);

  const id = Number(data);
  const usuarios = await listarUsuarios();
  const creado = usuarios.find(
    (usuario) => usuario.id === id
  );

  if (!creado) {
    throw new Error(
      "El usuario se creó, pero no pudo cargarse."
    );
  }

  return creado;
}

export async function actualizarUsuario(
  id: number,
  datos: {
    nombreCompleto: string;
    usuario: string;
    contrasena: string;
    rol: RolUsuario;
    activo: boolean;
  }
): Promise<Usuario> {
  const { error } = await supabase.rpc(
    "actualizar_usuario",
    {
      p_id: id,
      p_nombre_completo: datos.nombreCompleto,
      p_usuario: datos.usuario,
      p_contrasena:
        datos.contrasena.trim() === ""
          ? null
          : datos.contrasena,
      p_rol: datos.rol,
      p_activo: datos.activo,
    }
  );

  if (error) throw new Error(error.message);

  const usuarios = await listarUsuarios();
  const actualizado = usuarios.find(
    (usuario) => usuario.id === id
  );

  if (!actualizado) {
    throw new Error(
      "No fue posible cargar el usuario actualizado."
    );
  }

  return actualizado;
}

export async function cambiarEstadoUsuario(
  id: number,
  activo: boolean
): Promise<Usuario> {
  const { error } = await supabase.rpc(
    "cambiar_estado_usuario",
    {
      p_id: id,
      p_activo: activo,
    }
  );

  if (error) throw new Error(error.message);

  const usuarios = await listarUsuarios();
  const actualizado = usuarios.find(
    (usuario) => usuario.id === id
  );

  if (!actualizado) {
    throw new Error(
      "No fue posible cargar el usuario actualizado."
    );
  }

  return actualizado;
}

export async function eliminarUsuario(
  id: number
): Promise<void> {
  const { error } = await supabase.rpc(
    "eliminar_usuario",
    { p_id: id }
  );

  if (error) throw new Error(error.message);
}

export async function configurarPinAdministrador(
  usuarioId: number,
  pin: string
): Promise<void> {
  const { error } = await supabase.rpc(
    "configurar_pin_administrador",
    {
      p_usuario_id: usuarioId,
      p_pin: pin,
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function validarPinAdministrador(
  pin: string
): Promise<{
  id: number;
  nombreCompleto: string;
  usuario: string;
}> {
  const { data, error } = await supabase.rpc(
    "validar_pin_administrador",
    {
      p_pin: pin,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const filas = (data ?? []) as Array<{
    id: number;
    nombre_completo: string;
    usuario: string;
  }>;

  const administrador = filas[0];

  if (!administrador) {
    throw new Error(
      "El PIN es incorrecto o no pertenece a un administrador activo."
    );
  }

  return {
    id: Number(administrador.id),
    nombreCompleto: administrador.nombre_completo,
    usuario: administrador.usuario,
  };
}

export function mensajeErrorUsuarios(
  error: unknown
): string {
  return obtenerMensaje(error);
}