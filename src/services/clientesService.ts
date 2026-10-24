import { supabase } from "../lib/supabase";

export interface Cliente {
  id: number;
  nombreCompleto: string;
  telefono: string;
  correo: string;
  domicilio: string;
  colonia: string;
  municipioEstado: string;
  codigoPostal: string;
  notas: string;
  limiteCredito: number;
  saldoPendiente: number;
  activo: boolean;
  fechaCreacion: string;
}

interface ClienteFila {
  id: number;
  nombre_completo: string;
  telefono: string | null;
  correo: string | null;
  domicilio: string | null;
  colonia: string | null;
  municipio_estado: string | null;
  codigo_postal: string | null;
  notas: string | null;
  limite_credito: number | string | null;
  saldo_pendiente: number | string | null;
  activo: boolean;
  fecha_creacion: string;
}

function convertirFila(fila: ClienteFila): Cliente {
  return {
    id: Number(fila.id),
    nombreCompleto: fila.nombre_completo,
    telefono: fila.telefono ?? "",
    correo: fila.correo ?? "",
    domicilio: fila.domicilio ?? "",
    colonia: fila.colonia ?? "",
    municipioEstado: fila.municipio_estado ?? "",
    codigoPostal: fila.codigo_postal ?? "",
    notas: fila.notas ?? "",
    limiteCredito: Number(fila.limite_credito ?? 0),
    saldoPendiente: Number(fila.saldo_pendiente ?? 0),
    activo: Boolean(fila.activo),
    fechaCreacion: fila.fecha_creacion,
  };
}

function convertirCliente(
  cliente: Omit<Cliente, "id" | "saldoPendiente" | "fechaCreacion">
) {
  return {
    nombre_completo: cliente.nombreCompleto.trim(),
    telefono: cliente.telefono.trim() || null,
    correo: cliente.correo.trim() || null,
    domicilio: cliente.domicilio.trim() || null,
    colonia: cliente.colonia.trim() || null,
    municipio_estado: cliente.municipioEstado.trim() || null,
    codigo_postal: cliente.codigoPostal.trim() || null,
    notas: cliente.notas.trim() || null,
    limite_credito: cliente.limiteCredito,
    activo: cliente.activo,
  };
}

const camposCliente =
  "id,nombre_completo,telefono,correo,domicilio,colonia,municipio_estado,codigo_postal,notas,limite_credito,saldo_pendiente,activo,fecha_creacion";

export async function listarClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from("clientes")
    .select(camposCliente)
    .order("nombre_completo", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ClienteFila[]).map(convertirFila);
}

export async function crearCliente(
  cliente: Omit<Cliente, "id" | "saldoPendiente" | "fechaCreacion">
): Promise<Cliente> {
  const { data, error } = await supabase
    .from("clientes")
    .insert(convertirCliente(cliente))
    .select(camposCliente)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return convertirFila(data as ClienteFila);
}

export async function actualizarCliente(
  id: number,
  cliente: Omit<Cliente, "id" | "saldoPendiente" | "fechaCreacion">
): Promise<Cliente> {
  const { data, error } = await supabase
    .from("clientes")
    .update(convertirCliente(cliente))
    .eq("id", id)
    .select(camposCliente)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return convertirFila(data as ClienteFila);
}

export async function cambiarEstadoCliente(
  id: number,
  activo: boolean
): Promise<Cliente> {
  const { data, error } = await supabase
    .from("clientes")
    .update({ activo })
    .eq("id", id)
    .select(camposCliente)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return convertirFila(data as ClienteFila);
}

export async function eliminarClientePorId(
  id: number
): Promise<void> {
  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}