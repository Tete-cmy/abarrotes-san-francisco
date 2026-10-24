import { supabase } from "../lib/supabase";

export type EstadoCaja = "abierta" | "cerrada";
export type TipoMovimientoCaja = "entrada" | "salida";

export interface TurnoCaja {
  id: number;
  fechaApertura: string;
  fechaCierre: string | null;
  fondoInicial: number;
  efectivoContado: number | null;
  efectivoEsperado: number | null;
  diferencia: number | null;
  estado: EstadoCaja;
  usuarioAperturaId: number | null;
  usuarioAperturaNombre: string;
  usuarioCierreId: number | null;
  usuarioCierreNombre: string | null;
  observaciones: string;
}

export interface MovimientoCaja {
  id: number;
  turnoId: number;
  fecha: string;
  tipo: TipoMovimientoCaja;
  concepto: string;
  importe: number;
  usuarioId: number | null;
  atendidoPor: string;
}

export interface ResumenCaja {
  ventasEfectivo: number;
  abonosEfectivo: number;
  entradas: number;
  salidas: number;
  efectivoEsperado: number;
}

interface TurnoFila {
  id: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
  fondo_inicial: number | string;
  efectivo_contado: number | string | null;
  efectivo_esperado: number | string | null;
  diferencia: number | string | null;
  estado: EstadoCaja;
  usuario_apertura_id: number | null;
  usuario_apertura_nombre: string;
  usuario_cierre_id: number | null;
  usuario_cierre_nombre: string | null;
  observaciones: string | null;
}

interface MovimientoFila {
  id: number;
  turno_id: number;
  fecha: string;
  tipo: TipoMovimientoCaja;
  concepto: string;
  importe: number | string;
  usuario_id: number | null;
  atendido_por: string;
}

function convertirTurno(fila: TurnoFila): TurnoCaja {
  return {
    id: Number(fila.id),
    fechaApertura: fila.fecha_apertura,
    fechaCierre: fila.fecha_cierre,
    fondoInicial: Number(fila.fondo_inicial),
    efectivoContado:
      fila.efectivo_contado === null
        ? null
        : Number(fila.efectivo_contado),
    efectivoEsperado:
      fila.efectivo_esperado === null
        ? null
        : Number(fila.efectivo_esperado),
    diferencia:
      fila.diferencia === null
        ? null
        : Number(fila.diferencia),
    estado: fila.estado,
    usuarioAperturaId:
      fila.usuario_apertura_id === null
        ? null
        : Number(fila.usuario_apertura_id),
    usuarioAperturaNombre:
      fila.usuario_apertura_nombre || "Sin registrar",
    usuarioCierreId:
      fila.usuario_cierre_id === null
        ? null
        : Number(fila.usuario_cierre_id),
    usuarioCierreNombre:
      fila.usuario_cierre_nombre,
    observaciones: fila.observaciones ?? "",
  };
}

function convertirMovimiento(
  fila: MovimientoFila
): MovimientoCaja {
  return {
    id: Number(fila.id),
    turnoId: Number(fila.turno_id),
    fecha: fila.fecha,
    tipo: fila.tipo,
    concepto: fila.concepto,
    importe: Number(fila.importe),
    usuarioId:
      fila.usuario_id === null
        ? null
        : Number(fila.usuario_id),
    atendidoPor: fila.atendido_por || "Sin registrar",
  };
}

const camposTurno =
  "id,fecha_apertura,fecha_cierre,fondo_inicial,efectivo_contado,efectivo_esperado,diferencia,estado,usuario_apertura_id,usuario_apertura_nombre,usuario_cierre_id,usuario_cierre_nombre,observaciones";

export async function obtenerCajaAbierta(): Promise<
  TurnoCaja | null
> {
  const { data, error } = await supabase
    .from("turnos_caja")
    .select(camposTurno)
    .eq("estado", "abierta")
    .order("fecha_apertura", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? convertirTurno(data as TurnoFila) : null;
}

export async function listarTurnosCaja(): Promise<TurnoCaja[]> {
  const { data, error } = await supabase
    .from("turnos_caja")
    .select(camposTurno)
    .order("fecha_apertura", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as TurnoFila[]).map(convertirTurno);
}

export async function listarMovimientosCaja(
  turnoId: number
): Promise<MovimientoCaja[]> {
  const { data, error } = await supabase
    .from("movimientos_caja")
    .select(
      "id,turno_id,fecha,tipo,concepto,importe,usuario_id,atendido_por"
    )
    .eq("turno_id", turnoId)
    .order("fecha", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MovimientoFila[]).map(
    convertirMovimiento
  );
}

export async function abrirCaja(params: {
  fondoInicial: number;
  usuarioId: number | null;
  usuarioNombre: string;
  observaciones: string;
}): Promise<TurnoCaja> {
  const { data, error } = await supabase.rpc(
    "abrir_caja",
    {
      p_fondo_inicial: params.fondoInicial,
      p_usuario_id: params.usuarioId,
      p_usuario_nombre: params.usuarioNombre,
      p_observaciones: params.observaciones || null,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const id = Number(data);

  const { data: turno, error: errorTurno } =
    await supabase
      .from("turnos_caja")
      .select(camposTurno)
      .eq("id", id)
      .single();

  if (errorTurno) {
    throw new Error(errorTurno.message);
  }

  return convertirTurno(turno as TurnoFila);
}

export async function registrarMovimientoCaja(params: {
  turnoId: number;
  tipo: TipoMovimientoCaja;
  concepto: string;
  importe: number;
  usuarioId: number | null;
  atendidoPor: string;
}): Promise<MovimientoCaja> {
  const { data, error } = await supabase.rpc(
    "registrar_movimiento_caja",
    {
      p_turno_id: params.turnoId,
      p_tipo: params.tipo,
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

  const { data: movimiento, error: errorMovimiento } =
    await supabase
      .from("movimientos_caja")
      .select(
        "id,turno_id,fecha,tipo,concepto,importe,usuario_id,atendido_por"
      )
      .eq("id", id)
      .single();

  if (errorMovimiento) {
    throw new Error(errorMovimiento.message);
  }

  return convertirMovimiento(
    movimiento as MovimientoFila
  );
}

export async function obtenerResumenCaja(
  turno: TurnoCaja,
  movimientos: MovimientoCaja[]
): Promise<ResumenCaja> {
  const [ventasRespuesta, abonosRespuesta] =
    await Promise.all([
      supabase
        .from("ventas")
        .select("total")
        .gte("fecha", turno.fechaApertura)
        .eq("metodo_pago", "efectivo"),
      supabase
        .from("abonos_credito")
        .select("importe")
        .gte("fecha", turno.fechaApertura)
        .eq("metodo_pago", "efectivo"),
    ]);

  if (ventasRespuesta.error) {
    throw new Error(ventasRespuesta.error.message);
  }

  if (abonosRespuesta.error) {
    throw new Error(abonosRespuesta.error.message);
  }

  const ventasEfectivo = (
    ventasRespuesta.data ?? []
  ).reduce(
    (total, fila) => total + Number(fila.total),
    0
  );

  const abonosEfectivo = (
    abonosRespuesta.data ?? []
  ).reduce(
    (total, fila) => total + Number(fila.importe),
    0
  );

  const entradas = movimientos
    .filter((movimiento) => movimiento.tipo === "entrada")
    .reduce(
      (total, movimiento) => total + movimiento.importe,
      0
    );

  const salidas = movimientos
    .filter((movimiento) => movimiento.tipo === "salida")
    .reduce(
      (total, movimiento) => total + movimiento.importe,
      0
    );

  return {
    ventasEfectivo,
    abonosEfectivo,
    entradas,
    salidas,
    efectivoEsperado:
      turno.fondoInicial +
      ventasEfectivo +
      abonosEfectivo +
      entradas -
      salidas,
  };
}

export async function cerrarCaja(params: {
  turnoId: number;
  efectivoContado: number;
  usuarioId: number | null;
  usuarioNombre: string;
  observaciones: string;
}): Promise<TurnoCaja> {
  const { data, error } = await supabase.rpc(
    "cerrar_caja",
    {
      p_turno_id: params.turnoId,
      p_efectivo_contado: params.efectivoContado,
      p_usuario_id: params.usuarioId,
      p_usuario_nombre: params.usuarioNombre,
      p_observaciones: params.observaciones || null,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const id = Number(data);

  const { data: turno, error: errorTurno } =
    await supabase
      .from("turnos_caja")
      .select(camposTurno)
      .eq("id", id)
      .single();

  if (errorTurno) {
    throw new Error(errorTurno.message);
  }

  return convertirTurno(turno as TurnoFila);
}