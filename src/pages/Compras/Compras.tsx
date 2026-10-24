import { useEffect, useMemo, useState } from "react";
import "./Compras.css";
import type { UsuarioSesion } from "../Login/Login";
import {
  obtenerProductos,
  type Producto,
} from "../../services/productosService";
import {
  actualizarProveedor,
  crearProveedor,
  listarCompras,
  listarProveedores,
  registrarCompra,
  type Compra,
  type EstadoPagoCompra,
  type MetodoPagoCompra,
  type Proveedor,
} from "../../services/comprasService";

interface ComprasProps {
  usuarioActual: UsuarioSesion;
}

interface ProductoCompraFormulario {
  productoId: string;
  cantidad: string;
  costoUnitario: string;
}

const productoCompraInicial: ProductoCompraFormulario = {
  productoId: "",
  cantidad: "1",
  costoUnitario: "",
};

const proveedorInicial = {
  nombre: "",
  contacto: "",
  telefono: "",
  correo: "",
  direccion: "",
  rfc: "",
  notas: "",
  activo: true,
};

function Compras({
  usuarioActual,
}: ComprasProps) {
  const [proveedores, setProveedores] =
    useState<Proveedor[]>([]);
  const [productos, setProductos] =
    useState<Producto[]>([]);
  const [compras, setCompras] =
    useState<Compra[]>([]);

  const [cargando, setCargando] =
    useState(true);
  const [procesando, setProcesando] =
    useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] =
    useState("");

  const [vista, setVista] =
    useState<"compras" | "proveedores">(
      "compras"
    );

  const [mostrarCompra, setMostrarCompra] =
    useState(false);
  const [mostrarProveedor, setMostrarProveedor] =
    useState(false);
  const [proveedorEditando, setProveedorEditando] =
    useState<Proveedor | null>(null);

  const [proveedorId, setProveedorId] =
    useState("");
  const [folioProveedor, setFolioProveedor] =
    useState("");
  const [impuestos, setImpuestos] =
    useState("0");
  const [estadoPago, setEstadoPago] =
    useState<EstadoPagoCompra>("pagada");
  const [metodoPago, setMetodoPago] =
    useState<MetodoPagoCompra>("efectivo");
  const [observaciones, setObservaciones] =
    useState("");
  const [lineasCompra, setLineasCompra] =
    useState<ProductoCompraFormulario[]>([
      { ...productoCompraInicial },
    ]);

  const [formProveedor, setFormProveedor] =
    useState(proveedorInicial);

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      try {
        setCargando(true);
        setError("");

        const [
          proveedoresCargados,
          productosCargados,
          comprasCargadas,
        ] = await Promise.all([
          listarProveedores(),
          obtenerProductos(),
          listarCompras(),
        ]);

        if (!activo) {
          return;
        }

        setProveedores(proveedoresCargados);
        setProductos(productosCargados);
        setCompras(comprasCargadas);
      } catch (errorCarga) {
        console.error(errorCarga);

        if (activo) {
          setError(
            errorCarga instanceof Error
              ? errorCarga.message
              : "No fue posible cargar compras."
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

  const subtotalCompra = useMemo(() => {
    return lineasCompra.reduce(
      (total, linea) =>
        total +
        Number(linea.cantidad || 0) *
          Number(linea.costoUnitario || 0),
      0
    );
  }, [lineasCompra]);

  const impuestosNumero =
    Number(impuestos || 0);

  const totalCompra =
    subtotalCompra +
    (Number.isFinite(impuestosNumero)
      ? impuestosNumero
      : 0);

  const totalComprado = compras.reduce(
    (total, compra) => total + compra.total,
    0
  );

  const comprasPendientes = compras.filter(
    (compra) =>
      compra.estadoPago === "pendiente"
  ).length;

  const proveedoresActivos =
    proveedores.filter(
      (proveedor) => proveedor.activo
    ).length;

  function mostrarMensaje(
    mensaje: string
  ) {
    setMensajeExito(mensaje);

    window.setTimeout(() => {
      setMensajeExito("");
    }, 1800);
  }

  function actualizarLinea(
    indice: number,
    campo: keyof ProductoCompraFormulario,
    valor: string
  ) {
    setLineasCompra((actuales) =>
      actuales.map((linea, posicion) =>
        posicion === indice
          ? { ...linea, [campo]: valor }
          : linea
      )
    );

    setError("");
  }

  function agregarLinea() {
    setLineasCompra((actuales) => [
      ...actuales,
      { ...productoCompraInicial },
    ]);
  }

  function eliminarLinea(indice: number) {
    setLineasCompra((actuales) =>
      actuales.length === 1
        ? actuales
        : actuales.filter(
            (_, posicion) =>
              posicion !== indice
          )
    );
  }

  function abrirNuevaCompra() {
    setProveedorId("");
    setFolioProveedor("");
    setImpuestos("0");
    setEstadoPago("pagada");
    setMetodoPago("efectivo");
    setObservaciones("");
    setLineasCompra([
      { ...productoCompraInicial },
    ]);
    setError("");
    setMostrarCompra(true);
  }

  async function guardarCompra(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (procesando) {
      return;
    }

    const lineasValidas =
      lineasCompra.map((linea) => ({
        productoId: Number(linea.productoId),
        cantidad: Number(linea.cantidad),
        costoUnitario: Number(
          linea.costoUnitario
        ),
      }));

    if (
      lineasValidas.some(
        (linea) =>
          !Number.isInteger(
            linea.productoId
          ) ||
          linea.productoId <= 0 ||
          !Number.isInteger(
            linea.cantidad
          ) ||
          linea.cantidad <= 0 ||
          !Number.isFinite(
            linea.costoUnitario
          ) ||
          linea.costoUnitario < 0
      )
    ) {
      setError(
        "Completa correctamente todos los productos de la compra."
      );
      return;
    }

    const ids = lineasValidas.map(
      (linea) => linea.productoId
    );

    if (
      new Set(ids).size !== ids.length
    ) {
      setError(
        "No repitas el mismo producto en la compra."
      );
      return;
    }

    if (
      !Number.isFinite(impuestosNumero) ||
      impuestosNumero < 0
    ) {
      setError(
        "El importe de impuestos no es válido."
      );
      return;
    }

    try {
      setProcesando(true);
      setError("");

      const compra = await registrarCompra({
        proveedorId:
          proveedorId === ""
            ? null
            : Number(proveedorId),
        folioProveedor,
        impuestos: impuestosNumero,
        estadoPago,
        metodoPago,
        observaciones,
        usuarioId: usuarioActual.id,
        registradoPor:
          usuarioActual.nombreCompleto,
        productos: lineasValidas,
      });

      const [
        comprasActualizadas,
        productosActualizados,
      ] = await Promise.all([
        listarCompras(),
        obtenerProductos(),
      ]);

      setCompras(comprasActualizadas);
      setProductos(productosActualizados);
      setMostrarCompra(false);

      mostrarMensaje(
        `Compra #${compra.id} registrada correctamente.`
      );
    } catch (errorGuardado) {
      console.error(errorGuardado);

      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No fue posible registrar la compra."
      );
    } finally {
      setProcesando(false);
    }
  }

  function abrirNuevoProveedor() {
    setProveedorEditando(null);
    setFormProveedor(proveedorInicial);
    setError("");
    setMostrarProveedor(true);
  }

  function abrirEdicionProveedor(
    proveedor: Proveedor
  ) {
    setProveedorEditando(proveedor);
    setFormProveedor({
      nombre: proveedor.nombre,
      contacto: proveedor.contacto,
      telefono: proveedor.telefono,
      correo: proveedor.correo,
      direccion: proveedor.direccion,
      rfc: proveedor.rfc,
      notas: proveedor.notas,
      activo: proveedor.activo,
    });
    setError("");
    setMostrarProveedor(true);
  }

  async function guardarProveedor(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!formProveedor.nombre.trim()) {
      setError(
        "El nombre del proveedor es obligatorio."
      );
      return;
    }

    try {
      setProcesando(true);
      setError("");

      if (proveedorEditando) {
        await actualizarProveedor(
          proveedorEditando.id,
          formProveedor
        );

        mostrarMensaje(
          "Proveedor actualizado correctamente."
        );
      } else {
        await crearProveedor(
          formProveedor
        );

        mostrarMensaje(
          "Proveedor registrado correctamente."
        );
      }

      const actualizados =
        await listarProveedores();

      setProveedores(actualizados);
      setMostrarProveedor(false);
    } catch (errorGuardado) {
      console.error(errorGuardado);

      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No fue posible guardar el proveedor."
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="compras-page">
      <main className="compras-main">
        <section className="compras-titulo">
          <div>
            <p>MÓDULO DE COMPRAS</p>
            <h1>Compras y proveedores</h1>
            <span>
              Registra mercancía, actualiza
              existencias y administra proveedores.
            </span>
          </div>

          <div className="compras-acciones-superiores">
            <button
              type="button"
              className="compras-boton-secundario"
              onClick={abrirNuevoProveedor}
            >
              + Proveedor
            </button>

            <button
              type="button"
              className="compras-boton-principal"
              onClick={abrirNuevaCompra}
              disabled={
                cargando || procesando
              }
            >
              + Nueva compra
            </button>
          </div>
        </section>

        <section className="compras-resumen">
          <article>
            <div className="compras-resumen-icono naranja">
              🚚
            </div>
            <div>
              <span>Proveedores activos</span>
              <strong>
                {proveedoresActivos}
              </strong>
              <p>Disponibles para compras</p>
            </div>
          </article>

          <article>
            <div className="compras-resumen-icono azul">
              🧾
            </div>
            <div>
              <span>Compras registradas</span>
              <strong>{compras.length}</strong>
              <p>Movimientos históricos</p>
            </div>
          </article>

          <article>
            <div className="compras-resumen-icono rojo">
              ⌛
            </div>
            <div>
              <span>Compras pendientes</span>
              <strong>
                {comprasPendientes}
              </strong>
              <p>Por liquidar</p>
            </div>
          </article>

          <article>
            <div className="compras-resumen-icono morado">
              💼
            </div>
            <div>
              <span>Total comprado</span>
              <strong>
                ${totalComprado.toFixed(2)}
              </strong>
              <p>Importe acumulado</p>
            </div>
          </article>
        </section>

        {error && (
          <div className="compras-error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        <div className="compras-tabs">
          <button
            type="button"
            className={
              vista === "compras"
                ? "activo"
                : ""
            }
            onClick={() => setVista("compras")}
          >
            Compras
          </button>

          <button
            type="button"
            className={
              vista === "proveedores"
                ? "activo"
                : ""
            }
            onClick={() =>
              setVista("proveedores")
            }
          >
            Proveedores
          </button>
        </div>

        {vista === "compras" ? (
          <section className="compras-panel">
            <div className="compras-panel-header">
              <div>
                <p>HISTORIAL</p>
                <h2>Compras registradas</h2>
              </div>

              <span>
                {compras.length} resultado
                {compras.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <div className="compras-tabla-contenedor">
              <table className="compras-tabla">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>Productos</th>
                    <th>Método</th>
                    <th>Estado</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {cargando ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="compras-vacio"
                      >
                        Cargando compras...
                      </td>
                    </tr>
                  ) : compras.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="compras-vacio"
                      >
                        <div>🧾</div>
                        <strong>
                          No hay compras registradas
                        </strong>
                      </td>
                    </tr>
                  ) : (
                    compras.map((compra) => (
                      <tr key={compra.id}>
                        <td>
                          #
                          {String(
                            compra.id
                          ).padStart(5, "0")}
                        </td>
                        <td>
                          {new Date(
                            compra.fecha
                          ).toLocaleString(
                            "es-MX"
                          )}
                        </td>
                        <td>
                          <strong>
                            {
                              compra.proveedorNombre
                            }
                          </strong>
                          <span>
                            {compra.folioProveedor ||
                              "Sin folio"}
                          </span>
                        </td>
                        <td>
                          {
                            compra.productos
                              .length
                          }{" "}
                          producto
                          {compra.productos
                            .length === 1
                            ? ""
                            : "s"}
                        </td>
                        <td>
                          {compra.metodoPago}
                        </td>
                        <td>
                          <span
                            className={`compra-estado ${compra.estadoPago}`}
                          >
                            {compra.estadoPago ===
                            "pagada"
                              ? "Pagada"
                              : "Pendiente"}
                          </span>
                        </td>
                        <td className="compra-total">
                          $
                          {compra.total.toFixed(
                            2
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="compras-panel">
            <div className="compras-panel-header">
              <div>
                <p>DIRECTORIO</p>
                <h2>Proveedores</h2>
              </div>

              <span>
                {proveedores.length} resultado
                {proveedores.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <div className="proveedores-grid">
              {proveedores.map(
                (proveedor) => (
                  <article
                    key={proveedor.id}
                  >
                    <div className="proveedor-encabezado">
                      <div>
                        <strong>
                          {proveedor.nombre}
                        </strong>
                        <span>
                          {proveedor.contacto ||
                            "Sin contacto"}
                        </span>
                      </div>

                      <span
                        className={`proveedor-estado ${
                          proveedor.activo
                            ? "activo"
                            : "inactivo"
                        }`}
                      >
                        {proveedor.activo
                          ? "Activo"
                          : "Inactivo"}
                      </span>
                    </div>

                    <p>
                      📞{" "}
                      {proveedor.telefono ||
                        "Sin teléfono"}
                    </p>
                    <p>
                      ✉️{" "}
                      {proveedor.correo ||
                        "Sin correo"}
                    </p>
                    <p>
                      📍{" "}
                      {proveedor.direccion ||
                        "Sin dirección"}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        abrirEdicionProveedor(
                          proveedor
                        )
                      }
                    >
                      Editar proveedor
                    </button>
                  </article>
                )
              )}
            </div>
          </section>
        )}
      </main>

      {mostrarCompra && (
        <div className="compras-modal-fondo">
          <div className="compras-modal compras-modal-grande">
            <div className="compras-modal-header">
              <div>
                <span>NUEVA ENTRADA</span>
                <h2>Registrar compra</h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMostrarCompra(false)
                }
                disabled={procesando}
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarCompra}>
              <div className="compras-form-grid">
                <label>
                  Proveedor
                  <select
                    value={proveedorId}
                    onChange={(event) =>
                      setProveedorId(
                        event.target.value
                      )
                    }
                    disabled={procesando}
                  >
                    <option value="">
                      Sin proveedor
                    </option>
                    {proveedores
                      .filter(
                        (proveedor) =>
                          proveedor.activo
                      )
                      .map(
                        (proveedor) => (
                          <option
                            key={proveedor.id}
                            value={
                              proveedor.id
                            }
                          >
                            {
                              proveedor.nombre
                            }
                          </option>
                        )
                      )}
                  </select>
                </label>

                <label>
                  Folio del proveedor
                  <input
                    type="text"
                    value={folioProveedor}
                    onChange={(event) =>
                      setFolioProveedor(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Estado de pago
                  <select
                    value={estadoPago}
                    onChange={(event) =>
                      setEstadoPago(
                        event.target
                          .value as EstadoPagoCompra
                      )
                    }
                  >
                    <option value="pagada">
                      Pagada
                    </option>
                    <option value="pendiente">
                      Pendiente
                    </option>
                  </select>
                </label>

                <label>
                  Método de pago
                  <select
                    value={metodoPago}
                    onChange={(event) =>
                      setMetodoPago(
                        event.target
                          .value as MetodoPagoCompra
                      )
                    }
                  >
                    <option value="efectivo">
                      Efectivo
                    </option>
                    <option value="tarjeta">
                      Tarjeta
                    </option>
                    <option value="transferencia">
                      Transferencia
                    </option>
                    <option value="credito">
                      Crédito
                    </option>
                  </select>
                </label>
              </div>

              <div className="lineas-compra">
                <div className="lineas-compra-header">
                  <h3>Productos</h3>
                  <button
                    type="button"
                    onClick={agregarLinea}
                  >
                    + Agregar producto
                  </button>
                </div>

                {lineasCompra.map(
                  (linea, indice) => {
                    const producto =
                      productos.find(
                        (item) =>
                          item.id ===
                          Number(
                            linea.productoId
                          )
                      );

                    return (
                      <div
                        className="linea-compra"
                        key={indice}
                      >
                        <label>
                          Producto
                          <select
                            value={
                              linea.productoId
                            }
                            onChange={(event) => {
                              const id =
                                event.target.value;
                              const seleccionado =
                                productos.find(
                                  (item) =>
                                    item.id ===
                                    Number(id)
                                );

                              actualizarLinea(
                                indice,
                                "productoId",
                                id
                              );

                              if (
                                seleccionado
                              ) {
                                actualizarLinea(
                                  indice,
                                  "costoUnitario",
                                  String(
                                    seleccionado.precioCompra
                                  )
                                );
                              }
                            }}
                          >
                            <option value="">
                              Selecciona
                            </option>
                            {productos.map(
                              (producto) => (
                                <option
                                  key={
                                    producto.id
                                  }
                                  value={
                                    producto.id
                                  }
                                >
                                  {
                                    producto.nombre
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <label>
                          Cantidad
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={
                              linea.cantidad
                            }
                            onChange={(event) =>
                              actualizarLinea(
                                indice,
                                "cantidad",
                                event.target
                                  .value
                              )
                            }
                          />
                        </label>

                        <label>
                          Costo unitario
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              linea.costoUnitario
                            }
                            onChange={(event) =>
                              actualizarLinea(
                                indice,
                                "costoUnitario",
                                event.target
                                  .value
                              )
                            }
                          />
                        </label>

                        <div className="linea-subtotal">
                          <span>Subtotal</span>
                          <strong>
                            $
                            {(
                              Number(
                                linea.cantidad ||
                                  0
                              ) *
                              Number(
                                linea.costoUnitario ||
                                  0
                              )
                            ).toFixed(2)}
                          </strong>
                        </div>

                        <button
                          type="button"
                          className="linea-eliminar"
                          onClick={() =>
                            eliminarLinea(
                              indice
                            )
                          }
                        >
                          ×
                        </button>

                        {producto && (
                          <small>
                            Existencias actuales:{" "}
                            {
                              producto.existencias
                            }
                          </small>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              <div className="compras-form-grid">
                <label>
                  Impuestos
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={impuestos}
                    onChange={(event) =>
                      setImpuestos(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="compras-completo">
                  Observaciones
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(event) =>
                      setObservaciones(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              <div className="compra-totales">
                <div>
                  <span>Subtotal</span>
                  <strong>
                    ${subtotalCompra.toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span>Impuestos</span>
                  <strong>
                    $
                    {(
                      Number(impuestos) || 0
                    ).toFixed(2)}
                  </strong>
                </div>
                <div className="total-final">
                  <span>Total</span>
                  <strong>
                    ${totalCompra.toFixed(2)}
                  </strong>
                </div>
              </div>

              {error && (
                <div className="compras-error">
                  <span>⚠️</span>
                  <p>{error}</p>
                </div>
              )}

              <div className="compras-modal-acciones">
                <button
                  type="button"
                  className="compras-cancelar"
                  onClick={() =>
                    setMostrarCompra(false)
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="compras-guardar"
                  disabled={procesando}
                >
                  {procesando
                    ? "Registrando..."
                    : "Registrar compra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarProveedor && (
        <div className="compras-modal-fondo">
          <div className="compras-modal">
            <div className="compras-modal-header">
              <div>
                <span>PROVEEDOR</span>
                <h2>
                  {proveedorEditando
                    ? "Editar proveedor"
                    : "Nuevo proveedor"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMostrarProveedor(false)
                }
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarProveedor}>
              <div className="compras-form-grid">
                {(
                  [
                    ["nombre", "Nombre"],
                    ["contacto", "Contacto"],
                    ["telefono", "Teléfono"],
                    ["correo", "Correo"],
                    ["direccion", "Dirección"],
                    ["rfc", "RFC"],
                  ] as const
                ).map(([campo, etiqueta]) => (
                  <label key={campo}>
                    {etiqueta}
                    <input
                      type={
                        campo === "correo"
                          ? "email"
                          : "text"
                      }
                      value={
                        formProveedor[campo]
                      }
                      onChange={(event) =>
                        setFormProveedor(
                          (actual) => ({
                            ...actual,
                            [campo]:
                              event.target
                                .value,
                          })
                        )
                      }
                    />
                  </label>
                ))}

                <label className="compras-completo">
                  Notas
                  <textarea
                    rows={4}
                    value={
                      formProveedor.notas
                    }
                    onChange={(event) =>
                      setFormProveedor(
                        (actual) => ({
                          ...actual,
                          notas:
                            event.target.value,
                        })
                      )
                    }
                  />
                </label>
              </div>

              <label className="proveedor-activo-check">
                <input
                  type="checkbox"
                  checked={
                    formProveedor.activo
                  }
                  onChange={(event) =>
                    setFormProveedor(
                      (actual) => ({
                        ...actual,
                        activo:
                          event.target.checked,
                      })
                    )
                  }
                />
                Proveedor activo
              </label>

              {error && (
                <div className="compras-error">
                  <span>⚠️</span>
                  <p>{error}</p>
                </div>
              )}

              <div className="compras-modal-acciones">
                <button
                  type="button"
                  className="compras-cancelar"
                  onClick={() =>
                    setMostrarProveedor(false)
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="compras-guardar"
                  disabled={procesando}
                >
                  {procesando
                    ? "Guardando..."
                    : "Guardar proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mensajeExito && (
        <div className="compras-exito-fondo">
          <div className="compras-exito">
            <div>✓</div>
            <h2>Operación completada</h2>
            <p>{mensajeExito}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Compras;