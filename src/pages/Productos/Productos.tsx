import { useEffect, useRef, useState } from "react";
import "./Productos.css";
import type { UsuarioSesion } from "../Login/Login";
import { registrarEventoBitacora } from "../../services/bitacoraService";
import {
  actualizarProducto,
  crearProducto,
  eliminarProductoPorId,
  migrarProductosLocalesSiHaceFalta,
  type Producto,
} from "../../services/productosService";

interface ProductosProps {
  usuarioActual: UsuarioSesion;
}

function Productos({
  usuarioActual,
}: ProductosProps) {
  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [productos, setProductos] =
    useState<Producto[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [procesando, setProcesando] =
    useState(false);

  const [errorCarga, setErrorCarga] =
    useState("");

  const [productoEditando, setProductoEditando] =
    useState<Producto | null>(null);

  const [productoAEliminar, setProductoAEliminar] =
    useState<Producto | null>(null);

  const [codigo, setCodigo] =
    useState("");

  const [busqueda, setBusqueda] =
    useState("");

  const [filtroCategoria, setFiltroCategoria] =
    useState("");

  const [nombre, setNombre] =
    useState("");

  const [categoria, setCategoria] =
    useState("");

  const [precioCompra, setPrecioCompra] =
    useState("");

  const [precioVenta, setPrecioVenta] =
    useState("");

  const [existencias, setExistencias] =
    useState("");

  const [stockMinimo, setStockMinimo] =
    useState("");

  const [errorFormulario, setErrorFormulario] =
    useState("");

  const [mensajeExito, setMensajeExito] =
    useState("");

  const codigoInputRef =
    useRef<HTMLInputElement | null>(null);

  const nombreInputRef =
    useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let componenteActivo = true;

    async function cargarProductos() {
      try {
        setCargando(true);
        setErrorCarga("");

        const productosCargados =
          await migrarProductosLocalesSiHaceFalta();

        if (!componenteActivo) {
          return;
        }

        setProductos(productosCargados);
      } catch (error) {
        if (!componenteActivo) {
          return;
        }

        console.error(error);

        setErrorCarga(
          "No fue posible cargar los productos desde Supabase."
        );

        const respaldo =
          localStorage.getItem("productos");

        if (respaldo) {
          try {
            setProductos(
              JSON.parse(respaldo) as Producto[]
            );
          } catch {
            setProductos([]);
          }
        }
      } finally {
        if (componenteActivo) {
          setCargando(false);
        }
      }
    }

    cargarProductos();

    return () => {
      componenteActivo = false;
    };
  }, []);

  useEffect(() => {
    const parametros =
      new URLSearchParams(window.location.search);

    const codigoDesdeVentas =
      parametros.get("codigo")?.trim() ?? "";

    if (!codigoDesdeVentas) {
      return;
    }

    limpiarFormulario();
    setProductoEditando(null);
    setCodigo(codigoDesdeVentas);
    setMostrarFormulario(true);

    window.setTimeout(() => {
      nombreInputRef.current?.focus();
    }, 100);

    const urlLimpia =
      `${window.location.pathname}${window.location.hash}`;

    window.history.replaceState(
      {},
      document.title,
      urlLimpia
    );
  }, []);

  useEffect(() => {
    if (cargando) {
      return;
    }

    localStorage.setItem(
      "productos",
      JSON.stringify(productos)
    );
  }, [productos, cargando]);

  function limpiarFormulario() {
    setCodigo("");
    setNombre("");
    setCategoria("");
    setPrecioCompra("");
    setPrecioVenta("");
    setExistencias("");
    setStockMinimo("");
    setErrorFormulario("");
  }

  function mostrarMensajeExito(
    mensaje: string
  ) {
    setMensajeExito(mensaje);

    window.setTimeout(() => {
      setMensajeExito("");
    }, 1800);
  }

  async function guardarProducto(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (procesando) {
      return;
    }

    const codigoLimpio = codigo.trim();
    const nombreLimpio = nombre.trim();

    if (
      !codigoLimpio ||
      !nombreLimpio ||
      !categoria ||
      precioCompra === "" ||
      precioVenta === "" ||
      existencias === "" ||
      stockMinimo === ""
    ) {
      setErrorFormulario(
        "Completa todos los campos obligatorios."
      );
      return;
    }

    const compraNumero =
      Number(precioCompra);

    const ventaNumero =
      Number(precioVenta);

    const existenciasNumero =
      Number(existencias);

    const stockNumero =
      Number(stockMinimo);

    if (
      !Number.isFinite(compraNumero) ||
      !Number.isFinite(ventaNumero)
    ) {
      setErrorFormulario(
        "Los precios deben contener números válidos."
      );
      return;
    }

    if (
      !Number.isInteger(existenciasNumero) ||
      !Number.isInteger(stockNumero)
    ) {
      setErrorFormulario(
        "Las existencias y el stock mínimo deben ser números enteros."
      );
      return;
    }

    if (
      compraNumero < 0 ||
      ventaNumero < 0 ||
      existenciasNumero < 0 ||
      stockNumero < 0
    ) {
      setErrorFormulario(
        "Los valores numéricos no pueden ser negativos."
      );
      return;
    }

    if (ventaNumero < compraNumero) {
      setErrorFormulario(
        "El precio de venta no puede ser menor que el precio de compra."
      );
      return;
    }

    const codigoDuplicado =
      productos.some(
        (producto) =>
          producto.codigo.toLowerCase() ===
            codigoLimpio.toLowerCase() &&
          producto.id !==
            productoEditando?.id
      );

    if (codigoDuplicado) {
      setErrorFormulario(
        "Ya existe otro producto con ese código o ID de producto."
      );
      return;
    }

    const datosProducto = {
      codigo: codigoLimpio,
      nombre: nombreLimpio,
      categoria,
      precioCompra: compraNumero,
      precioVenta: ventaNumero,
      existencias: existenciasNumero,
      stockMinimo: stockNumero,
    };

    try {
      setProcesando(true);
      setErrorFormulario("");

      if (productoEditando) {
        const actualizado =
          await actualizarProducto(
            productoEditando.id,
            datosProducto
          );

        setProductos((actuales) =>
          actuales.map((producto) =>
            producto.id === actualizado.id
              ? actualizado
              : producto
          )
        );

        const cambios: string[] = [];

        if (
          productoEditando.nombre !==
          actualizado.nombre
        ) {
          cambios.push(
            `Nombre: "${productoEditando.nombre}" → "${actualizado.nombre}"`
          );
        }

        if (
          productoEditando.precioCompra !==
          actualizado.precioCompra
        ) {
          cambios.push(
            `Precio de compra: $${productoEditando.precioCompra.toFixed(
              2
            )} → $${actualizado.precioCompra.toFixed(2)}`
          );
        }

        if (
          productoEditando.precioVenta !==
          actualizado.precioVenta
        ) {
          cambios.push(
            `Precio de venta: $${productoEditando.precioVenta.toFixed(
              2
            )} → $${actualizado.precioVenta.toFixed(2)}`
          );
        }

        if (
          productoEditando.existencias !==
          actualizado.existencias
        ) {
          cambios.push(
            `Existencias: ${productoEditando.existencias} → ${actualizado.existencias}`
          );
        }

        if (
          productoEditando.stockMinimo !==
          actualizado.stockMinimo
        ) {
          cambios.push(
            `Stock mínimo: ${productoEditando.stockMinimo} → ${actualizado.stockMinimo}`
          );
        }

        try {
          await registrarEventoBitacora({
            usuarioId: usuarioActual.id,
            nombreUsuario:
              usuarioActual.nombreCompleto,
            usuario: usuarioActual.usuario,
            rol: usuarioActual.rol,
            modulo: "Productos",
            accion: "Edición de producto",
            detalle:
              cambios.length > 0
                ? `Producto "${actualizado.nombre}" actualizado. ${cambios.join(
                    " · "
                  )}`
                : `Producto "${actualizado.nombre}" guardado sin cambios visibles.`,
            entidadTipo: "producto",
            entidadId: actualizado.id,
          });
        } catch (errorBitacora) {
          console.error(
            "No fue posible registrar la edición en bitácora:",
            errorBitacora
          );
        }

        mostrarMensajeExito(
          "Producto actualizado correctamente."
        );
      } else {
        const nuevo =
          await crearProducto(
            datosProducto
          );

        setProductos((actuales) => [
          ...actuales,
          nuevo,
        ]);

        try {
          await registrarEventoBitacora({
            usuarioId: usuarioActual.id,
            nombreUsuario:
              usuarioActual.nombreCompleto,
            usuario: usuarioActual.usuario,
            rol: usuarioActual.rol,
            modulo: "Productos",
            accion: "Creación de producto",
            detalle:
              `Se registró "${nuevo.nombre}" con código ${nuevo.codigo}, ` +
              `precio de venta $${nuevo.precioVenta.toFixed(
                2
              )} y ${nuevo.existencias} existencias iniciales.`,
            entidadTipo: "producto",
            entidadId: nuevo.id,
          });
        } catch (errorBitacora) {
          console.error(
            "No fue posible registrar la creación en bitácora:",
            errorBitacora
          );
        }

        mostrarMensajeExito(
          "Producto registrado correctamente."
        );
      }

      limpiarFormulario();
      setProductoEditando(null);
      setMostrarFormulario(false);
    } catch (error) {
      console.error(error);

      setErrorFormulario(
        "No fue posible guardar el producto en Supabase."
      );
    } finally {
      setProcesando(false);
    }
  }

  function editarProducto(
    producto: Producto
  ) {
    setProductoEditando(producto);
    setCodigo(producto.codigo);
    setNombre(producto.nombre);
    setCategoria(producto.categoria);
    setPrecioCompra(
      String(producto.precioCompra)
    );
    setPrecioVenta(
      String(producto.precioVenta)
    );
    setExistencias(
      String(producto.existencias)
    );
    setStockMinimo(
      String(producto.stockMinimo)
    );
    setErrorFormulario("");
    setMostrarFormulario(true);
  }

  function solicitarEliminacion(
    producto: Producto
  ) {
    setProductoAEliminar(producto);
  }

  async function confirmarEliminacion() {
    if (
      !productoAEliminar ||
      procesando
    ) {
      return;
    }

    try {
      setProcesando(true);

      const productoEliminado =
        productoAEliminar;

      await eliminarProductoPorId(
        productoEliminado.id
      );

      try {
        await registrarEventoBitacora({
          usuarioId: usuarioActual.id,
          nombreUsuario:
            usuarioActual.nombreCompleto,
          usuario: usuarioActual.usuario,
          rol: usuarioActual.rol,
          modulo: "Productos",
          accion: "Eliminación de producto",
          detalle:
            `Se eliminó "${productoEliminado.nombre}" ` +
            `(código ${productoEliminado.codigo}) con ` +
            `${productoEliminado.existencias} existencias.`,
          entidadTipo: "producto",
          entidadId: productoEliminado.id,
        });
      } catch (errorBitacora) {
        console.error(
          "No fue posible registrar la eliminación en bitácora:",
          errorBitacora
        );
      }

      setProductos((actuales) =>
        actuales.filter(
          (producto) =>
            producto.id !==
            productoAEliminar.id
        )
      );

      setProductoAEliminar(null);

      mostrarMensajeExito(
        "Producto eliminado correctamente."
      );
    } catch (error) {
      console.error(error);

      setProductoAEliminar(null);

      setErrorCarga(
        "No fue posible eliminar el producto en Supabase."
      );
    } finally {
      setProcesando(false);
    }
  }

  function cancelarFormulario() {
    if (procesando) {
      return;
    }

    limpiarFormulario();
    setProductoEditando(null);
    setMostrarFormulario(false);
  }

  const productosFiltrados =
    productos.filter((producto) => {
      const textoBusqueda =
        busqueda.toLowerCase().trim();

      const coincideBusqueda =
        producto.nombre
          .toLowerCase()
          .includes(textoBusqueda) ||
        producto.codigo
          .toLowerCase()
          .includes(textoBusqueda);

      const coincideCategoria =
        filtroCategoria === "" ||
        producto.categoria ===
          filtroCategoria;

      return (
        coincideBusqueda &&
        coincideCategoria
      );
    });

  const totalUnidades =
    productos.reduce(
      (total, producto) =>
        total + producto.existencias,
      0
    );

  const productosStockBajo =
    productos.filter(
      (producto) =>
        producto.existencias <=
        producto.stockMinimo
    ).length;

  const valorInventario =
    productos.reduce(
      (total, producto) =>
        total +
        producto.precioCompra *
          producto.existencias,
      0
    );

  return (
    <div className="productos-page">
      <main className="productos-main">
        <section className="productos-header">
          <div>
            <p>
              MÓDULO DE PRODUCTOS
            </p>

            <h1>
              Catálogo de productos
            </h1>

            <span>
              Administra precios,
              existencias y categorías de
              la tienda.
            </span>
          </div>

          <button
            type="button"
            className="agregar-producto"
            disabled={
              cargando || procesando
            }
            onClick={() => {
              limpiarFormulario();
              setProductoEditando(null);
              setMostrarFormulario(true);

              window.setTimeout(() => {
                codigoInputRef.current?.focus();
              }, 100);
            }}
          >
            + Agregar producto
          </button>
        </section>

        <section className="productos-resumen">
          <article>
            <div className="producto-resumen-icono naranja">
              📦
            </div>

            <div>
              <span>
                Productos registrados
              </span>

              <strong>
                {productos.length}
              </strong>

              <p>
                Total del catálogo
              </p>
            </div>
          </article>

          <article>
            <div className="producto-resumen-icono azul">
              ▦
            </div>

            <div>
              <span>
                Unidades disponibles
              </span>

              <strong>
                {totalUnidades}
              </strong>

              <p>
                Existencias actuales
              </p>
            </div>
          </article>

          <article>
            <div className="producto-resumen-icono rojo">
              ⚠
            </div>

            <div>
              <span>Stock bajo</span>

              <strong>
                {productosStockBajo}
              </strong>

              <p>
                Productos por surtir
              </p>
            </div>
          </article>

          <article>
            <div className="producto-resumen-icono morado">
              💼
            </div>

            <div>
              <span>
                Valor del inventario
              </span>

              <strong>
                $
                {valorInventario.toFixed(
                  2
                )}
              </strong>

              <p>
                Calculado al costo
              </p>
            </div>
          </article>
        </section>

        {errorCarga && (
          <div className="producto-error">
            <span>⚠️</span>
            <p>{errorCarga}</p>
          </div>
        )}

        <section className="productos-panel">
          <div className="productos-panel-header">
            <div>
              <p>LISTADO GENERAL</p>
              <h2>
                Productos registrados
              </h2>
            </div>

            <span>
              {productosFiltrados.length}{" "}
              resultado
              {productosFiltrados.length ===
              1
                ? ""
                : "s"}
            </span>
          </div>

          <div className="productos-tools">
            <input
              type="text"
              placeholder="Buscar por nombre o código de barras"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(
                  event.target.value
                )
              }
            />

            <select
              value={filtroCategoria}
              onChange={(event) =>
                setFiltroCategoria(
                  event.target.value
                )
              }
            >
              <option value="">
                Todas las categorías
              </option>
              <option value="Bebidas">
                Bebidas
              </option>
              <option value="Botanas">
                Botanas
              </option>
              <option value="Lácteos">
                Lácteos
              </option>
              <option value="Limpieza">
                Limpieza
              </option>
              <option value="Otros">
                Otros
              </option>
            </select>
          </div>

          <div className="tabla-productos">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>
                    Precio de compra
                  </th>
                  <th>
                    Precio de venta
                  </th>
                  <th>Existencias</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargando ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="sin-productos"
                    >
                      <strong>
                        Cargando productos...
                      </strong>
                      <p>
                        Consultando la base de
                        datos.
                      </p>
                    </td>
                  </tr>
                ) : productosFiltrados.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="sin-productos"
                    >
                      <strong>
                        No hay productos
                        registrados
                      </strong>
                      <p>
                        Agrega el primer
                        producto para comenzar.
                      </p>
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map(
                    (producto) => (
                      <tr
                        key={producto.id}
                        className={
                          producto.existencias <=
                          producto.stockMinimo
                            ? "fila-stock-bajo"
                            : ""
                        }
                      >
                        <td>
                          {producto.codigo}
                        </td>

                        <td>
                          <strong>
                            {producto.nombre}
                          </strong>
                        </td>

                        <td>
                          {producto.categoria}
                        </td>

                        <td>
                          $
                          {producto.precioCompra.toFixed(
                            2
                          )}
                        </td>

                        <td>
                          $
                          {producto.precioVenta.toFixed(
                            2
                          )}
                        </td>

                        <td>
                          <div className="existencias-contenido">
                            <span>
                              {
                                producto.existencias
                              }
                            </span>

                            {producto.existencias <=
                              producto.stockMinimo && (
                              <span className="etiqueta-stock-bajo">
                                Stock bajo
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="acciones-producto">
                            <button
                              type="button"
                              className="boton-accion"
                              disabled={
                                procesando
                              }
                              onClick={() =>
                                editarProducto(
                                  producto
                                )
                              }
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              className="boton-eliminar"
                              disabled={
                                procesando
                              }
                              onClick={() =>
                                solicitarEliminacion(
                                  producto
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
        <div className="modal-fondo">
          <div className="modal-producto">
            <div className="modal-header">
              <div>
                <p>
                  {productoEditando
                    ? "Actualizar registro"
                    : "Nuevo registro"}
                </p>

                <h2>
                  {productoEditando
                    ? "Editar producto"
                    : "Agregar producto"}
                </h2>
              </div>

              <button
                type="button"
                className="cerrar-modal"
                onClick={
                  cancelarFormulario
                }
                disabled={procesando}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={guardarProducto}
            >
              <div className="form-grid">
                <label>
                  Código de barras

                  <input
                    ref={codigoInputRef}
                    type="text"
                    value={codigo}
                    disabled={procesando}
                    onChange={(event) => {
                      setCodigo(
                        event.target.value
                      );
                      setErrorFormulario(
                        ""
                      );
                    }}
                    placeholder="Ejemplo: 7501055300075"
                  />
                </label>

                <label>
                  Nombre del producto

                  <input
                    ref={nombreInputRef}
                    type="text"
                    value={nombre}
                    disabled={procesando}
                    onChange={(event) => {
                      setNombre(
                        event.target.value
                      );
                      setErrorFormulario(
                        ""
                      );
                    }}
                    placeholder="Ejemplo: Refresco 600 ml"
                  />
                </label>

                <label>
                  Categoría

                  <select
                    value={categoria}
                    disabled={procesando}
                    onChange={(event) => {
                      setCategoria(
                        event.target.value
                      );
                      setErrorFormulario(
                        ""
                      );
                    }}
                  >
                    <option value="">
                      Selecciona una
                      categoría
                    </option>

                    <option value="Bebidas">
                      Bebidas
                    </option>

                    <option value="Botanas">
                      Botanas
                    </option>

                    <option value="Lácteos">
                      Lácteos
                    </option>

                    <option value="Limpieza">
                      Limpieza
                    </option>

                    <option value="Otros">
                      Otros
                    </option>
                  </select>
                </label>

                <label>
                  Precio de compra

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioCompra}
                    disabled={procesando}
                    onChange={(event) => {
                      setPrecioCompra(
                        event.target.value
                      );
                      setErrorFormulario(
                        ""
                      );
                    }}
                    placeholder="Ejemplo: 25.00"
                  />
                </label>

                <label>
                  Precio de venta

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioVenta}
                    disabled={procesando}
                    onChange={(event) => {
                      setPrecioVenta(
                        event.target.value
                      );
                      setErrorFormulario(
                        ""
                      );
                    }}
                    placeholder="Ejemplo: 30.00"
                  />
                </label>

                <label>
                  Existencias iniciales

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={existencias}
                    disabled={procesando}
                    onChange={(event) => {
                      setExistencias(
                        event.target.value
                      );
                      setErrorFormulario(
                        ""
                      );
                    }}
                    placeholder="Ejemplo: 100"
                  />
                </label>

                <label>
                  Stock mínimo

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stockMinimo}
                    disabled={procesando}
                    onChange={(event) => {
                      setStockMinimo(
                        event.target.value
                      );
                      setErrorFormulario(
                        ""
                      );
                    }}
                    placeholder="Ejemplo: 10"
                  />
                </label>
              </div>

              {errorFormulario && (
                <div className="producto-error">
                  <span>⚠️</span>
                  <p>
                    {errorFormulario}
                  </p>
                </div>
              )}

              <div className="modal-acciones">
                <button
                  type="button"
                  className="boton-cancelar"
                  disabled={procesando}
                  onClick={
                    cancelarFormulario
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="boton-guardar"
                  disabled={procesando}
                >
                  {procesando
                    ? "Guardando..."
                    : productoEditando
                      ? "Guardar cambios"
                      : "Guardar producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mensajeExito && (
        <div className="producto-exito-fondo">
          <div className="producto-exito">
            <div className="producto-exito-circulo">
              ✓
            </div>

            <h2>
              Operación completada
            </h2>

            <p>{mensajeExito}</p>
          </div>
        </div>
      )}

      {productoAEliminar && (
        <div className="eliminar-producto-fondo">
          <div className="eliminar-producto-modal">
            <div className="eliminar-producto-icono">
              ⚠️
            </div>

            <h2>
              Eliminar producto
            </h2>

            <p>
              ¿Seguro que deseas eliminar
              este producto?
            </p>

            <div className="producto-eliminar-datos">
              <strong>
                {
                  productoAEliminar.nombre
                }
              </strong>

              <span>
                Código:{" "}
                {
                  productoAEliminar.codigo
                }
              </span>
            </div>

            <div className="eliminar-producto-acciones">
              <button
                type="button"
                className="cancelar-eliminacion"
                disabled={procesando}
                onClick={() =>
                  setProductoAEliminar(
                    null
                  )
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="confirmar-eliminacion"
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
    </div>
  );
}

export default Productos; 