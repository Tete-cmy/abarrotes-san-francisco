import { useEffect, useState } from "react";
import "./Inventario.css";
import { registrarEventoBitacora } from "../../services/bitacoraService";
import type { UsuarioSesion } from "../Login/Login";
import type { Pantalla } from "../../types/navegacion";
import {
  obtenerProductos,
  type Producto,
} from "../../services/productosService";
import {
  obtenerMovimientosConMigracion,
  registrarEntradaInventario,
  type MovimientoInventario,
} from "../../services/inventarioService";

interface InventarioProps {
  onNavigate: (pantalla: Pantalla) => void;
  usuarioActual: UsuarioSesion;
}

type FiltroEstado =
  | "todos"
  | "suficiente"
  | "bajo"
  | "agotado";

type FiltroMovimiento =
  | "todos"
  | "entrada"
  | "salida";

function Inventario({
  onNavigate,
  usuarioActual,
}: InventarioProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("todos");

  const [productoEntrada, setProductoEntrada] =
    useState<Producto | null>(null);

  const [busquedaMovimiento, setBusquedaMovimiento] =
    useState("");

  const [filtroMovimiento, setFiltroMovimiento] =
    useState<FiltroMovimiento>("todos");

  const [cantidadEntrada, setCantidadEntrada] =
    useState("");

  const [errorEntrada, setErrorEntrada] =
    useState("");

  const [mensajeEntrada, setMensajeEntrada] =
    useState("");

  const [procesandoEntrada, setProcesandoEntrada] =
    useState(false);

  const [productos, setProductos] =
    useState<Producto[]>([]);

  const [movimientos, setMovimientos] =
    useState<MovimientoInventario[]>([]);

  const [cargandoInventario, setCargandoInventario] =
    useState(true);

  const [errorCarga, setErrorCarga] =
    useState("");

  useEffect(() => {
    let componenteActivo = true;

    async function cargarInventario() {
      try {
        setCargandoInventario(true);
        setErrorCarga("");

        const [
          productosCargados,
          movimientosCargados,
        ] = await Promise.all([
          obtenerProductos(),
          obtenerMovimientosConMigracion(),
        ]);

        if (!componenteActivo) {
          return;
        }

        setProductos(productosCargados);
        setMovimientos(movimientosCargados);

        localStorage.setItem(
          "productos",
          JSON.stringify(productosCargados)
        );

        localStorage.setItem(
          "movimientosInventario",
          JSON.stringify(movimientosCargados)
        );
      } catch (error) {
        if (!componenteActivo) {
          return;
        }

        console.error(error);

        setErrorCarga(
          "No fue posible cargar el inventario desde Supabase."
        );

        const productosGuardados =
          localStorage.getItem("productos");

        const movimientosGuardados =
          localStorage.getItem(
            "movimientosInventario"
          );

        if (productosGuardados) {
          try {
            const datos: unknown = JSON.parse(
              productosGuardados
            );

            if (Array.isArray(datos)) {
              setProductos(datos as Producto[]);
            }
          } catch {
            setProductos([]);
          }
        }

        if (movimientosGuardados) {
          try {
            const datos: unknown = JSON.parse(
              movimientosGuardados
            );

            if (Array.isArray(datos)) {
              setMovimientos(
                datos as MovimientoInventario[]
              );
            }
          } catch {
            setMovimientos([]);
          }
        }
      } finally {
        if (componenteActivo) {
          setCargandoInventario(false);
        }
      }
    }

    cargarInventario();

    return () => {
      componenteActivo = false;
    };
  }, []);

  const totalUnidades = productos.reduce(
    (total, producto) =>
      total + producto.existencias,
    0
  );

  const valorInventario = productos.reduce(
    (total, producto) =>
      total +
      producto.precioCompra *
        producto.existencias,
    0
  );

  const productosStockBajo = productos.filter(
    (producto) =>
      producto.existencias > 0 &&
      producto.existencias <=
        producto.stockMinimo
  ).length;

  const productosAgotados = productos.filter(
    (producto) => producto.existencias === 0
  ).length;

  function obtenerEstado(producto: Producto) {
    if (producto.existencias === 0) {
      return "agotado";
    }

    if (
      producto.existencias <= producto.stockMinimo
    ) {
      return "bajo";
    }

    return "suficiente";
  }

  const productosFiltrados = productos.filter(
    (producto) => {
      const texto = busqueda
        .toLowerCase()
        .trim();

      const coincideBusqueda =
        producto.nombre
          .toLowerCase()
          .includes(texto) ||
        producto.codigo
          .toLowerCase()
          .includes(texto) ||
        producto.categoria
          .toLowerCase()
          .includes(texto);

      const estado = obtenerEstado(producto);

      const coincideEstado =
        filtroEstado === "todos" ||
        filtroEstado === estado;

      return coincideBusqueda && coincideEstado;
    }
  );

  function agregarExistencias(
    producto: Producto
  ) {
    setProductoEntrada(producto);
    setCantidadEntrada("");
    setErrorEntrada("");
    setProcesandoEntrada(false);
  }

  function cerrarEntrada() {
    if (procesandoEntrada) {
      return;
    }

    setProductoEntrada(null);
    setCantidadEntrada("");
    setErrorEntrada("");
  }

  async function confirmarEntrada() {
    if (!productoEntrada || procesandoEntrada) {
      return;
    }

    const cantidad = Number(cantidadEntrada);

    if (
      !Number.isInteger(cantidad) ||
      cantidad <= 0
    ) {
      setErrorEntrada(
        "Ingresa una cantidad entera mayor que cero."
      );
      return;
    }

    const productoActual = productos.find(
      (producto) =>
        producto.id === productoEntrada.id
    );

    if (!productoActual) {
      setErrorEntrada(
        "El producto ya no está disponible."
      );
      return;
    }

    try {
      setProcesandoEntrada(true);
      setErrorEntrada("");

      const {
        productoActualizado,
        movimiento,
      } = await registrarEntradaInventario(
        productoActual,
        cantidad
      );

      const productosActualizados =
        productos.map((producto) =>
          producto.id ===
          productoActualizado.id
            ? productoActualizado
            : producto
        );

      const movimientosActualizados = [
        movimiento,
        ...movimientos,
      ];

      setProductos(productosActualizados);
      setMovimientos(
        movimientosActualizados
      );

      localStorage.setItem(
        "productos",
        JSON.stringify(productosActualizados)
      );

      localStorage.setItem(
        "movimientosInventario",
        JSON.stringify(
          movimientosActualizados
        )
      );

      try {
        await registrarEventoBitacora({
          usuarioId: usuarioActual.id,
          nombreUsuario:
            usuarioActual.nombreCompleto,
          usuario: usuarioActual.usuario,
          rol: usuarioActual.rol,
          modulo: "Inventario",
          accion: "Entrada de mercancía",
          detalle:
            `Se agregaron ${cantidad} unidades a "${productoActual.nombre}". ` +
            `Existencias: ${productoActual.existencias} → ${productoActualizado.existencias}.`,
          entidadTipo: "producto",
          entidadId: productoActual.id,
        });
      } catch (errorBitacora) {
        console.error(
          "No fue posible registrar la entrada en bitácora:",
          errorBitacora
        );
      }

      setMensajeEntrada(
        `Se agregaron ${cantidad} unidades a ${productoActual.nombre}.`
      );

      setProductoEntrada(null);
      setCantidadEntrada("");

      window.setTimeout(() => {
        setMensajeEntrada("");
      }, 1800);
    } catch (error) {
      console.error(error);

      setErrorEntrada(
        "No fue posible registrar la entrada en Supabase."
      );
    } finally {
      setProcesandoEntrada(false);
    }
  }

  const movimientosFiltrados =
    movimientos.filter((movimiento) => {
      const texto = busquedaMovimiento
        .toLowerCase()
        .trim();

      const coincideBusqueda =
        movimiento.productoNombre
          .toLowerCase()
          .includes(texto) ||
        movimiento.motivo
          .toLowerCase()
          .includes(texto);

      const coincideTipo =
        filtroMovimiento === "todos" ||
        movimiento.tipo ===
          filtroMovimiento;

      return coincideBusqueda && coincideTipo;
    });

  return (
    <div className="inventario-page">
      {errorCarga && (
        <div className="entrada-error">
          {errorCarga}
        </div>
      )}

      {cargandoInventario && (
        <div className="entrada-error">
          Cargando inventario desde Supabase...
        </div>
      )}

      <main className="inventario-main">
        <section className="inventario-titulo">
          <div>
            <p>MÓDULO DE INVENTARIO</p>
            <h2>Existencias de la tienda</h2>
            <span>
              Consulta el stock y registra entradas
              de mercancía.
            </span>
          </div>

          <button
            type="button"
            className="boton-entrada"
            onClick={() =>
              onNavigate("productos")
            }
          >
            Administrar productos
          </button>
        </section>

        <section className="inventario-resumen">
          <article>
            <div className="resumen-icono verde">
              📦
            </div>
            <div>
              <span>Productos</span>
              <strong>{productos.length}</strong>
              <p>Productos registrados</p>
            </div>
          </article>

          <article>
            <div className="resumen-icono azul">
              ▦
            </div>
            <div>
              <span>Unidades disponibles</span>
              <strong>{totalUnidades}</strong>
              <p>Existencias totales</p>
            </div>
          </article>

          <article>
            <div className="resumen-icono naranja">
              ⚠
            </div>
            <div>
              <span>Stock bajo</span>
              <strong>
                {productosStockBajo}
              </strong>
              <p>Requieren atención</p>
            </div>
          </article>

          <article>
            <div className="resumen-icono rojo">
              ×
            </div>
            <div>
              <span>Agotados</span>
              <strong>
                {productosAgotados}
              </strong>
              <p>Sin existencias</p>
            </div>
          </article>

          <article>
            <div className="resumen-icono morado">
              💼
            </div>
            <div>
              <span>Valor del inventario</span>
              <strong>
                ${valorInventario.toFixed(2)}
              </strong>
              <p>Calculado al costo</p>
            </div>
          </article>
        </section>

        <section className="inventario-panel">
          <div className="inventario-panel-header">
            <div>
              <p>LISTADO GENERAL</p>
              <h3>
                Productos en inventario
              </h3>
            </div>

            <span>
              {productosFiltrados.length} resultado
              {productosFiltrados.length === 1
                ? ""
                : "s"}
            </span>
          </div>

          <div className="inventario-herramientas">
            <input
              type="text"
              placeholder="Buscar por código, producto o categoría"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
            />

            <select
              value={filtroEstado}
              onChange={(event) =>
                setFiltroEstado(
                  event.target
                    .value as FiltroEstado
                )
              }
            >
              <option value="todos">
                Todos los estados
              </option>
              <option value="suficiente">
                Stock suficiente
              </option>
              <option value="bajo">
                Stock bajo
              </option>
              <option value="agotado">
                Agotados
              </option>
            </select>
          </div>

          <div className="inventario-tabla-contenedor">
            <table className="inventario-tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Existencias</th>
                  <th>Stock mínimo</th>
                  <th>Valor actual</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="inventario-vacio"
                    >
                      <div>📦</div>
                      <strong>
                        No se encontraron productos
                      </strong>
                      <p>
                        Modifica la búsqueda o registra
                        nuevos productos.
                      </p>
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map(
                    (producto) => {
                      const estado =
                        obtenerEstado(producto);

                      return (
                        <tr key={producto.id}>
                          <td>
                            {producto.codigo}
                          </td>

                          <td>
                            <strong>
                              {producto.nombre}
                            </strong>
                          </td>

                          <td>
                            {producto.categoria}
                          </td>

                          <td className="cantidad-inventario">
                            {
                              producto.existencias
                            }
                          </td>

                          <td>
                            {
                              producto.stockMinimo
                            }
                          </td>

                          <td>
                            $
                            {(
                              producto.precioCompra *
                              producto.existencias
                            ).toFixed(2)}
                          </td>

                          <td>
                            <span
                              className={`estado-inventario ${estado}`}
                            >
                              {estado === "agotado"
                                ? "Agotado"
                                : estado ===
                                    "bajo"
                                  ? "Stock bajo"
                                  : "Suficiente"}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="boton-entrada"
                              onClick={() =>
                                agregarExistencias(
                                  producto
                                )
                              }
                            >
                              + Entrada
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="movimientos-panel">
          <div className="movimientos-header">
            <div>
              <p>HISTORIAL</p>
              <h3>Movimientos recientes</h3>
            </div>

            <div className="movimientos-herramientas">
              <input
                type="text"
                placeholder="Buscar por producto o motivo"
                value={busquedaMovimiento}
                onChange={(event) =>
                  setBusquedaMovimiento(
                    event.target.value
                  )
                }
              />

              <select
                value={filtroMovimiento}
                onChange={(event) =>
                  setFiltroMovimiento(
                    event.target
                      .value as FiltroMovimiento
                  )
                }
              >
                <option value="todos">
                  Todos los movimientos
                </option>
                <option value="entrada">
                  Solo entradas
                </option>
                <option value="salida">
                  Solo salidas
                </option>
              </select>
            </div>

            <span>
              {movimientosFiltrados.length} movimiento
              {movimientosFiltrados.length === 1
                ? ""
                : "s"}
            </span>
          </div>

          <div className="movimientos-tabla-contenedor">
            <table className="movimientos-tabla">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>
                    Existencias anteriores
                  </th>
                  <th>
                    Existencias nuevas
                  </th>
                  <th>Motivo</th>
                </tr>
              </thead>

              <tbody>
                {movimientosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="movimientos-vacio"
                    >
                      <div>🗂️</div>
                      <strong>
                        No hay movimientos registrados
                      </strong>
                      <p>
                        Las entradas y salidas de productos
                        aparecerán aquí.
                      </p>
                    </td>
                  </tr>
                ) : (
                  movimientosFiltrados.map(
                    (movimiento) => (
                      <tr key={movimiento.id}>
                        <td>
                          {new Date(
                            movimiento.fecha
                          ).toLocaleString("es-MX")}
                        </td>

                        <td>
                          <strong>
                            {
                              movimiento.productoNombre
                            }
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`tipo-movimiento ${movimiento.tipo}`}
                          >
                            {movimiento.tipo ===
                            "entrada"
                              ? "Entrada"
                              : "Salida"}
                          </span>
                        </td>

                        <td
                          className={
                            movimiento.tipo ===
                            "entrada"
                              ? "cantidad-entrada"
                              : "cantidad-salida"
                          }
                        >
                          {movimiento.tipo ===
                          "entrada"
                            ? "+"
                            : "−"}
                          {movimiento.cantidad}
                        </td>

                        <td>
                          {
                            movimiento.existenciasAnteriores
                          }
                        </td>

                        <td>
                          {
                            movimiento.existenciasNuevas
                          }
                        </td>

                        <td>
                          {movimiento.motivo}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {productoEntrada && (
        <div className="entrada-modal-fondo">
          <div className="entrada-modal">
            <div className="entrada-modal-header">
              <div>
                <span>
                  REGISTRAR MOVIMIENTO
                </span>
                <h2>
                  Entrada de mercancía
                </h2>
              </div>

              <button
                type="button"
                onClick={cerrarEntrada}
                disabled={procesandoEntrada}
              >
                ×
              </button>
            </div>

            <div className="entrada-producto">
              <div className="entrada-producto-icono">
                📦
              </div>

              <div>
                <span>
                  Producto seleccionado
                </span>
                <strong>
                  {productoEntrada.nombre}
                </strong>
                <p>
                  Código:{" "}
                  {productoEntrada.codigo}
                </p>
              </div>
            </div>

            <div className="entrada-existencias">
              <span>
                Existencias actuales
              </span>
              <strong>
                {productoEntrada.existencias}
              </strong>
            </div>

            <label className="entrada-cantidad">
              Cantidad que ingresará

              <input
                type="number"
                min="1"
                step="1"
                autoFocus
                value={cantidadEntrada}
                disabled={procesandoEntrada}
                onChange={(event) => {
                  setCantidadEntrada(
                    event.target.value
                  );
                  setErrorEntrada("");
                }}
                placeholder="Ejemplo: 10"
              />
            </label>

            {cantidadEntrada !== "" && (
              <div className="entrada-nuevo-stock">
                <span>
                  Nuevas existencias
                </span>

                <strong>
                  {productoEntrada.existencias +
                    (Number(cantidadEntrada) ||
                      0)}
                </strong>
              </div>
            )}

            {errorEntrada && (
              <p className="entrada-error">
                {errorEntrada}
              </p>
            )}

            <div className="entrada-modal-acciones">
              <button
                type="button"
                className="cancelar-entrada"
                onClick={cerrarEntrada}
                disabled={procesandoEntrada}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="confirmar-entrada"
                onClick={confirmarEntrada}
                disabled={procesandoEntrada}
              >
                {procesandoEntrada
                  ? "Registrando..."
                  : "Confirmar entrada"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mensajeEntrada && (
        <div className="entrada-exito-fondo">
          <div className="entrada-exito">
            <div>✓</div>
            <h2>Entrada registrada</h2>
            <p>{mensajeEntrada}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventario;