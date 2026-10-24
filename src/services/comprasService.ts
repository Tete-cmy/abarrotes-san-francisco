import { supabase } from "../lib/supabase";

export type EstadoPagoCompra = "pagada" | "pendiente";

export type MetodoPagoCompra =
  | "efectivo"
  | "tarjeta"
  | "transferencia"
  | "credito";

export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string;
  telefono: string;
  correo: string;
  direccion: string;
  rfc: string;
  notas: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface DetalleCompra {
  id: number;
  compraId: number;
  productoId: number;
  productoNombre: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
}

export interface Compra {
  id: number;
  proveedorId: number | null;
  proveedorNombre: string;
  fecha: string;
  folioProveedor: string;
  subtotal: number;
  impuestos: number;
  total: number;
  estadoPago: EstadoPagoCompra;
  metodoPago: MetodoPagoCompra;
  observaciones: string;
  usuarioId: number | null;
  registradoPor: string;
  productos: DetalleCompra[];
}

interface ProveedorFila {
  id: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  rfc: string | null;
  notas: string | null;
  activo: boolean;
  fecha_creacion: string;
}

interface CompraFila {
  id: number;
  proveedor_id: number | null;
  fecha: string;
  folio_proveedor: string | null;
  subtotal: number | string;
  impuestos: number | string;
  total: number | string;
  estado_pago: EstadoPagoCompra;
  metodo_pago: MetodoPagoCompra;
  observaciones: string | null;
  usuario_id: number | null;
  registrado_por: string;
  proveedores:
    | { nombre: string }
    | { nombre: string }[]
    | null;
}

interface DetalleFila {
  id: number;
  compra_id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  costo_unitario: number | string;
  subtotal: number | string;
}

function convertirProveedor(
  fila: ProveedorFila
): Proveedor {
  return {
    id: Number(fila.id),
    nombre: fila.nombre,
    contacto: fila.contacto ?? "",
    telefono: fila.telefono ?? "",
    correo: fila.correo ?? "",
    direccion: fila.direccion ?? "",
    rfc: fila.rfc ?? "",
    notas: fila.notas ?? "",
    activo: Boolean(fila.activo),
    fechaCreacion: fila.fecha_creacion,
  };
}

function obtenerNombreProveedor(
  relacion: CompraFila["proveedores"]
): string {
  if (Array.isArray(relacion)) {
    return relacion[0]?.nombre ?? "Sin proveedor";
  }

  return relacion?.nombre ?? "Sin proveedor";
}

function convertirDetalle(
  fila: DetalleFila
): DetalleCompra {
  return {
    id: Number(fila.id),
    compraId: Number(fila.compra_id),
    productoId: Number(fila.producto_id),
    productoNombre: fila.producto_nombre,
    cantidad: Number(fila.cantidad),
    costoUnitario: Number(fila.costo_unitario),
    subtotal: Number(fila.subtotal),
  };
}

function convertirCompra(
  fila: CompraFila,
  detalles: DetalleFila[]
): Compra {
  return {
    id: Number(fila.id),
    proveedorId:
      fila.proveedor_id === null
        ? null
        : Number(fila.proveedor_id),
    proveedorNombre: obtenerNombreProveedor(
      fila.proveedores
    ),
    fecha: fila.fecha,
    folioProveedor: fila.folio_proveedor ?? "",
    subtotal: Number(fila.subtotal),
    impuestos: Number(fila.impuestos),
    total: Number(fila.total),
    estadoPago: fila.estado_pago,
    metodoPago: fila.metodo_pago,
    observaciones: fila.observaciones ?? "",
    usuarioId:
      fila.usuario_id === null
        ? null
        : Number(fila.usuario_id),
    registradoPor:
      fila.registrado_por || "Sin registrar",
    productos: detalles.map(convertirDetalle),
  };
}

const camposProveedor =
  "id,nombre,contacto,telefono,correo,direccion,rfc,notas,activo,fecha_creacion";

const camposCompra =
  "id,proveedor_id,fecha,folio_proveedor,subtotal,impuestos,total,estado_pago,metodo_pago,observaciones,usuario_id,registrado_por,proveedores(nombre)";

export async function listarProveedores(): Promise<
  Proveedor[]
> {
  const { data, error } = await supabase
    .from("proveedores")
    .select(camposProveedor)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProveedorFila[]).map(
    convertirProveedor
  );
}

export async function crearProveedor(
  proveedor: Omit<Proveedor, "id" | "fechaCreacion">
): Promise<Proveedor> {
  const { data, error } = await supabase
    .from("proveedores")
    .insert({
      nombre: proveedor.nombre.trim(),
      contacto: proveedor.contacto.trim() || null,
      telefono: proveedor.telefono.trim() || null,
      correo: proveedor.correo.trim() || null,
      direccion: proveedor.direccion.trim() || null,
      rfc: proveedor.rfc.trim() || null,
      notas: proveedor.notas.trim() || null,
      activo: proveedor.activo,
    })
    .select(camposProveedor)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return convertirProveedor(data as ProveedorFila);
}

export async function actualizarProveedor(
  id: number,
  proveedor: Omit<Proveedor, "id" | "fechaCreacion">
): Promise<Proveedor> {
  const { data, error } = await supabase
    .from("proveedores")
    .update({
      nombre: proveedor.nombre.trim(),
      contacto: proveedor.contacto.trim() || null,
      telefono: proveedor.telefono.trim() || null,
      correo: proveedor.correo.trim() || null,
      direccion: proveedor.direccion.trim() || null,
      rfc: proveedor.rfc.trim() || null,
      notas: proveedor.notas.trim() || null,
      activo: proveedor.activo,
    })
    .eq("id", id)
    .select(camposProveedor)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return convertirProveedor(data as ProveedorFila);
}

export async function listarCompras(): Promise<
  Compra[]
> {
  const { data: compras, error: errorCompras } =
    await supabase
      .from("compras")
      .select(camposCompra)
      .order("fecha", { ascending: false });

  if (errorCompras) {
    throw new Error(errorCompras.message);
  }

  const comprasFilas =
    (compras ?? []) as CompraFila[];

  if (comprasFilas.length === 0) {
    return [];
  }

  const ids = comprasFilas.map((compra) =>
    Number(compra.id)
  );

  const { data: detalles, error: errorDetalles } =
    await supabase
      .from("detalle_compras")
      .select(
        "id,compra_id,producto_id,producto_nombre,cantidad,costo_unitario,subtotal"
      )
      .in("compra_id", ids)
      .order("id", { ascending: true });

  if (errorDetalles) {
    throw new Error(errorDetalles.message);
  }

  const detallesFilas =
    (detalles ?? []) as DetalleFila[];

  return comprasFilas.map((compra) =>
    convertirCompra(
      compra,
      detallesFilas.filter(
        (detalle) =>
          Number(detalle.compra_id) ===
          Number(compra.id)
      )
    )
  );
}

export async function registrarCompra(params: {
  proveedorId: number | null;
  folioProveedor: string;
  impuestos: number;
  estadoPago: EstadoPagoCompra;
  metodoPago: MetodoPagoCompra;
  observaciones: string;
  usuarioId: number | null;
  registradoPor: string;
  productos: Array<{
    productoId: number;
    cantidad: number;
    costoUnitario: number;
  }>;
}): Promise<Compra> {
  const { data, error } = await supabase.rpc(
    "registrar_compra",
    {
      p_proveedor_id: params.proveedorId,
      p_folio_proveedor:
        params.folioProveedor || null,
      p_impuestos: params.impuestos,
      p_estado_pago: params.estadoPago,
      p_metodo_pago: params.metodoPago,
      p_observaciones:
        params.observaciones || null,
      p_usuario_id: params.usuarioId,
      p_registrado_por:
        params.registradoPor,
      p_productos: params.productos.map(
        (producto) => ({
          productoId: producto.productoId,
          cantidad: producto.cantidad,
          costoUnitario: producto.costoUnitario,
        })
      ),
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const id = Number(data);
  const compras = await listarCompras();
  const creada = compras.find(
    (compra) => compra.id === id
  );

  if (!creada) {
    throw new Error(
      "La compra se registró, pero no pudo cargarse."
    );
  }

  return creada;
}