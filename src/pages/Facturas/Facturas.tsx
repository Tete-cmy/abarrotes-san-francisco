import { useEffect, useMemo, useState } from "react";
import "./Facturas.css";
import type { UsuarioSesion } from "../Login/Login";
import {
  cancelarFactura,
  emitirFactura,
  listarFacturas,
  listarVentasFacturables,
  type Factura,
  type VentaFacturable,
} from "../../services/facturasService";

interface FacturasProps {
  usuarioActual: UsuarioSesion;
}

function Facturas({
  usuarioActual,
}: FacturasProps) {
  const [facturas, setFacturas] =
    useState<Factura[]>([]);
  const [ventas, setVentas] =
    useState<VentaFacturable[]>([]);

  const [cargando, setCargando] =
    useState(true);
  const [procesando, setProcesando] =
    useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] =
    useState("");

  const [busqueda, setBusqueda] =
    useState("");
  const [estadoFiltro, setEstadoFiltro] =
    useState<"todos" | "emitida" | "cancelada">(
      "todos"
    );

  const [mostrarEmision, setMostrarEmision] =
    useState(false);
  const [mostrarDetalle, setMostrarDetalle] =
    useState(false);
  const [mostrarCancelacion, setMostrarCancelacion] =
    useState(false);

  const [facturaSeleccionada, setFacturaSeleccionada] =
    useState<Factura | null>(null);

  const [ventaId, setVentaId] =
    useState("");
  const [serie, setSerie] =
    useState("A");
  const [clienteNombre, setClienteNombre] =
    useState("Público general");
  const [clienteRfc, setClienteRfc] =
    useState("");
  const [clienteCorreo, setClienteCorreo] =
    useState("");
  const [porcentajeImpuesto, setPorcentajeImpuesto] =
    useState("0");
  const [motivoCancelacion, setMotivoCancelacion] =
    useState("");

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      try {
        setCargando(true);
        setError("");

        const [facturasCargadas, ventasCargadas] =
          await Promise.all([
            listarFacturas(),
            listarVentasFacturables(),
          ]);

        if (!activo) {
          return;
        }

        setFacturas(facturasCargadas);
        setVentas(ventasCargadas);
      } catch (errorCarga) {
        console.error(errorCarga);

        if (activo) {
          setError(
            errorCarga instanceof Error
              ? errorCarga.message
              : "No fue posible cargar los comprobantes."
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarDatos();

    return () => {
      activo = false;
    };
  }, []);

  const ventaSeleccionada = useMemo(
    () =>
      ventas.find(
        (venta) => venta.id === Number(ventaId)
      ) ?? null,
    [ventas, ventaId]
  );

  const facturasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return facturas.filter((factura) => {
      const coincideEstado =
        estadoFiltro === "todos" ||
        factura.estado === estadoFiltro;

      const coincideBusqueda =
        texto === "" ||
        `${factura.serie}${factura.folio}`
          .toLowerCase()
          .includes(texto) ||
        factura.clienteNombre
          .toLowerCase()
          .includes(texto) ||
        factura.clienteRfc
          .toLowerCase()
          .includes(texto) ||
        String(factura.ventaId).includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [facturas, busqueda, estadoFiltro]);

  const totalEmitido = facturas
    .filter((factura) => factura.estado === "emitida")
    .reduce(
      (total, factura) => total + factura.total,
      0
    );

  const emitidas = facturas.filter(
    (factura) => factura.estado === "emitida"
  ).length;

  const canceladas = facturas.filter(
    (factura) => factura.estado === "cancelada"
  ).length;

  const ventasDisponibles = ventas.filter(
    (venta) => !venta.yaFacturada
  );

  function mostrarMensaje(mensaje: string) {
    setMensajeExito(mensaje);

    window.setTimeout(() => {
      setMensajeExito("");
    }, 1800);
  }

  function abrirEmision() {
    setVentaId("");
    setSerie("A");
    setClienteNombre("Público general");
    setClienteRfc("");
    setClienteCorreo("");
    setPorcentajeImpuesto("0");
    setError("");
    setMostrarEmision(true);
  }

  async function guardarEmision(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (procesando) {
      return;
    }

    const idVenta = Number(ventaId);
    const impuesto = Number(porcentajeImpuesto);

    if (
      !Number.isInteger(idVenta) ||
      idVenta <= 0
    ) {
      setError("Selecciona una venta válida.");
      return;
    }

    if (!clienteNombre.trim()) {
      setError(
        "El nombre del cliente es obligatorio."
      );
      return;
    }

    if (
      clienteCorreo.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        clienteCorreo.trim()
      )
    ) {
      setError(
        "Ingresa un correo electrónico válido."
      );
      return;
    }

    if (
      !Number.isFinite(impuesto) ||
      impuesto < 0
    ) {
      setError(
        "El porcentaje de impuesto no es válido."
      );
      return;
    }

    try {
      setProcesando(true);
      setError("");

      const creada = await emitirFactura({
        ventaId: idVenta,
        serie,
        clienteId: null,
        clienteNombre,
        clienteRfc:
          clienteRfc.toUpperCase(),
        clienteCorreo,
        porcentajeImpuesto: impuesto,
        usuarioId: usuarioActual.id,
        emitidaPor:
          usuarioActual.nombreCompleto,
      });

      const [facturasActualizadas, ventasActualizadas] =
        await Promise.all([
          listarFacturas(),
          listarVentasFacturables(),
        ]);

      setFacturas(facturasActualizadas);
      setVentas(ventasActualizadas);
      setMostrarEmision(false);
      setFacturaSeleccionada(creada);
      setMostrarDetalle(true);

      mostrarMensaje(
        `Comprobante ${creada.serie}-${String(
          creada.folio
        ).padStart(5, "0")} emitido correctamente.`
      );
    } catch (errorGuardado) {
      console.error(errorGuardado);

      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No fue posible emitir el comprobante."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarCancelacion(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!facturaSeleccionada || procesando) {
      return;
    }

    if (!motivoCancelacion.trim()) {
      setError(
        "Escribe el motivo de cancelación."
      );
      return;
    }

    try {
      setProcesando(true);
      setError("");

      const actualizada = await cancelarFactura({
        facturaId: facturaSeleccionada.id,
        motivo: motivoCancelacion,
        canceladaPor:
          usuarioActual.nombreCompleto,
      });

      const facturasActualizadas =
        await listarFacturas();

      setFacturas(facturasActualizadas);
      setFacturaSeleccionada(actualizada);
      setMostrarCancelacion(false);
      setMotivoCancelacion("");

      mostrarMensaje(
        "Comprobante cancelado correctamente."
      );
    } catch (errorCancelacion) {
      console.error(errorCancelacion);

      setError(
        errorCancelacion instanceof Error
          ? errorCancelacion.message
          : "No fue posible cancelar el comprobante."
      );
    } finally {
      setProcesando(false);
    }
  }

  function imprimirFactura(
    factura: Factura
  ) {
    setFacturaSeleccionada(factura);
    setMostrarDetalle(true);

    window.setTimeout(() => {
      window.print();
    }, 150);
  }

  return (
    <div className="facturas-page">
      <main className="facturas-main">
        <section className="facturas-titulo">
          <div>
            <p>MÓDULO DE COMPROBANTES</p>
            <h1>Facturas internas</h1>
            <span>
              Genera, consulta, imprime y cancela
              comprobantes de ventas.
            </span>
          </div>

          <button
            type="button"
            className="facturas-boton-principal"
            onClick={abrirEmision}
            disabled={
              cargando ||
              procesando ||
              ventasDisponibles.length === 0
            }
          >
            + Emitir comprobante
          </button>
        </section>

        <div className="facturas-aviso">
          <span>ℹ️</span>
          <p>
            Estos documentos son comprobantes internos.
            No son CFDI timbrados ante el SAT.
          </p>
        </div>

        <section className="facturas-resumen">
          <article>
            <div className="facturas-resumen-icono naranja">
              🧾
            </div>
            <div>
              <span>Comprobantes emitidos</span>
              <strong>{facturas.length}</strong>
              <p>Histórico total</p>
            </div>
          </article>

          <article>
            <div className="facturas-resumen-icono verde">
              ✓
            </div>
            <div>
              <span>Vigentes</span>
              <strong>{emitidas}</strong>
              <p>Documentos emitidos</p>
            </div>
          </article>

          <article>
            <div className="facturas-resumen-icono rojo">
              ×
            </div>
            <div>
              <span>Cancelados</span>
              <strong>{canceladas}</strong>
              <p>Documentos anulados</p>
            </div>
          </article>

          <article>
            <div className="facturas-resumen-icono morado">
              💼
            </div>
            <div>
              <span>Total vigente</span>
              <strong>
                ${totalEmitido.toFixed(2)}
              </strong>
              <p>Importe acumulado</p>
            </div>
          </article>

          <article>
            <div className="facturas-resumen-icono azul">
              🛒
            </div>
            <div>
              <span>Ventas disponibles</span>
              <strong>
                {ventasDisponibles.length}
              </strong>
              <p>Sin comprobante</p>
            </div>
          </article>
        </section>

        {error && (
          <div className="facturas-error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        <section className="facturas-panel">
          <div className="facturas-panel-header">
            <div>
              <p>HISTORIAL</p>
              <h2>Comprobantes registrados</h2>
            </div>

            <span>
              {facturasFiltradas.length} resultado
              {facturasFiltradas.length === 1
                ? ""
                : "s"}
            </span>
          </div>

          <div className="facturas-filtros">
            <input
              type="search"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
              placeholder="Buscar por folio, cliente, RFC o venta"
            />

            <select
              value={estadoFiltro}
              onChange={(event) =>
                setEstadoFiltro(
                  event.target.value as
                    | "todos"
                    | "emitida"
                    | "cancelada"
                )
              }
            >
              <option value="todos">
                Todos los estados
              </option>
              <option value="emitida">
                Emitidos
              </option>
              <option value="cancelada">
                Cancelados
              </option>
            </select>
          </div>

          <div className="facturas-tabla-contenedor">
            <table className="facturas-tabla">
              <thead>
                <tr>
                  <th>Serie / Folio</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Venta</th>
                  <th>Subtotal</th>
                  <th>Impuestos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargando ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="facturas-vacio"
                    >
                      Cargando comprobantes...
                    </td>
                  </tr>
                ) : facturasFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="facturas-vacio"
                    >
                      <div>🧾</div>
                      <strong>
                        No hay comprobantes registrados
                      </strong>
                      <p>
                        Emite un comprobante desde una
                        venta.
                      </p>
                    </td>
                  </tr>
                ) : (
                  facturasFiltradas.map(
                    (factura) => (
                      <tr key={factura.id}>
                        <td>
                          <strong>
                            {factura.serie}-
                            {String(
                              factura.folio
                            ).padStart(5, "0")}
                          </strong>
                        </td>

                        <td>
                          {new Date(
                            factura.fecha
                          ).toLocaleString("es-MX")}
                        </td>

                        <td>
                          <strong>
                            {
                              factura.clienteNombre
                            }
                          </strong>
                          <span>
                            {factura.clienteRfc ||
                              "Sin RFC"}
                          </span>
                        </td>

                        <td>
                          #{factura.ventaId}
                        </td>

                        <td>
                          $
                          {factura.subtotal.toFixed(
                            2
                          )}
                        </td>

                        <td>
                          $
                          {factura.impuestos.toFixed(
                            2
                          )}
                        </td>

                        <td className="factura-total">
                          $
                          {factura.total.toFixed(2)}
                        </td>

                        <td>
                          <span
                            className={`factura-estado ${factura.estado}`}
                          >
                            {factura.estado ===
                            "emitida"
                              ? "Emitida"
                              : "Cancelada"}
                          </span>
                        </td>

                        <td>
                          <div className="facturas-acciones">
                            <button
                              type="button"
                              onClick={() => {
                                setFacturaSeleccionada(
                                  factura
                                );
                                setMostrarDetalle(
                                  true
                                );
                              }}
                            >
                              Ver
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                imprimirFactura(
                                  factura
                                )
                              }
                            >
                              Imprimir
                            </button>

                            {factura.estado ===
                              "emitida" && (
                              <button
                                type="button"
                                className="factura-cancelar"
                                onClick={() => {
                                  setFacturaSeleccionada(
                                    factura
                                  );
                                  setMotivoCancelacion(
                                    ""
                                  );
                                  setError("");
                                  setMostrarCancelacion(
                                    true
                                  );
                                }}
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
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

      {mostrarEmision && (
        <div className="facturas-modal-fondo">
          <div className="facturas-modal">
            <div className="facturas-modal-header">
              <div>
                <span>NUEVO COMPROBANTE</span>
                <h2>Emitir comprobante</h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMostrarEmision(false)
                }
                disabled={procesando}
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarEmision}>
              <div className="facturas-form-grid">
                <label className="facturas-completo">
                  Venta
                  <select
                    value={ventaId}
                    onChange={(event) => {
                      setVentaId(
                        event.target.value
                      );
                      setError("");
                    }}
                    disabled={procesando}
                  >
                    <option value="">
                      Selecciona una venta
                    </option>

                    {ventasDisponibles.map(
                      (venta) => (
                        <option
                          key={venta.id}
                          value={venta.id}
                        >
                          Venta #{venta.id} ·{" "}
                          {new Date(
                            venta.fecha
                          ).toLocaleString(
                            "es-MX"
                          )}{" "}
                          · ${venta.total.toFixed(2)}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Serie
                  <input
                    type="text"
                    maxLength={10}
                    value={serie}
                    onChange={(event) =>
                      setSerie(
                        event.target.value.toUpperCase()
                      )
                    }
                  />
                </label>

                <label>
                  Impuesto incluido (%)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={porcentajeImpuesto}
                    onChange={(event) =>
                      setPorcentajeImpuesto(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="facturas-completo">
                  Nombre del cliente
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(event) =>
                      setClienteNombre(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  RFC
                  <input
                    type="text"
                    value={clienteRfc}
                    onChange={(event) =>
                      setClienteRfc(
                        event.target.value.toUpperCase()
                      )
                    }
                  />
                </label>

                <label>
                  Correo
                  <input
                    type="email"
                    value={clienteCorreo}
                    onChange={(event) =>
                      setClienteCorreo(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              {ventaSeleccionada && (
                <div className="facturas-venta-preview">
                  <div>
                    <span>Venta</span>
                    <strong>
                      #{ventaSeleccionada.id}
                    </strong>
                  </div>
                  <div>
                    <span>Productos</span>
                    <strong>
                      {
                        ventaSeleccionada
                          .productos.length
                      }
                    </strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>
                      $
                      {ventaSeleccionada.total.toFixed(
                        2
                      )}
                    </strong>
                  </div>
                </div>
              )}

              {error && (
                <div className="facturas-error">
                  <span>⚠️</span>
                  <p>{error}</p>
                </div>
              )}

              <div className="facturas-modal-acciones">
                <button
                  type="button"
                  className="facturas-boton-cancelar"
                  onClick={() =>
                    setMostrarEmision(false)
                  }
                  disabled={procesando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="facturas-boton-guardar"
                  disabled={procesando}
                >
                  {procesando
                    ? "Emitiendo..."
                    : "Emitir comprobante"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarDetalle && facturaSeleccionada && (
        <div className="facturas-modal-fondo">
          <div className="facturas-modal factura-documento">
            <div className="facturas-modal-header no-imprimir">
              <div>
                <span>COMPROBANTE</span>
                <h2>
                  {facturaSeleccionada.serie}-
                  {String(
                    facturaSeleccionada.folio
                  ).padStart(5, "0")}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMostrarDetalle(false)
                }
              >
                ×
              </button>
            </div>

            <div className="factura-documento-encabezado">
              <img
                src="/logo.png"
                alt="Logo de Abarrotes San Francisco"
              />

              <div>
                <h2>
                  Abarrotes San Francisco
                </h2>
                <p>
                  Comprobante interno de venta
                </p>
              </div>

              <div>
                <strong>
                  {facturaSeleccionada.serie}-
                  {String(
                    facturaSeleccionada.folio
                  ).padStart(5, "0")}
                </strong>
                <span>
                  {new Date(
                    facturaSeleccionada.fecha
                  ).toLocaleString("es-MX")}
                </span>
              </div>
            </div>

            <div className="factura-documento-datos">
              <div>
                <span>Cliente</span>
                <strong>
                  {
                    facturaSeleccionada
                      .clienteNombre
                  }
                </strong>
                <p>
                  RFC:{" "}
                  {facturaSeleccionada
                    .clienteRfc || "Sin registrar"}
                </p>
                <p>
                  Correo:{" "}
                  {facturaSeleccionada
                    .clienteCorreo ||
                    "Sin registrar"}
                </p>
              </div>

              <div>
                <span>Venta relacionada</span>
                <strong>
                  #{facturaSeleccionada.ventaId}
                </strong>
                <p>
                  Emitida por:{" "}
                  {
                    facturaSeleccionada
                      .emitidaPor
                  }
                </p>
              </div>
            </div>

            <table className="factura-documento-tabla">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Importe</th>
                </tr>
              </thead>

              <tbody>
                {facturaSeleccionada.productos.map(
                  (producto) => (
                    <tr key={producto.id}>
                      <td>
                        {producto.descripcion}
                      </td>
                      <td>
                        {producto.cantidad}
                      </td>
                      <td>
                        $
                        {producto.precioUnitario.toFixed(
                          2
                        )}
                      </td>
                      <td>
                        $
                        {producto.importe.toFixed(2)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            <div className="factura-documento-totales">
              <div>
                <span>Subtotal</span>
                <strong>
                  $
                  {facturaSeleccionada.subtotal.toFixed(
                    2
                  )}
                </strong>
              </div>
              <div>
                <span>Impuestos</span>
                <strong>
                  $
                  {facturaSeleccionada.impuestos.toFixed(
                    2
                  )}
                </strong>
              </div>
              <div className="factura-documento-total">
                <span>Total</span>
                <strong>
                  $
                  {facturaSeleccionada.total.toFixed(
                    2
                  )}
                </strong>
              </div>
            </div>

            {facturaSeleccionada.estado ===
              "cancelada" && (
              <div className="factura-documento-cancelada">
                CANCELADA
                <span>
                  {
                    facturaSeleccionada
                      .motivoCancelacion
                  }
                </span>
              </div>
            )}

            <div className="factura-documento-pie">
              <p>
                Documento interno sin validez fiscal.
              </p>
            </div>

            <div className="facturas-modal-acciones no-imprimir">
              <button
                type="button"
                className="facturas-boton-cancelar"
                onClick={() =>
                  setMostrarDetalle(false)
                }
              >
                Cerrar
              </button>

              <button
                type="button"
                className="facturas-boton-guardar"
                onClick={() => window.print()}
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarCancelacion &&
        facturaSeleccionada && (
          <div className="facturas-modal-fondo">
            <div className="facturas-modal facturas-modal-pequeno">
              <div className="facturas-modal-header">
                <div>
                  <span>CANCELAR COMPROBANTE</span>
                  <h2>
                    {facturaSeleccionada.serie}-
                    {String(
                      facturaSeleccionada.folio
                    ).padStart(5, "0")}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMostrarCancelacion(
                      false
                    )
                  }
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={confirmarCancelacion}
              >
                <label>
                  Motivo de cancelación
                  <textarea
                    rows={5}
                    value={motivoCancelacion}
                    onChange={(event) => {
                      setMotivoCancelacion(
                        event.target.value
                      );
                      setError("");
                    }}
                    placeholder="Explica por qué se cancela el comprobante"
                  />
                </label>

                {error && (
                  <div className="facturas-error">
                    <span>⚠️</span>
                    <p>{error}</p>
                  </div>
                )}

                <div className="facturas-modal-acciones">
                  <button
                    type="button"
                    className="facturas-boton-cancelar"
                    onClick={() =>
                      setMostrarCancelacion(
                        false
                      )
                    }
                  >
                    Volver
                  </button>

                  <button
                    type="submit"
                    className="facturas-boton-peligro"
                    disabled={procesando}
                  >
                    {procesando
                      ? "Cancelando..."
                      : "Confirmar cancelación"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {mensajeExito && (
        <div className="facturas-exito-fondo">
          <div className="facturas-exito">
            <div>✓</div>
            <h2>Operación completada</h2>
            <p>{mensajeExito}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Facturas;