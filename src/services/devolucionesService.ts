import { supabase } from "../lib/supabase";

export interface ProductoDevuelto {
  id: number;
  productoId: number;
  nombreProducto: string;
  precioVenta: number;
  cantidad: number;
  subtotal: number;
}

export interface Devolucion {
  id: number;
  ventaId: number;
  fecha: string;
  motivo: string;
  total: number;
  autorizadoPorId: number | null;
  autorizadoPor: string;
  solicitadoPorId: number | null;
  solicitadoPor: string;
  productos: ProductoDevuelto[];
}

interface DevolucionFila {
  id: number;
  venta_id: number;
  fecha: string;
  motivo: string;
  total: number | string;
  autorizado_por_id: number | null;
  autorizado_por: string;
  solicitado_por_id: number | null;
  solicitado_por: string;
}

interface ProductoDevueltoFila {
  id: number;
  devolucion_id: number;
  producto_id: number;
  nombre_producto: string;
  precio_venta: number | string;
  cantidad: number;
  subtotal: number | string;
}

export async function listarDevoluciones(): Promise<
  Devolucion[]
> {
  const { data, error } = await supabase.rpc(
    "listar_historial_devoluciones"
  );

  if (error) {
    throw new Error(error.message);
  }

  const filas = (data ?? []) as Array<
    DevolucionFila & {
      productos: ProductoDevueltoFila[] | null;
    }
  >;

  return filas.map((fila) => ({
    id: Number(fila.id),
    ventaId: Number(fila.venta_id),
    fecha: fila.fecha,
    motivo: fila.motivo,
    total: Number(fila.total),
    autorizadoPorId:
      fila.autorizado_por_id === null
        ? null
        : Number(fila.autorizado_por_id),
    autorizadoPor:
      fila.autorizado_por || "Sin registrar",
    solicitadoPorId:
      fila.solicitado_por_id === null
        ? null
        : Number(fila.solicitado_por_id),
    solicitadoPor:
      fila.solicitado_por || "Sin registrar",
    productos: (fila.productos ?? []).map(
      (producto) => ({
        id: Number(producto.id),
        productoId: Number(producto.producto_id),
        nombreProducto:
          producto.nombre_producto,
        precioVenta: Number(
          producto.precio_venta
        ),
        cantidad: Number(producto.cantidad),
        subtotal: Number(producto.subtotal),
      })
    ),
  }));
}