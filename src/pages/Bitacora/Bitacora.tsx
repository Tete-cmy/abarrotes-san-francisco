import {
  useEffect,
  useMemo,
  useState,
} from "react";
import "./Bitacora.css";
import {
  listarBitacora,
  type EventoBitacora,
} from "../../services/bitacoraService";

function Bitacora() {
  const [eventos, setEventos] =
    useState<EventoBitacora[]>([]);
  const [busqueda, setBusqueda] =
    useState("");
  const [modulo, setModulo] =
    useState("Todos");
  const [accion, setAccion] =
    useState("Todas");
  const [fecha, setFecha] =
    useState("");
  const [cargando, setCargando] =
    useState(true);
  const [errorCarga, setErrorCarga] =
    useState("");
  const [seleccionado, setSeleccionado] =
    useState<EventoBitacora | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        setCargando(true);
        setErrorCarga("");

        const datos = await listarBitacora();

        if (activo) {
          setEventos(datos);
        }
      } catch (error) {
        console.error(error);

        if (activo) {
          setErrorCarga(
            error instanceof Error
              ? error.message
              : "No fue posible cargar la bitácora."
          );
        }
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

  const modulos = useMemo(
    () => [
      "Todos",
      ...Array.from(
        new Set(eventos.map((evento) => evento.modulo))
      ).sort(),
    ],
    [eventos]
  );

  const acciones = useMemo(
    () => [
      "Todas",
      ...Array.from(
        new Set(eventos.map((evento) => evento.accion))
      ).sort(),
    ],
    [eventos]
  );

  const filtrados = useMemo(() => {
    const texto = busqueda
      .toLowerCase()
      .trim();

    return eventos.filter((evento) => {
      const coincideTexto =
        texto === "" ||
        evento.nombreUsuario
          .toLowerCase()
          .includes(texto) ||
        evento.usuario
          .toLowerCase()
          .includes(texto) ||
        evento.modulo
          .toLowerCase()
          .includes(texto) ||
        evento.accion
          .toLowerCase()
          .includes(texto) ||
        evento.detalle
          .toLowerCase()
          .includes(texto);

      const coincideModulo =
        modulo === "Todos" ||
        evento.modulo === modulo;

      const coincideAccion =
        accion === "Todas" ||
        evento.accion === accion;

      const coincideFecha =
        fecha === "" ||
        evento.fecha.slice(0, 10) === fecha;

      return (
        coincideTexto &&
        coincideModulo &&
        coincideAccion &&
        coincideFecha
      );
    });
  }, [
    eventos,
    busqueda,
    modulo,
    accion,
    fecha,
  ]);

  return (
    <div className="bitacora-page">
      <main className="bitacora-main">
        <section className="bitacora-header">
          <div>
            <p>SEGURIDAD Y AUDITORÍA</p>
            <h1>Bitácora de actividad</h1>
            <span>
              Consulta las acciones importantes
              realizadas dentro del sistema.
            </span>
          </div>
        </section>

        <section className="bitacora-resumen">
          <article>
            <span>Eventos registrados</span>
            <strong>{eventos.length}</strong>
          </article>

          <article>
            <span>Usuarios detectados</span>
            <strong>
              {
                new Set(
                  eventos.map(
                    (evento) => evento.usuario
                  )
                ).size
              }
            </strong>
          </article>

          <article>
            <span>Módulos con actividad</span>
            <strong>
              {
                new Set(
                  eventos.map(
                    (evento) => evento.modulo
                  )
                ).size
              }
            </strong>
          </article>
        </section>

        {errorCarga && (
          <div className="bitacora-error">
            <span>⚠️</span>
            <p>{errorCarga}</p>
          </div>
        )}

        <section className="bitacora-panel">
          <div className="bitacora-panel-header">
            <div>
              <p>REGISTRO GENERAL</p>
              <h2>Movimientos del sistema</h2>
            </div>

            <span>
              {filtrados.length} resultado
              {filtrados.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="bitacora-filtros">
            <input
              type="text"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
              placeholder="Buscar por usuario, módulo, acción o detalle"
            />

            <select
              value={modulo}
              onChange={(event) =>
                setModulo(event.target.value)
              }
            >
              {modulos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={accion}
              onChange={(event) =>
                setAccion(event.target.value)
              }
            >
              {acciones.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={fecha}
              onChange={(event) =>
                setFecha(event.target.value)
              }
            />
          </div>

          <div className="bitacora-tabla-contenedor">
            <table className="bitacora-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th>Detalle</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargando ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="bitacora-vacio"
                    >
                      Cargando bitácora...
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="bitacora-vacio"
                    >
                      No hay movimientos para mostrar.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((evento) => (
                    <tr key={evento.id}>
                      <td>
                        {new Date(
                          evento.fecha
                        ).toLocaleString("es-MX")}
                      </td>

                      <td>
                        <strong>
                          {evento.nombreUsuario}
                        </strong>
                        <span>@{evento.usuario}</span>
                      </td>

                      <td>{evento.rol}</td>

                      <td>
                        <span className="bitacora-modulo">
                          {evento.modulo}
                        </span>
                      </td>

                      <td>{evento.accion}</td>

                      <td className="bitacora-detalle-corto">
                        {evento.detalle}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            setSeleccionado(evento)
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

      {seleccionado && (
        <div className="bitacora-modal-fondo">
          <div className="bitacora-modal">
            <div className="bitacora-modal-header">
              <div>
                <span>DETALLE DEL EVENTO</span>
                <h2>{seleccionado.accion}</h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSeleccionado(null)
                }
              >
                ×
              </button>
            </div>

            <dl>
              <div>
                <dt>Fecha</dt>
                <dd>
                  {new Date(
                    seleccionado.fecha
                  ).toLocaleString("es-MX")}
                </dd>
              </div>

              <div>
                <dt>Usuario</dt>
                <dd>
                  {seleccionado.nombreUsuario}
                  {" · "}@{seleccionado.usuario}
                </dd>
              </div>

              <div>
                <dt>Rol</dt>
                <dd>{seleccionado.rol}</dd>
              </div>

              <div>
                <dt>Módulo</dt>
                <dd>{seleccionado.modulo}</dd>
              </div>

              <div>
                <dt>Detalle</dt>
                <dd>{seleccionado.detalle}</dd>
              </div>

              <div>
                <dt>Entidad</dt>
                <dd>
                  {seleccionado.entidadTipo ??
                    "Sin registrar"}
                  {seleccionado.entidadId === null
                    ? ""
                    : ` #${seleccionado.entidadId}`}
                </dd>
              </div>

              <div>
                <dt>Dispositivo</dt>
                <dd className="bitacora-dispositivo">
                  {seleccionado.dispositivo}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              className="bitacora-cerrar"
              onClick={() =>
                setSeleccionado(null)
              }
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bitacora;