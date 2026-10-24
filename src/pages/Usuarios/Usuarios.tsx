import { useEffect, useState } from "react";
import "./Usuarios.css";
import type { Pantalla } from "../../types/navegacion";
import type { UsuarioSesion } from "../Login/Login";
import { registrarEventoBitacora } from "../../services/bitacoraService";
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  crearUsuario,
  eliminarUsuario,
  listarUsuarios,
  mensajeErrorUsuarios,
  configurarPinAdministrador,
  type RolUsuario,
  type Usuario,
} from "../../services/usuariosService";

interface UsuariosProps {
  onNavigate: (pantalla: Pantalla) => void;
  usuarioActual: UsuarioSesion;
}

function Usuarios({
  onNavigate,
  usuarioActual,
}: UsuariosProps) {
  const [usuarios, setUsuarios] =
    useState<Usuario[]>([]);

  const [cargandoUsuarios, setCargandoUsuarios] =
    useState(true);

  const [procesando, setProcesando] =
    useState(false);

  const [busqueda, setBusqueda] =
    useState("");

  const [filtroRol, setFiltroRol] =
    useState<"todos" | RolUsuario>(
      "todos"
    );

  const [filtroEstado, setFiltroEstado] =
    useState<
      "todos" | "activos" | "inactivos"
    >("todos");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [usuarioEditando, setUsuarioEditando] =
    useState<Usuario | null>(null);

  const [usuarioAEliminar, setUsuarioAEliminar] =
    useState<Usuario | null>(null);

  const [nombreCompleto, setNombreCompleto] =
    useState("");

  const [nombreUsuario, setNombreUsuario] =
    useState("");

  const [contrasena, setContrasena] =
    useState("");

  const [rol, setRol] =
    useState<RolUsuario>("Cajero");

  const [activo, setActivo] =
    useState(true);

  const [errorFormulario, setErrorFormulario] =
    useState("");

  const [mensajeExito, setMensajeExito] =
    useState("");

  const [pin, setPin] =
    useState("");

  const [confirmarPin, setConfirmarPin] =
    useState("");

  const [, setErrorPin] =
    useState("");

  useEffect(() => {
    let componenteActivo = true;

    async function cargarUsuarios() {
      try {
        setCargandoUsuarios(true);

        const usuariosCargados =
          await listarUsuarios();

        if (!componenteActivo) {
          return;
        }

        setUsuarios(usuariosCargados);

        localStorage.setItem(
          "usuarios",
          JSON.stringify(usuariosCargados)
        );
      } catch (error) {
        console.error(error);

        if (!componenteActivo) {
          return;
        }

        setMensajeExito(
          "No fue posible cargar los usuarios desde Supabase."
        );
      } finally {
        if (componenteActivo) {
          setCargandoUsuarios(false);
        }
      }
    }

    cargarUsuarios();

    return () => {
      componenteActivo = false;
    };
  }, []);

  function limpiarFormulario() {
    setNombreCompleto("");
    setNombreUsuario("");
    setContrasena("");
    setRol("Cajero");
    setActivo(true);
    setPin("");
    setConfirmarPin("");
    setErrorPin("");
    setErrorFormulario("");
  }

  function mostrarExito(mensaje: string) {
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
        modulo: "Usuarios",
        accion,
        detalle,
        entidadTipo: "usuario",
        entidadId,
      });
    } catch (errorBitacora) {
      console.error(
        "No fue posible registrar la acción de usuarios en bitácora:",
        errorBitacora
      );
    }
  }

  function abrirNuevoUsuario() {
    limpiarFormulario();
    setUsuarioEditando(null);
    setMostrarFormulario(true);
  }

  function editarUsuario(usuario: Usuario) {
    setUsuarioEditando(usuario);
    setNombreCompleto(
      usuario.nombreCompleto
    );
    setNombreUsuario(usuario.usuario);
    setContrasena("");
    setRol(usuario.rol);
    setActivo(usuario.activo);
    setPin("");
    setConfirmarPin("");
    setErrorPin("");
    setErrorFormulario("");
    setMostrarFormulario(true);
  }

  async function guardarUsuario(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (procesando) {
      return;
    }

    const nombreLimpio =
      nombreCompleto.trim();

    const usuarioLimpio =
      nombreUsuario.trim();

    if (
      !nombreLimpio ||
      !usuarioLimpio ||
      (!usuarioEditando &&
        !contrasena.trim())
    ) {
      setErrorFormulario(
        "Completa todos los campos obligatorios."
      );
      return;
    }

    if (usuarioLimpio.length < 4) {
      setErrorFormulario(
        "El nombre de usuario debe tener al menos 4 caracteres."
      );
      return;
    }

    if (
      contrasena.trim() !== "" &&
      contrasena.length < 6
    ) {
      setErrorFormulario(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    const quiereCambiarPin =
      Boolean(usuarioEditando) &&
      rol === "Administrador" &&
      (pin !== "" || confirmarPin !== "");

    if (
      quiereCambiarPin &&
      !/^\d{4,6}$/.test(pin)
    ) {
      setErrorFormulario(
        "El PIN debe contener entre 4 y 6 números."
      );
      return;
    }

    if (
      quiereCambiarPin &&
      pin !== confirmarPin
    ) {
      setErrorFormulario(
        "La confirmación del PIN no coincide."
      );
      return;
    }

    try {
      setProcesando(true);
      setErrorFormulario("");

      if (usuarioEditando) {
        const actualizado =
          await actualizarUsuario(
            usuarioEditando.id,
            {
              nombreCompleto:
                nombreLimpio,
              usuario: usuarioLimpio,
              contrasena,
              rol,
              activo,
            }
          );

        if (quiereCambiarPin) {
          await configurarPinAdministrador(
            actualizado.id,
            pin
          );
        }

        setUsuarios((actuales) =>
          actuales.map((usuario) =>
            usuario.id ===
            actualizado.id
              ? {
                  ...actualizado,
                  tienePin:
                    quiereCambiarPin ||
                    usuario.tienePin,
                }
              : usuario
          )
        );

        const cambios: string[] = [];

        if (
          usuarioEditando.nombreCompleto !==
          actualizado.nombreCompleto
        ) {
          cambios.push(
            `Nombre: "${usuarioEditando.nombreCompleto}" → "${actualizado.nombreCompleto}"`
          );
        }

        if (
          usuarioEditando.usuario !==
          actualizado.usuario
        ) {
          cambios.push(
            `Usuario: @${usuarioEditando.usuario} → @${actualizado.usuario}`
          );
        }

        if (
          usuarioEditando.rol !==
          actualizado.rol
        ) {
          cambios.push(
            `Rol: ${usuarioEditando.rol} → ${actualizado.rol}`
          );
        }

        if (
          usuarioEditando.activo !==
          actualizado.activo
        ) {
          cambios.push(
            `Estado: ${
              usuarioEditando.activo
                ? "Activo"
                : "Inactivo"
            } → ${
              actualizado.activo
                ? "Activo"
                : "Inactivo"
            }`
          );
        }

        if (contrasena.trim() !== "") {
          cambios.push(
            "Contraseña actualizada"
          );
        }

        if (quiereCambiarPin) {
          cambios.push(
            usuarioEditando.tienePin
              ? "PIN actualizado"
              : "PIN configurado"
          );
        }

        await registrarEnBitacora(
          "Edición de usuario",
          cambios.length > 0
            ? `Se actualizó a "${actualizado.nombreCompleto}". ${cambios.join(
                " · "
              )}`
            : `Se guardó a "${actualizado.nombreCompleto}" sin cambios visibles.`,
          actualizado.id
        );

        mostrarExito(
          quiereCambiarPin
            ? usuarioEditando.tienePin
              ? "Usuario y PIN actualizados correctamente."
              : "Usuario actualizado y PIN configurado correctamente."
            : "Usuario actualizado correctamente."
        );
      } else {
        const nuevo =
          await crearUsuario({
            nombreCompleto:
              nombreLimpio,
            usuario: usuarioLimpio,
            contrasena,
            rol,
            activo,
          });

        setUsuarios((actuales) => [
          ...actuales,
          nuevo,
        ]);

        await registrarEnBitacora(
          "Creación de usuario",
          `Se creó "${nuevo.nombreCompleto}" (@${nuevo.usuario}) con rol ${nuevo.rol} y estado ${
            nuevo.activo ? "Activo" : "Inactivo"
          }.`,
          nuevo.id
        );

        mostrarExito(
          "Usuario creado correctamente."
        );
      }

      const actualizados =
        await listarUsuarios();

      setUsuarios(actualizados);

      localStorage.setItem(
        "usuarios",
        JSON.stringify(actualizados)
      );

      limpiarFormulario();
      setUsuarioEditando(null);
      setMostrarFormulario(false);
    } catch (error) {
      console.error(error);

      setErrorFormulario(
        mensajeErrorUsuarios(error)
      );
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarEliminacion() {
    if (
      !usuarioAEliminar ||
      procesando
    ) {
      return;
    }

    try {
      setProcesando(true);

      const usuarioEliminado =
        usuarioAEliminar;

      await eliminarUsuario(
        usuarioEliminado.id
      );

      await registrarEnBitacora(
        "Eliminación de usuario",
        `Se eliminó "${usuarioEliminado.nombreCompleto}" (@${usuarioEliminado.usuario}) con rol ${usuarioEliminado.rol}.`,
        usuarioEliminado.id
      );

      setUsuarios((actuales) =>
        actuales.filter(
          (usuario) =>
            usuario.id !==
            usuarioAEliminar.id
        )
      );

      setUsuarioAEliminar(null);

      mostrarExito(
        "Usuario eliminado correctamente."
      );
    } catch (error) {
      console.error(error);

      setUsuarioAEliminar(null);

      mostrarExito(
        mensajeErrorUsuarios(error)
      );
    } finally {
      setProcesando(false);
    }
  }

  async function cambiarEstado(
    usuario: Usuario
  ) {
    if (procesando) {
      return;
    }

    try {
      setProcesando(true);

      const actualizado =
        await cambiarEstadoUsuario(
          usuario.id,
          !usuario.activo
        );

      setUsuarios((actuales) =>
        actuales.map((item) =>
          item.id ===
          actualizado.id
            ? actualizado
            : item
        )
      );

      await registrarEnBitacora(
        actualizado.activo
          ? "Activación de usuario"
          : "Desactivación de usuario",
        `El usuario "${actualizado.nombreCompleto}" (@${actualizado.usuario}) fue ${
          actualizado.activo
            ? "activado"
            : "desactivado"
        }.`,
        actualizado.id
      );

      mostrarExito(
        actualizado.activo
          ? "Usuario activado correctamente."
          : "Usuario desactivado correctamente."
      );
    } catch (error) {
      console.error(error);

      mostrarExito(
        mensajeErrorUsuarios(error)
      );
    } finally {
      setProcesando(false);
    }
  }

  const usuariosFiltrados =
    usuarios.filter((usuario) => {
      const texto = busqueda
        .toLowerCase()
        .trim();

      const coincideBusqueda =
        usuario.nombreCompleto
          .toLowerCase()
          .includes(texto) ||
        usuario.usuario
          .toLowerCase()
          .includes(texto);

      const coincideRol =
        filtroRol === "todos" ||
        usuario.rol === filtroRol;

      const coincideEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "activos" &&
          usuario.activo) ||
        (filtroEstado === "inactivos" &&
          !usuario.activo);

      return (
        coincideBusqueda &&
        coincideRol &&
        coincideEstado
      );
    });

  const administradores =
    usuarios.filter(
      (usuario) =>
        usuario.rol ===
        "Administrador"
    ).length;

  const cajeros =
    usuarios.filter(
      (usuario) =>
        usuario.rol === "Cajero"
    ).length;

  const activos =
    usuarios.filter(
      (usuario) => usuario.activo
    ).length;

  return (
    <div className="usuarios-page">
      <main className="usuarios-main">
        <section className="usuarios-titulo">
          <div>
            <p>
              MÓDULO DE USUARIOS
            </p>

            <h2>
              Administración de accesos
            </h2>

            <span>
              Crea cuentas, asigna roles
              y controla el acceso al
              sistema.
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="nuevo-usuario"
              onClick={abrirNuevoUsuario}
              disabled={
                cargandoUsuarios ||
                procesando
              }
            >
              + Nuevo usuario
            </button>

            <button
              type="button"
              className="volver-dashboard"
              onClick={() =>
                onNavigate("dashboard")
              }
            >
              Volver al inicio
            </button>
          </div>
        </section>

        <section className="usuarios-resumen">
          <article>
            <div className="usuario-resumen-icono verde">
              👤
            </div>
            <div>
              <span>Usuarios</span>
              <strong>
                {usuarios.length}
              </strong>
              <p>
                Cuentas registradas
              </p>
            </div>
          </article>

          <article>
            <div className="usuario-resumen-icono azul">
              🛡️
            </div>
            <div>
              <span>
                Administradores
              </span>
              <strong>
                {administradores}
              </strong>
              <p>Acceso completo</p>
            </div>
          </article>

          <article>
            <div className="usuario-resumen-icono naranja">
              🧾
            </div>
            <div>
              <span>Cajeros</span>
              <strong>{cajeros}</strong>
              <p>Acceso a ventas</p>
            </div>
          </article>

          <article>
            <div className="usuario-resumen-icono morado">
              ✓
            </div>
            <div>
              <span>Activos</span>
              <strong>{activos}</strong>
              <p>
                Con acceso permitido
              </p>
            </div>
          </article>
        </section>

        <section className="usuarios-panel">
          <div className="usuarios-panel-header">
            <div>
              <p>
                LISTADO GENERAL
              </p>

              <h3>
                Usuarios registrados
              </h3>
            </div>

            <span>
              {usuariosFiltrados.length}{" "}
              resultado
              {usuariosFiltrados.length ===
              1
                ? ""
                : "s"}
            </span>
          </div>

          <div className="usuarios-herramientas">
            <input
              type="text"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(
                  event.target.value
                )
              }
              placeholder="Buscar por nombre o usuario"
            />

            <select
              value={filtroRol}
              onChange={(event) =>
                setFiltroRol(
                  event.target.value as
                    | "todos"
                    | RolUsuario
                )
              }
            >
              <option value="todos">
                Todos los roles
              </option>

              <option value="Administrador">
                Administradores
              </option>

              <option value="Cajero">
                Cajeros
              </option>
            </select>

            <select
              value={filtroEstado}
              onChange={(event) =>
                setFiltroEstado(
                  event.target.value as
                    | "todos"
                    | "activos"
                    | "inactivos"
                )
              }
            >
              <option value="todos">
                Todos los estados
              </option>

              <option value="activos">
                Activos
              </option>

              <option value="inactivos">
                Inactivos
              </option>
            </select>
          </div>

          <div className="usuarios-tabla-contenedor">
            <table className="usuarios-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>
                    Fecha de creación
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargandoUsuarios ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="usuarios-vacio"
                    >
                      <div>⏳</div>
                      <strong>
                        Cargando usuarios...
                      </strong>
                    </td>
                  </tr>
                ) : usuariosFiltrados.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="usuarios-vacio"
                    >
                      <div>👥</div>
                      <strong>
                        No se encontraron
                        usuarios
                      </strong>
                      <p>
                        Modifica los filtros
                        o crea una cuenta
                        nueva.
                      </p>
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map(
                    (usuario) => (
                      <tr key={usuario.id}>
                        <td>
                          <strong>
                            {
                              usuario.nombreCompleto
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            usuario.usuario
                          }
                        </td>

                        <td>
                          <span
                            className={`rol-usuario ${
                              usuario.rol ===
                              "Administrador"
                                ? "administrador"
                                : "cajero"
                            }`}
                          >
                            {usuario.rol}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className={`estado-usuario ${
                              usuario.activo
                                ? "activo"
                                : "inactivo"
                            }`}
                            disabled={
                              procesando
                            }
                            onClick={() =>
                              cambiarEstado(
                                usuario
                              )
                            }
                          >
                            {usuario.activo
                              ? "Activo"
                              : "Inactivo"}
                          </button>
                        </td>

                        <td>
                          {new Date(
                            usuario.fechaCreacion
                          ).toLocaleDateString(
                            "es-MX"
                          )}
                        </td>

                        <td>
                          <div className="acciones-usuario">
                            <button
                              type="button"
                              className="editar-usuario"
                              disabled={
                                procesando
                              }
                              onClick={() =>
                                editarUsuario(
                                  usuario
                                )
                              }
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              className="eliminar-usuario"
                              disabled={
                                procesando
                              }
                              onClick={() =>
                                setUsuarioAEliminar(
                                  usuario
                                )
                              }
                            >
                              Eliminar
                            </button>
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

      {mostrarFormulario && (
        <div className="usuario-modal-fondo">
          <div className="usuario-modal">
            <div className="usuario-modal-header">
              <div>
                <span>
                  GESTIÓN DE ACCESO
                </span>

                <h2>
                  {usuarioEditando
                    ? "Editar usuario"
                    : "Crear usuario"}
                </h2>
              </div>

              <button
                type="button"
                disabled={procesando}
                onClick={() => {
                  setMostrarFormulario(
                    false
                  );
                  setUsuarioEditando(
                    null
                  );
                  limpiarFormulario();
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={guardarUsuario}
            >
              <div className="usuario-form-grid">
                <label>
                  Nombre completo

                  <input
                    type="text"
                    value={nombreCompleto}
                    disabled={procesando}
                    onChange={(event) => {
                      setNombreCompleto(
                        event.target.value
                      );
                      setErrorFormulario(
                        ""
                      );
                    }}
                    placeholder="Ejemplo: Juan Pérez"
                  />
                </label>

                <label>
                  Nombre de usuario

                  <input
                    type="text"
                    value={nombreUsuario}
                    disabled={procesando}
                    onChange={(event) => {
                      setNombreUsuario(
                        event.target.value
                      );
                      setErrorFormulario(
                        ""
                      );
                    }}
                    placeholder="Ejemplo: juan.perez"
                  />
                </label>

                <label>
                  Contraseña

                  <input
                    type="password"
                    value={contrasena}
                    disabled={procesando}
                    onChange={(event) => {
                      setContrasena(
                        event.target.value
                      );
                      setErrorFormulario(
                        ""
                      );
                    }}
                    placeholder={
                      usuarioEditando
                        ? "Déjala vacía para conservarla"
                        : "Mínimo 6 caracteres"
                    }
                  />
                </label>

                <label>
                  Rol

                  <select
                    value={rol}
                    disabled={procesando}
                    onChange={(event) => {
                      setRol(
                        event.target
                          .value as RolUsuario
                      );
                      setErrorFormulario(
                        ""
                      );
                    }}
                  >
                    <option value="Administrador">
                      Administrador
                    </option>

                    <option value="Cajero">
                      Cajero
                    </option>
                  </select>
                </label>
              </div>

              {usuarioEditando &&
                rol === "Administrador" && (
                  <section className="usuario-pin-edicion">
                    <div className="usuario-pin-edicion-header">
                      <div>
                        <span>SEGURIDAD</span>
                        <strong>
                          PIN de autorización
                        </strong>
                      </div>

                      <span
                        className={
                          usuarioEditando.tienePin
                            ? "pin-configurado"
                            : "pin-sin-configurar"
                        }
                      >
                        {usuarioEditando.tienePin
                          ? "PIN configurado"
                          : "Sin PIN"}
                      </span>
                    </div>

                    <p>
                      {usuarioEditando.tienePin
                        ? "Escribe un PIN nuevo solo si deseas cambiar el actual."
                        : "Configura un PIN para autorizar cancelaciones y devoluciones."}
                    </p>

                    <div className="usuario-form-grid">
                      <label>
                        {usuarioEditando.tienePin
                          ? "Nuevo PIN"
                          : "Crear PIN"}

                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          value={pin}
                          disabled={procesando}
                          onChange={(event) => {
                            setPin(
                              event.target.value.replace(
                                /\D/g,
                                ""
                              )
                            );
                            setErrorPin("");
                            setErrorFormulario("");
                          }}
                          placeholder={
                            usuarioEditando.tienePin
                              ? "Déjalo vacío para conservarlo"
                              : "4 a 6 números"
                          }
                        />
                      </label>

                      <label>
                        Confirmar PIN

                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          value={confirmarPin}
                          disabled={procesando}
                          onChange={(event) => {
                            setConfirmarPin(
                              event.target.value.replace(
                                /\D/g,
                                ""
                              )
                            );
                            setErrorPin("");
                            setErrorFormulario("");
                          }}
                          placeholder="Repite el PIN"
                        />
                      </label>
                    </div>
                  </section>
                )}

              <label className="usuario-activo-check">
                <input
                  type="checkbox"
                  checked={activo}
                  disabled={procesando}
                  onChange={(event) =>
                    setActivo(
                      event.target.checked
                    )
                  }
                />

                <div>
                  <strong>
                    Usuario activo
                  </strong>

                  <span>
                    Permitir que esta
                    cuenta inicie sesión.
                  </span>
                </div>
              </label>

              {errorFormulario && (
                <div className="usuario-error">
                  <span>⚠️</span>
                  <p>
                    {errorFormulario}
                  </p>
                </div>
              )}

              <div className="usuario-modal-acciones">
                <button
                  type="button"
                  className="cancelar-usuario"
                  disabled={procesando}
                  onClick={() => {
                    setMostrarFormulario(
                      false
                    );
                    setUsuarioEditando(
                      null
                    );
                    limpiarFormulario();
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="guardar-usuario"
                  disabled={procesando}
                >
                  {procesando
                    ? "Guardando..."
                    : usuarioEditando
                      ? "Guardar cambios"
                      : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {usuarioAEliminar && (
        <div className="usuario-eliminar-fondo">
          <div className="usuario-eliminar-modal">
            <div className="usuario-eliminar-icono">
              ⚠️
            </div>

            <h2>
              Eliminar usuario
            </h2>

            <p>
              Esta cuenta ya no podrá
              acceder al sistema.
            </p>

            <div className="usuario-eliminar-datos">
              <strong>
                {
                  usuarioAEliminar.nombreCompleto
                }
              </strong>

              <span>
                Usuario:{" "}
                {
                  usuarioAEliminar.usuario
                }
              </span>
            </div>

            <div className="usuario-eliminar-acciones">
              <button
                type="button"
                className="cancelar-eliminar-usuario"
                disabled={procesando}
                onClick={() =>
                  setUsuarioAEliminar(
                    null
                  )
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="confirmar-eliminar-usuario"
                disabled={procesando}
                onClick={
                  confirmarEliminacion
                }
              >
                {procesando
                  ? "Eliminando..."
                  : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mensajeExito && (
        <div className="usuario-exito-fondo">
          <div className="usuario-exito">
            <div>✓</div>
            <h2>
              Operación completada
            </h2>
            <p>{mensajeExito}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Usuarios;