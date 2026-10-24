import { useEffect, useState } from "react";
import "./Reportes.css";
import type { Pantalla } from "../../types/navegacion";
import {
  obtenerDatosReportes,
} from "../../services/reportesService";
import type {
  VentaGuardada,
} from "../../services/ventasService";
import type {
  Producto,
} from "../../services/productosService";

interface ReportesProps {
  onNavigate: (pantalla: Pantalla) => void;
}

type FiltroPeriodo =
  | "hoy"
  | "semana"
  | "mes"
  | "todas";

function Reportes({
  onNavigate,
}: ReportesProps) {
  const [filtroPeriodo, setFiltroPeriodo] =
    useState<FiltroPeriodo>("todas");

  const [ventas, setVentas] =
    useState<VentaGuardada[]>([]);

  const [productos, setProductos] =
    useState<Producto[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [errorCarga, setErrorCarga] =
    useState("");

  useEffect(() => {
    let componenteActivo = true;

    async function cargarReportes() {
      try {
        setCargando(true);
        setErrorCarga("");

        const datos =
          await obtenerDatosReportes();

        if (!componenteActivo) {
          return;
        }

        setVentas(datos.ventas);
        setProductos(datos.productos);

        localStorage.setItem(
          "ventas",
          JSON.stringify(datos.ventas)
        );

        localStorage.setItem(
          "productos",
          JSON.stringify(datos.productos)
        );
      } catch (error) {
        console.error(error);

        if (!componenteActivo) {
          return;
        }

        setErrorCarga(
          "No fue posible cargar los informes desde Supabase."
        );

        const ventasGuardadas =
          localStorage.getItem("ventas");

        const productosGuardados =
          localStorage.getItem("productos");

        if (ventasGuardadas) {
          try {
            const datos: unknown =
              JSON.parse(ventasGuardadas);

            if (Array.isArray(datos)) {
              setVentas(
                datos as VentaGuardada[]
              );
            }
          } catch {
            setVentas([]);
          }
        }

        if (productosGuardados) {
          try {
            const datos: unknown =
              JSON.parse(productosGuardados);

            if (Array.isArray(datos)) {
              setProductos(
                datos as Producto[]
              );
            }
          } catch {
            setProductos([]);
          }
        }
      } finally {
        if (componenteActivo) {
          setCargando(false);
        }
      }
    }

    cargarReportes();

    return () => {
      componenteActivo = false;
    };
  }, []);

  function perteneceAlPeriodo(
    fechaVenta: string
  ) {
    const fecha = new Date(fechaVenta);
    const hoy = new Date();

    if (Number.isNaN(fecha.getTime())) {
      return false;
    }

    if (filtroPeriodo === "todas") {
      return true;
    }

    if (filtroPeriodo === "hoy") {
      return (
        fecha.toDateString() ===
        hoy.toDateString()
      );
    }

    if (filtroPeriodo === "semana") {
      const haceSieteDias =
        new Date(hoy);

      haceSieteDias.setDate(
        hoy.getDate() - 7
      );

      return (
        fecha >= haceSieteDias &&
        fecha <= hoy
      );
    }

    return (
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() ===
        hoy.getFullYear()
    );
  }

  const ventasFiltradas = [...ventas]
    .filter((venta) =>
      perteneceAlPeriodo(venta.fecha)
    )
    .sort(
      (ventaA, ventaB) =>
        new Date(
          ventaB.fecha
        ).getTime() -
        new Date(
          ventaA.fecha
        ).getTime()
    );

  const ingresosTotales =
    ventasFiltradas.reduce(
      (total, venta) =>
        total + venta.total,
      0
    );

  const articulosVendidos =
    ventasFiltradas.reduce(
      (total, venta) =>
        total +
        (venta.productos ?? []).reduce(
          (subtotal, producto) =>
            subtotal +
            producto.cantidad,
          0
        ),
      0
    );

  const promedioPorVenta =
    ventasFiltradas.length === 0
      ? 0
      : ingresosTotales /
        ventasFiltradas.length;

  const unidadesInventario =
    productos.reduce(
      (total, producto) =>
        total +
        producto.existencias,
      0
    );

  const valorInventario =
    productos.reduce(
      (total, producto) =>
        total +
        producto.precioCompra *
          producto.existencias,
      0
    );

  const cantidadesPorProducto: Record<
    string,
    {
      nombre: string;
      cantidad: number;
      ingresos: number;
    }
  > = {};

  ventasFiltradas.forEach((venta) => {
    (venta.productos ?? []).forEach(
      (producto) => {
        const clave =
          String(producto.id);

        if (
          !cantidadesPorProducto[clave]
        ) {
          cantidadesPorProducto[clave] = {
            nombre: producto.nombre,
            cantidad: 0,
            ingresos: 0,
          };
        }

        cantidadesPorProducto[
          clave
        ].cantidad +=
          producto.cantidad;

        cantidadesPorProducto[
          clave
        ].ingresos +=
          producto.subtotal;
      }
    );
  });

  const productosMasVendidos =
    Object.values(
      cantidadesPorProducto
    ).sort(
      (
        productoA,
        productoB
      ) =>
        productoB.cantidad -
        productoA.cantidad
    );

  const productoMasVendido =
    productosMasVendidos[0] ??
    null;

  const ventasPorCajero =
    Object.values(
      ventasFiltradas.reduce<
        Record<
          string,
          {
            nombre: string;
            operaciones: number;
            ingresos: number;
          }
        >
      >((acumulado, venta) => {
        const nombre =
          venta.atendidoPor ||
          "Sin registrar";

        if (!acumulado[nombre]) {
          acumulado[nombre] = {
            nombre,
            operaciones: 0,
            ingresos: 0,
          };
        }

        acumulado[
          nombre
        ].operaciones += 1;

        acumulado[
          nombre
        ].ingresos +=
          venta.total;

        return acumulado;
      }, {})
    ).sort(
      (a, b) =>
        b.ingresos -
        a.ingresos
    );

  const productosStockBajo =
    productos.filter(
      (producto) =>
        producto.existencias > 0 &&
        producto.existencias <=
          producto.stockMinimo
    );

  const productosAgotados =
    productos.filter(
      (producto) =>
        producto.existencias === 0
    );

  return (
    <div className="reportes-page">
      {errorCarga && (
        <div className="usuario-error">
          <span>⚠️</span>
          <p>{errorCarga}</p>
        </div>
      )}

      {cargando && (
        <div className="usuario-error">
          <span>⏳</span>
          <p>
            Cargando informes desde
            Supabase...
          </p>
        </div>
      )}

      <main className="reportes-main">
        <section className="reportes-titulo">
          <div>
            <p>
              MÓDULO DE INFORMES
            </p>

            <h2>
              Resumen de ventas
            </h2>

            <span>
              Consulta el rendimiento y
              las operaciones de la
              tienda.
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="boton-entrada"
              onClick={() =>
                onNavigate("ventas")
              }
            >
              Nueva venta
            </button>

            <select
              value={filtroPeriodo}
              onChange={(event) =>
                setFiltroPeriodo(
                  event.target
                    .value as FiltroPeriodo
                )
              }
            >
              <option value="hoy">
                Ventas de hoy
              </option>
              <option value="semana">
                Últimos 7 días
              </option>
              <option value="mes">
                Este mes
              </option>
              <option value="todas">
                Todas las ventas
              </option>
            </select>
          </div>
        </section>

        <section className="reportes-resumen">
          <article>
            <div className="reporte-icono verde">
              💵
            </div>
            <div>
              <span>Ingresos</span>
              <strong>
                $
                {ingresosTotales.toFixed(
                  2
                )}
              </strong>
              <p>Total del periodo</p>
            </div>
          </article>

          <article>
            <div className="reporte-icono azul">
              🧾
            </div>
            <div>
              <span>Operaciones</span>
              <strong>
                {
                  ventasFiltradas.length
                }
              </strong>
              <p>Ventas registradas</p>
            </div>
          </article>

          <article>
            <div className="reporte-icono naranja">
              📦
            </div>
            <div>
              <span>
                Artículos vendidos
              </span>
              <strong>
                {articulosVendidos}
              </strong>
              <p>Unidades despachadas</p>
            </div>
          </article>

          <article>
            <div className="reporte-icono morado">
              📊
            </div>
            <div>
              <span>
                Promedio por venta
              </span>
              <strong>
                $
                {promedioPorVenta.toFixed(
                  2
                )}
              </strong>
              <p>Ticket promedio</p>
            </div>
          </article>

          <article>
            <div className="reporte-icono rojo">
              💼
            </div>
            <div>
              <span>
                Valor del inventario
              </span>
              <strong>
                $
                {valorInventario.toFixed(
                  2
                )}
              </strong>
              <p>
                {unidadesInventario}{" "}
                unidades actuales
              </p>
            </div>
          </article>
        </section>

        <section className="reportes-layout">
          <div className="ventas-reporte-panel">
            <div className="reportes-panel-header">
              <div>
                <p>HISTORIAL</p>
                <h3>
                  Ventas registradas
                </h3>
              </div>

              <span>
                {`${ventasFiltradas.length} ${
                  ventasFiltradas.length ===
                  1
                    ? "operación"
                    : "operaciones"
                }`}
              </span>
            </div>

            <div className="reportes-tabla-contenedor">
              <table className="reportes-tabla">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>
                      Fecha y hora
                    </th>
                    <th>Productos</th>
                    <th>Artículos</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {ventasFiltradas.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="reportes-vacio"
                      >
                        <div>🧾</div>
                        <strong>
                          No hay ventas en
                          este periodo
                        </strong>
                        <p>
                          Selecciona otro
                          periodo o registra
                          una nueva venta.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    ventasFiltradas.map(
                      (venta) => {
                        const cantidadArticulos =
                          (
                            venta.productos ??
                            []
                          ).reduce(
                            (
                              total,
                              producto
                            ) =>
                              total +
                              producto.cantidad,
                            0
                          );

                        return (
                          <tr
                            key={
                              venta.id
                            }
                          >
                            <td>
                              #
                              {String(
                                venta.id
                              ).slice(
                                -6
                              )}
                            </td>

                            <td>
                              {new Date(
                                venta.fecha
                              ).toLocaleString(
                                "es-MX"
                              )}
                            </td>

                            <td>
                              {
                                (
                                  venta.productos ??
                                  []
                                ).length
                              }
                            </td>

                            <td>
                              {
                                cantidadArticulos
                              }
                            </td>

                            <td className="total-reporte">
                              $
                              {venta.total.toFixed(
                                2
                              )}
                            </td>

                            <td>
                              <span className="estado-venta">
                                Completada
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="productos-vendidos-panel">
            <div className="reportes-panel-header">
              <div>
                <p>PRODUCTOS</p>
                <h3>Más vendidos</h3>
              </div>
            </div>

            {productoMasVendido && (
              <div className="producto-destacado">
                <span>
                  Producto principal
                </span>
                <strong>
                  {
                    productoMasVendido.nombre
                  }
                </strong>
                <p>
                  {
                    productoMasVendido.cantidad
                  }{" "}
                  unidades vendidas
                </p>
              </div>
            )}

            {productosMasVendidos.length ===
            0 ? (
              <div className="productos-vendidos-vacio">
                <div>📦</div>
                <strong>
                  Sin información todavía
                </strong>
                <p>
                  Los productos más
                  vendidos aparecerán
                  aquí.
                </p>
              </div>
            ) : (
              <div className="ranking-productos">
                {productosMasVendidos
                  .slice(0, 5)
                  .map(
                    (
                      producto,
                      indice
                    ) => (
                      <article
                        key={`${producto.nombre}-${indice}`}
                      >
                        <div className="posicion-ranking">
                          {indice + 1}
                        </div>

                        <div>
                          <strong>
                            {
                              producto.nombre
                            }
                          </strong>
                          <span>
                            {
                              producto.cantidad
                            }{" "}
                            unidades
                          </span>
                        </div>

                        <b>
                          $
                          {producto.ingresos.toFixed(
                            2
                          )}
                        </b>
                      </article>
                    )
                  )}
              </div>
            )}
          </aside>
        </section>

        <section className="reportes-layout">
          <div className="ventas-reporte-panel">
            <div className="reportes-panel-header">
              <div>
                <p>PERSONAL</p>
                <h3>
                  Ventas por cajero
                </h3>
              </div>
            </div>

            <div className="reportes-tabla-contenedor">
              <table className="reportes-tabla">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>
                      Operaciones
                    </th>
                    <th>Ingresos</th>
                  </tr>
                </thead>

                <tbody>
                  {ventasPorCajero.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="reportes-vacio"
                      >
                        Sin ventas
                        registradas.
                      </td>
                    </tr>
                  ) : (
                    ventasPorCajero.map(
                      (cajero) => (
                        <tr
                          key={
                            cajero.nombre
                          }
                        >
                          <td>
                            {
                              cajero.nombre
                            }
                          </td>
                          <td>
                            {
                              cajero.operaciones
                            }
                          </td>
                          <td className="total-reporte">
                            $
                            {cajero.ingresos.toFixed(
                              2
                            )}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="productos-vendidos-panel">
            <div className="reportes-panel-header">
              <div>
                <p>INVENTARIO</p>
                <h3>
                  Alertas de existencias
                </h3>
              </div>
            </div>

            <div className="producto-destacado">
              <span>Stock bajo</span>
              <strong>
                {
                  productosStockBajo.length
                }
              </strong>
              <p>
                Productos que necesitan
                reposición
              </p>
            </div>

            <div className="producto-destacado">
              <span>Agotados</span>
              <strong>
                {
                  productosAgotados.length
                }
              </strong>
              <p>
                Productos sin
                existencias
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default Reportes;