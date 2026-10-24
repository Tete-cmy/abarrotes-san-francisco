import { supabase } from "../lib/supabase";

export type EstadoCredito =
  | "pendiente"
  | "parcial"
  | "liquidado";

export type MetodoAbono =
  | "efectivo"
  | "tarjeta"
  | "transferencia";

export interface Credito {
  id: number;
  clienteId: number;
  clienteNombre: string;
  fecha: string;
  concepto: string;
  importe: number;
  saldoRestante: number;
  estado: EstadoCredito;
  usuarioId: number | null;
  atendidoPor: string;
}

export interface AbonoCredito {
  id: number;
  creditoId: number;
  clienteId: number;
  fecha: string;
  importe: number;
  saldoAnterior: number;
  saldoNuevo: number;
  metodoPago: MetodoAbono;
  usuarioId: number | null;
  atendidoPor: string;
}

interface CreditoFila {
  id: number;
  cliente_id: number;
  fecha: string;
  concepto: string;
  importe: number | string;
  saldo_restante: number | string;
  estado: EstadoCredito;
  usuario_id: number | null;
  atendido_por: string;
  clientes:
    | { nombre_completo: string }
    | { nombre_completo: string }[]
    | null;
}

interface AbonoFila {
  id: number;
  credito_id: number;
  cliente_id: number;
  fecha: string;
  importe: number | string;
  saldo_anterior: number | string;
  saldo_nuevo: number | string;
  metodo_pago: MetodoAbono;
  usuario_id: number | null;
  atendido_por: string;
}

function obtenerNombreCliente(
  relacion: CreditoFila["clientes"]
): string {
  if (Array.isArray(relacion)) {
    return relacion[0]?.nombre_completo ?? "Sin registrar";
  }

  return relacion?.nombre_completo ?? "Sin registrar";
}

function convertirCredito(fila: CreditoFila): Credito {
  return {
    id: Number(fila.id),
    clienteId: Number(fila.cliente_id),
    clienteNombre: obtenerNombreCliente(fila.clientes),
    fecha: fila.fecha,
    concepto: fila.concepto,
    importe: Number(fila.importe),
    saldoRestante: Number(fila.saldo_restante),
    estado: fila.estado,
    usuarioId:
      fila.usuario_id === null ? null : Number(fila.usuario_id),
    atendidoPor: fila.atendido_por || "Sin registrar",
  };
}

function convertirAbono(fila: AbonoFila): AbonoCredito {
  return {
    id: Number(fila.id),
    creditoId: Number(fila.credito_id),
    clienteId: Number(fila.cliente_id),
    fecha: fila.fecha,
    importe: Number(fila.importe),
    saldoAnterior: Number(fila.saldo_anterior),
    saldoNuevo: Number(fila.saldo_nuevo),
    metodoPago: fila.metodo_pago,
    usuarioId:
      fila.usuario_id === null ? null : Number(fila.usuario_id),
    atendidoPor: fila.atendido_por || "Sin registrar",
  };
}

const camposCredito =
  "id,cliente_id,fecha,concepto,importe,saldo_restante,estado,usuario_id,atendido_por,clientes(nombre_completo)";

export async function listarCreditos(): Promise<Credito[]> {
  const { data, error } = await supabase
    .from("creditos")
    .select(camposCredito)
    .order("fecha", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as CreditoFila[]).map(convertirCredito);
}

export async function listarAbonosCredito(
  creditoId: number
): Promise<AbonoCredito[]> {
  const { data, error } = await supabase
    .from("abonos_credito")
    .select(
      "id,credito_id,cliente_id,fecha,importe,saldo_anterior,saldo_nuevo,metodo_pago,usuario_id,atendido_por"
    )
    .eq("credito_id", creditoId)
    .order("fecha", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AbonoFila[]).map(convertirAbono);
}

export async function registrarCredito(params: {
  clienteId: number;
  concepto: string;
  importe: number;
  usuarioId: number | null;
  atendidoPor: string;
}): Promise<Credito> {
  const { data, error } = await supabase.rpc(
    "registrar_credito",
    {
      p_cliente_id: params.clienteId,
      p_concepto: params.concepto,
      p_importe: params.importe,
      p_usuario_id: params.usuarioId,
      p_atendido_por: params.atendidoPor,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const id = Number(data);

  const { data: credito, error: errorCredito } =
    await supabase
      .from("creditos")
      .select(camposCredito)
      .eq("id", id)
      .single();

  if (errorCredito) {
    throw new Error(errorCredito.message);
  }

  return convertirCredito(credito as CreditoFila);
}

export async function registrarAbono(params: {
  creditoId: number;
  importe: number;
  metodoPago: MetodoAbono;
  usuarioId: number | null;
  atendidoPor: string;
}): Promise<AbonoCredito> {
  const { data, error } = await supabase.rpc(
    "registrar_abono_credito",
    {
      p_credito_id: params.creditoId,
      p_importe: params.importe,
      p_metodo_pago: params.metodoPago,
      p_usuario_id: params.usuarioId,
      p_atendido_por: params.atendidoPor,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const id = Number(data);

  const { data: abono, error: errorAbono } =
    await supabase
      .from("abonos_credito")
      .select(
        "id,credito_id,cliente_id,fecha,importe,saldo_anterior,saldo_nuevo,metodo_pago,usuario_id,atendido_por"
      )
      .eq("id", id)
      .single();

  if (errorAbono) {
    throw new Error(errorAbono.message);
  }

  return convertirAbono(abono as AbonoFila);
}