import { supabase } from "../lib/supabase";

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  precioCompra: number;
  precioVenta: number;
  existencias: number;
  stockMinimo: number;
}

interface ProductoFila {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  precio_compra: number | string;
  precio_venta: number | string;
  existencias: number;
  stock_minimo: number;
}

function convertirFila(
  fila: ProductoFila
): Producto {
  return {
    id: Number(fila.id),
    codigo: fila.codigo,
    nombre: fila.nombre,
    categoria: fila.categoria,
    precioCompra: Number(fila.precio_compra),
    precioVenta: Number(fila.precio_venta),
    existencias: Number(fila.existencias),
    stockMinimo: Number(fila.stock_minimo),
  };
}

function convertirProducto(
  producto: Omit<Producto, "id">
) {
  return {
    codigo: producto.codigo,
    nombre: producto.nombre,
    categoria: producto.categoria,
    precio_compra: producto.precioCompra,
    precio_venta: producto.precioVenta,
    existencias: producto.existencias,
    stock_minimo: producto.stockMinimo,
  };
}

export async function obtenerProductos(): Promise<
  Producto[]
> {
  const { data, error } = await supabase
    .from("productos")
    .select(
      "id,codigo,nombre,categoria,precio_compra,precio_venta,existencias,stock_minimo"
    )
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as ProductoFila[]).map(
    convertirFila
  );
}

export async function crearProducto(
  producto: Omit<Producto, "id">
): Promise<Producto> {
  const { data, error } = await supabase
    .from("productos")
    .insert(convertirProducto(producto))
    .select(
      "id,codigo,nombre,categoria,precio_compra,precio_venta,existencias,stock_minimo"
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return convertirFila(data as ProductoFila);
}

export async function actualizarProducto(
  id: number,
  producto: Omit<Producto, "id">
): Promise<Producto> {
  const { data, error } = await supabase
    .from("productos")
    .update(convertirProducto(producto))
    .eq("id", id)
    .select(
      "id,codigo,nombre,categoria,precio_compra,precio_venta,existencias,stock_minimo"
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return convertirFila(data as ProductoFila);
}

export async function eliminarProductoPorId(
  id: number
): Promise<void> {
  const { error } = await supabase
    .from("productos")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function migrarProductosLocalesSiHaceFalta(): Promise<
  Producto[]
> {
  const productosSupabase =
    await obtenerProductos();

  if (productosSupabase.length > 0) {
    localStorage.setItem(
      "productos",
      JSON.stringify(productosSupabase)
    );

    return productosSupabase;
  }

  const guardados =
    localStorage.getItem("productos");

  if (!guardados) {
    return [];
  }

  let productosLocales: Producto[];

  try {
    const datos: unknown =
      JSON.parse(guardados);

    if (!Array.isArray(datos)) {
      return [];
    }

    productosLocales = datos as Producto[];
  } catch {
    return [];
  }

  if (productosLocales.length === 0) {
    return [];
  }

  const filas = productosLocales.map(
    (producto) =>
      convertirProducto({
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria,
        precioCompra:
          producto.precioCompra,
        precioVenta:
          producto.precioVenta,
        existencias:
          producto.existencias,
        stockMinimo:
          producto.stockMinimo,
      })
  );

  const { error } = await supabase
    .from("productos")
    .upsert(filas, {
      onConflict: "codigo",
      ignoreDuplicates: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const migrados =
    await obtenerProductos();

  localStorage.setItem(
    "productos",
    JSON.stringify(migrados)
  );

  return migrados;
}

export async function probarConexionProductos() {
  console.log(
    "Probando conexión con Supabase..."
  );

  try {
    const productos =
      await obtenerProductos();

    console.log(
      "Conexión con Supabase correcta:",
      productos
    );
  } catch (error) {
    console.error(
      "Error al conectar con Supabase:",
      error
    );
  }
}