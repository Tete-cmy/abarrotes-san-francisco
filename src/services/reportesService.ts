import {
  obtenerProductos,
  type Producto,
} from "./productosService";
import {
  obtenerVentas,
  type VentaGuardada,
} from "./ventasService";

export interface ResumenReportes {
  ventas: VentaGuardada[];
  productos: Producto[];
}

export async function obtenerDatosReportes(): Promise<
  ResumenReportes
> {
  const [ventas, productos] = await Promise.all([
    obtenerVentas(),
    obtenerProductos(),
  ]);

  return {
    ventas,
    productos,
  };
}