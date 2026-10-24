import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import "./Ventas.css";
import type { UsuarioSesion } from "../Login/Login";
import {
  obtenerProductos,
  type Producto,
} from "../../services/productosService";
import {
  cancelarVentaConfirmada,
  obtenerVentas,
  registrarDevolucionParcial,
  registrarVenta,
  type VentaGuardada,
} from "../../services/ventasService";

interface VentasProps {
  usuarioActual: UsuarioSesion;
}

interface ProductoCarrito extends Producto {
  cantidad: number;
}

function Ventas({
  usuarioActual,
}: VentasProps) {
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] =
    useState(true);
  const [procesandoVenta, setProcesandoVenta] =
    useState(false);
  const [mostrarCobro, setMostrarCobro] = useState(false);
  const [efectivo, setEfectivo] = useState("");
  const [carrito, setCarrito] =
    useState<ProductoCarrito[]>([]);
  const [mostrarCancelar, setMostrarCancelar] =
    useState(false);
  const [ventaCompletada, setVentaCompletada] =
    useState<VentaGuardada | null>(null);
  const [mostrarHistorial, setMostrarHistorial] =
    useState(false);
  const [ventasHistorial, setVentasHistorial] =
    useState<VentaGuardada[]>([]);
  const [ventaSeleccionada, setVentaSeleccionada] =
    useState<VentaGuardada | null>(null);
  const [mensajeAviso, setMensajeAviso] = useState("");
  const [tipoAviso, setTipoAviso] = useState<"exito" | "error" | "advertencia">("advertencia");
  const [codigoNoEncontrado, setCodigoNoEncontrado] = useState("");
  const inputEscanerRef = useRef<HTMLInputElement | null>(null);
  const [anchoTicket, setAnchoTicket] =
    useState<"58mm" | "80mm">("80mm");
  const [qrTicket, setQrTicket] = useState("");
  const numeroCaja =
    localStorage.getItem("numeroCaja") || "Caja 1";
  const turnoCaja =
    localStorage.getItem("turnoCaja") || "Turno actual";

  const [ventaACancelar, setVentaACancelar] =
    useState<VentaGuardada | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] =
    useState("");
  const [pinAdministrador, setPinAdministrador] =
    useState("");
  const [errorCancelacion, setErrorCancelacion] =
    useState("");

  const [ventaADevolver, setVentaADevolver] =
    useState<VentaGuardada | null>(null);
  const [cantidadesDevolucion, setCantidadesDevolucion] =
    useState<Record<number, string>>({});
  const [motivoDevolucion, setMotivoDevolucion] =
    useState("");
  const [pinDevolucion, setPinDevolucion] =
    useState("");
  const [errorDevolucion, setErrorDevolucion] =
    useState("");

  useEffect(() => {
    let componenteActivo = true;

    async function cargarProductos() {
      try {
        setCargandoProductos(true);

        const productosCargados = await obtenerProductos();

        if (!componenteActivo) {
          return;
        }

        setProductos(productosCargados);

        localStorage.setItem(
          "productos",
          JSON.stringify(productosCargados)
        );
      } catch (error) {
        console.error(error);

        const respaldo = localStorage.getItem("productos");

        if (respaldo && componenteActivo) {
          try {
            setProductos(
              JSON.parse(respaldo) as Producto[]
            );
          } catch {
            setProductos([]);
          }
        }

        if (componenteActivo) {
          setMensajeAviso(
            "No fue posible cargar los productos desde Supabase."
          );
        }
      } finally {
        if (componenteActivo) {
          setCargandoProductos(false);
        }
      }
    }

    cargarProductos();

    return () => {
      componenteActivo = false;
    };
  }, []);

  useEffect(() => {
    if (mensajeAviso === "") {
      return;
    }

    const temporizador = window.setTimeout(() => {
      setMensajeAviso("");
    }, 3500);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, [mensajeAviso]);


  function enfocarEscaner() {
    window.setTimeout(() => inputEscanerRef.current?.focus(), 50);
  }

  function reproducirSonido(tipo: "exito" | "error") {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

      if (!AudioContextClass) return;

      const contexto = new AudioContextClass();
      const oscilador = contexto.createOscillator();
      const ganancia = contexto.createGain();

      oscilador.connect(ganancia);
      ganancia.connect(contexto.destination);
      oscilador.frequency.value = tipo === "exito" ? 880 : 220;
      ganancia.gain.setValueAtTime(0.0001, contexto.currentTime);
      ganancia.gain.exponentialRampToValueAtTime(
        tipo === "exito" ? 0.16 : 0.2,
        contexto.currentTime + 0.01
      );
      ganancia.gain.exponentialRampToValueAtTime(
        0.0001,
        contexto.currentTime + 0.16
      );
      oscilador.start();
      oscilador.stop(contexto.currentTime + 0.17);
      window.setTimeout(() => void contexto.close(), 250);
    } catch {
      // El sonido es opcional.
    }
  }

  useEffect(() => {
    if (!mostrarCobro && !mostrarCancelar && !ventaCompletada && !mostrarHistorial && !ventaACancelar && !ventaADevolver) {
      enfocarEscaner();
    }
  }, [mostrarCobro, mostrarCancelar, ventaCompletada, mostrarHistorial, ventaACancelar, ventaADevolver]);

  useEffect(() => {
    let activo = true;

    async function generarQr() {
      if (!ventaCompletada) {
        setQrTicket("");
        return;
      }

      try {
        const contenido = JSON.stringify({
          ventaId: ventaCompletada.id,
          fecha: ventaCompletada.fecha,
          total: ventaCompletada.total,
          caja: numeroCaja,
          turno: turnoCaja,
          cajero: ventaCompletada.atendidoPor,
        });

        const imagen = await QRCode.toDataURL(contenido, {
          width: 180,
          margin: 1,
          errorCorrectionLevel: "M",
        });

        if (activo) {
          setQrTicket(imagen);
        }
      } catch (error) {
        console.error("No fue posible generar el QR:", error);

        if (activo) {
          setQrTicket("");
        }
      }
    }

    void generarQr();

    return () => {
      activo = false;
    };
  }, [ventaCompletada, numeroCaja, turnoCaja]);


  useEffect(() => {
    function manejarAtajos(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        setBusqueda("");
        enfocarEscaner();
        return;
      }

      if (event.key === "F9") {
        event.preventDefault();

        if (
          carrito.length > 0 &&
          !procesandoVenta &&
          !mostrarCancelar &&
          !ventaCompletada &&
          !mostrarHistorial
        ) {
          setEfectivo("");
          setMostrarCobro(true);
        }

        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();

        if (ventaACancelar) {
          setVentaACancelar(null);
          setMotivoCancelacion("");
          setPinAdministrador("");
          setErrorCancelacion("");
          return;
        }

        if (ventaADevolver) {
          setVentaADevolver(null);
          setCantidadesDevolucion({});
          setMotivoDevolucion("");
          setPinDevolucion("");
          setErrorDevolucion("");
          return;
        }

        if (mostrarCobro) {
          setMostrarCobro(false);
          setEfectivo("");
          return;
        }

        if (mostrarCancelar) {
          setMostrarCancelar(false);
          return;
        }

        if (ventaCompletada) {
          setVentaCompletada(null);
          return;
        }

        if (mostrarHistorial) {
          setMostrarHistorial(false);
          setVentaSeleccionada(null);
          return;
        }

        if (mensajeAviso) {
          setMensajeAviso("");
          return;
        }

        setBusqueda("");
        enfocarEscaner();
      }
    }

    window.addEventListener("keydown", manejarAtajos);

    return () => {
      window.removeEventListener("keydown", manejarAtajos);
    };
  }, [
    carrito.length,
    mensajeAviso,
    mostrarCancelar,
    mostrarCobro,
    mostrarHistorial,
    procesandoVenta,
    ventaCompletada,
    ventaACancelar,
    ventaADevolver,
  ]);

  const productosDisponibles = productos.filter(
    (producto) => {
      const textoBusqueda = busqueda
        .toLowerCase()
        .trim();

      const coincideBusqueda =
        producto.nombre
          .toLowerCase()
          .includes(textoBusqueda) ||
        producto.codigo
          .toLowerCase()
          .includes(textoBusqueda);

      return coincideBusqueda && producto.existencias > 0;
    }
  );

  function agregarAlCarrito(producto: Producto): boolean {
    const productoExistente = carrito.find(
      (item) => item.id === producto.id
    );

    if (productoExistente) {
      if (
        productoExistente.cantidad >=
        producto.existencias
      ) {
        setTipoAviso("advertencia");
        setMensajeAviso(
          "No hay suficientes existencias de este producto."
        );
        return false;
      }

      setCarrito((carritoActual) =>
        carritoActual.map((item) =>
          item.id === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
              }
            : item
        )
      );

      return true;
    }

    setCarrito((carritoActual) => [
      ...carritoActual,
      {
        ...producto,
        cantidad: 1,
      },
    ]);

    return true;
  }

  function procesarCodigoEscaneado() {
    const codigo = busqueda.trim();
    if (!codigo) return;

    const producto = productos.find(
      (item) => item.codigo.trim().toLowerCase() === codigo.toLowerCase()
    );

    if (!producto || producto.existencias <= 0) {
      reproducirSonido("error");
      setTipoAviso("error");
      setCodigoNoEncontrado(codigo);
      setMensajeAviso(`El código ${codigo} no existe o no tiene existencias.`);
      enfocarEscaner();
      return;
    }

    const agregado = agregarAlCarrito(producto);

    if (agregado) {
      reproducirSonido("exito");
      setTipoAviso("exito");
      setCodigoNoEncontrado("");
      setMensajeAviso(`${producto.nombre} agregado correctamente.`);
      setBusqueda("");
    } else {
      reproducirSonido("error");
    }

    enfocarEscaner();
  }

  function aumentarCantidad(id: number) {
    setCarrito((carritoActual) =>
      carritoActual.map((item) => {
        if (item.id !== id) {
          return item;
        }

        if (item.cantidad >= item.existencias) {
          setMensajeAviso(
            "No puedes agregar más unidades que las disponibles."
          );

          return item;
        }

        return {
          ...item,
          cantidad: item.cantidad + 1,
        };
      })
    );
  }

  function disminuirCantidad(id: number) {
    setCarrito((carritoActual) => {
      const producto = carritoActual.find(
        (item) => item.id === id
      );

      if (!producto) {
        return carritoActual;
      }

      if (producto.cantidad <= 1) {
        return carritoActual.filter(
          (item) => item.id !== id
        );
      }

      return carritoActual.map((item) =>
        item.id === id
          ? {
              ...item,
              cantidad: item.cantidad - 1,
            }
          : item
      );
    });
  }

  function eliminarDelCarrito(id: number) {
    setCarrito((carritoActual) =>
      carritoActual.filter((item) => item.id !== id)
    );
  }

  function cancelarVenta() {
    if (carrito.length === 0) {
      return;
    }

    setMostrarCancelar(true);
  }

  function confirmarCancelacion() {
    setCarrito([]);
    setBusqueda("");
    setEfectivo("");
    setMostrarCancelar(false);
  }

  const totalArticulos = carrito.reduce(
    (total, item) => total + item.cantidad,
    0
  );

  const totalVenta = carrito.reduce(
    (total, item) =>
      total + item.precioVenta * item.cantidad,
    0
  );

  const efectivoRecibido = Number(efectivo) || 0;
  const cambio = efectivoRecibido - totalVenta;
  const efectivoSuficiente =
    efectivoRecibido >= totalVenta;

  async function abrirHistorialVentas() {
    try {
      const ventasSupabase = await obtenerVentas();

      let ventasLocales: VentaGuardada[] = [];
      const guardadas = localStorage.getItem("ventas");

      if (guardadas) {
        try {
          const datos: unknown = JSON.parse(guardadas);

          if (Array.isArray(datos)) {
            ventasLocales = datos as VentaGuardada[];
          }
        } catch {
          ventasLocales = [];
        }
      }

      const idsSupabase = new Set(
        ventasSupabase.map((venta) => venta.id)
      );

      const historicasLocales = ventasLocales.filter(
        (venta) => !idsSupabase.has(venta.id)
      );

      const combinadas = [
        ...ventasSupabase,
        ...historicasLocales,
      ].sort(
        (a, b) =>
          new Date(b.fecha).getTime() -
          new Date(a.fecha).getTime()
      );

      setVentasHistorial(combinadas);
      setVentaSeleccionada(null);
      setMostrarHistorial(true);
    } catch (error) {
      console.error(
        "Error al cargar historial:",
        error
      );

      setMensajeAviso(
        "No fue posible cargar el historial desde Supabase."
      );
    }
  }

  async function cobrarVenta() {
    if (
      carrito.length === 0 ||
      !efectivoSuficiente ||
      procesandoVenta
    ) {
      return;
    }

    try {
      setProcesandoVenta(true);

      const ventaNueva = await registrarVenta({
        total: totalVenta,
        efectivoRecibido,
        cambio,
        usuarioId: usuarioActual.id,
        atendidoPor:
          usuarioActual.nombreCompleto,
        rolUsuario: usuarioActual.rol,
        productos: carrito.map((item) => ({
          id: item.id,
          nombre: item.nombre,
          precioVenta: item.precioVenta,
          cantidad: item.cantidad,
          subtotal:
            item.precioVenta * item.cantidad,
        })),
      });

      const productosActualizados =
        await obtenerProductos();

      setProductos(productosActualizados);

      localStorage.setItem(
        "productos",
        JSON.stringify(productosActualizados)
      );

      const ventasGuardadas =
        localStorage.getItem("ventas");

      let ventasLocales: VentaGuardada[] = [];

      if (ventasGuardadas) {
        try {
          const datos: unknown = JSON.parse(
            ventasGuardadas
          );

          if (Array.isArray(datos)) {
            ventasLocales =
              datos as VentaGuardada[];
          }
        } catch {
          ventasLocales = [];
        }
      }

      const sinDuplicar = ventasLocales.filter(
        (venta) => venta.id !== ventaNueva.id
      );

      localStorage.setItem(
        "ventas",
        JSON.stringify([
          ...sinDuplicar,
          ventaNueva,
        ])
      );

      setVentaCompletada(ventaNueva);
      setCarrito([]);
      setBusqueda("");
      setMostrarCobro(false);
      setEfectivo("");
    } catch (error) {
      console.error(error);

      setMensajeAviso(
        error instanceof Error
          ? error.message
          : "No fue posible registrar la venta."
      );
    } finally {
      setProcesandoVenta(false);
    }
  }

  async function confirmarCancelacionRegistrada(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!ventaACancelar || procesandoVenta) {
      return;
    }

    const motivo = motivoCancelacion.trim();
    const pin = pinAdministrador.trim();

    if (motivo.length < 5) {
      setErrorCancelacion(
        "Escribe un motivo de al menos 5 caracteres."
      );
      return;
    }

    if (!/^\d{4,6}$/.test(pin)) {
      setErrorCancelacion(
        "El PIN debe contener entre 4 y 6 números."
      );
      return;
    }

    try {
      setProcesandoVenta(true);
      setErrorCancelacion("");

      const cancelada = await cancelarVentaConfirmada({
        ventaId: ventaACancelar.id,
        motivo,
        pin,
        solicitadoPorId: usuarioActual.id,
        solicitadoPor: usuarioActual.nombreCompleto,
      });

      const [ventasActualizadas, productosActualizados] =
        await Promise.all([
          obtenerVentas(),
          obtenerProductos(),
        ]);

      setVentasHistorial(ventasActualizadas);
      setProductos(productosActualizados);
      setVentaSeleccionada(cancelada);
      setVentaACancelar(null);
      setMotivoCancelacion("");
      setPinAdministrador("");

      localStorage.setItem(
        "ventas",
        JSON.stringify(ventasActualizadas)
      );

      localStorage.setItem(
        "productos",
        JSON.stringify(productosActualizados)
      );

      setTipoAviso("exito");
      setMensajeAviso(
        `La venta #${cancelada.id} fue cancelada y el inventario fue restaurado.`
      );
    } catch (error) {
      console.error(error);

      setErrorCancelacion(
        error instanceof Error
          ? error.message
          : "No fue posible cancelar la venta."
      );
    } finally {
      setProcesandoVenta(false);
    }
  }

  function abrirDevolucionParcial(
    venta: VentaGuardada
  ) {
    const cantidadesIniciales: Record<number, string> = {};

    venta.productos.forEach((producto) => {
      cantidadesIniciales[producto.id] = "";
    });

    setVentaADevolver(venta);
    setCantidadesDevolucion(cantidadesIniciales);
    setMotivoDevolucion("");
    setPinDevolucion("");
    setErrorDevolucion("");
  }

  async function confirmarDevolucionParcial(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!ventaADevolver || procesandoVenta) {
      return;
    }

    const productosSeleccionados =
      ventaADevolver.productos
        .map((producto) => {
          const cantidad = Number(
            cantidadesDevolucion[producto.id] || 0
          );

          return {
            productoId: producto.id,
            cantidad,
            disponible:
              producto.cantidad -
              (producto.cantidadDevuelta ?? 0),
          };
        })
        .filter((producto) => producto.cantidad > 0);

    if (productosSeleccionados.length === 0) {
      setErrorDevolucion(
        "Selecciona al menos una unidad para devolver."
      );
      return;
    }

    const cantidadInvalida =
      productosSeleccionados.some(
        (producto) =>
          !Number.isInteger(producto.cantidad) ||
          producto.cantidad <= 0 ||
          producto.cantidad > producto.disponible
      );

    if (cantidadInvalida) {
      setErrorDevolucion(
        "Una de las cantidades supera lo disponible para devolución."
      );
      return;
    }

    if (motivoDevolucion.trim().length < 5) {
      setErrorDevolucion(
        "Escribe un motivo de al menos 5 caracteres."
      );
      return;
    }

    if (!/^\d{4,6}$/.test(pinDevolucion.trim())) {
      setErrorDevolucion(
        "El PIN debe contener entre 4 y 6 números."
      );
      return;
    }

    try {
      setProcesandoVenta(true);
      setErrorDevolucion("");

      const devolucion = await registrarDevolucionParcial({
        ventaId: ventaADevolver.id,
        motivo: motivoDevolucion.trim(),
        pin: pinDevolucion.trim(),
        solicitadoPorId: usuarioActual.id,
        solicitadoPor: usuarioActual.nombreCompleto,
        productos: productosSeleccionados.map(
          ({ productoId, cantidad }) => ({
            productoId,
            cantidad,
          })
        ),
      });

      const [ventasActualizadas, productosActualizados] =
        await Promise.all([
          obtenerVentas(),
          obtenerProductos(),
        ]);

      setVentasHistorial(ventasActualizadas);
      setProductos(productosActualizados);

      const ventaActualizada =
        ventasActualizadas.find(
          (venta) => venta.id === ventaADevolver.id
        ) ?? null;

      setVentaSeleccionada(ventaActualizada);
      setVentaADevolver(null);
      setCantidadesDevolucion({});
      setMotivoDevolucion("");
      setPinDevolucion("");

      localStorage.setItem(
        "ventas",
        JSON.stringify(ventasActualizadas)
      );

      localStorage.setItem(
        "productos",
        JSON.stringify(productosActualizados)
      );

      setTipoAviso("exito");
      setMensajeAviso(
        `Devolución #${devolucion.id} registrada por $${devolucion.total.toFixed(2)}.`
      );
    } catch (error) {
      console.error(error);

      setErrorDevolucion(
        error instanceof Error
          ? error.message
          : "No fue posible registrar la devolución."
      );
    } finally {
      setProcesandoVenta(false);
    }
  }

  return (
    <div className="ventas-pos-page">
      <main className="ventas-pos-contenido">
        <section className="venta-titulo-barra">
          <div>
            <span>VENTA DE PRODUCTOS</span>
            <strong>
              Ticket #{Date.now().toString().slice(-5)}
            </strong>
          </div>

          <p>{new Date().toLocaleString("es-MX")}</p>
        </section>

        <section
          className="atajos-pos"
          aria-label="Atajos de teclado"
        >
          <span>
            <kbd>F2</kbd> Buscar producto
          </span>

          <span>
            <kbd>F9</kbd> Cobrar
          </span>

          <span>
            <kbd>Esc</kbd> Cerrar o limpiar
          </span>
        </section>

        <section className="busqueda-pos">
          <label htmlFor="busqueda-producto">
            Código o nombre del producto
          </label>

          <div className="busqueda-pos-fila">
            <input
              ref={inputEscanerRef}
              id="busqueda-producto"
              type="text"
              autoFocus
              autoComplete="off"
              placeholder="Escribe el código o nombre del producto"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  procesarCodigoEscaneado();
                }
              }}
              onBlur={() => {
                if (!mostrarCobro && !mostrarCancelar && !ventaCompletada && !mostrarHistorial) {
                  enfocarEscaner();
                }
              }}
            />

            <button
              type="button"
              disabled={
                cargandoProductos ||
                procesandoVenta ||
                productosDisponibles.length === 0
              }
              onClick={() => {
                const producto = productosDisponibles[0];
                if (!producto) return;

                const agregado = agregarAlCarrito(producto);
                if (agregado) {
                  reproducirSonido("exito");
                  setTipoAviso("exito");
                  setMensajeAviso(`${producto.nombre} agregado correctamente.`);
                  setBusqueda("");
                }
                enfocarEscaner();
              }}
            >
              + Agregar primer resultado
            </button>
          </div>

          {busqueda.trim() !== "" && (
            <div className="resultados-busqueda">
              {productosDisponibles.length === 0 ? (
                <div className="resultado-vacio">
                  No se encontraron productos disponibles.
                </div>
              ) : (
                productosDisponibles
                  .slice(0, 5)
                  .map((producto) => (
                    <button
                      type="button"
                      className="resultado-producto"
                      key={producto.id}
                      onClick={() => {
                        const agregado = agregarAlCarrito(producto);
                        if (agregado) {
                          reproducirSonido("exito");
                          setTipoAviso("exito");
                          setMensajeAviso(`${producto.nombre} agregado correctamente.`);
                          setBusqueda("");
                        }
                        enfocarEscaner();
                      }}
                    >
                      <div>
                        <strong>
                          {producto.nombre}
                        </strong>

                        <span>
                          Código: {producto.codigo} ·{" "}
                          {producto.categoria}
                        </span>
                      </div>

                      <div>
                        <strong>
                          $
                          {producto.precioVenta.toFixed(
                            2
                          )}
                        </strong>

                        <span>
                          Existencias:{" "}
                          {producto.existencias}
                        </span>
                      </div>
                    </button>
                  ))
              )}
            </div>
          )}
        </section>

        <section className="acciones-pos">
          <button
            type="button"
            onClick={() => setBusqueda("")}
          >
            Limpiar búsqueda
          </button>

          <button
            type="button"
            onClick={abrirHistorialVentas}
          >
            Historial de ventas
          </button>

          <button
            type="button"
            onClick={cancelarVenta}
            disabled={carrito.length === 0}
          >
            Cancelar venta
          </button>

          <button
            type="button"
            className="accion-cobrar"
            onClick={() => {
              setEfectivo("");
              setMostrarCobro(true);
            }}
            disabled={carrito.length === 0}
          >
            Cobrar
          </button>
        </section>

        <section className="ticket-panel">
          <div className="ticket-encabezado">
            <strong>Venta actual</strong>

            <span>
              {totalArticulos} artículo
              {totalArticulos === 1 ? "" : "s"}
            </span>
          </div>

          <div className="tabla-ticket-contenedor">
            <table className="tabla-ticket">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción del producto</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                  <th>Importe</th>
                  <th>Existencia</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {carrito.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="ticket-vacio"
                    >
                      <div>🛒</div>
                      <strong>
                        No hay productos en la venta actual
                      </strong>
                      <p>
                        Busca un producto y agrégalo para
                        comenzar.
                      </p>
                    </td>
                  </tr>
                ) : (
                  carrito.map((item) => (
                    <tr key={item.id}>
                      <td>{item.codigo}</td>

                      <td>
                        <strong>{item.nombre}</strong>
                        <span>{item.categoria}</span>
                      </td>

                      <td>
                        ${item.precioVenta.toFixed(2)}
                      </td>

                      <td>
                        <div className="cantidad-ticket">
                          <button
                            type="button"
                            onClick={() =>
                              disminuirCantidad(item.id)
                            }
                          >
                            −
                          </button>

                          <span>{item.cantidad}</span>

                          <button
                            type="button"
                            onClick={() =>
                              aumentarCantidad(item.id)
                            }
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="importe-ticket">
                        $
                        {(
                          item.precioVenta *
                          item.cantidad
                        ).toFixed(2)}
                      </td>

                      <td>{item.existencias}</td>

                      <td>
                        <button
                          type="button"
                          className="eliminar-ticket"
                          onClick={() =>
                            eliminarDelCarrito(item.id)
                          }
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="resumen-pos">
          <div className="resumen-informacion">
            <div>
              <span>Productos en la venta</span>
              <strong>{totalArticulos}</strong>
            </div>

            <div>
              <span>Productos diferentes</span>
              <strong>{carrito.length}</strong>
            </div>

            <div>
              <span>Estado</span>
              <strong>
                {carrito.length === 0
                  ? "Venta vacía"
                  : "Venta en proceso"}
              </strong>
            </div>
          </div>

          <div className="total-pos">
            <span>Total</span>
            <strong>${totalVenta.toFixed(2)}</strong>

            <button
              type="button"
              className="boton-cobrar"
              disabled={carrito.length === 0}
              onClick={() => {
                setEfectivo("");
                setMostrarCobro(true);
              }}
            >
              Cobrar venta
            </button>
          </div>
        </section>
      </main>

      {mostrarCobro && (
        <div className="cobro-modal-fondo">
          <div className="cobro-modal">
            <div className="cobro-modal-header">
              <div>
                <p>CONFIRMAR OPERACIÓN</p>
                <h2>Cobrar venta</h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMostrarCobro(false);
                  setEfectivo("");
                }}
              >
                ×
              </button>
            </div>

            <div className="cobro-resumen">
              <span>Total a cobrar</span>
              <strong>
                ${totalVenta.toFixed(2)}
              </strong>
            </div>

            <label className="campo-efectivo">
              Efectivo recibido

              <input
                type="number"
                min="0"
                step="0.01"
                autoFocus
                value={efectivo}
                onChange={(event) =>
                  setEfectivo(event.target.value)
                }
                placeholder="0.00"
              />
            </label>

            <div
              className={`cambio-resumen ${
                efectivoSuficiente
                  ? "correcto"
                  : "insuficiente"
              }`}
            >
              <span>Cambio</span>

              <strong>
                $
                {efectivoSuficiente
                  ? cambio.toFixed(2)
                  : "0.00"}
              </strong>
            </div>

            {!efectivoSuficiente &&
              efectivo !== "" && (
                <p className="efectivo-error">
                  El efectivo recibido es menor al total.
                </p>
              )}

            <div className="cobro-modal-acciones">
              <button
                type="button"
                className="cancelar-cobro"
                onClick={() => {
                  setMostrarCobro(false);
                  setEfectivo("");
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="confirmar-cobro"
                disabled={
                  !efectivoSuficiente ||
                  procesandoVenta
                }
                onClick={cobrarVenta}
              >
                {procesandoVenta
                  ? "Registrando..."
                  : "Confirmar venta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {ventaCompletada && (
        <div className="ticket-modal-fondo">
          <div
            className={`ticket-impresion ticket-${anchoTicket}`}
          >
            <div className="ticket-impresion-header">
                <img
                className="ticket-logo-san-francisco"
                src="/logo.png"
                alt="Abarrotes San Francisco"
                />

              <h2>Abarrotes San Francisco</h2>
              <p>Ticket de venta</p>
              <span className="ticket-folio-profesional">
                Folio #{String(ventaCompletada.id).padStart(6, "0")}
              </span>
            </div>

            <div className="ticket-datos">
              <p>
                <strong>Ticket:</strong>{" "}
                #
                {String(
                  ventaCompletada.id
                ).slice(-6)}
              </p>

              <p>
                <strong>Fecha:</strong>{" "}
                {new Date(
                  ventaCompletada.fecha
                ).toLocaleString("es-MX")}
              </p>

              <p>
                <strong>Atendió:</strong>{" "}
                {ventaCompletada.atendidoPor}
              </p>

              <p>
                <strong>Rol:</strong>{" "}
                {ventaCompletada.rolUsuario}
              </p>

              <p>
                <strong>Caja:</strong> {numeroCaja}
              </p>

              <p>
                <strong>Turno:</strong> {turnoCaja}
              </p>

              <p>
                <strong>Método:</strong> Efectivo
              </p>
            </div>

            <div className="ticket-productos">
              <div className="ticket-productos-titulo">
                <span>Producto</span>
                <span>Importe</span>
              </div>

              {(ventaCompletada.productos ?? []).map(
                (producto) => (
                  <div
                    className="ticket-producto-linea"
                    key={producto.id}
                  >
                    <div>
                      <strong>
                        {producto.nombre}
                      </strong>

                      <span>
                        {producto.cantidad} × $
                        {producto.precioVenta.toFixed(
                          2
                        )}
                      </span>
                    </div>

                    <strong>
                      $
                      {(
                        producto.subtotal ??
                        producto.precioVenta *
                          producto.cantidad
                      ).toFixed(2)}
                    </strong>
                  </div>
                )
              )}
            </div>

            <div className="ticket-totales">
              <div>
                <span>Total</span>
                <strong>
                  $
                  {ventaCompletada.total.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Efectivo recibido</span>
                <strong>
                  $
                  {(
                    ventaCompletada.efectivoRecibido ??
                    ventaCompletada.total
                  ).toFixed(2)}
                </strong>
              </div>

              <div className="ticket-cambio">
                <span>Cambio</span>
                <strong>
                  $
                  {(
                    ventaCompletada.cambio ?? 0
                  ).toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="ticket-qr">
              {qrTicket ? (
                <img
                  src={qrTicket}
                  alt={`Código QR de la venta ${ventaCompletada.id}`}
                />
              ) : (
                <div className="ticket-qr-cargando">
                  Generando QR...
                </div>
              )}

              <p>
                Escanea para consultar los datos principales
                de esta venta.
              </p>
            </div>

            <div className="ticket-mensaje">
              <strong>¡Gracias por su compra!</strong>
              <p>
                Conserve este ticket para cualquier
                aclaración.
              </p>
              <small>
                Abarrotes San Francisco · Venta interna
              </small>
            </div>

            <div className="selector-ticket">
              <span>Ancho de impresión</span>

              <div>
                <button
                  type="button"
                  className={
                    anchoTicket === "58mm" ? "activo" : ""
                  }
                  onClick={() => setAnchoTicket("58mm")}
                >
                  58 mm
                </button>

                <button
                  type="button"
                  className={
                    anchoTicket === "80mm" ? "activo" : ""
                  }
                  onClick={() => setAnchoTicket("80mm")}
                >
                  80 mm
                </button>
              </div>
            </div>

            <div className="ticket-modal-acciones">
              <button
                type="button"
                className="cerrar-ticket"
                onClick={() => {
                  setVentaCompletada(null);
                }}
              >
                Cerrar
              </button>

              <button
                type="button"
                className="imprimir-ticket"
                onClick={() => window.print()}
              >
                🖨 Imprimir ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarCancelar && (
        <div className="cancelar-modal-fondo">
          <div className="cancelar-modal">
            <div className="cancelar-modal-icono">
              ⚠️
            </div>

            <h2>Cancelar venta</h2>

            <p>
              ¿Seguro que deseas cancelar la venta actual?
            </p>

            <div className="cancelar-modal-resumen">
              <span>Productos agregados</span>
              <strong>{totalArticulos}</strong>
            </div>

            <div className="cancelar-modal-resumen">
              <span>Total de la venta</span>
              <strong>
                ${totalVenta.toFixed(2)}
              </strong>
            </div>

            <div className="cancelar-modal-acciones">
              <button
                type="button"
                className="volver-venta"
                onClick={() =>
                  setMostrarCancelar(false)
                }
              >
                Volver
              </button>

              <button
                type="button"
                className="confirmar-cancelacion"
                onClick={confirmarCancelacion}
              >
                Sí, cancelar venta
              </button>
            </div>
          </div>
        </div>
      )}

      {mensajeAviso && (
        <div className={`aviso-existencias aviso-${tipoAviso}`}>
          <div>
            <span>{tipoAviso === "exito" ? "✅" : tipoAviso === "error" ? "❌" : "⚠️"}</span>

            <div>
              <strong>
                {tipoAviso === "exito"
                  ? "Producto agregado"
                  : tipoAviso === "error"
                    ? "Código no encontrado"
                    : "Aviso de inventario"}
              </strong>
              <p>{mensajeAviso}</p>

              {tipoAviso === "error" && codigoNoEncontrado && (
                <button
                  type="button"
                  className="registrar-producto-rapido"
                  onClick={() => {
                    window.location.href =
                      `/productos?codigo=${encodeURIComponent(codigoNoEncontrado)}`;
                  }}
                >
                  Registrar producto nuevo
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMensajeAviso("")}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {ventaADevolver && (
        <div className="devolucion-modal-fondo">
          <div className="devolucion-modal">
            <div className="devolucion-modal-header">
              <div>
                <span>DEVOLUCIÓN PARCIAL</span>
                <h2>Seleccionar productos</h2>
              </div>

              <button
                type="button"
                disabled={procesandoVenta}
                onClick={() => {
                  setVentaADevolver(null);
                  setCantidadesDevolucion({});
                  setMotivoDevolucion("");
                  setPinDevolucion("");
                  setErrorDevolucion("");
                }}
              >
                ×
              </button>
            </div>

            <div className="devolucion-ticket-resumen">
              <div>
                <span>Ticket</span>
                <strong>
                  #{String(ventaADevolver.id).padStart(6, "0")}
                </strong>
              </div>

              <div>
                <span>Total original</span>
                <strong>
                  ${ventaADevolver.total.toFixed(2)}
                </strong>
              </div>
            </div>

            <form onSubmit={confirmarDevolucionParcial}>
              <div className="devolucion-productos-lista">
                {ventaADevolver.productos.map((producto) => {
                  const devueltas =
                    producto.cantidadDevuelta ?? 0;
                  const disponibles =
                    producto.cantidad - devueltas;

                  return (
                    <article
                      key={producto.id}
                      className={
                        disponibles <= 0
                          ? "sin-unidades-devolucion"
                          : ""
                      }
                    >
                      <div>
                        <strong>{producto.nombre}</strong>
                        <span>
                          Vendidas: {producto.cantidad} · Ya
                          devueltas: {devueltas}
                        </span>
                        <b>
                          Disponible para devolver:{" "}
                          {Math.max(disponibles, 0)}
                        </b>
                      </div>

                      <label>
                        Cantidad
                        <input
                          type="number"
                          min="0"
                          max={Math.max(disponibles, 0)}
                          step="1"
                          value={
                            cantidadesDevolucion[producto.id] ??
                            ""
                          }
                          disabled={
                            procesandoVenta || disponibles <= 0
                          }
                          onChange={(event) => {
                            setCantidadesDevolucion(
                              (actuales) => ({
                                ...actuales,
                                [producto.id]:
                                  event.target.value,
                              })
                            );
                            setErrorDevolucion("");
                          }}
                          placeholder="0"
                        />
                      </label>
                    </article>
                  );
                })}
              </div>

              <label className="devolucion-campo">
                Motivo de la devolución
                <textarea
                  rows={3}
                  value={motivoDevolucion}
                  disabled={procesandoVenta}
                  onChange={(event) => {
                    setMotivoDevolucion(event.target.value);
                    setErrorDevolucion("");
                  }}
                  placeholder="Ejemplo: Producto dañado o cambio solicitado"
                />
              </label>

              <label className="devolucion-campo">
                PIN de administrador
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinDevolucion}
                  disabled={procesandoVenta}
                  onChange={(event) => {
                    setPinDevolucion(
                      event.target.value.replace(/\D/g, "")
                    );
                    setErrorDevolucion("");
                  }}
                  placeholder="4 a 6 números"
                />
              </label>

              <p className="devolucion-advertencia">
                Solo regresarán al inventario las cantidades
                seleccionadas. La venta original permanecerá
                en el historial.
              </p>

              {errorDevolucion && (
                <div className="devolucion-error">
                  <span>⚠️</span>
                  <p>{errorDevolucion}</p>
                </div>
              )}

              <div className="devolucion-modal-acciones">
                <button
                  type="button"
                  className="devolucion-cancelar"
                  disabled={procesandoVenta}
                  onClick={() => {
                    setVentaADevolver(null);
                    setCantidadesDevolucion({});
                    setMotivoDevolucion("");
                    setPinDevolucion("");
                    setErrorDevolucion("");
                  }}
                >
                  Volver
                </button>

                <button
                  type="submit"
                  className="devolucion-confirmar"
                  disabled={procesandoVenta}
                >
                  {procesandoVenta
                    ? "Registrando..."
                    : "Autorizar devolución"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ventaACancelar && (
        <div className="cancelacion-registrada-fondo">
          <div className="cancelacion-registrada-modal">
            <div className="cancelacion-registrada-header">
              <div>
                <span>AUTORIZACIÓN REQUERIDA</span>
                <h2>Cancelar venta registrada</h2>
              </div>

              <button
                type="button"
                disabled={procesandoVenta}
                onClick={() => {
                  setVentaACancelar(null);
                  setMotivoCancelacion("");
                  setPinAdministrador("");
                  setErrorCancelacion("");
                }}
              >
                ×
              </button>
            </div>

            <div className="cancelacion-venta-resumen">
              <div>
                <span>Ticket</span>
                <strong>
                  #{String(ventaACancelar.id).padStart(6, "0")}
                </strong>
              </div>

              <div>
                <span>Total</span>
                <strong>
                  ${ventaACancelar.total.toFixed(2)}
                </strong>
              </div>
            </div>

            <form onSubmit={confirmarCancelacionRegistrada}>
              <label>
                Motivo de la cancelación
                <textarea
                  value={motivoCancelacion}
                  disabled={procesandoVenta}
                  onChange={(event) => {
                    setMotivoCancelacion(
                      event.target.value
                    );
                    setErrorCancelacion("");
                  }}
                  placeholder="Ejemplo: Error de cobro o producto equivocado"
                  rows={3}
                  autoFocus
                />
              </label>

              <label>
                PIN de administrador
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinAdministrador}
                  disabled={procesandoVenta}
                  onChange={(event) => {
                    setPinAdministrador(
                      event.target.value.replace(/\D/g, "")
                    );
                    setErrorCancelacion("");
                  }}
                  placeholder="4 a 6 números"
                />
              </label>

              <p className="cancelacion-advertencia">
                Al confirmar, los productos regresarán al
                inventario y la venta quedará marcada como
                cancelada. Esta acción no se puede repetir.
              </p>

              {errorCancelacion && (
                <div className="cancelacion-error">
                  <span>⚠️</span>
                  <p>{errorCancelacion}</p>
                </div>
              )}

              <div className="cancelacion-registrada-acciones">
                <button
                  type="button"
                  className="cancelacion-volver"
                  disabled={procesandoVenta}
                  onClick={() => {
                    setVentaACancelar(null);
                    setMotivoCancelacion("");
                    setPinAdministrador("");
                    setErrorCancelacion("");
                  }}
                >
                  Volver
                </button>

                <button
                  type="submit"
                  className="cancelacion-confirmar"
                  disabled={procesandoVenta}
                >
                  {procesandoVenta
                    ? "Cancelando..."
                    : "Autorizar cancelación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarHistorial && (
        <div className="historial-modal-fondo">
          <div className="historial-modal">
            <div className="historial-header">
              <div>
                <span>REGISTRO DE OPERACIONES</span>
                <h2>Historial de ventas</h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMostrarHistorial(false);
                  setVentaSeleccionada(null);
                }}
              >
                ×
              </button>
            </div>

            {ventasHistorial.length === 0 ? (
              <div className="historial-vacio">
                <div>🧾</div>
                <strong>
                  No hay ventas registradas
                </strong>
                <p>
                  Las ventas confirmadas aparecerán aquí.
                </p>
              </div>
            ) : (
              <div className="historial-contenido">
                <div className="historial-lista">
                  {ventasHistorial.map((venta) => (
                    <button
                      type="button"
                      key={venta.id}
                      className={`historial-venta-item ${
                        ventaSeleccionada?.id ===
                        venta.id
                          ? "seleccionada"
                          : ""
                      }`}
                      onClick={() =>
                        setVentaSeleccionada(venta)
                      }
                    >
                      <div>
                        <strong>
                          Ticket #
                          {String(
                            venta.id
                          ).slice(-6)}
                        </strong>

                        <span>
                          {new Date(
                            venta.fecha
                          ).toLocaleString("es-MX")}
                        </span>
                      </div>

                      <div>
                        <strong>
                          ${venta.total.toFixed(2)}
                        </strong>

                        <span>
                          {(venta.productos ?? []).reduce(
                            (total, producto) =>
                              total +
                              producto.cantidad,
                            0
                          )}{" "}
                          productos
                        </span>

                        <span>
                          Atendió: {venta.atendidoPor}
                        </span>

                        {venta.estado === "cancelada" && (
                          <span className="venta-cancelada-etiqueta">
                            Cancelada
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="historial-detalle">
                  {!ventaSeleccionada ? (
                    <div className="historial-seleccionar">
                      <div>👈</div>
                      <strong>
                        Selecciona una venta
                      </strong>
                      <p>
                        Presiona un ticket para consultar
                        sus productos y totales.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="detalle-ticket-header">
                        <div>
                          <span>DETALLE DE VENTA</span>
                          <h3>
                            Ticket #
                            {String(
                              ventaSeleccionada.id
                            ).slice(-6)}
                          </h3>
                        </div>

                        <strong>
                          $
                          {ventaSeleccionada.total.toFixed(
                            2
                          )}
                        </strong>
                      </div>

                      <div className="detalle-ticket-datos">
                        <p>
                          <strong>Fecha:</strong>{" "}
                          {new Date(
                            ventaSeleccionada.fecha
                          ).toLocaleString("es-MX")}
                        </p>

                        <p>
                          <strong>Atendió:</strong>{" "}
                          {
                            ventaSeleccionada.atendidoPor
                          }
                        </p>

                        <p>
                          <strong>Rol:</strong>{" "}
                          {
                            ventaSeleccionada.rolUsuario
                          }
                        </p>

                        <p>
                          <strong>Método:</strong>{" "}
                          Efectivo
                        </p>
                      </div>

                      <div className="detalle-productos">
                        {(ventaSeleccionada.productos ??
                          []
                        ).map((producto, index) => (
                          <div
                            className="detalle-producto"
                            key={`${producto.id}-${index}`}
                          >
                            <div>
                              <strong>
                                {producto.nombre}
                              </strong>

                              <span>
                                {producto.cantidad} × $
                                {producto.precioVenta.toFixed(
                                  2
                                )}
                              </span>

                              {(producto.cantidadDevuelta ?? 0) > 0 && (
                                <span className="producto-devuelto-info">
                                  Devuelto: {producto.cantidadDevuelta} de{" "}
                                  {producto.cantidad}
                                </span>
                              )}
                            </div>

                            <strong>
                              $
                              {(
                                producto.subtotal ??
                                producto.precioVenta *
                                  producto.cantidad
                              ).toFixed(2)}
                            </strong>
                          </div>
                        ))}
                      </div>

                      <div className="detalle-totales">
                        <div>
                          <span>Total</span>
                          <strong>
                            $
                            {ventaSeleccionada.total.toFixed(
                              2
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Efectivo recibido
                          </span>
                          <strong>
                            $
                            {(
                              ventaSeleccionada.efectivoRecibido ??
                              ventaSeleccionada.total
                            ).toFixed(2)}
                          </strong>
                        </div>

                        <div className="detalle-cambio">
                          <span>Cambio</span>
                          <strong>
                            $
                            {(
                              ventaSeleccionada.cambio ??
                              0
                            ).toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      {ventaSeleccionada.estado !==
                        "cancelada" &&
                        ventaSeleccionada.productos.some(
                          (producto) =>
                            producto.cantidad -
                              (producto.cantidadDevuelta ?? 0) >
                            0
                        ) && (
                          <button
                            type="button"
                            className="devolver-productos-venta"
                            onClick={() =>
                              abrirDevolucionParcial(
                                ventaSeleccionada
                              )
                            }
                          >
                            Devolver productos
                          </button>
                        )}

                      {ventaSeleccionada.estado ===
                      "cancelada" ? (
                        <div className="venta-cancelada-resumen">
                          <strong>Venta cancelada</strong>
                          <span>
                            Motivo:{" "}
                            {ventaSeleccionada.motivoCancelacion ||
                              "Sin especificar"}
                          </span>
                          <span>
                            Autorizó:{" "}
                            {ventaSeleccionada.canceladaPor ||
                              "Administrador"}
                          </span>
                          {ventaSeleccionada.fechaCancelacion && (
                            <span>
                              Fecha:{" "}
                              {new Date(
                                ventaSeleccionada.fechaCancelacion
                              ).toLocaleString("es-MX")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="cancelar-venta-registrada"
                          onClick={() => {
                            setVentaACancelar(
                              ventaSeleccionada
                            );
                            setMotivoCancelacion("");
                            setPinAdministrador("");
                            setErrorCancelacion("");
                          }}
                        >
                          Cancelar venta con PIN
                        </button>
                      )}

                      <button
                        type="button"
                        className="reimprimir-ticket"
                        onClick={() => {
                          setVentaCompletada(
                            ventaSeleccionada
                          );
                          setMostrarHistorial(false);
                        }}
                      >
                        🖨 Ver e imprimir ticket
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Ventas;