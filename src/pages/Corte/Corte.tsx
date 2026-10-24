import { useEffect, useMemo, useState } from "react";
import "./Corte.css";
import type { UsuarioSesion } from "../Login/Login";
import {
  registrarEventoBitacora,
} from "../../services/bitacoraService";
import {
  abrirCaja,
  cerrarCaja,
  listarMovimientosCaja,
  listarTurnosCaja,
  obtenerCajaAbierta,
  obtenerResumenCaja,
  registrarMovimientoCaja,
  type MovimientoCaja,
  type ResumenCaja,
  type TipoMovimientoCaja,
  type TurnoCaja,
} from "../../services/corteService";

interface CorteProps {
  usuarioActual: UsuarioSesion;
}

const resumenVacio: ResumenCaja = {
  ventasEfectivo: 0,
  abonosEfectivo: 0,
  entradas: 0,
  salidas: 0,
  efectivoEsperado: 0,
};

function Corte({
  usuarioActual,
}: CorteProps) {
  const [turnoActual, setTurnoActual] =
    useState<TurnoCaja | null>(null);
  const [turnos, setTurnos] =
    useState<TurnoCaja[]>([]);
  const [movimientos, setMovimientos] =
    useState<MovimientoCaja[]>([]);
  const [resumen, setResumen] =
    useState<ResumenCaja>(resumenVacio);

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorFormulario, setErrorFormulario] =
    useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [mostrarApertura, setMostrarApertura] =
    useState(false);
  const [mostrarMovimiento, setMostrarMovimiento] =
    useState(false);
  const [mostrarCierre, setMostrarCierre] =
    useState(false);

  const [fondoInicial, setFondoInicial] =
    useState("");
  const [observacionesApertura, setObservacionesApertura] =
    useState("");

  const [tipoMovimiento, setTipoMovimiento] =
    useState<TipoMovimientoCaja>("entrada");
  const [conceptoMovimiento, setConceptoMovimiento] =
    useState("");
  const [importeMovimiento, setImporteMovimiento] =
    useState("");

  const [efectivoContado, setEfectivoContado] =
    useState("");
  const [observacionesCierre, setObservacionesCierre] =
    useState("");

  useEffect(() => {
    let componenteActivo = true;

    async function cargarCorte() {
      try {
        setCargando(true);
        setErrorCarga("");

        const [cajaAbierta, historial] =
          await Promise.all([
            obtenerCajaAbierta(),
            listarTurnosCaja(),
          ]);

        if (!componenteActivo) {
          return;
        }

        setTurnoActual(cajaAbierta);
        setTurnos(historial);

        if (cajaAbierta) {
          const movimientosCargados =
            await listarMovimientosCaja(cajaAbierta.id);

          const resumenCargado =
            await obtenerResumenCaja(
              cajaAbierta,
              movimientosCargados
            );

          if (!componenteActivo) {
            return;
          }

          setMovimientos(movimientosCargados);
          setResumen(resumenCargado);
        }
      } catch (error) {
        console.error(error);

        if (componenteActivo) {
          setErrorCarga(
            error instanceof Error
              ? error.message
              : "No fue posible cargar el corte de caja."
          );
        }
      } finally {
        if (componenteActivo) {
          setCargando(false);
        }
      }
    }

    cargarCorte();

    return () => {
      componenteActivo = false;
    };
  }, []);

  const diferenciaPrevia = useMemo(() => {
    const contado = Number(efectivoContado);

    if (!Number.isFinite(contado)) {
      return null;
    }

    return contado - resumen.efectivoEsperado;
  }, [efectivoContado, resumen.efectivoEsperado]);

  function mostrarMensaje(mensaje: string) {
    setMensajeExito(mensaje);

    window.setTimeout(() => {
      setMensajeExito("");
    }, 1800);
  }

  async function registrarEnBitacora(
    accion: string,
    detalle: string,
    entidadId: number | null
  ) {
    try {
      await registrarEventoBitacora({
        usuarioId: usuarioActual.id,
        nombreUsuario:
          usuarioActual.nombreCompleto,
        usuario: usuarioActual.usuario,
        rol: usuarioActual.rol,
        modulo: "Caja",
        accion,
        detalle,
        entidadTipo: "turno_caja",
        entidadId,
      });
    } catch (errorBitacora) {
      console.error(
        "No fue posible registrar la acción de caja en bitácora:",
        errorBitacora
      );
    }
  }

  async function recargarCaja(turno: TurnoCaja) {
    const [movimientosActualizados, turnosActualizados] =
      await Promise.all([
        listarMovimientosCaja(turno.id),
        listarTurnosCaja(),
      ]);

    const resumenActualizado =
      await obtenerResumenCaja(
        turno,
        movimientosActualizados
      );

    setTurnoActual(turno);
    setMovimientos(movimientosActualizados);
    setTurnos(turnosActualizados);
    setResumen(resumenActualizado);
  }

  async function confirmarApertura(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (procesando) {
      return;
    }

    const fondo = Number(fondoInicial);

    if (!Number.isFinite(fondo) || fondo < 0) {
      setErrorFormulario(
        "El fondo inicial debe ser un número válido."
      );
      return;
    }

    try {
      setProcesando(true);
      setErrorFormulario("");

      const turno = await abrirCaja({
        fondoInicial: fondo,
        usuarioId: usuarioActual.id,
        usuarioNombre:
          usuarioActual.nombreCompleto,
        observaciones: observacionesApertura,
      });

      await recargarCaja(turno);

      await registrarEnBitacora(
        "Apertura de caja",
        `Se abrió la caja con fondo inicial de $${turno.fondoInicial.toFixed(
          2
        )}${
          observacionesApertura.trim()
            ? `. Observaciones: ${observacionesApertura.trim()}`
            : "."
        }`,
        turno.id
      );

      setMostrarApertura(false);
      setFondoInicial("");
      setObservacionesApertura("");
      mostrarMensaje("Caja abierta correctamente.");
    } catch (error) {
      console.error(error);

      setErrorFormulario(
        error instanceof Error
          ? error.message
          : "No fue posible abrir la caja."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarMovimiento(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!turnoActual || procesando) {
      return;
    }

    const importe = Number(importeMovimiento);

    if (!conceptoMovimiento.trim()) {
      setErrorFormulario(
        "Escribe el concepto del movimiento."
      );
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

      const movimiento =
        await registrarMovimientoCaja({
          turnoId: turnoActual.id,
          tipo: tipoMovimiento,
          concepto: conceptoMovimiento,
          importe,
          usuarioId: usuarioActual.id,
          atendidoPor:
            usuarioActual.nombreCompleto,
        });

      await recargarCaja(turnoActual);

      await registrarEnBitacora(
        movimiento.tipo === "entrada"
          ? "Entrada de efectivo"
          : "Salida de efectivo",
        `${movimiento.tipo === "entrada" ? "Entrada" : "Salida"} de $${movimiento.importe.toFixed(
          2
        )}. Concepto: ${movimiento.concepto}. Turno #${movimiento.turnoId}.`,
        movimiento.turnoId
      );

      setMostrarMovimiento(false);
      setConceptoMovimiento("");
      setImporteMovimiento("");
      mostrarMensaje("Movimiento registrado.");
    } catch (error) {
      console.error(error);

      setErrorFormulario(
        error instanceof Error
          ? error.message
          : "No fue posible registrar el movimiento."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarCierre(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!turnoActual || procesando) {
      return;
    }

    const contado = Number(efectivoContado);

    if (!Number.isFinite(contado) || contado < 0) {
      setErrorFormulario(
        "Ingresa el efectivo contado en caja."
      );
      return;
    }

    try {
      setProcesando(true);
      setErrorFormulario("");

      const turnoCerrado =
        await cerrarCaja({
          turnoId: turnoActual.id,
          efectivoContado: contado,
          usuarioId: usuarioActual.id,
          usuarioNombre:
            usuarioActual.nombreCompleto,
          observaciones: observacionesCierre,
        });

      await registrarEnBitacora(
        "Cierre de caja",
        `Se cerró la caja. Efectivo esperado: $${(
          turnoCerrado.efectivoEsperado ?? 0
        ).toFixed(2)} · Efectivo contado: $${(
          turnoCerrado.efectivoContado ?? 0
        ).toFixed(2)} · Diferencia: $${(
          turnoCerrado.diferencia ?? 0
        ).toFixed(2)}${
          observacionesCierre.trim()
            ? ` · Observaciones: ${observacionesCierre.trim()}`
            : ""
        }.`,
        turnoCerrado.id
      );

      const historial = await listarTurnosCaja();

      setTurnoActual(null);
      setTurnos(historial);
      setMovimientos([]);
      setResumen(resumenVacio);
      setMostrarCierre(false);
      setEfectivoContado("");
      setObservacionesCierre("");
      mostrarMensaje("Caja cerrada correctamente.");
    } catch (error) {
      console.error(error);

      setErrorFormulario(
        error instanceof Error
          ? error.message
          : "No fue posible cerrar la caja."
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="corte-page">
      <main className="corte-main">
        <section className="corte-titulo">
          <div>
            <p>MÓDULO DE CORTE</p>
            <h1>Control de caja</h1>
            <span>
              Administra apertura, movimientos,
              efectivo y cierre de turno.
            </span>
          </div>

          {!turnoActual ? (
            <button
              type="button"
              className="corte-boton-principal"
              onClick={() => {
                setErrorFormulario("");
                setMostrarApertura(true);
              }}
              disabled={cargando || procesando}
            >
              Abrir caja
            </button>
          ) : (
            <div className="corte-acciones-superiores">
              <button
                type="button"
                className="corte-boton-secundario"
                onClick={() => {
                  setErrorFormulario("");
                  setMostrarMovimiento(true);
                }}
              >
                + Movimiento
              </button>

              <button
                type="button"
                className="corte-boton-cerrar"
                onClick={() => {
                  setErrorFormulario("");
                  setMostrarCierre(true);
                }}
              >
                Cerrar caja
              </button>
            </div>
          )}
        </section>

        {errorCarga && (
          <div className="corte-error">
            <span>⚠️</span>
            <p>{errorCarga}</p>
          </div>
        )}

        <section
          className={`corte-estado-panel ${
            turnoActual ? "abierta" : "cerrada"
          }`}
        >
          <div className="corte-estado-icono">
            {turnoActual ? "🔓" : "🔒"}
          </div>

          <div>
            <span>ESTADO ACTUAL</span>
            <h2>
              {turnoActual
                ? "Caja abierta"
                : "Caja cerrada"}
            </h2>

            <p>
              {turnoActual
                ? `Abierta por ${
                    turnoActual.usuarioAperturaNombre
                  } el ${new Date(
                    turnoActual.fechaApertura
                  ).toLocaleString("es-MX")}`
                : "Abre una caja para comenzar a registrar operaciones."}
            </p>
          </div>
        </section>

        <section className="corte-resumen">
          <article>
            <div className="corte-resumen-icono naranja">
              💰
            </div>
            <div>
              <span>Fondo inicial</span>
              <strong>
                $
                {(
                  turnoActual?.fondoInicial ?? 0
                ).toFixed(2)}
              </strong>
              <p>Inicio del turno</p>
            </div>
          </article>

          <article>
            <div className="corte-resumen-icono verde">
              🛒
            </div>
            <div>
              <span>Ventas en efectivo</span>
              <strong>
                ${resumen.ventasEfectivo.toFixed(2)}
              </strong>
              <p>Ventas del turno</p>
            </div>
          </article>

          <article>
            <div className="corte-resumen-icono azul">
              💳
            </div>
            <div>
              <span>Abonos en efectivo</span>
              <strong>
                ${resumen.abonosEfectivo.toFixed(2)}
              </strong>
              <p>Pagos de créditos</p>
            </div>
          </article>

          <article>
            <div className="corte-resumen-icono morado">
              ➕
            </div>
            <div>
              <span>Entradas</span>
              <strong>
                ${resumen.entradas.toFixed(2)}
              </strong>
              <p>Movimientos adicionales</p>
            </div>
          </article>

          <article>
            <div className="corte-resumen-icono rojo">
              ➖
            </div>
            <div>
              <span>Salidas</span>
              <strong>
                ${resumen.salidas.toFixed(2)}
              </strong>
              <p>Retiros de caja</p>
            </div>
          </article>
        </section>

        <section className="corte-esperado">
          <div>
            <p>EFECTIVO ESPERADO</p>
            <h2>
              ${resumen.efectivoEsperado.toFixed(2)}
            </h2>
            <span>
              Fondo + ventas + abonos + entradas − salidas
            </span>
          </div>

          <div className="corte-formula">
            <span>
              $
              {(
                turnoActual?.fondoInicial ?? 0
              ).toFixed(2)}
            </span>
            <b>+</b>
            <span>
              ${resumen.ventasEfectivo.toFixed(2)}
            </span>
            <b>+</b>
            <span>
              ${resumen.abonosEfectivo.toFixed(2)}
            </span>
            <b>+</b>
            <span>
              ${resumen.entradas.toFixed(2)}
            </span>
            <b>−</b>
            <span>
              ${resumen.salidas.toFixed(2)}
            </span>
          </div>
        </section>

        <section className="corte-layout">
          <div className="corte-panel">
            <div className="corte-panel-header">
              <div>
                <p>MOVIMIENTOS</p>
                <h2>Entradas y salidas</h2>
              </div>

              <span>
                {movimientos.length} movimiento
                {movimientos.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="corte-tabla-contenedor">
              <table className="corte-tabla">
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Importe</th>
                    <th>Registró</th>
                  </tr>
                </thead>

                <tbody>
                  {movimientos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="corte-vacio"
                      >
                        <div>💵</div>
                        <strong>
                          No hay movimientos registrados
                        </strong>
                        <p>
                          Las entradas y salidas aparecerán
                          aquí.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    movimientos.map((movimiento) => (
                      <tr key={movimiento.id}>
                        <td>
                          {new Date(
                            movimiento.fecha
                          ).toLocaleString("es-MX")}
                        </td>

                        <td>
                          <span
                            className={`corte-tipo ${movimiento.tipo}`}
                          >
                            {movimiento.tipo === "entrada"
                              ? "Entrada"
                              : "Salida"}
                          </span>
                        </td>

                        <td>{movimiento.concepto}</td>

                        <td
                          className={
                            movimiento.tipo === "entrada"
                              ? "corte-importe-entrada"
                              : "corte-importe-salida"
                          }
                        >
                          {movimiento.tipo === "entrada"
                            ? "+"
                            : "−"}
                          ${movimiento.importe.toFixed(2)}
                        </td>

                        <td>{movimiento.atendidoPor}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="corte-panel">
            <div className="corte-panel-header">
              <div>
                <p>HISTORIAL</p>
                <h2>Últimos cortes</h2>
              </div>
            </div>

            <div className="corte-historial">
              {turnos.length === 0 ? (
                <div className="corte-vacio">
                  <div>🧾</div>
                  <strong>Sin cortes registrados</strong>
                </div>
              ) : (
                turnos.slice(0, 6).map((turno) => (
                  <article key={turno.id}>
                    <div>
                      <strong>
                        Corte #{String(turno.id).padStart(5, "0")}
                      </strong>
                      <span>
                        {new Date(
                          turno.fechaApertura
                        ).toLocaleString("es-MX")}
                      </span>
                    </div>

                    <span
                      className={`corte-historial-estado ${turno.estado}`}
                    >
                      {turno.estado === "abierta"
                        ? "Abierta"
                        : "Cerrada"}
                    </span>

                    <div>
                      <span>Diferencia</span>
                      <strong
                        className={
                          (turno.diferencia ?? 0) === 0
                            ? "diferencia-correcta"
                            : (turno.diferencia ?? 0) > 0
                              ? "diferencia-sobrante"
                              : "diferencia-faltante"
                        }
                      >
                        $
                        {(turno.diferencia ?? 0).toFixed(2)}
                      </strong>
                    </div>
                  </article>
                ))
              )}
            </div>
          </aside>
        </section>
      </main>

      {mostrarApertura && (
        <div className="corte-modal-fondo">
          <div className="corte-modal">
            <div className="corte-modal-header">
              <div>
                <span>INICIAR TURNO</span>
                <h2>Abrir caja</h2>
              </div>

              <button
                type="button"
                onClick={() => setMostrarApertura(false)}
                disabled={procesando}
              >
                ×
              </button>
            </div>

            <form onSubmit={confirmarApertura}>
              <label>
                Fondo inicial
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fondoInicial}
                  onChange={(event) => {
                    setFondoInicial(event.target.value);
                    setErrorFormulario("");
                  }}
                  disabled={procesando}
                  placeholder="0.00"
                />
              </label>

              <label>
                Observaciones
                <textarea
                  rows={4}
                  value={observacionesApertura}
                  onChange={(event) =>
                    setObservacionesApertura(
                      event.target.value
                    )
                  }
                  disabled={procesando}
                  placeholder="Opcional"
                />
              </label>

              {errorFormulario && (
                <div className="corte-error">
                  <span>⚠️</span>
                  <p>{errorFormulario}</p>
                </div>
              )}

              <div className="corte-modal-acciones">
                <button
                  type="button"
                  className="corte-cancelar"
                  onClick={() => setMostrarApertura(false)}
                  disabled={procesando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="corte-guardar"
                  disabled={procesando}
                >
                  {procesando
                    ? "Abriendo..."
                    : "Abrir caja"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarMovimiento && turnoActual && (
        <div className="corte-modal-fondo">
          <div className="corte-modal">
            <div className="corte-modal-header">
              <div>
                <span>MOVIMIENTO DE EFECTIVO</span>
                <h2>Registrar movimiento</h2>
              </div>

              <button
                type="button"
                onClick={() => setMostrarMovimiento(false)}
                disabled={procesando}
              >
                ×
              </button>
            </div>

            <form onSubmit={confirmarMovimiento}>
              <label>
                Tipo
                <select
                  value={tipoMovimiento}
                  onChange={(event) =>
                    setTipoMovimiento(
                      event.target
                        .value as TipoMovimientoCaja
                    )
                  }
                  disabled={procesando}
                >
                  <option value="entrada">
                    Entrada de efectivo
                  </option>
                  <option value="salida">
                    Salida de efectivo
                  </option>
                </select>
              </label>

              <label>
                Concepto
                <input
                  type="text"
                  value={conceptoMovimiento}
                  onChange={(event) => {
                    setConceptoMovimiento(
                      event.target.value
                    );
                    setErrorFormulario("");
                  }}
                  disabled={procesando}
                  placeholder="Ejemplo: cambio adicional"
                />
              </label>

              <label>
                Importe
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={importeMovimiento}
                  onChange={(event) => {
                    setImporteMovimiento(
                      event.target.value
                    );
                    setErrorFormulario("");
                  }}
                  disabled={procesando}
                  placeholder="0.00"
                />
              </label>

              {errorFormulario && (
                <div className="corte-error">
                  <span>⚠️</span>
                  <p>{errorFormulario}</p>
                </div>
              )}

              <div className="corte-modal-acciones">
                <button
                  type="button"
                  className="corte-cancelar"
                  onClick={() =>
                    setMostrarMovimiento(false)
                  }
                  disabled={procesando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="corte-guardar"
                  disabled={procesando}
                >
                  {procesando
                    ? "Registrando..."
                    : "Registrar movimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarCierre && turnoActual && (
        <div className="corte-modal-fondo">
          <div className="corte-modal corte-modal-cierre">
            <div className="corte-modal-header">
              <div>
                <span>FINALIZAR TURNO</span>
                <h2>Cerrar caja</h2>
              </div>

              <button
                type="button"
                onClick={() => setMostrarCierre(false)}
                disabled={procesando}
              >
                ×
              </button>
            </div>

            <div className="corte-cierre-resumen">
              <span>Efectivo esperado</span>
              <strong>
                ${resumen.efectivoEsperado.toFixed(2)}
              </strong>
            </div>

            <form onSubmit={confirmarCierre}>
              <label>
                Efectivo contado
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={efectivoContado}
                  onChange={(event) => {
                    setEfectivoContado(
                      event.target.value
                    );
                    setErrorFormulario("");
                  }}
                  disabled={procesando}
                  placeholder="0.00"
                />
              </label>

              {diferenciaPrevia !== null && (
                <div
                  className={`corte-diferencia ${
                    diferenciaPrevia === 0
                      ? "correcta"
                      : diferenciaPrevia > 0
                        ? "sobrante"
                        : "faltante"
                  }`}
                >
                  <span>Diferencia</span>
                  <strong>
                    ${diferenciaPrevia.toFixed(2)}
                  </strong>
                </div>
              )}

              <label>
                Observaciones de cierre
                <textarea
                  rows={4}
                  value={observacionesCierre}
                  onChange={(event) =>
                    setObservacionesCierre(
                      event.target.value
                    )
                  }
                  disabled={procesando}
                  placeholder="Opcional"
                />
              </label>

              {errorFormulario && (
                <div className="corte-error">
                  <span>⚠️</span>
                  <p>{errorFormulario}</p>
                </div>
              )}

              <div className="corte-modal-acciones">
                <button
                  type="button"
                  className="corte-cancelar"
                  onClick={() => setMostrarCierre(false)}
                  disabled={procesando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="corte-cerrar-confirmar"
                  disabled={procesando}
                >
                  {procesando
                    ? "Cerrando..."
                    : "Confirmar cierre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mensajeExito && (
        <div className="corte-exito-fondo">
          <div className="corte-exito">
            <div>✓</div>
            <h2>Operación completada</h2>
            <p>{mensajeExito}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Corte;