import { useEffect, useMemo, useState } from "react";
import "./Creditos.css";
import type { UsuarioSesion } from "../Login/Login";
import {
  listarClientes,
  type Cliente,
} from "../../services/clientesService";
import {
  listarAbonosCredito,
  listarCreditos,
  registrarAbono,
  registrarCredito,
  type AbonoCredito,
  type Credito,
  type EstadoCredito,
  type MetodoAbono,
} from "../../services/creditoService";

interface CreditosProps {
  usuarioActual: UsuarioSesion;
}

type FiltroEstado = "todos" | EstadoCredito;

function Creditos({
  usuarioActual,
}: CreditosProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("todos");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorFormulario, setErrorFormulario] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [mostrarNuevoCredito, setMostrarNuevoCredito] =
    useState(false);
  const [clienteId, setClienteId] = useState("");
  const [concepto, setConcepto] =
    useState("Venta a crédito");
  const [importeCredito, setImporteCredito] = useState("");

  const [creditoSeleccionado, setCreditoSeleccionado] =
    useState<Credito | null>(null);
  const [mostrarAbono, setMostrarAbono] = useState(false);
  const [importeAbono, setImporteAbono] = useState("");
  const [metodoAbono, setMetodoAbono] =
    useState<MetodoAbono>("efectivo");
  const [abonos, setAbonos] = useState<AbonoCredito[]>([]);
  const [cargandoAbonos, setCargandoAbonos] = useState(false);

  useEffect(() => {
    let componenteActivo = true;

    async function cargarDatos() {
      try {
        setCargando(true);
        setErrorCarga("");

        const [clientesCargados, creditosCargados] =
          await Promise.all([
            listarClientes(),
            listarCreditos(),
          ]);

        if (!componenteActivo) return;

        setClientes(clientesCargados);
        setCreditos(creditosCargados);

        localStorage.setItem(
          "clientes",
          JSON.stringify(clientesCargados)
        );
        localStorage.setItem(
          "creditos",
          JSON.stringify(creditosCargados)
        );
      } catch (error) {
        console.error(error);

        if (!componenteActivo) return;

        setErrorCarga(
          error instanceof Error
            ? error.message
            : "No fue posible cargar los créditos."
        );
      } finally {
        if (componenteActivo) {
          setCargando(false);
        }
      }
    }

    cargarDatos();

    return () => {
      componenteActivo = false;
    };
  }, []);

  const creditosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    return creditos.filter((credito) => {
      const coincideBusqueda =
        credito.clienteNombre.toLowerCase().includes(texto) ||
        credito.concepto.toLowerCase().includes(texto) ||
        String(credito.id).includes(texto);

      const coincideEstado =
        filtroEstado === "todos" ||
        credito.estado === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [creditos, busqueda, filtroEstado]);

  const saldoTotal = creditos.reduce(
    (total, credito) => total + credito.saldoRestante,
    0
  );

  const creditosPendientes = creditos.filter(
    (credito) => credito.estado !== "liquidado"
  ).length;

  const creditosLiquidados = creditos.filter(
    (credito) => credito.estado === "liquidado"
  ).length;

  const totalOtorgado = creditos.reduce(
    (total, credito) => total + credito.importe,
    0
  );

  function mostrarMensaje(mensaje: string) {
    setMensajeExito(mensaje);

    window.setTimeout(() => {
      setMensajeExito("");
    }, 1800);
  }

  function abrirNuevoCredito() {
    setClienteId("");
    setConcepto("Venta a crédito");
    setImporteCredito("");
    setErrorFormulario("");
    setMostrarNuevoCredito(true);
  }

  async function guardarCredito(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (procesando) return;

    const idCliente = Number(clienteId);
    const importe = Number(importeCredito);

    if (!Number.isInteger(idCliente) || idCliente <= 0) {
      setErrorFormulario("Selecciona un cliente.");
      return;
    }

    if (!Number.isFinite(importe) || importe <= 0) {
      setErrorFormulario(
        "El importe debe ser mayor que cero."
      );
      return;
    }

    try {
      setProcesando(true);
      setErrorFormulario("");

      const nuevo = await registrarCredito({
        clienteId: idCliente,
        concepto,
        importe,
        usuarioId: usuarioActual.id,
        atendidoPor: usuarioActual.nombreCompleto,
      });

      const [creditosActualizados, clientesActualizados] =
        await Promise.all([
          listarCreditos(),
          listarClientes(),
        ]);

      setCreditos(creditosActualizados);
      setClientes(clientesActualizados);
      setMostrarNuevoCredito(false);
      mostrarMensaje(
        `Crédito #${nuevo.id} registrado correctamente.`
      );
    } catch (error) {
      console.error(error);

      setErrorFormulario(
        error instanceof Error
          ? error.message
          : "No fue posible registrar el crédito."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function abrirDetalle(credito: Credito) {
    setCreditoSeleccionado(credito);
    setCargandoAbonos(true);
    setAbonos([]);

    try {
      const datos = await listarAbonosCredito(credito.id);
      setAbonos(datos);
    } catch (error) {
      console.error(error);
      setErrorCarga(
        "No fue posible cargar los abonos del crédito."
      );
    } finally {
      setCargandoAbonos(false);
    }
  }

  function abrirRegistroAbono(credito: Credito) {
    setCreditoSeleccionado(credito);
    setImporteAbono("");
    setMetodoAbono("efectivo");
    setErrorFormulario("");
    setMostrarAbono(true);
  }

  async function guardarAbono(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!creditoSeleccionado || procesando) return;
    const creditoId = creditoSeleccionado.id;
    const importe = Number(importeAbono);

    if (!Number.isFinite(importe) || importe <= 0) {
      setErrorFormulario(
        "El importe del abono debe ser mayor que cero."
      );
      return;
    }

    if (importe > creditoSeleccionado.saldoRestante) {
      setErrorFormulario(
        "El abono no puede ser mayor que el saldo pendiente."
      );
      return;
    }

    try {
      setProcesando(true);
      setErrorFormulario("");

      await registrarAbono({
        creditoId,
        importe,
        metodoPago: metodoAbono,
        usuarioId: usuarioActual.id,
        atendidoPor: usuarioActual.nombreCompleto,
        });

      const [creditosActualizados, clientesActualizados] =
        await Promise.all([
          listarCreditos(),
          listarClientes(),
        ]);

      setCreditos(creditosActualizados);
      setClientes(clientesActualizados);

     const actualizado = creditosActualizados.find(
    (credito: Credito) => credito.id === creditoId
    );
      setCreditoSeleccionado(actualizado ?? null);
      setMostrarAbono(false);
      mostrarMensaje("Abono registrado correctamente.");

      if (actualizado) {
        const abonosActualizados =
          await listarAbonosCredito(actualizado.id);
        setAbonos(abonosActualizados);
      }
    } catch (error) {
      console.error(error);

      setErrorFormulario(
        error instanceof Error
          ? error.message
          : "No fue posible registrar el abono."
      );
    } finally {
      setProcesando(false);
    }
  }

  const clienteSeleccionado = clientes.find(
    (cliente) => cliente.id === Number(clienteId)
  );

  return (
    <div className="creditos-page">
      <main className="creditos-main">
        <section className="creditos-titulo">
          <div>
            <p>MÓDULO DE CRÉDITOS</p>
            <h1>Créditos y abonos</h1>
            <span>
              Controla ventas fiadas, saldos pendientes y
              pagos de clientes.
            </span>
          </div>

          <button
            type="button"
            className="creditos-boton-principal"
            onClick={abrirNuevoCredito}
            disabled={cargando || procesando}
          >
            + Nuevo crédito
          </button>
        </section>

        <section className="creditos-resumen">
          <article>
            <div className="creditos-resumen-icono naranja">💳</div>
            <div>
              <span>Total otorgado</span>
              <strong>${totalOtorgado.toFixed(2)}</strong>
              <p>Importe histórico</p>
            </div>
          </article>

          <article>
            <div className="creditos-resumen-icono rojo">💵</div>
            <div>
              <span>Saldo pendiente</span>
              <strong>${saldoTotal.toFixed(2)}</strong>
              <p>Total por cobrar</p>
            </div>
          </article>

          <article>
            <div className="creditos-resumen-icono azul">⌛</div>
            <div>
              <span>Créditos abiertos</span>
              <strong>{creditosPendientes}</strong>
              <p>Pendientes o parciales</p>
            </div>
          </article>

          <article>
            <div className="creditos-resumen-icono verde">✓</div>
            <div>
              <span>Liquidados</span>
              <strong>{creditosLiquidados}</strong>
              <p>Créditos pagados</p>
            </div>
          </article>
        </section>

        {errorCarga && (
          <div className="creditos-error">
            <span>⚠️</span>
            <p>{errorCarga}</p>
          </div>
        )}

        <section className="creditos-panel">
          <div className="creditos-panel-header">
            <div>
              <p>ESTADO DE CUENTA</p>
              <h2>Créditos registrados</h2>
            </div>

            <span>
              {creditosFiltrados.length} resultado
              {creditosFiltrados.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="creditos-herramientas">
            <input
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por cliente, concepto o folio"
            />

            <select
              value={filtroEstado}
              onChange={(event) =>
                setFiltroEstado(event.target.value as FiltroEstado)
              }
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="parcial">Con abonos</option>
              <option value="liquidado">Liquidados</option>
            </select>
          </div>

          <div className="creditos-tabla-contenedor">
            <table className="creditos-tabla">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Importe</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={8} className="creditos-vacio">
                      <div>⏳</div>
                      <strong>Cargando créditos...</strong>
                    </td>
                  </tr>
                ) : creditosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="creditos-vacio">
                      <div>💳</div>
                      <strong>No hay créditos registrados</strong>
                      <p>
                        Registra un crédito para comenzar el control
                        de saldos.
                      </p>
                    </td>
                  </tr>
                ) : (
                  creditosFiltrados.map((credito) => (
                    <tr key={credito.id}>
                      <td>#{String(credito.id).padStart(5, "0")}</td>
                      <td>
                        <strong>{credito.clienteNombre}</strong>
                        <span>Cliente #{credito.clienteId}</span>
                      </td>
                      <td>
                        {new Date(credito.fecha).toLocaleString(
                          "es-MX"
                        )}
                      </td>
                      <td>{credito.concepto}</td>
                      <td>${credito.importe.toFixed(2)}</td>
                      <td className="creditos-saldo">
                        ${credito.saldoRestante.toFixed(2)}
                      </td>
                      <td>
                        <span
                          className={`credito-estado ${credito.estado}`}
                        >
                          {credito.estado === "pendiente"
                            ? "Pendiente"
                            : credito.estado === "parcial"
                              ? "Con abonos"
                              : "Liquidado"}
                        </span>
                      </td>
                      <td>
                        <div className="creditos-acciones">
                          <button
                            type="button"
                            className="creditos-detalle"
                            onClick={() => abrirDetalle(credito)}
                          >
                            Ver
                          </button>

                          {credito.estado !== "liquidado" && (
                              <button
                                type="button"
                                className="creditos-abono"
                                onClick={() => abrirRegistroAbono(credito)}
                                disabled={procesando}
                              >
                                Abonar
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {mostrarNuevoCredito && (
        <div className="creditos-modal-fondo">
          <div className="creditos-modal">
            <div className="creditos-modal-header">
              <div>
                <span>NUEVO MOVIMIENTO</span>
                <h2>Registrar crédito</h2>
              </div>

              <button
                type="button"
                onClick={() => setMostrarNuevoCredito(false)}
                disabled={procesando}
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarCredito}>
              <label>
                Cliente
                <select
                  value={clienteId}
                  onChange={(event) => {
                    setClienteId(event.target.value);
                    setErrorFormulario("");
                  }}
                  disabled={procesando}
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes
                    .filter((cliente) => cliente.activo)
                    .map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombreCompleto}
                      </option>
                    ))}
                </select>
              </label>

              {clienteSeleccionado && (
                <div className="credito-cliente-resumen">
                  <div>
                    <span>Límite autorizado</span>
                    <strong>
                      ${clienteSeleccionado.limiteCredito.toFixed(2)}
                    </strong>
                  </div>

                  <div>
                    <span>Saldo actual</span>
                    <strong>
                      ${clienteSeleccionado.saldoPendiente.toFixed(2)}
                    </strong>
                  </div>

                  <div>
                    <span>Disponible</span>
                    <strong>
                      $
                      {Math.max(
                        clienteSeleccionado.limiteCredito -
                          clienteSeleccionado.saldoPendiente,
                        0
                      ).toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}

              <label>
                Concepto
                <input
                  type="text"
                  value={concepto}
                  onChange={(event) => {
                    setConcepto(event.target.value);
                    setErrorFormulario("");
                  }}
                  disabled={procesando}
                />
              </label>

              <label>
                Importe del crédito
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={importeCredito}
                  onChange={(event) => {
                    setImporteCredito(event.target.value);
                    setErrorFormulario("");
                  }}
                  disabled={procesando}
                />
              </label>

              {errorFormulario && (
                <div className="creditos-error">
                  <span>⚠️</span>
                  <p>{errorFormulario}</p>
                </div>
              )}

              <div className="creditos-modal-acciones">
                <button
                  type="button"
                  className="creditos-cancelar"
                  onClick={() => setMostrarNuevoCredito(false)}
                  disabled={procesando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="creditos-guardar"
                  disabled={procesando}
                >
                  {procesando
                    ? "Registrando..."
                    : "Registrar crédito"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarAbono && creditoSeleccionado && (
        <div className="creditos-modal-fondo">
          <div className="creditos-modal">
            <div className="creditos-modal-header">
              <div>
                <span>REGISTRAR PAGO</span>
                <h2>Abono a crédito</h2>
              </div>

              <button
                type="button"
                onClick={() => setMostrarAbono(false)}
                disabled={procesando}
              >
                ×
              </button>
            </div>

            <div className="credito-seleccionado">
              <strong>{creditoSeleccionado.clienteNombre}</strong>
              <span>
                Folio #{String(creditoSeleccionado.id).padStart(5, "0")}
              </span>
              <b>
                Saldo: ${creditoSeleccionado.saldoRestante.toFixed(2)}
              </b>
            </div>

            <form onSubmit={guardarAbono}>
              <label>
                Importe del abono
                <input
                  type="number"
                  min="0.01"
                  max={creditoSeleccionado.saldoRestante}
                  step="0.01"
                  value={importeAbono}
                  onChange={(event) => {
                    setImporteAbono(event.target.value);
                    setErrorFormulario("");
                  }}
                  disabled={procesando}
                />
              </label>

              <label>
                Método de pago
                <select
                  value={metodoAbono}
                  onChange={(event) =>
                    setMetodoAbono(
                      event.target.value as MetodoAbono
                    )
                  }
                  disabled={procesando}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">
                    Transferencia
                  </option>
                </select>
              </label>

              {errorFormulario && (
                <div className="creditos-error">
                  <span>⚠️</span>
                  <p>{errorFormulario}</p>
                </div>
              )}

              <div className="creditos-modal-acciones">
                <button
                  type="button"
                  className="creditos-cancelar"
                  onClick={() => setMostrarAbono(false)}
                  disabled={procesando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="creditos-guardar"
                  disabled={procesando}
                >
                  {procesando ? "Registrando..." : "Registrar abono"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {creditoSeleccionado && !mostrarAbono && (
        <div className="creditos-detalle-fondo">
          <div className="creditos-detalle-modal">
            <div className="creditos-modal-header">
              <div>
                <span>ESTADO DE CUENTA</span>
                <h2>
                  Crédito #{String(creditoSeleccionado.id).padStart(5, "0")}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setCreditoSeleccionado(null)}
              >
                ×
              </button>
            </div>

            <div className="credito-detalle-resumen">
              <div>
                <span>Cliente</span>
                <strong>{creditoSeleccionado.clienteNombre}</strong>
              </div>

              <div>
                <span>Importe original</span>
                <strong>
                  ${creditoSeleccionado.importe.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Saldo pendiente</span>
                <strong>
                  ${creditoSeleccionado.saldoRestante.toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="abonos-header">
              <h3>Historial de abonos</h3>

              {creditoSeleccionado.estado !== "liquidado" && (
                <button
                  type="button"
                  className="creditos-abono"
                  onClick={() =>
                    abrirRegistroAbono(creditoSeleccionado)
                  }
                >
                  + Registrar abono
                </button>
              )}
            </div>

            <div className="abonos-lista">
              {cargandoAbonos ? (
                <p>Cargando abonos...</p>
              ) : abonos.length === 0 ? (
                <div className="abonos-vacio">
                  <div>💵</div>
                  <strong>No hay abonos registrados</strong>
                </div>
              ) : (
                abonos.map((abono) => (
                  <article key={abono.id}>
                    <div>
                      <strong>${abono.importe.toFixed(2)}</strong>
                      <span>
                        {new Date(abono.fecha).toLocaleString(
                          "es-MX"
                        )}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {abono.metodoPago === "efectivo"
                          ? "Efectivo"
                          : abono.metodoPago === "tarjeta"
                            ? "Tarjeta"
                            : "Transferencia"}
                      </strong>
                      <span>Atendió: {abono.atendidoPor}</span>
                    </div>

                    <div>
                      <span>Saldo nuevo</span>
                      <strong>${abono.saldoNuevo.toFixed(2)}</strong>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {mensajeExito && (
        <div className="creditos-exito-fondo">
          <div className="creditos-exito">
            <div>✓</div>
            <h2>Operación completada</h2>
            <p>{mensajeExito}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Creditos;