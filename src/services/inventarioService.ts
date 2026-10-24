import { supabase } from "../lib/supabase";
import {
  obtenerProductos,
  type Producto,
} from "./productosService";

export interface MovimientoInventario {
  id: number;
  fecha: string;
  tipo: "entrada" | "salida";
  productoId: number;
  productoNombre: string;
  cantidad: number;
  existenciasAnteriores: number;
  existenciasNuevas: number;
  motivo: string;
}

interface MovimientoFila {
  id: number;
  fecha: string;
  tipo: "entrada" | "salida";
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  existencias_anteriores: number;
  existencias_nuevas: number;
  motivo: string;
}

function convertirMovimiento(
  fila: MovimientoFila
): MovimientoInventario {
  return {
    id: Number(fila.id),
    fecha: fila.fecha,
    tipo: fila.tipo,
    productoId: Number(fila.producto_id),
    productoNombre: fila.producto_nombre,
    cantidad: Number(fila.cantidad),
    existenciasAnteriores: Number(
      fila.existencias_anteriores
    ),
    existenciasNuevas: Number(
      fila.existencias_nuevas
    ),
    motivo: fila.motivo,
  };
}

export async function obtenerMovimientos(): Promise<
  MovimientoInventario[]
> {
  const { data, error } = await supabase
    .from("movimientos_inventario")
    .select(
      "id,fecha,tipo,producto_id,producto_nombre,cantidad,existencias_anteriores,existencias_nuevas,motivo"
    )
    .order("fecha", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as MovimientoFila[]).map(
    convertirMovimiento
  );
}

export function obtenerMovimientosConMigracion(): Promise<
  MovimientoInventario[]
> {
  return migrarMovimientosLocales();
}

async function migrarMovimientosLocales(): Promise<
  MovimientoInventario[]
> {
  const movimientosSupabase =
    await obtenerMovimientos();

  if (movimientosSupabase.length > 0) {
    localStorage.setItem(
      "movimientosInventario",
      JSON.stringify(movimientosSupabase)
    );

    return movimientosSupabase;
  }

  const guardados = localStorage.getItem(
    "movimientosInventario"
  );

  if (!guardados) {
    return [];
  }

  let movimientosLocales: MovimientoInventario[];

  try {
    const datos: unknown = JSON.parse(guardados);

    if (!Array.isArray(datos)) {
      return [];
    }

    movimientosLocales =
      datos as MovimientoInventario[];
  } catch {
    return [];
  }

  if (movimientosLocales.length === 0) {
    return [];
  }

  const productos = await obtenerProductos();

  const filas = movimientosLocales
    .map((movimiento) => {
      const producto = productos.find(
        (item) =>
          item.nombre.trim().toLowerCase() ===
          movimiento.productoNombre
            .trim()
            .toLowerCase()
      );

      if (!producto) {
        return null;
      }

      return {
        fecha: movimiento.fecha,
        tipo: movimiento.tipo,
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        cantidad: movimiento.cantidad,
        existencias_anteriores:
          movimiento.existenciasAnteriores,
        existencias_nuevas:
          movimiento.existenciasNuevas,
        motivo: movimiento.motivo,
      };
    })
    .filter(
      (
        fila
      ): fila is {
        fecha: string;
        tipo: "entrada" | "salida";
        producto_id: number;
        producto_nombre: string;
        cantidad: number;
        existencias_anteriores: number;
        existencias_nuevas: number;
        motivo: string;
      } => fila !== null
    );

  if (filas.length === 0) {
    return [];
  }

  const { error } = await supabase
    .from("movimientos_inventario")
    .insert(filas);

  if (error) {
    throw new Error(error.message);
  }

  const migrados = await obtenerMovimientos();

  localStorage.setItem(
    "movimientosInventario",
    JSON.stringify(migrados)
  );

  return migrados;
}

export async function registrarEntradaInventario(
  producto: Producto,
  cantidad: number
): Promise<{
  productoActualizado: Producto;
  movimiento: MovimientoInventario;
}> {
  const existenciasAnteriores = producto.existencias;
  const existenciasNuevas =
    existenciasAnteriores + cantidad;

  const { data: productoFila, error: errorProducto } =
    await supabase
      .from("productos")
      .update({
        existencias: existenciasNuevas,
      })
      .eq("id", producto.id)
      .select(
        "id,codigo,nombre,categoria,precio_compra,precio_venta,existencias,stock_minimo"
      )
      .single();

  if (errorProducto) {
    throw new Error(errorProducto.message);
  }

  const productoActualizado: Producto = {
    id: Number(productoFila.id),
    codigo: productoFila.codigo,
    nombre: productoFila.nombre,
    categoria: productoFila.categoria,
    precioCompra: Number(
      productoFila.precio_compra
    ),
    precioVenta: Number(
      productoFila.precio_venta
    ),
    existencias: Number(
      productoFila.existencias
    ),
    stockMinimo: Number(
      productoFila.stock_minimo
    ),
  };

  const { data: movimientoFila, error: errorMovimiento } =
    await supabase
      .from("movimientos_inventario")
      .insert({
        fecha: new Date().toISOString(),
        tipo: "entrada",
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        cantidad,
        existencias_anteriores:
          existenciasAnteriores,
        existencias_nuevas: existenciasNuevas,
        motivo: "Entrada de mercancía",
      })
      .select(
        "id,fecha,tipo,producto_id,producto_nombre,cantidad,existencias_anteriores,existencias_nuevas,motivo"
      )
      .single();

  if (errorMovimiento) {
    await supabase
      .from("productos")
      .update({
        existencias: existenciasAnteriores,
      })
      .eq("id", producto.id);

    throw new Error(errorMovimiento.message);
  }

  return {
    productoActualizado,
    movimiento: convertirMovimiento(
      movimientoFila as MovimientoFila
    ),
  };
}