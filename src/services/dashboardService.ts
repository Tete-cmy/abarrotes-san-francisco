import {
  obtenerProductos,
  type Producto,
} from "./productosService";
import {
  obtenerVentas,
  type VentaGuardada,
} from "./ventasService";
import {
  listarCompras,
  type Compra,
} from "./comprasService";
import {
  listarCreditos,
  type Credito,
} from "./creditoService";
import {
  obtenerMovimientosConMigracion,
  type MovimientoInventario,
} from "./inventarioService";

export interface DatosDashboard {
  productos: Producto[];
  ventas: VentaGuardada[];
  compras: Compra[];
  creditos: Credito[];
  movimientosInventario: MovimientoInventario[];
}

export async function obtenerDatosDashboard(): Promise<DatosDashboard> {
  const [
    productos,
    ventas,
    compras,
    creditos,
    movimientosInventario,
  ] = await Promise.all([
    obtenerProductos(),
    obtenerVentas(),
    listarCompras(),
    listarCreditos(),
    obtenerMovimientosConMigracion(),
  ]);

  return {
    productos,
    ventas,
    compras,
    creditos,
    movimientosInventario,
  };
}