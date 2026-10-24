import { supabase } from "../lib/supabase";

export interface EventoBitacora {
  id: number;
  fecha: string;
  usuarioId: number | null;
  nombreUsuario: string;
  usuario: string;
  rol: string;
  modulo: string;
  accion: string;
  detalle: string;
  entidadTipo: string | null;
  entidadId: number | null;
  dispositivo: string;
}

interface EventoBitacoraFila {
  id: number;
  fecha: string;
  usuario_id: number | null;
  nombre_usuario: string;
  usuario: string;
  rol: string;
  modulo: string;
  accion: string;
  detalle: string;
  entidad_tipo: string | null;
  entidad_id: number | null;
  dispositivo: string;
}

function convertirEvento(
  fila: EventoBitacoraFila
): EventoBitacora {
  return {
    id: Number(fila.id),
    fecha: fila.fecha,
    usuarioId:
      fila.usuario_id === null
        ? null
        : Number(fila.usuario_id),
    nombreUsuario:
      fila.nombre_usuario || "Sin registrar",
    usuario: fila.usuario || "Sin registrar",
    rol: fila.rol || "Sin registrar",
    modulo: fila.modulo,
    accion: fila.accion,
    detalle: fila.detalle,
    entidadTipo: fila.entidad_tipo,
    entidadId:
      fila.entidad_id === null
        ? null
        : Number(fila.entidad_id),
    dispositivo:
      fila.dispositivo || "Sin registrar",
  };
}

export async function registrarEventoBitacora(
  datos: {
    usuarioId: number | null;
    nombreUsuario: string;
    usuario: string;
    rol: string;
    modulo: string;
    accion: string;
    detalle: string;
    entidadTipo?: string | null;
    entidadId?: number | null;
  }
): Promise<void> {
  const { error } = await supabase.rpc(
    "registrar_evento_bitacora",
    {
      p_usuario_id: datos.usuarioId,
      p_nombre_usuario: datos.nombreUsuario,
      p_usuario: datos.usuario,
      p_rol: datos.rol,
      p_modulo: datos.modulo,
      p_accion: datos.accion,
      p_detalle: datos.detalle,
      p_entidad_tipo:
        datos.entidadTipo ?? null,
      p_entidad_id:
        datos.entidadId ?? null,
      p_dispositivo:
        navigator.userAgent,
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function listarBitacora(): Promise<
  EventoBitacora[]
> {
  const { data, error } = await supabase.rpc(
    "listar_bitacora"
  );

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as EventoBitacoraFila[]).map(
    convertirEvento
  );
}