import { useEffect, useState } from "react";
import "./Configuracion.css";
import {
  guardarConfiguracion,
  obtenerConfiguracion,
  type ConfiguracionTienda,
} from "../../services/configuracionService";

const configuracionInicial: ConfiguracionTienda = {
  id: 1,
  nombreTienda: "Abarrotes San Francisco",
  slogan: "Sistema administrativo y punto de venta",
  telefono: "",
  correo: "",
  direccion: "",
  colonia: "",
  municipioEstado: "",
  codigoPostal: "",
  rfc: "",
  moneda: "MXN",
  simboloMoneda: "$",
  porcentajeImpuesto: 0,
  stockMinimoPredeterminado: 5,
  permitirCreditos: true,
  imprimirTicketAutomatico: false,
  mostrarLogoTicket: true,
  pieTicket: "Gracias por su compra",
  logoUrl: "/logo.png",
  actualizadoEn: new Date().toISOString(),
};

function Configuracion() {
  const [configuracion, setConfiguracion] =
    useState<ConfiguracionTienda>(
      configuracionInicial
    );

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  useEffect(() => {
    let componenteActivo = true;

    async function cargarConfiguracion() {
      try {
        setCargando(true);
        setError("");

        const datos = await obtenerConfiguracion();

        if (!componenteActivo) {
          return;
        }

        setConfiguracion(datos);

        localStorage.setItem(
          "configuracionTienda",
          JSON.stringify(datos)
        );
      } catch (errorCarga) {
        console.error(errorCarga);

        if (!componenteActivo) {
          return;
        }

        setError(
          "No fue posible cargar la configuración desde Supabase."
        );

        const respaldo = localStorage.getItem(
          "configuracionTienda"
        );

        if (respaldo) {
          try {
            setConfiguracion(
              JSON.parse(respaldo) as ConfiguracionTienda
            );
          } catch {
            setConfiguracion(configuracionInicial);
          }
        }
      } finally {
        if (componenteActivo) {
          setCargando(false);
        }
      }
    }

    cargarConfiguracion();

    return () => {
      componenteActivo = false;
    };
  }, []);

  function actualizarCampo<
    K extends keyof ConfiguracionTienda,
  >(
    campo: K,
    valor: ConfiguracionTienda[K]
  ) {
    setConfiguracion((actual) => ({
      ...actual,
      [campo]: valor,
    }));

    setError("");
  }

  async function guardar(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (guardando) {
      return;
    }

    if (!configuracion.nombreTienda.trim()) {
      setError(
        "El nombre de la tienda es obligatorio."
      );
      return;
    }

    if (
      configuracion.correo.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        configuracion.correo.trim()
      )
    ) {
      setError(
        "Ingresa un correo electrónico válido."
      );
      return;
    }

    if (
      !Number.isFinite(
        configuracion.porcentajeImpuesto
      ) ||
      configuracion.porcentajeImpuesto < 0
    ) {
      setError(
        "El porcentaje de impuesto no es válido."
      );
      return;
    }

    if (
      !Number.isInteger(
        configuracion.stockMinimoPredeterminado
      ) ||
      configuracion.stockMinimoPredeterminado < 0
    ) {
      setError(
        "El stock mínimo predeterminado debe ser un entero no negativo."
      );
      return;
    }

    try {
      setGuardando(true);
      setError("");

      const actualizada =
        await guardarConfiguracion(
          configuracion
        );

      setConfiguracion(actualizada);
      setMensajeExito(
        "Configuración guardada correctamente."
      );

      window.setTimeout(() => {
        setMensajeExito("");
      }, 1800);
    } catch (errorGuardado) {
      console.error(errorGuardado);

      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No fue posible guardar la configuración."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="configuracion-page">
      <main className="configuracion-main">
        <section className="configuracion-titulo">
          <div>
            <p>MÓDULO DE CONFIGURACIÓN</p>
            <h1>Ajustes del sistema</h1>
            <span>
              Personaliza los datos de la tienda,
              operación, inventario y ticket.
            </span>
          </div>

          <button
            type="submit"
            form="formulario-configuracion"
            className="configuracion-boton-principal"
            disabled={cargando || guardando}
          >
            {guardando
              ? "Guardando..."
              : "Guardar cambios"}
          </button>
        </section>

        {error && (
          <div className="configuracion-error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {cargando ? (
          <section className="configuracion-cargando">
            <div>⏳</div>
            <h2>Cargando configuración...</h2>
          </section>
        ) : (
          <form
            id="formulario-configuracion"
            onSubmit={guardar}
          >
            <section className="configuracion-layout">
              <div className="configuracion-columna">
                <article className="configuracion-panel">
                  <div className="configuracion-panel-header">
                    <div className="configuracion-icono naranja">
                      🏪
                    </div>
                    <div>
                      <p>DATOS GENERALES</p>
                      <h2>Información de la tienda</h2>
                    </div>
                  </div>

                  <div className="configuracion-form-grid">
                    <label className="configuracion-completo">
                      Nombre de la tienda
                      <input
                        type="text"
                        value={
                          configuracion.nombreTienda
                        }
                        onChange={(event) =>
                          actualizarCampo(
                            "nombreTienda",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label className="configuracion-completo">
                      Slogan
                      <input
                        type="text"
                        value={configuracion.slogan}
                        onChange={(event) =>
                          actualizarCampo(
                            "slogan",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Teléfono
                      <input
                        type="tel"
                        value={configuracion.telefono}
                        onChange={(event) =>
                          actualizarCampo(
                            "telefono",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Correo
                      <input
                        type="email"
                        value={configuracion.correo}
                        onChange={(event) =>
                          actualizarCampo(
                            "correo",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label className="configuracion-completo">
                      Dirección
                      <input
                        type="text"
                        value={configuracion.direccion}
                        onChange={(event) =>
                          actualizarCampo(
                            "direccion",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Colonia
                      <input
                        type="text"
                        value={configuracion.colonia}
                        onChange={(event) =>
                          actualizarCampo(
                            "colonia",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Municipio / Estado
                      <input
                        type="text"
                        value={
                          configuracion.municipioEstado
                        }
                        onChange={(event) =>
                          actualizarCampo(
                            "municipioEstado",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Código postal
                      <input
                        type="text"
                        value={
                          configuracion.codigoPostal
                        }
                        onChange={(event) =>
                          actualizarCampo(
                            "codigoPostal",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      RFC
                      <input
                        type="text"
                        value={configuracion.rfc}
                        onChange={(event) =>
                          actualizarCampo(
                            "rfc",
                            event.target.value.toUpperCase()
                          )
                        }
                      />
                    </label>
                  </div>
                </article>

                <article className="configuracion-panel">
                  <div className="configuracion-panel-header">
                    <div className="configuracion-icono azul">
                      🧾
                    </div>
                    <div>
                      <p>TICKET</p>
                      <h2>Impresión y presentación</h2>
                    </div>
                  </div>

                  <div className="configuracion-form-grid">
                    <label className="configuracion-completo">
                      Ruta del logotipo
                      <input
                        type="text"
                        value={configuracion.logoUrl}
                        onChange={(event) =>
                          actualizarCampo(
                            "logoUrl",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label className="configuracion-completo">
                      Mensaje al final del ticket
                      <textarea
                        rows={4}
                        value={configuracion.pieTicket}
                        onChange={(event) =>
                          actualizarCampo(
                            "pieTicket",
                            event.target.value
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="configuracion-opciones">
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          configuracion.mostrarLogoTicket
                        }
                        onChange={(event) =>
                          actualizarCampo(
                            "mostrarLogoTicket",
                            event.target.checked
                          )
                        }
                      />
                      <div>
                        <strong>
                          Mostrar logo en el ticket
                        </strong>
                        <span>
                          Incluye el logotipo de la tienda.
                        </span>
                      </div>
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={
                          configuracion
                            .imprimirTicketAutomatico
                        }
                        onChange={(event) =>
                          actualizarCampo(
                            "imprimirTicketAutomatico",
                            event.target.checked
                          )
                        }
                      />
                      <div>
                        <strong>
                          Impresión automática
                        </strong>
                        <span>
                          Abre la impresión al finalizar una
                          venta.
                        </span>
                      </div>
                    </label>
                  </div>
                </article>
              </div>

              <aside className="configuracion-columna">
                <article className="configuracion-panel">
                  <div className="configuracion-panel-header">
                    <div className="configuracion-icono morado">
                      ⚙️
                    </div>
                    <div>
                      <p>OPERACIÓN</p>
                      <h2>Preferencias del sistema</h2>
                    </div>
                  </div>

                  <div className="configuracion-form-grid una-columna">
                    <label>
                      Moneda
                      <select
                        value={configuracion.moneda}
                        onChange={(event) =>
                          actualizarCampo(
                            "moneda",
                            event.target.value
                          )
                        }
                      >
                        <option value="MXN">
                          Peso mexicano (MXN)
                        </option>
                        <option value="USD">
                          Dólar estadounidense (USD)
                        </option>
                      </select>
                    </label>

                    <label>
                      Símbolo de moneda
                      <input
                        type="text"
                        maxLength={4}
                        value={
                          configuracion.simboloMoneda
                        }
                        onChange={(event) =>
                          actualizarCampo(
                            "simboloMoneda",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Impuesto predeterminado (%)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          configuracion
                            .porcentajeImpuesto
                        }
                        onChange={(event) =>
                          actualizarCampo(
                            "porcentajeImpuesto",
                            Number(event.target.value)
                          )
                        }
                      />
                    </label>

                    <label>
                      Stock mínimo predeterminado
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          configuracion
                            .stockMinimoPredeterminado
                        }
                        onChange={(event) =>
                          actualizarCampo(
                            "stockMinimoPredeterminado",
                            Number(event.target.value)
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="configuracion-opciones">
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          configuracion.permitirCreditos
                        }
                        onChange={(event) =>
                          actualizarCampo(
                            "permitirCreditos",
                            event.target.checked
                          )
                        }
                      />
                      <div>
                        <strong>
                          Permitir créditos
                        </strong>
                        <span>
                          Habilita ventas fiadas y abonos.
                        </span>
                      </div>
                    </label>
                  </div>
                </article>

                <article className="configuracion-panel vista-previa">
                  <div className="configuracion-panel-header">
                    <div className="configuracion-icono verde">
                      👁️
                    </div>
                    <div>
                      <p>VISTA PREVIA</p>
                      <h2>Identidad de la tienda</h2>
                    </div>
                  </div>

                  <div className="configuracion-preview-logo">
                    {configuracion.logoUrl ? (
                     <img
                      className="ticket-logo-san-francisco"
                      src="/logo.png"
                      alt="Abarrotes San Francisco"
                    />
                    ) : (
                      <div>🏪</div>
                    )}
                  </div>

                  <h3>{configuracion.nombreTienda}</h3>
                  <p>{configuracion.slogan}</p>

                  <div className="configuracion-preview-datos">
                    <span>
                      {configuracion.telefono ||
                        "Sin teléfono"}
                    </span>
                    <span>
                      {configuracion.direccion ||
                        "Sin dirección"}
                    </span>
                    <span>
                      RFC:{" "}
                      {configuracion.rfc ||
                        "Sin registrar"}
                    </span>
                  </div>

                  <div className="configuracion-preview-ticket">
                    <strong>
                      {configuracion.simboloMoneda}
                      125.00
                    </strong>
                    <span>{configuracion.pieTicket}</span>
                  </div>
                </article>
              </aside>
            </section>
          </form>
        )}
      </main>

      {mensajeExito && (
        <div className="configuracion-exito-fondo">
          <div className="configuracion-exito">
            <div>✓</div>
            <h2>Configuración guardada</h2>
            <p>{mensajeExito}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Configuracion;