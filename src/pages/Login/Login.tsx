import { useState } from "react";
import "./Login.css";
import {
  validarLogin,
  type UsuarioSesion,
} from "../../services/usuariosService";
import {
  registrarEventoBitacora,
} from "../../services/bitacoraService";

export type { UsuarioSesion } from "../../services/usuariosService";

interface LoginProps {
  onLogin: (usuario: UsuarioSesion) => void;
}

function Login({ onLogin }: LoginProps) {
  const [usuario, setUsuario] = useState(
    () => localStorage.getItem("usuarioRecordado") ?? ""
  );
  const [contrasena, setContrasena] = useState("");
  const [recordarUsuario, setRecordarUsuario] = useState(
    () => localStorage.getItem("usuarioRecordado") !== null
  );
  const [errorLogin, setErrorLogin] = useState("");
  const [procesando, setProcesando] = useState(false);

  async function iniciarSesion(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (procesando) {
      return;
    }

    const usuarioLimpio = usuario.trim();

    if (!usuarioLimpio || !contrasena) {
      setErrorLogin("Ingresa tu usuario y contraseña.");
      return;
    }

    try {
      setProcesando(true);
      setErrorLogin("");

      const usuarioSesion = await validarLogin(
        usuarioLimpio,
        contrasena
      );

      await registrarEventoBitacora({
        usuarioId: usuarioSesion.id,
        nombreUsuario: usuarioSesion.nombreCompleto,
        usuario: usuarioSesion.usuario,
        rol: usuarioSesion.rol,
        modulo: "Acceso",
        accion: "Inicio de sesión",
        detalle: "Inicio de sesión correcto.",
        entidadTipo: "usuario",
        entidadId: usuarioSesion.id,
      });

      if (recordarUsuario) {
        localStorage.setItem(
          "usuarioRecordado",
          usuarioSesion.usuario
        );
      } else {
        localStorage.removeItem("usuarioRecordado");
      }

      setContrasena("");
      onLogin(usuarioSesion);
    } catch (error) {
      console.error(error);

      try {
        await registrarEventoBitacora({
          usuarioId: null,
          nombreUsuario: usuarioLimpio || "Sin registrar",
          usuario: usuarioLimpio || "Sin registrar",
          rol: "Sin registrar",
          modulo: "Acceso",
          accion: "Intento fallido de inicio de sesión",
          detalle: `Intento fallido para el usuario "${usuarioLimpio}".`,
          entidadTipo: "usuario",
          entidadId: null,
        });
      } catch (errorBitacora) {
        console.error(
          "No fue posible registrar el intento fallido:",
          errorBitacora
        );
      }

      setErrorLogin(
        error instanceof Error
          ? error.message
          : "No fue posible iniciar sesión."
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-presentacion">
        <div className="login-presentacion-contenido">
          <img
            className="login-logo-principal"
            src="/logo.png"
            alt="Logo de Abarrotes San Francisco"
          />

          <p className="login-etiqueta">
            SISTEMA ADMINISTRATIVO
          </p>

          <h1>Abarrotes San Francisco</h1>

          <p className="login-descripcion">
            Controla ventas, productos, inventario, clientes,
            créditos y reportes desde un solo lugar.
          </p>

          <div className="login-caracteristicas">
            <div>
              <span>✓</span>
              <p>Control de productos e inventario</p>
            </div>

            <div>
              <span>✓</span>
              <p>Registro rápido de ventas</p>
            </div>

            <div>
              <span>✓</span>
              <p>Resumen y actividad de la tienda</p>
            </div>
          </div>
        </div>

        <p className="login-version">
          Abarrotes San Francisco · Versión 1.0
        </p>
      </section>

      <section className="login-acceso">
        <div className="login-formulario-contenedor">
          <div className="login-marca-movil">
            <img
              src="/logo.png"
              alt="Abarrotes San Francisco"
            />

            <div>
              <strong>
                Sistema de Abarrotes San Francisco
              </strong>
              <span>Punto de venta</span>
            </div>
          </div>

          <div className="login-encabezado">
            <p>ACCESO AL SISTEMA</p>
            <h2>Bienvenido de nuevo</h2>

            <span>
              Ingresa tus datos para abrir el sistema
              administrativo.
            </span>
          </div>

          <form
            className="login-formulario"
            onSubmit={iniciarSesion}
            autoComplete="off"
          >
            <label>
              Usuario
              <div className="login-input-contenedor">
                <span>👤</span>

                <input
                  type="text"
                  name="username"
                  value={usuario}
                  autoComplete="off"
                  onChange={(event) => {
                    setUsuario(event.target.value);
                    setErrorLogin("");
                  }}
                  placeholder="Ingresa tu usuario"
                />
              </div>
            </label>

            <label>
              Contraseña
              <div className="login-input-contenedor">
                <span>🔒</span>

                <input
                  type="password"
                  name="password"
                  value={contrasena}
                  autoComplete="new-password"
                  onChange={(event) => {
                    setContrasena(event.target.value);
                    setErrorLogin("");
                  }}
                  placeholder="Ingresa tu contraseña"
                />
              </div>
            </label>

            {errorLogin && (
              <div className="login-error">
                <span>⚠️</span>

                <div>
                  <strong>No se pudo iniciar sesión</strong>
                  <p>{errorLogin}</p>
                </div>
              </div>
            )}

            <div className="login-opciones">
              <label className="recordar-sesion">
                <input
                  type="checkbox"
                  checked={recordarUsuario}
                  onChange={(event) =>
                    setRecordarUsuario(event.target.checked)
                  }
                />
                Recordar usuario
              </label>

              <span>Acceso autorizado</span>
            </div>

            <button
              type="submit"
              disabled={procesando}
            >
              {procesando
                ? "Verificando acceso..."
                : "Iniciar sesión"}
              <span>→</span>
            </button>
          </form>

          <p className="login-ayuda">
            Acceso exclusivo para personal autorizado.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;