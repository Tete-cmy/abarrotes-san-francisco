import { useEffect, useState } from "react";
import Login, {
  type UsuarioSesion,
} from "./pages/Login/Login";

import Dashboard from "./pages/Dashboard/Dashboard";
import Productos from "./pages/Productos/Productos";
import Ventas from "./pages/Ventas/Ventas";
import Inventario from "./pages/Inventario/Inventario";
import Reportes from "./pages/Reportes/Reportes";
import Usuarios from "./pages/Usuarios/Usuarios";
import Clientes from "./pages/Clientes/Clientes";
import Creditos from "./pages/Creditos/Creditos";
import Corte from "./pages/Corte/Corte";
import Configuracion from "./pages/Configuracion/Configuracion";
import Compras from "./pages/Compras/Compras";
import Facturas from "./pages/Facturas/Facturas";
import Devoluciones from "./pages/Devoluciones/Devoluciones";
import Bitacora from "./pages/Bitacora/Bitacora";

import SistemaLayout from "./components/SistemaLayout/SistemaLayout";
import type { Pantalla } from "./types/navegacion";

import {
  probarConexionProductos,
} from "./services/productosService";

function App() {
  const [usuarioActual, setUsuarioActual] =
    useState<UsuarioSesion | null>(null);

  const [pantallaActual, setPantallaActual] =
    useState<Pantalla>("dashboard");

  useEffect(() => {
    probarConexionProductos();
  }, []);

  function iniciarSesion(usuario: UsuarioSesion) {
    setUsuarioActual(usuario);

    setPantallaActual(
      usuario.rol === "Cajero"
        ? "ventas"
        : "dashboard"
    );
  }

  function cerrarSesion() {
    setUsuarioActual(null);
    setPantallaActual("dashboard");
  }

  function navegar(pantalla: Pantalla) {
    if (!usuarioActual) {
      return;
    }

    if (usuarioActual.rol === "Cajero") {
      const pantallasBloqueadas: Pantalla[] = [
        "dashboard",
        "usuarios",
        "reportes",
        "compras",
        "configuracion",
        "facturas",
        "devoluciones",
        "bitacora",
      ];

      if (pantallasBloqueadas.includes(pantalla)) {
        setPantallaActual("ventas");
        return;
      }
    }

    setPantallaActual(pantalla);
  }

  if (!usuarioActual) {
    return <Login onLogin={iniciarSesion} />;
  }

  const usuarioSesion: UsuarioSesion =
    usuarioActual;

  function mostrarPantalla() {
    switch (pantallaActual) {
      case "ventas":
        return (
          <Ventas
            usuarioActual={usuarioSesion}
          />
        );

      case "productos":
        return (
          <Productos
            usuarioActual={usuarioSesion}
          />
        );

      case "clientes":
        return <Clientes />;

      case "inventario":
        return (
          <Inventario
            onNavigate={navegar}
            usuarioActual={usuarioSesion}
          />
        );

      case "reportes":
        return (
          <Reportes onNavigate={navegar} />
        );

      case "usuarios":
        return (
          <Usuarios
            onNavigate={navegar}
            usuarioActual={usuarioSesion}
          />
        );

      case "creditos":
        return (
          <Creditos
            usuarioActual={usuarioSesion}
          />
        );

      case "compras":
        return (
          <Compras
            usuarioActual={usuarioSesion}
          />
        );

      case "configuracion":
        return <Configuracion />;

      case "facturas":
        return (
          <Facturas
            usuarioActual={usuarioSesion}
          />
        );

      case "devoluciones":
        return <Devoluciones />;

      case "bitacora":
        return <Bitacora />;

      case "corte":
        return (
          <Corte
            usuarioActual={usuarioSesion}
          />
        );

      case "dashboard":
      default:
        return (
          <Dashboard
            onNavigate={navegar}
            usuarioActual={usuarioSesion}
          />
        );
    }
  }

  return (
    <SistemaLayout
      pantallaActual={pantallaActual}
      usuarioActual={usuarioSesion}
      onNavigate={navegar}
      onCerrarSesion={cerrarSesion}
    >
      {mostrarPantalla()}
    </SistemaLayout>
  );
}

export default App;