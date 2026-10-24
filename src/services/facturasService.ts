import { supabase } from "../lib/supabase";
import {
  obtenerVentas,
  type VentaGuardada,
} from "./ventasService";

export type EstadoFactura = "emitida" | "cancelada";

export interface DetalleFactura {
  id: number;
  facturaId: number;
  productoId: number | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

export interface Factura {
  id: number;
  serie: string;
  folio: number;
  ventaId: number;
  clienteId: number | null;
  clienteNombre: string;
  clienteRfc: string;
  clienteCorreo: string;
  fecha: string;
  subtotal: number;
  impuestos: number;
  total: number;
  estado: EstadoFactura;
  motivoCancelacion: string;
  usuarioId: number | null;
  emitidaPor: string;
  fechaCancelacion: string | null;
  canceladaPor: string;
  productos: DetalleFactura[];
}

export interface VentaFacturable extends VentaGuardada {
  yaFacturada: boolean;
}

interface FacturaFila {
  id: number;
  serie: string;
  folio: number;
  venta_id: number;
  cliente_id: number | null;
  cliente_nombre: string;
  cliente_rfc: string | null;
  cliente_correo: string | null;
  fecha: string;
  subtotal: number | string;
  impuestos: number | string;
  total: number | string;
  estado: EstadoFactura;
  motivo_cancelacion: string | null;
  usuario_id: number | null;
  emitida_por: string;
  fecha_cancelacion: string | null;
  cancelada_por: string | null;
}

interface DetalleFila {
  id: number;
  factura_id: number;
  producto_id: number | null;
  descripcion: string;
  cantidad: number | string;
  precio_unitario: number | string;
  importe: number | string;
}

const camposFactura =
  "id,serie,folio,venta_id,cliente_id,cliente_nombre,cliente_rfc,cliente_correo,fecha,subtotal,impuestos,total,estado,motivo_cancelacion,usuario_id,emitida_por,fecha_cancelacion,cancelada_por";

function convertirDetalle(
  fila: DetalleFila
): DetalleFactura {
  return {
    id: Number(fila.id),
    facturaId: Number(fila.factura_id),
    productoId:
      fila.producto_id === null
        ? null
        : Number(fila.producto_id),
    descripcion: fila.descripcion,
    cantidad: Number(fila.cantidad),
    precioUnitario: Number(fila.precio_unitario),
    importe: Number(fila.importe),
  };
}

function convertirFactura(
  fila: FacturaFila,
  detalles: DetalleFila[]
): Factura {
  return {
    id: Number(fila.id),
    serie: fila.serie,
    folio: Number(fila.folio),
    ventaId: Number(fila.venta_id),
    clienteId:
      fila.cliente_id === null
        ? null
        : Number(fila.cliente_id),
    clienteNombre: fila.cliente_nombre,
    clienteRfc: fila.cliente_rfc ?? "",
    clienteCorreo: fila.cliente_correo ?? "",
    fecha: fila.fecha,
    subtotal: Number(fila.subtotal),
    impuestos: Number(fila.impuestos),
    total: Number(fila.total),
    estado: fila.estado,
    motivoCancelacion:
      fila.motivo_cancelacion ?? "",
    usuarioId:
      fila.usuario_id === null
        ? null
        : Number(fila.usuario_id),
    emitidaPor: fila.emitida_por,
    fechaCancelacion: fila.fecha_cancelacion,
    canceladaPor: fila.cancelada_por ?? "",
    productos: detalles.map(convertirDetalle),
  };
}

export async function listarFacturas(): Promise<
  Factura[]
> {
  const { data: facturas, error: errorFacturas } =
    await supabase
      .from("facturas")
      .select(camposFactura)
      .order("fecha", { ascending: false });

  if (errorFacturas) {
    throw new Error(errorFacturas.message);
  }

  const filasFactura =
    (facturas ?? []) as FacturaFila[];

  if (filasFactura.length === 0) {
    return [];
  }

  const ids = filasFactura.map(
    (factura) => Number(factura.id)
  );

  const { data: detalles, error: errorDetalles } =
    await supabase
      .from("detalle_facturas")
      .select(
        "id,factura_id,producto_id,descripcion,cantidad,precio_unitario,importe"
      )
      .in("factura_id", ids)
      .order("id", { ascending: true });

  if (errorDetalles) {
    throw new Error(errorDetalles.message);
  }

  const filasDetalle =
    (detalles ?? []) as DetalleFila[];

  return filasFactura.map((factura) =>
    convertirFactura(
      factura,
      filasDetalle.filter(
        (detalle) =>
          Number(detalle.factura_id) ===
          Number(factura.id)
      )
    )
  );
}

export async function listarVentasFacturables(): Promise<
  VentaFacturable[]
> {
  const [ventas, facturas] = await Promise.all([
    obtenerVentas(),
    listarFacturas(),
  ]);

  const ventasFacturadas = new Set(
    facturas.map((factura) => factura.ventaId)
  );

  return ventas.map((venta) => ({
    ...venta,
    yaFacturada: ventasFacturadas.has(venta.id),
  }));
}

export async function emitirFactura(params: {
  ventaId: number;
  serie: string;
  clienteId: number | null;
  clienteNombre: string;
  clienteRfc: string;
  clienteCorreo: string;
  porcentajeImpuesto: number;
  usuarioId: number | null;
  emitidaPor: string;
}): Promise<Factura> {
  const { data, error } = await supabase.rpc(
    "emitir_factura_interna",
    {
      p_venta_id: params.ventaId,
      p_serie: params.serie,
      p_cliente_id: params.clienteId,
      p_cliente_nombre: params.clienteNombre,
      p_cliente_rfc: params.clienteRfc || null,
      p_cliente_correo:
        params.clienteCorreo || null,
      p_porcentaje_impuesto:
        params.porcentajeImpuesto,
      p_usuario_id: params.usuarioId,
      p_emitida_por: params.emitidaPor,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const id = Number(data);
  const facturas = await listarFacturas();
  const creada = facturas.find(
    (factura) => factura.id === id
  );

  if (!creada) {
    throw new Error(
      "El comprobante se creó, pero no pudo cargarse."
    );
  }

  return creada;
}

export async function cancelarFactura(params: {
  facturaId: number;
  motivo: string;
  canceladaPor: string;
}): Promise<Factura> {
  const { data, error } = await supabase.rpc(
    "cancelar_factura_interna",
    {
      p_factura_id: params.facturaId,
      p_motivo: params.motivo,
      p_cancelada_por: params.canceladaPor,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const id = Number(data);
  const facturas = await listarFacturas();
  const actualizada = facturas.find(
    (factura) => factura.id === id
  );

  if (!actualizada) {
    throw new Error(
      "El comprobante se canceló, pero no pudo cargarse."
    );
  }

  return actualizada;
}