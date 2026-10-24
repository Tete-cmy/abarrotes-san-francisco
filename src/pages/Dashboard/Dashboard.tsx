import { useEffect, useMemo, useState } from "react";
import "./dashboard.css";
import {
  obtenerDatosDashboard,
  type DatosDashboard,
} from "../../services/dashboardService";
import type { UsuarioSesion } from "../Login/Login";
import type { Pantalla } from "../../types/navegacion";

interface DashboardProps {
  onNavigate: (pantalla: Pantalla) => void;
  usuarioActual: UsuarioSesion;
}

interface ActividadDashboard {
  id: string;
  fecha: string;
  tipo: string;
  icono: string;
  titulo: string;
  descripcion: string;
  importe: number | null;
  pantalla: Pantalla;
}

const datosIniciales: DatosDashboard = {
  productos: [],
  ventas: [],
  compras: [],
  creditos: [],
  movimientosInventario: [],
};

function obtenerCampoTexto(
  objeto: unknown,
  campos: string[],
  respaldo: string
): string {
  if (!objeto || typeof objeto !== "object") {
    return respaldo;
  }

  const registro = objeto as Record<string, unknown>;

  for (const campo of campos) {
    const valor = registro[campo];

    if (
      typeof valor === "string" &&
      valor.trim() !== ""
    ) {
      return valor;
    }
  }

  return respaldo;
}

function obtenerCampoNumero(
  objeto: unknown,
  campos: string[],
  respaldo = 0
): number {
  if (!objeto || typeof objeto !== "object") {
    return respaldo;
  }

  const registro = objeto as Record<string, unknown>;

  for (const campo of campos) {
    const valor = Number(registro[campo]);

    if (Number.isFinite(valor)) {
      return valor;
    }
  }

  return respaldo;
}

function Dashboard({
  onNavigate,
  usuarioActual,
}: DashboardProps) {
  const [datos, setDatos] =
    useState<DatosDashboard>(datosIniciales);
  const [cargandoDashboard, setCargandoDashboard] =
    useState(true);
  const [errorDashboard, setErrorDashboard] =
    useState("");

  useEffect(() => {
    let componenteActivo = true;

    async function cargarDashboard() {
      try {
        setCargandoDashboard(true);
        setErrorDashboard("");

        const respuesta =
          await obtenerDatosDashboard();

        if (!componenteActivo) {
          return;
        }

        setDatos(respuesta);
      } catch (error) {
        console.error(error);

        if (!componenteActivo) {
          return;
        }

        setErrorDashboard(
          error instanceof Error
            ? error.message
            : "No fue posible cargar el panel general."
        );
      } finally {
        if (componenteActivo) {
          setCargandoDashboard(false);
        }
      }
    }

    cargarDashboard();

    return () => {
      componenteActivo = false;
    };
  }, []);

  const ahora = new Date();

  function esHoy(fecha: string) {
    const valor = new Date(fecha);

    return (
      valor.getFullYear() === ahora.getFullYear() &&
      valor.getMonth() === ahora.getMonth() &&
      valor.getDate() === ahora.getDate()
    );
  }

  function esMesActual(fecha: string) {
    const valor = new Date(fecha);

    return (
      valor.getFullYear() === ahora.getFullYear() &&
      valor.getMonth() === ahora.getMonth()
    );
  }

  const ventasHoy = datos.ventas.filter((venta) =>
    esHoy(venta.fecha)
  );

  const comprasMes = datos.compras.filter((compra) =>
    esMesActual(
      obtenerCampoTexto(
        compra,
        ["fecha", "createdAt", "created_at"],
        new Date(0).toISOString()
      )
    )
  );

  const totalVentasHoy = ventasHoy.reduce(
    (total, venta) => total + Number(venta.total),
    0
  );

  const totalComprasMes = comprasMes.reduce(
    (total, compra) =>
      total +
      obtenerCampoNumero(compra, ["total", "importeTotal"]),
    0
  );

  const creditosPendientes = datos.creditos.filter(
    (credito) => credito.estado !== "liquidado"
  );

  const saldoCreditos = creditosPendientes.reduce(
    (total, credito) =>
      total + Number(credito.saldoRestante),
    0
  );

  const stockBajo = datos.productos.filter(
    (producto) =>
      Number(producto.existencias) <=
      Number(producto.stockMinimo)
  );

  const agotados = datos.productos.filter(
    (producto) => Number(producto.existencias) <= 0
  );

  const valorInventario = datos.productos.reduce(
    (total, producto) =>
      total +
      Number(producto.precioCompra) *
        Number(producto.existencias),
    0
  );

  const gananciaEstimadaHoy = ventasHoy.reduce(
    (total, venta) => {
      const ganancia = venta.productos.reduce(
        (acumulado, detalle) => {
          const producto = datos.productos.find(
            (item) => item.id === detalle.id
          );

          if (!producto) {
            return acumulado;
          }

          return (
            acumulado +
            (Number(detalle.precioVenta) -
              Number(producto.precioCompra)) *
              Number(detalle.cantidad)
          );
        },
        0
      );

      return total + ganancia;
    },
    0
  );

  const comprasPendientes = datos.compras.filter(
    (compra) => {
      const estado = obtenerCampoTexto(
        compra,
        ["estadoPago", "estado_pago", "estado"],
        ""
      ).toLowerCase();

      return estado === "pendiente";
    }
  ).length;

  const actividadReciente = useMemo(() => {
    const ventas: ActividadDashboard[] =
      datos.ventas.map((venta) => ({
        id: `venta-${venta.id}`,
        fecha: venta.fecha,
        tipo: "Venta",
        icono: "🛒",
        titulo: `Venta #${venta.id}`,
        descripcion: `${venta.productos.length} producto${
          venta.productos.length === 1 ? "" : "s"
        }`,
        importe: Number(venta.total),
        pantalla: "ventas",
      }));

    const compras: ActividadDashboard[] =
      datos.compras.map((compra) => ({
        id: `compra-${obtenerCampoNumero(
          compra,
          ["id"]
        )}`,
        fecha: obtenerCampoTexto(
          compra,
          ["fecha", "createdAt", "created_at"],
          new Date(0).toISOString()
        ),
        tipo: "Compra",
        icono: "🚚",
        titulo: `Compra #${obtenerCampoNumero(
          compra,
          ["id"]
        )}`,
        descripcion: obtenerCampoTexto(
          compra,
          [
            "proveedorNombre",
            "proveedor_nombre",
            "proveedor",
          ],
          "Proveedor sin registrar"
        ),
        importe: obtenerCampoNumero(
          compra,
          ["total", "importeTotal"]
        ),
        pantalla: "compras",
      }));

    const movimientos: ActividadDashboard[] =
      datos.movimientosInventario.map(
        (movimiento) => ({
          id: `movimiento-${movimiento.id}`,
          fecha: movimiento.fecha,
          tipo:
            movimiento.tipo === "entrada"
              ? "Entrada"
              : "Salida",
          icono:
            movimiento.tipo === "entrada"
              ? "📥"
              : "📤",
          titulo: movimiento.productoNombre,
          descripcion: `${movimiento.cantidad} · ${movimiento.motivo}`,
          importe: null,
          pantalla: "inventario",
        })
      );

    return [...ventas, ...compras, ...movimientos]
      .sort(
        (a, b) =>
          new Date(b.fecha).getTime() -
          new Date(a.fecha).getTime()
      )
      .slice(0, 7);
  }, [
    datos.ventas,
    datos.compras,
    datos.movimientosInventario,
  ]);

  const productosMasVendidos = useMemo(() => {
    const acumulado = new Map<
      number,
      {
        nombre: string;
        cantidad: number;
        importe: number;
      }
    >();

    datos.ventas.forEach((venta) => {
      venta.productos.forEach((producto) => {
        const actual = acumulado.get(producto.id) ?? {
          nombre: producto.nombre,
          cantidad: 0,
          importe: 0,
        };

        actual.cantidad += Number(producto.cantidad);
        actual.importe += Number(producto.subtotal);

        acumulado.set(producto.id, actual);
      });
    });

    return [...acumulado.values()]
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [datos.ventas]);

  const saludo =
    ahora.getHours() < 12
      ? "Buenos días"
      : ahora.getHours() < 19
      ? "Buenas tardes"
      : "Buenas noches";

  return (
    <div className="panel-page">
      {errorDashboard && (
        <div className="dashboard-aviso error">
          <span>⚠️</span>
          <p>{errorDashboard}</p>
        </div>
      )}

      {cargandoDashboard && (
        <div className="dashboard-aviso">
          <span>⏳</span>
          <p>Cargando información del negocio...</p>
        </div>
      )}

      <main className="panel-main">
        <section className="panel-welcome">
          <div>
            <p>CENTRO DE CONTROL</p>
            <h2>
              {saludo}, {usuarioActual.nombreCompleto}
            </h2>
            <span>
              Estado general de Abarrotes San Francisco.
            </span>
          </div>

          <div className="welcome-actions">
            <button
              type="button"
              onClick={() => onNavigate("ventas")}
            >
              <span>🛒</span>
              Nueva venta
            </button>

            <button
              type="button"
              onClick={() => onNavigate("compras")}
            >
              <span>🚚</span>
              Registrar compra
            </button>
          </div>
        </section>

        <section className="business-stats-grid">
          <article className="business-stat-card ventas">
            <div className="business-stat-icon">💵</div>
            <div>
              <span>Ventas de hoy</span>
              <strong>${totalVentasHoy.toFixed(2)}</strong>
              <p>
                {ventasHoy.length} operación
                {ventasHoy.length === 1 ? "" : "es"}
              </p>
            </div>
          </article>

          <article className="business-stat-card ganancia">
            <div className="business-stat-icon">📈</div>
            <div>
              <span>Ganancia estimada hoy</span>
              <strong>
                ${gananciaEstimadaHoy.toFixed(2)}
              </strong>
              <p>Venta menos costo registrado</p>
            </div>
          </article>

          <article className="business-stat-card compras">
            <div className="business-stat-icon">🚚</div>
            <div>
              <span>Compras del mes</span>
              <strong>
                ${totalComprasMes.toFixed(2)}
              </strong>
              <p>
                {comprasMes.length} compra
                {comprasMes.length === 1 ? "" : "s"}
              </p>
            </div>
          </article>

          <article className="business-stat-card creditos">
            <div className="business-stat-icon">💳</div>
            <div>
              <span>Créditos por cobrar</span>
              <strong>${saldoCreditos.toFixed(2)}</strong>
              <p>
                {creditosPendientes.length} cuenta
                {creditosPendientes.length === 1
                  ? ""
                  : "s"}{" "}
                abierta
                {creditosPendientes.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>
          </article>

          <article className="business-stat-card inventario">
            <div className="business-stat-icon">📦</div>
            <div>
              <span>Valor del inventario</span>
              <strong>
                ${valorInventario.toFixed(2)}
              </strong>
              <p>{datos.productos.length} productos</p>
            </div>
          </article>

          <article className="business-stat-card alertas">
            <div className="business-stat-icon">⚠️</div>
            <div>
              <span>Alertas de inventario</span>
              <strong>{stockBajo.length}</strong>
              <p>{agotados.length} agotados</p>
            </div>
          </article>
        </section>

        <section className="dashboard-main-grid">
          <div className="dashboard-activity-panel">
            <div className="dashboard-section-heading">
              <div>
                <p>OPERACIONES RECIENTES</p>
                <h3>Actividad del negocio</h3>
              </div>

              <span>
                Ventas, compras e inventario
              </span>
            </div>

            <div className="activity-list">
              {actividadReciente.length === 0 ? (
                <div className="dashboard-empty">
                  <div>📋</div>
                  <strong>
                    No hay actividad registrada
                  </strong>
                  <p>
                    Las operaciones aparecerán aquí.
                  </p>
                </div>
              ) : (
                actividadReciente.map((actividad) => (
                  <button
                    type="button"
                    key={actividad.id}
                    className="activity-row"
                    onClick={() =>
                      onNavigate(actividad.pantalla)
                    }
                  >
                    <span className="activity-icon">
                      {actividad.icono}
                    </span>

                    <span className="activity-copy">
                      <strong>
                        {actividad.titulo}
                      </strong>
                      <small>
                        {actividad.tipo} ·{" "}
                        {actividad.descripcion}
                      </small>
                    </span>

                    <span className="activity-date">
                      {new Date(
                        actividad.fecha
                      ).toLocaleString("es-MX")}
                    </span>

                    {actividad.importe !== null && (
                      <b>
                        $
                        {actividad.importe.toFixed(2)}
                      </b>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <aside className="dashboard-status-panel">
            <div className="dashboard-section-heading compact">
              <div>
                <p>ESTADO DEL NEGOCIO</p>
                <h3>Resumen operativo</h3>
              </div>
            </div>

            <div className="status-list">
              <button
                type="button"
                onClick={() => onNavigate("corte")}
              >
                <span className="status-icon">💵</span>
                <span>
                  <strong>Caja y corte</strong>
                  <small>
                    Apertura, movimientos y cierre
                  </small>
                </span>
                <b>→</b>
              </button>

              <button
                type="button"
                onClick={() => onNavigate("creditos")}
              >
                <span className="status-icon">💳</span>
                <span>
                  <strong>
                    {creditosPendientes.length} créditos
                    abiertos
                  </strong>
                  <small>
                    ${saldoCreditos.toFixed(2)} por cobrar
                  </small>
                </span>
                <b>→</b>
              </button>

              <button
                type="button"
                onClick={() => onNavigate("compras")}
              >
                <span className="status-icon">🚚</span>
                <span>
                  <strong>
                    {comprasPendientes} compras pendientes
                  </strong>
                  <small>
                    Consultar proveedores y pagos
                  </small>
                </span>
                <b>→</b>
              </button>

              <button
                type="button"
                onClick={() =>
                  onNavigate("inventario")
                }
              >
                <span className="status-icon">📦</span>
                <span>
                  <strong>
                    {stockBajo.length} productos por surtir
                  </strong>
                  <small>
                    {agotados.length} sin existencias
                  </small>
                </span>
                <b>→</b>
              </button>
            </div>
          </aside>
        </section>

        <section className="dashboard-secondary-grid">
          <div className="dashboard-ranking-panel">
            <div className="dashboard-section-heading">
              <div>
                <p>PRODUCTOS</p>
                <h3>Más vendidos</h3>
              </div>
            </div>

            <div className="dashboard-ranking-list">
              {productosMasVendidos.length === 0 ? (
                <div className="dashboard-empty small">
                  <div>📦</div>
                  <strong>Sin datos de ventas</strong>
                </div>
              ) : (
                productosMasVendidos.map(
                  (producto, indice) => (
                    <article key={producto.nombre}>
                      <span>{indice + 1}</span>
                      <div>
                        <strong>
                          {producto.nombre}
                        </strong>
                        <small>
                          {producto.cantidad} unidades
                        </small>
                      </div>
                      <b>
                        ${producto.importe.toFixed(2)}
                      </b>
                    </article>
                  )
                )
              )}
            </div>
          </div>

          <div className="dashboard-alert-panel">
            <div className="dashboard-section-heading">
              <div>
                <p>ALERTAS</p>
                <h3>Requiere atención</h3>
              </div>
            </div>

            <div className="dashboard-alert-list">
              {stockBajo.length === 0 ? (
                <div className="dashboard-empty small">
                  <div>✅</div>
                  <strong>
                    Inventario en buen estado
                  </strong>
                </div>
              ) : (
                stockBajo.slice(0, 5).map(
                  (producto) => (
                    <button
                      type="button"
                      key={producto.id}
                      onClick={() =>
                        onNavigate("productos")
                      }
                    >
                      <span>⚠️</span>
                      <div>
                        <strong>
                          {producto.nombre}
                        </strong>
                        <small>
                          {producto.existencias} disponibles
                          · mínimo{" "}
                          {producto.stockMinimo}
                        </small>
                      </div>
                      <b>Ver</b>
                    </button>
                  )
                )
              )}
            </div>
          </div>
        </section>

        <section className="dashboard-quick-actions">
          <button
            type="button"
            onClick={() => onNavigate("ventas")}
          >
            <span>🛒</span>
            <strong>Nueva venta</strong>
            <small>Registrar un cobro</small>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("compras")}
          >
            <span>🚚</span>
            <strong>Nueva compra</strong>
            <small>Ingresar mercancía</small>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("productos")}
          >
            <span>📦</span>
            <strong>Nuevo producto</strong>
            <small>Administrar catálogo</small>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("creditos")}
          >
            <span>💳</span>
            <strong>Créditos</strong>
            <small>Consultar saldos</small>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("corte")}
          >
            <span>💵</span>
            <strong>Corte de caja</strong>
            <small>Controlar efectivo</small>
          </button>

          {usuarioActual.rol ===
            "Administrador" && (
            <button
              type="button"
              onClick={() =>
                onNavigate("reportes")
              }
            >
              <span>📈</span>
              <strong>Informes</strong>
              <small>Analizar resultados</small>
            </button>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;