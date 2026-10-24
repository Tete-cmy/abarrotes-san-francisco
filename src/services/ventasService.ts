import { supabase } from "../lib/supabase";

export interface ProductoVenta {
  id: number;
  nombre: string;
  precioVenta: number;
  cantidad: number;
  subtotal: number;
  cantidadDevuelta?: number;
}

export type EstadoVenta = "completada" | "cancelada";

export interface VentaGuardada {
  id: number;
  fecha: string;
  total: number;
  efectivoRecibido: number;
  cambio: number;
  metodoPago: "efectivo";
  usuarioId: number | null;
  atendidoPor: string;
  rolUsuario:
    | "Administrador"
    | "Cajero"
    | "Sin registrar";
  estado: EstadoVenta;
  motivoCancelacion: string | null;
  fechaCancelacion: string | null;
  canceladaPorId: number | null;
  canceladaPor: string | null;
  productos: ProductoVenta[];
}

interface VentaFila {
  id: number;
  fecha: string;
  total: number | string;
  efectivo_recibido: number | string;
  cambio: number | string;
  metodo_pago: string;
  usuario_id: number | null;
  atendido_por: string;
  rol_usuario: string;
  estado?: string | null;
  motivo_cancelacion?: string | null;
  fecha_cancelacion?: string | null;
  cancelada_por_id?: number | null;
  cancelada_por?: string | null;
}

interface DetalleFila {
  id: number;
  venta_id: number;
  producto_id: number;
  nombre_producto: string;
  precio_venta: number | string;
  cantidad: number;
  subtotal: number | string;
}

interface DetalleDevolucionFila {
  venta_id: number;
  producto_id: number;
  cantidad: number;
}

const CAMPOS_VENTA =
  "id,fecha,total,efectivo_recibido,cambio,metodo_pago,usuario_id,atendido_por,rol_usuario,estado,motivo_cancelacion,fecha_cancelacion,cancelada_por_id,cancelada_por";

function normalizarRol(
  rol: string
): VentaGuardada["rolUsuario"] {
  if (rol === "Administrador" || rol === "Cajero") {
    return rol;
  }

  return "Sin registrar";
}

function normalizarEstado(
  estado: string | null | undefined
): EstadoVenta {
  return estado === "cancelada"
    ? "cancelada"
    : "completada";
}

function convertirVenta(
  venta: VentaFila,
  detalles: DetalleFila[],
  devoluciones: DetalleDevolucionFila[] = []
): VentaGuardada {
  return {
    id: Number(venta.id),
    fecha: venta.fecha,
    total: Number(venta.total),
    efectivoRecibido: Number(
      venta.efectivo_recibido
    ),
    cambio: Number(venta.cambio),
    metodoPago: "efectivo",
    usuarioId:
      venta.usuario_id === null
        ? null
        : Number(venta.usuario_id),
    atendidoPor:
      venta.atendido_por || "Sin registrar",
    rolUsuario: normalizarRol(
      venta.rol_usuario
    ),
    estado: normalizarEstado(venta.estado),
    motivoCancelacion:
      venta.motivo_cancelacion ?? null,
    fechaCancelacion:
      venta.fecha_cancelacion ?? null,
    canceladaPorId:
      venta.cancelada_por_id === null ||
      venta.cancelada_por_id === undefined
        ? null
        : Number(venta.cancelada_por_id),
    canceladaPor:
      venta.cancelada_por ?? null,
    productos: detalles.map((detalle) => ({
      id: Number(detalle.producto_id),
      nombre: detalle.nombre_producto,
      precioVenta: Number(detalle.precio_venta),
      cantidad: Number(detalle.cantidad),
      subtotal: Number(detalle.subtotal),
      cantidadDevuelta: devoluciones
        .filter(
          (devolucion) =>
            Number(devolucion.venta_id) ===
              Number(detalle.venta_id) &&
            Number(devolucion.producto_id) ===
              Number(detalle.producto_id)
        )
        .reduce(
          (total, devolucion) =>
            total + Number(devolucion.cantidad),
          0
        ),
    })),
  };
}

async function obtenerVentaPorId(
  id: number
): Promise<VentaGuardada> {
  const { data: venta, error: errorVenta } =
    await supabase
      .from("ventas")
      .select(CAMPOS_VENTA)
      .eq("id", id)
      .single();

  if (errorVenta) {
    throw new Error(errorVenta.message);
  }

  const { data: detalles, error: errorDetalles } =
    await supabase
      .from("detalle_ventas")
      .select(
        "id,venta_id,producto_id,nombre_producto,precio_venta,cantidad,subtotal"
      )
      .eq("venta_id", id)
      .order("id", { ascending: true });

  if (errorDetalles) {
    throw new Error(errorDetalles.message);
  }

  const {
    data: devoluciones,
    error: errorDevoluciones,
  } = await supabase.rpc(
    "listar_cantidades_devueltas",
    {
      p_venta_ids: [id],
    }
  );

  if (errorDevoluciones) {
    throw new Error(errorDevoluciones.message);
  }

  return convertirVenta(
    venta as VentaFila,
    (detalles ?? []) as DetalleFila[],
    (devoluciones ?? []) as DetalleDevolucionFila[]
  );
}

export async function obtenerVentas(): Promise<
  VentaGuardada[]
> {
  const { data: ventas, error: errorVentas } =
    await supabase
      .from("ventas")
      .select(CAMPOS_VENTA)
      .order("fecha", { ascending: false });

  if (errorVentas) {
    throw new Error(errorVentas.message);
  }

  const ventasFilas =
    (ventas ?? []) as VentaFila[];

  if (ventasFilas.length === 0) {
    return [];
  }

  const ids = ventasFilas.map((venta) =>
    Number(venta.id)
  );

  const { data: detalles, error: errorDetalles } =
    await supabase
      .from("detalle_ventas")
      .select(
        "id,venta_id,producto_id,nombre_producto,precio_venta,cantidad,subtotal"
      )
      .in("venta_id", ids)
      .order("id", { ascending: true });

  if (errorDetalles) {
    throw new Error(errorDetalles.message);
  }

  const detallesFilas =
    (detalles ?? []) as DetalleFila[];

  const {
    data: devoluciones,
    error: errorDevoluciones,
  } = await supabase.rpc(
    "listar_cantidades_devueltas",
    {
      p_venta_ids: ids,
    }
  );

  if (errorDevoluciones) {
    throw new Error(errorDevoluciones.message);
  }

  const devolucionesFilas =
    (devoluciones ?? []) as DetalleDevolucionFila[];

  return ventasFilas.map((venta) =>
    convertirVenta(
      venta,
      detallesFilas.filter(
        (detalle) =>
          Number(detalle.venta_id) ===
          Number(venta.id)
      ),
      devolucionesFilas.filter(
        (devolucion) =>
          Number(devolucion.venta_id) ===
          Number(venta.id)
      )
    )
  );
}

export async function registrarVenta(params: {
  total: number;
  efectivoRecibido: number;
  cambio: number;
  usuarioId: number | null;
  atendidoPor: string;
  rolUsuario: "Administrador" | "Cajero";
  productos: ProductoVenta[];
}): Promise<VentaGuardada> {
  const { data: ventaId, error } =
    await supabase.rpc("registrar_venta", {
      p_total: params.total,
      p_efectivo_recibido:
        params.efectivoRecibido,
      p_cambio: params.cambio,
      p_usuario_id: params.usuarioId,
      p_atendido_por: params.atendidoPor,
      p_rol_usuario: params.rolUsuario,
      p_productos: params.productos.map(
        (producto) => ({
          productoId: producto.id,
          precioVenta: producto.precioVenta,
          cantidad: producto.cantidad,
          subtotal: producto.subtotal,
        })
      ),
    });

  if (error) {
    throw new Error(error.message);
  }

  return obtenerVentaPorId(Number(ventaId));
}

export async function cancelarVentaConfirmada(
  params: {
    ventaId: number;
    motivo: string;
    pin: string;
    solicitadoPorId: number | null;
    solicitadoPor: string;
  }
): Promise<VentaGuardada> {
  const { error } = await supabase.rpc(
    "cancelar_venta_confirmada",
    {
      p_venta_id: params.ventaId,
      p_motivo: params.motivo,
      p_pin: params.pin,
      p_solicitado_por_id:
        params.solicitadoPorId,
      p_solicitado_por:
        params.solicitadoPor,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return obtenerVentaPorId(params.ventaId);
}


export interface DevolucionRegistrada {
  id: number;
  total: number;
}

export async function registrarDevolucionParcial(
  params: {
    ventaId: number;
    motivo: string;
    pin: string;
    solicitadoPorId: number | null;
    solicitadoPor: string;
    productos: Array<{
      productoId: number;
      cantidad: number;
    }>;
  }
): Promise<DevolucionRegistrada> {
  const { data, error } = await supabase.rpc(
    "registrar_devolucion_parcial",
    {
      p_venta_id: params.ventaId,
      p_motivo: params.motivo,
      p_pin: params.pin,
      p_solicitado_por_id:
        params.solicitadoPorId,
      p_solicitado_por:
        params.solicitadoPor,
      p_productos: params.productos.map(
        (producto) => ({
          productoId: producto.productoId,
          cantidad: producto.cantidad,
        })
      ),
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const resultado = data as {
    id?: number;
    total?: number | string;
  } | null;

  if (!resultado?.id) {
    throw new Error(
      "La devolución se registró, pero no se recibió su folio."
    );
  }

  return {
    id: Number(resultado.id),
    total: Number(resultado.total ?? 0),
  };
}