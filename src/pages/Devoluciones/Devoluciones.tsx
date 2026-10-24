import { useEffect, useMemo, useState } from "react";
import "./Devoluciones.css";
import {
  listarDevoluciones,
  type Devolucion,
} from "../../services/devolucionesService";

function Devoluciones() {
  const [devoluciones, setDevoluciones] =
    useState<Devolucion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [seleccionada, setSeleccionada] =
    useState<Devolucion | null>(null);

  const [anchoComprobante, setAnchoComprobante] =
    useState<"58mm" | "80mm">("80mm");

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        setCargando(true);
        setErrorCarga("");

        const datos =
          await listarDevoluciones();

        if (!activo) return;

        setDevoluciones(datos);
      } catch (error) {
        console.error(error);

        if (!activo) return;

        setErrorCarga(
          error instanceof Error
            ? error.message
            : "No fue posible cargar las devoluciones."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargar();

    return () => {
      activo = false;
    };
  }, []);

  const filtradas = useMemo(() => {
    const texto =
      busqueda.toLowerCase().trim();

    return devoluciones.filter(
      (devolucion) =>
        String(devolucion.id).includes(texto) ||
        String(devolucion.ventaId).includes(texto) ||
        devolucion.motivo
          .toLowerCase()
          .includes(texto) ||
        devolucion.solicitadoPor
          .toLowerCase()
          .includes(texto) ||
        devolucion.autorizadoPor
          .toLowerCase()
          .includes(texto) ||
        devolucion.productos.some(
          (producto) =>
            producto.nombreProducto
              .toLowerCase()
              .includes(texto)
        )
    );
  }, [devoluciones, busqueda]);

  const totalDevuelto = devoluciones.reduce(
    (total, devolucion) =>
      total + devolucion.total,
    0
  );

  const unidadesDevueltas =
    devoluciones.reduce(
      (total, devolucion) =>
        total +
        devolucion.productos.reduce(
          (subtotal, producto) =>
            subtotal + producto.cantidad,
          0
        ),
      0
    );

  return (
    <div className="devoluciones-page">
      <main className="devoluciones-main">
        <section className="devoluciones-titulo">
          <div>
            <p>MÓDULO DE DEVOLUCIONES</p>
            <h1>Historial de devoluciones</h1>
            <span>
              Consulta productos devueltos,
              motivos, importes y autorizaciones.
            </span>
          </div>
        </section>

        <section className="devoluciones-resumen">
          <article>
            <div>↩️</div>
            <span>Devoluciones</span>
            <strong>{devoluciones.length}</strong>
            <p>Movimientos registrados</p>
          </article>

          <article>
            <div>📦</div>
            <span>Unidades devueltas</span>
            <strong>{unidadesDevueltas}</strong>
            <p>Productos regresados</p>
          </article>

          <article>
            <div>💵</div>
            <span>Importe devuelto</span>
            <strong>
              ${totalDevuelto.toFixed(2)}
            </strong>
            <p>Total histórico</p>
          </article>
        </section>

        {errorCarga && (
          <div className="devoluciones-error">
            <span>⚠️</span>
            <p>{errorCarga}</p>
          </div>
        )}

        <section className="devoluciones-panel">
          <div className="devoluciones-panel-header">
            <div>
              <p>REGISTRO GENERAL</p>
              <h2>Devoluciones registradas</h2>
            </div>

            <span>
              {filtradas.length} resultado
              {filtradas.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="devoluciones-herramientas">
            <input
              type="text"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
              placeholder="Buscar por folio, ticket, producto, motivo o empleado"
            />
          </div>

          <div className="devoluciones-tabla-contenedor">
            <table className="devoluciones-tabla">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Ticket original</th>
                  <th>Fecha</th>
                  <th>Productos</th>
                  <th>Motivo</th>
                  <th>Total</th>
                  <th>Autorizó</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargando ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="devoluciones-vacio"
                    >
                      Cargando devoluciones...
                    </td>
                  </tr>
                ) : filtradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="devoluciones-vacio"
                    >
                      No hay devoluciones registradas.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((devolucion) => (
                    <tr key={devolucion.id}>
                      <td>
                        #
                        {String(
                          devolucion.id
                        ).padStart(6, "0")}
                      </td>

                      <td>
                        #
                        {String(
                          devolucion.ventaId
                        ).padStart(6, "0")}
                      </td>

                      <td>
                        {new Date(
                          devolucion.fecha
                        ).toLocaleString("es-MX")}
                      </td>

                      <td>
                        <strong>
                          {devolucion.productos.reduce(
                            (total, producto) =>
                              total +
                              producto.cantidad,
                            0
                          )}{" "}
                          unidad
                          {devolucion.productos.reduce(
                            (total, producto) =>
                              total +
                              producto.cantidad,
                            0
                          ) === 1
                            ? ""
                            : "es"}
                        </strong>

                        <span>
                          {devolucion.productos
                            .map(
                              (producto) =>
                                producto.nombreProducto
                            )
                            .join(", ")}
                        </span>
                      </td>

                      <td>{devolucion.motivo}</td>

                      <td className="devolucion-total">
                        ${devolucion.total.toFixed(2)}
                      </td>

                      <td>
                        {devolucion.autorizadoPor}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            setSeleccionada(devolucion)
                          }
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {seleccionada && (
        <div className="devolucion-detalle-fondo">
          <div
            className={`devolucion-detalle-modal comprobante-${anchoComprobante}`}
          >
            <div className="devolucion-comprobante-marca">
              <img
                src="/logo.png"
                alt="Abarrotes San Francisco"
              />

              <div>
                <strong>
                  Abarrotes San Francisco
                </strong>
                <span>
                  Comprobante de devolución
                </span>
              </div>
            </div>

            <div className="devolucion-detalle-header">
              <div>
                <span>COMPROBANTE DE DEVOLUCIÓN</span>
                <h2>
                  Folio #
                  {String(
                    seleccionada.id
                  ).padStart(6, "0")}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSeleccionada(null)
                }
              >
                ×
              </button>
            </div>

            <div className="devolucion-detalle-datos">
              <p>
                <strong>Ticket original:</strong>{" "}
                #
                {String(
                  seleccionada.ventaId
                ).padStart(6, "0")}
              </p>

              <p>
                <strong>Fecha:</strong>{" "}
                {new Date(
                  seleccionada.fecha
                ).toLocaleString("es-MX")}
              </p>

              <p>
                <strong>Motivo:</strong>{" "}
                {seleccionada.motivo}
              </p>

              <p>
                <strong>Solicitó:</strong>{" "}
                {seleccionada.solicitadoPor}
              </p>

              <p>
                <strong>Autorizó:</strong>{" "}
                {seleccionada.autorizadoPor}
              </p>
            </div>

            <div className="devolucion-detalle-productos">
              {seleccionada.productos.map(
                (producto) => (
                  <article key={producto.id}>
                    <div>
                      <strong>
                        {producto.nombreProducto}
                      </strong>

                      <span>
                        {producto.cantidad} × $
                        {producto.precioVenta.toFixed(2)}
                      </span>
                    </div>

                    <strong>
                      ${producto.subtotal.toFixed(2)}
                    </strong>
                  </article>
                )
              )}
            </div>

            <div className="devolucion-detalle-total">
              <span>Total devuelto</span>
              <strong>
                ${seleccionada.total.toFixed(2)}
              </strong>
            </div>

            <div className="devolucion-comprobante-mensaje">
              <strong>
                Movimiento registrado correctamente
              </strong>
              <p>
                Conserve este comprobante para cualquier
                aclaración.
              </p>
            </div>

            <div className="selector-comprobante">
              <span>Ancho de impresión</span>

              <div>
                <button
                  type="button"
                  className={
                    anchoComprobante === "58mm"
                      ? "activo"
                      : ""
                  }
                  onClick={() =>
                    setAnchoComprobante("58mm")
                  }
                >
                  58 mm
                </button>

                <button
                  type="button"
                  className={
                    anchoComprobante === "80mm"
                      ? "activo"
                      : ""
                  }
                  onClick={() =>
                    setAnchoComprobante("80mm")
                  }
                >
                  80 mm
                </button>
              </div>
            </div>

            <div className="devolucion-detalle-acciones">
              <button
                type="button"
                onClick={() =>
                  setSeleccionada(null)
                }
              >
                Cerrar
              </button>

              <button
                type="button"
                className="imprimir"
                onClick={() => window.print()}
              >
                Imprimir comprobante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Devoluciones;