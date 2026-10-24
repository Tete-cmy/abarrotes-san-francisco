import {
  useEffect,
  type ReactNode,
} from "react";
import "./SistemaLayout.css";
import type { UsuarioSesion } from "../../services/usuariosService";
import type { Pantalla } from "../../types/navegacion";

interface SistemaLayoutProps {
  children: ReactNode;
  pantallaActual: Pantalla;
  onNavigate: (pantalla: Pantalla) => void;
  usuarioActual: UsuarioSesion;
  onCerrarSesion: () => void;
}

interface OpcionMenu {
  pantalla: Pantalla;
  nombre: string;
  icono: string;
  atajo?: string;
  soloAdministrador?: boolean;
}

const opcionesMenu: OpcionMenu[] = [
  {
    pantalla: "ventas",
    nombre: "Ventas",
    icono: "🛒",
    atajo: "F1",
  },
  {
    pantalla: "creditos",
    nombre: "Créditos",
    icono: "💳",
    atajo: "F2",
  },
  {
    pantalla: "clientes",
    nombre: "Clientes",
    icono: "👥",
  },
  {
    pantalla: "productos",
    nombre: "Productos",
    icono: "📦",
    atajo: "F3",
  },
  {
    pantalla: "inventario",
    nombre: "Inventario",
    icono: "📊",
    atajo: "F4",
  },
  {
    pantalla: "compras",
    nombre: "Compras",
    icono: "🚚",
    soloAdministrador: true,
  },
  {
    pantalla: "configuracion",
    nombre: "Configuración",
    icono: "⚙️",
    soloAdministrador: true,
  },
  {
    pantalla: "facturas",
    nombre: "Facturas",
    icono: "🧾",
    soloAdministrador: true,
  },
  {
    pantalla: "devoluciones",
    nombre: "Devoluciones",
    icono: "↩️",
    soloAdministrador: true,
  },
  {
    pantalla: "bitacora",
    nombre: "Bitácora",
    icono: "📋",
    soloAdministrador: true,
  },
  {
    pantalla: "corte",
    nombre: "Corte",
    icono: "💵",
  },
  {
    pantalla: "reportes",
    nombre: "Reportes",
    icono: "📈",
    soloAdministrador: true,
  },
  {
    pantalla: "usuarios",
    nombre: "Usuarios",
    icono: "👤",
    soloAdministrador: true,
  },
];

function SistemaLayout({
  children,
  pantallaActual,
  usuarioActual,
  onNavigate,
  onCerrarSesion,
}: SistemaLayoutProps) {
  const iniciales = usuarioActual.nombreCompleto
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) =>
      palabra[0]?.toUpperCase()
    )
    .join("");

  useEffect(() => {
    function manejarAtajos(
      event: KeyboardEvent
    ) {
      const elementoActivo =
        document.activeElement;

      const estaEscribiendo =
        elementoActivo instanceof
          HTMLInputElement ||
        elementoActivo instanceof
          HTMLTextAreaElement ||
        elementoActivo instanceof
          HTMLSelectElement;

      if (estaEscribiendo) {
        return;
      }

      switch (event.key) {
        case "F1":
          event.preventDefault();
          onNavigate("ventas");
          break;

        case "F2":
          event.preventDefault();
          onNavigate("creditos");
          break;

        case "F3":
          event.preventDefault();
          onNavigate("productos");
          break;

        case "F4":
          event.preventDefault();
          onNavigate("inventario");
          break;

        default:
          break;
      }
    }

    window.addEventListener(
      "keydown",
      manejarAtajos
    );

    return () => {
      window.removeEventListener(
        "keydown",
        manejarAtajos
      );
    };
  }, [onNavigate]);

  const opcionesPermitidas =
    opcionesMenu.filter(
      (opcion) =>
        !opcion.soloAdministrador ||
        usuarioActual.rol ===
          "Administrador"
    );

  return (
    <div className="sistema-layout">
      <header className="sistema-header">
        <button
          type="button"
          className="sistema-marca"
          onClick={() =>
            onNavigate(
              usuarioActual.rol ===
                "Administrador"
                ? "dashboard"
                : "ventas"
            )
          }
        >
          <img
            src="/logo.png"
            alt="Logo de Abarrotes San Francisco"
          />

          <div>
            <strong>
              Abarrotes San Francisco
            </strong>
            <span>
              Sistema administrativo y punto
              de venta
            </span>
          </div>
        </button>

        <div className="sistema-sesion">
          <div className="sistema-fecha">
            <span>📅</span>

            <div>
              <small>Fecha actual</small>
              <strong>
                {new Date().toLocaleDateString(
                  "es-MX",
                  {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </strong>
            </div>
          </div>

          <div className="sistema-estado-caja">
            <span />
            Caja abierta
          </div>

          <div className="sistema-usuario">
            <div className="sistema-avatar">
              {iniciales || "US"}
            </div>

            <div>
              <small>
                {usuarioActual.rol}
              </small>
              <strong>
                {
                  usuarioActual.nombreCompleto
                }
              </strong>
              <span>
                @{usuarioActual.usuario}
              </span>
            </div>
          </div>
        </div>
      </header>

      <nav className="sistema-menu">
        {usuarioActual.rol ===
          "Administrador" && (
          <button
            type="button"
            className={
              pantallaActual === "dashboard"
                ? "sistema-menu-activo"
                : ""
            }
            onClick={() =>
              onNavigate("dashboard")
            }
          >
            <span className="sistema-menu-icono">
              🏠
            </span>

            <span className="sistema-menu-texto">
              <strong>Inicio</strong>
              <small>
                Panel principal
              </small>
            </span>
          </button>
        )}

        {opcionesPermitidas.map(
          (opcion) => (
            <button
              type="button"
              key={opcion.pantalla}
              className={
                pantallaActual ===
                opcion.pantalla
                  ? "sistema-menu-activo"
                  : ""
              }
              onClick={() =>
                onNavigate(opcion.pantalla)
              }
            >
              <span className="sistema-menu-icono">
                {opcion.icono}
              </span>

              <span className="sistema-menu-texto">
                <strong>
                  {opcion.nombre}
                </strong>

                <small>
                  {opcion.atajo ??
                    obtenerDescripcion(
                      opcion.pantalla
                    )}
                </small>
              </span>
            </button>
          )
        )}

        <button
          type="button"
          className="sistema-menu-salir"
          onClick={onCerrarSesion}
        >
          <span className="sistema-menu-icono">
            🚪
          </span>

          <span className="sistema-menu-texto">
            <strong>Salir</strong>
            <small>Cerrar sesión</small>
          </span>
        </button>
      </nav>

      <main className="sistema-contenido">
        {children}
      </main>
    </div>
  );
}

function obtenerDescripcion(
  pantalla: Pantalla
): string {
  const descripciones: Record<
    Pantalla,
    string
  > = {
    dashboard: "Panel principal",
    ventas: "Punto de venta",
    creditos: "Fiado y abonos",
    clientes: "Directorio",
    productos: "Catálogo",
    inventario: "Existencias",
    compras: "Proveedores",
    configuracion: "Ajustes",
    facturas: "Comprobantes",
    devoluciones: "Productos devueltos",
    bitacora: "Auditoría",
    corte: "Control de caja",
    reportes: "Estadísticas",
    usuarios: "Personal",
  };

  return descripciones[pantalla];
}

export default SistemaLayout;