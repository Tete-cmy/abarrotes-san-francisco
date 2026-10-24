import { useEffect, useMemo, useState } from "react";
import "./Clientes.css";
import {
  actualizarCliente,
  cambiarEstadoCliente,
  crearCliente,
  eliminarClientePorId,
  listarClientes,
  type Cliente,
} from "../../services/clientesService";

type FiltroEstado = "todos" | "activos" | "inactivos";

interface FormularioCliente {
  nombreCompleto: string;
  telefono: string;
  correo: string;
  domicilio: string;
  colonia: string;
  municipioEstado: string;
  codigoPostal: string;
  notas: string;
  limiteCredito: string;
  activo: boolean;
}

const formularioInicial: FormularioCliente = {
  nombreCompleto: "",
  telefono: "",
  correo: "",
  domicilio: "",
  colonia: "",
  municipioEstado: "",
  codigoPostal: "",
  notas: "",
  limiteCredito: "0",
  activo: true,
};

function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("todos");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorFormulario, setErrorFormulario] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);
  const [clienteEditando, setClienteEditando] =
    useState<Cliente | null>(null);
  const [clienteAEliminar, setClienteAEliminar] =
    useState<Cliente | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioCliente>(formularioInicial);

  useEffect(() => {
    let componenteActivo = true;

    async function cargarClientes() {
      try {
        setCargando(true);
        setErrorCarga("");

        const datos = await listarClientes();

        if (!componenteActivo) return;

        setClientes(datos);
        localStorage.setItem("clientes", JSON.stringify(datos));
      } catch (error) {
        console.error(error);

        if (!componenteActivo) return;

        setErrorCarga(
          "No fue posible cargar los clientes desde Supabase."
        );

        const respaldo = localStorage.getItem("clientes");

        if (respaldo) {
          try {
            const datos: unknown = JSON.parse(respaldo);

            if (Array.isArray(datos)) {
              setClientes(datos as Cliente[]);
            }
          } catch {
            setClientes([]);
          }
        }
      } finally {
        if (componenteActivo) {
          setCargando(false);
        }
      }
    }

    cargarClientes();

    return () => {
      componenteActivo = false;
    };
  }, []);

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    return clientes.filter((cliente) => {
      const coincideBusqueda =
        cliente.nombreCompleto.toLowerCase().includes(texto) ||
        cliente.telefono.toLowerCase().includes(texto) ||
        cliente.correo.toLowerCase().includes(texto);

      const coincideEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "activos" && cliente.activo) ||
        (filtroEstado === "inactivos" && !cliente.activo);

      return coincideBusqueda && coincideEstado;
    });
  }, [clientes, busqueda, filtroEstado]);

  const clientesActivos = clientes.filter(
    (cliente) => cliente.activo
  ).length;

  const saldoTotal = clientes.reduce(
    (total, cliente) => total + cliente.saldoPendiente,
    0
  );

  const limiteTotal = clientes.reduce(
    (total, cliente) => total + cliente.limiteCredito,
    0
  );

  function actualizarCampo<K extends keyof FormularioCliente>(
    campo: K,
    valor: FormularioCliente[K]
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));

    setErrorFormulario("");
  }

  function abrirNuevoCliente() {
    setClienteEditando(null);
    setFormulario(formularioInicial);
    setErrorFormulario("");
    setMostrarFormulario(true);
  }

  function abrirEdicion(cliente: Cliente) {
    setClienteEditando(cliente);
    setFormulario({
      nombreCompleto: cliente.nombreCompleto,
      telefono: cliente.telefono,
      correo: cliente.correo,
      domicilio: cliente.domicilio,
      colonia: cliente.colonia,
      municipioEstado: cliente.municipioEstado,
      codigoPostal: cliente.codigoPostal,
      notas: cliente.notas,
      limiteCredito: String(cliente.limiteCredito),
      activo: cliente.activo,
    });
    setErrorFormulario("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    if (procesando) return;

    setMostrarFormulario(false);
    setClienteEditando(null);
    setFormulario(formularioInicial);
    setErrorFormulario("");
  }

  function mostrarMensaje(mensaje: string) {
    setMensajeExito(mensaje);

    window.setTimeout(() => {
      setMensajeExito("");
    }, 1800);
  }

  async function guardarCliente(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (procesando) return;

    const nombreLimpio = formulario.nombreCompleto.trim();
    const limiteCredito = Number(formulario.limiteCredito);

    if (!nombreLimpio) {
      setErrorFormulario(
        "Ingresa el nombre completo del cliente."
      );
      return;
    }

    if (
      formulario.correo.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.correo.trim())
    ) {
      setErrorFormulario(
        "Ingresa un correo electrónico válido."
      );
      return;
    }

    if (!Number.isFinite(limiteCredito) || limiteCredito < 0) {
      setErrorFormulario(
        "El límite de crédito debe ser un número válido y no negativo."
      );
      return;
    }

    const datos = {
      nombreCompleto: nombreLimpio,
      telefono: formulario.telefono,
      correo: formulario.correo,
      domicilio: formulario.domicilio,
      colonia: formulario.colonia,
      municipioEstado: formulario.municipioEstado,
      codigoPostal: formulario.codigoPostal,
      notas: formulario.notas,
      limiteCredito,
      activo: formulario.activo,
    };

    try {
      setProcesando(true);
      setErrorFormulario("");

      if (clienteEditando) {
        const actualizado = await actualizarCliente(
          clienteEditando.id,
          datos
        );

        setClientes((actuales) =>
          actuales.map((cliente) =>
            cliente.id === actualizado.id ? actualizado : cliente
          )
        );

        mostrarMensaje("Cliente actualizado correctamente.");
      } else {
        const nuevo = await crearCliente(datos);

        setClientes((actuales) => [...actuales, nuevo]);
        mostrarMensaje("Cliente registrado correctamente.");
      }

      const actualizados = await listarClientes();

      setClientes(actualizados);
      localStorage.setItem(
        "clientes",
        JSON.stringify(actualizados)
      );

      cerrarFormulario();
    } catch (error) {
      console.error(error);

      setErrorFormulario(
        error instanceof Error
          ? error.message
          : "No fue posible guardar el cliente."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function alternarEstado(cliente: Cliente) {
    if (procesando) return;

    try {
      setProcesando(true);

      const actualizado = await cambiarEstadoCliente(
        cliente.id,
        !cliente.activo
      );

      setClientes((actuales) =>
        actuales.map((item) =>
          item.id === actualizado.id ? actualizado : item
        )
      );
    } catch (error) {
      console.error(error);

      setErrorCarga(
        error instanceof Error
          ? error.message
          : "No fue posible cambiar el estado del cliente."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarEliminacion() {
    if (!clienteAEliminar || procesando) return;

    try {
      setProcesando(true);

      await eliminarClientePorId(clienteAEliminar.id);

      setClientes((actuales) =>
        actuales.filter(
          (cliente) => cliente.id !== clienteAEliminar.id
        )
      );

      setClienteAEliminar(null);
      mostrarMensaje("Cliente eliminado correctamente.");
    } catch (error) {
      console.error(error);

      setClienteAEliminar(null);

      setErrorCarga(
        error instanceof Error
          ? error.message
          : "No fue posible eliminar el cliente."
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="clientes-page">
      <main className="clientes-main">
        <section className="clientes-titulo">
          <div>
            <p>MÓDULO DE CLIENTES</p>
            <h1>Administración de clientes</h1>
            <span>
              Registra datos de contacto, límites de crédito y
              saldos pendientes.
            </span>
          </div>

          <button
            type="button"
            className="clientes-boton-principal"
            onClick={abrirNuevoCliente}
            disabled={cargando || procesando}
          >
            + Nuevo cliente
          </button>
        </section>

        <section className="clientes-resumen">
          <article>
            <div className="clientes-resumen-icono naranja">👥</div>
            <div>
              <span>Clientes registrados</span>
              <strong>{clientes.length}</strong>
              <p>Total del directorio</p>
            </div>
          </article>

          <article>
            <div className="clientes-resumen-icono azul">✓</div>
            <div>
              <span>Clientes activos</span>
              <strong>{clientesActivos}</strong>
              <p>Con cuenta habilitada</p>
            </div>
          </article>

          <article>
            <div className="clientes-resumen-icono morado">💳</div>
            <div>
              <span>Límite de crédito</span>
              <strong>${limiteTotal.toFixed(2)}</strong>
              <p>Total autorizado</p>
            </div>
          </article>

          <article>
            <div className="clientes-resumen-icono rojo">💵</div>
            <div>
              <span>Saldo pendiente</span>
              <strong>${saldoTotal.toFixed(2)}</strong>
              <p>Total por cobrar</p>
            </div>
          </article>
        </section>

        {errorCarga && (
          <div className="clientes-error">
            <span>⚠️</span>
            <p>{errorCarga}</p>
          </div>
        )}

        <section className="clientes-panel">
          <div className="clientes-panel-header">
            <div>
              <p>LISTADO GENERAL</p>
              <h2>Clientes registrados</h2>
            </div>

            <span>
              {clientesFiltrados.length} resultado
              {clientesFiltrados.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="clientes-herramientas">
            <input
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre, teléfono o correo"
            />

            <select
              value={filtroEstado}
              onChange={(event) =>
                setFiltroEstado(event.target.value as FiltroEstado)
              }
            >
              <option value="todos">Todos los estados</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>

          <div className="clientes-tabla-contenedor">
            <table className="clientes-tabla">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Domicilio</th>
                  <th>Límite</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={7} className="clientes-vacio">
                      <div>⏳</div>
                      <strong>Cargando clientes...</strong>
                    </td>
                  </tr>
                ) : clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="clientes-vacio">
                      <div>👥</div>
                      <strong>No se encontraron clientes</strong>
                      <p>
                        Modifica la búsqueda o registra un cliente
                        nuevo.
                      </p>
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id}>
                      <td>
                        <strong>{cliente.nombreCompleto}</strong>
                        <span>
                          Cliente #{String(cliente.id).padStart(4, "0")}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {cliente.telefono || "Sin teléfono"}
                        </strong>
                        <span>
                          {cliente.correo || "Sin correo"}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {cliente.domicilio || "Sin domicilio"}
                        </strong>
                        <span>
                          {[cliente.colonia, cliente.municipioEstado]
                            .filter(Boolean)
                            .join(", ") || "Sin ubicación"}
                        </span>
                      </td>

                      <td>
                        ${cliente.limiteCredito.toFixed(2)}
                      </td>

                      <td className="clientes-saldo">
                        ${cliente.saldoPendiente.toFixed(2)}
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`clientes-estado ${
                            cliente.activo ? "activo" : "inactivo"
                          }`}
                          onClick={() => alternarEstado(cliente)}
                          disabled={procesando}
                        >
                          {cliente.activo ? "Activo" : "Inactivo"}
                        </button>
                      </td>

                      <td>
                        <div className="clientes-acciones">
                          <button
                            type="button"
                            className="clientes-editar"
                            onClick={() => abrirEdicion(cliente)}
                            disabled={procesando}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="clientes-eliminar"
                            onClick={() => setClienteAEliminar(cliente)}
                            disabled={procesando}
                          >
                            Eliminar
                          </button>
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

      {mostrarFormulario && (
        <div className="clientes-modal-fondo">
          <div className="clientes-modal">
            <div className="clientes-modal-header">
              <div>
                <span>GESTIÓN DE CLIENTES</span>
                <h2>
                  {clienteEditando
                    ? "Editar cliente"
                    : "Registrar cliente"}
                </h2>
              </div>

              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={procesando}
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarCliente}>
              <div className="clientes-form-grid">
                <label>
                  Nombre completo *
                  <input
                    type="text"
                    value={formulario.nombreCompleto}
                    onChange={(event) =>
                      actualizarCampo(
                        "nombreCompleto",
                        event.target.value
                      )
                    }
                    disabled={procesando}
                  />
                </label>

                <label>
                  Teléfono
                  <input
                    type="tel"
                    value={formulario.telefono}
                    onChange={(event) =>
                      actualizarCampo("telefono", event.target.value)
                    }
                    disabled={procesando}
                  />
                </label>

                <label>
                  Correo electrónico
                  <input
                    type="email"
                    value={formulario.correo}
                    onChange={(event) =>
                      actualizarCampo("correo", event.target.value)
                    }
                    disabled={procesando}
                  />
                </label>

                <label>
                  Límite de crédito
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.limiteCredito}
                    onChange={(event) =>
                      actualizarCampo(
                        "limiteCredito",
                        event.target.value
                      )
                    }
                    disabled={procesando}
                  />
                </label>

                <label className="clientes-columna-completa">
                  Domicilio
                  <input
                    type="text"
                    value={formulario.domicilio}
                    onChange={(event) =>
                      actualizarCampo("domicilio", event.target.value)
                    }
                    disabled={procesando}
                  />
                </label>

                <label>
                  Colonia
                  <input
                    type="text"
                    value={formulario.colonia}
                    onChange={(event) =>
                      actualizarCampo("colonia", event.target.value)
                    }
                    disabled={procesando}
                  />
                </label>

                <label>
                  Municipio / Estado
                  <input
                    type="text"
                    value={formulario.municipioEstado}
                    onChange={(event) =>
                      actualizarCampo(
                        "municipioEstado",
                        event.target.value
                      )
                    }
                    disabled={procesando}
                  />
                </label>

                <label>
                  Código postal
                  <input
                    type="text"
                    value={formulario.codigoPostal}
                    onChange={(event) =>
                      actualizarCampo(
                        "codigoPostal",
                        event.target.value
                      )
                    }
                    disabled={procesando}
                  />
                </label>

                <label className="clientes-columna-completa">
                  Notas
                  <textarea
                    rows={4}
                    value={formulario.notas}
                    onChange={(event) =>
                      actualizarCampo("notas", event.target.value)
                    }
                    disabled={procesando}
                  />
                </label>
              </div>

              <label className="clientes-activo-check">
                <input
                  type="checkbox"
                  checked={formulario.activo}
                  onChange={(event) =>
                    actualizarCampo("activo", event.target.checked)
                  }
                  disabled={procesando}
                />

                <div>
                  <strong>Cliente activo</strong>
                  <span>
                    Permitir ventas y movimientos en su cuenta.
                  </span>
                </div>
              </label>

              {errorFormulario && (
                <div className="clientes-error">
                  <span>⚠️</span>
                  <p>{errorFormulario}</p>
                </div>
              )}

              <div className="clientes-modal-acciones">
                <button
                  type="button"
                  className="clientes-cancelar"
                  onClick={cerrarFormulario}
                  disabled={procesando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="clientes-guardar"
                  disabled={procesando}
                >
                  {procesando
                    ? "Guardando..."
                    : clienteEditando
                      ? "Guardar cambios"
                      : "Registrar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {clienteAEliminar && (
        <div className="clientes-eliminar-fondo">
          <div className="clientes-eliminar-modal">
            <div className="clientes-eliminar-icono">⚠️</div>

            <h2>Eliminar cliente</h2>
            <p>
              El cliente dejará de aparecer en el directorio.
            </p>

            <div className="clientes-eliminar-datos">
              <strong>{clienteAEliminar.nombreCompleto}</strong>
              <span>
                Saldo pendiente: $
                {clienteAEliminar.saldoPendiente.toFixed(2)}
              </span>
            </div>

            <div className="clientes-eliminar-acciones">
              <button
                type="button"
                className="clientes-cancelar-eliminacion"
                onClick={() => setClienteAEliminar(null)}
                disabled={procesando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="clientes-confirmar-eliminacion"
                onClick={confirmarEliminacion}
                disabled={procesando}
              >
                {procesando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mensajeExito && (
        <div className="clientes-exito-fondo">
          <div className="clientes-exito">
            <div>✓</div>
            <h2>Operación completada</h2>
            <p>{mensajeExito}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;