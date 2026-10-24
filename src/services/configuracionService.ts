import { supabase } from "../lib/supabase";

export interface ConfiguracionTienda {
  id: number;
  nombreTienda: string;
  slogan: string;
  telefono: string;
  correo: string;
  direccion: string;
  colonia: string;
  municipioEstado: string;
  codigoPostal: string;
  rfc: string;
  moneda: string;
  simboloMoneda: string;
  porcentajeImpuesto: number;
  stockMinimoPredeterminado: number;
  permitirCreditos: boolean;
  imprimirTicketAutomatico: boolean;
  mostrarLogoTicket: boolean;
  pieTicket: string;
  logoUrl: string;
  actualizadoEn: string;
}

interface ConfiguracionFila {
  id: number;
  nombre_tienda: string;
  slogan: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  colonia: string | null;
  municipio_estado: string | null;
  codigo_postal: string | null;
  rfc: string | null;
  moneda: string;
  simbolo_moneda: string;
  porcentaje_impuesto: number | string;
  stock_minimo_predeterminado: number;
  permitir_creditos: boolean;
  imprimir_ticket_automatico: boolean;
  mostrar_logo_ticket: boolean;
  pie_ticket: string;
  logo_url: string;
  actualizado_en: string;
}

const campos =
  "id,nombre_tienda,slogan,telefono,correo,direccion,colonia,municipio_estado,codigo_postal,rfc,moneda,simbolo_moneda,porcentaje_impuesto,stock_minimo_predeterminado,permitir_creditos,imprimir_ticket_automatico,mostrar_logo_ticket,pie_ticket,logo_url,actualizado_en";

function convertirFila(
  fila: ConfiguracionFila
): ConfiguracionTienda {
  return {
    id: Number(fila.id),
    nombreTienda: fila.nombre_tienda,
    slogan: fila.slogan,
    telefono: fila.telefono ?? "",
    correo: fila.correo ?? "",
    direccion: fila.direccion ?? "",
    colonia: fila.colonia ?? "",
    municipioEstado: fila.municipio_estado ?? "",
    codigoPostal: fila.codigo_postal ?? "",
    rfc: fila.rfc ?? "",
    moneda: fila.moneda,
    simboloMoneda: fila.simbolo_moneda,
    porcentajeImpuesto: Number(fila.porcentaje_impuesto),
    stockMinimoPredeterminado: Number(
      fila.stock_minimo_predeterminado
    ),
    permitirCreditos: Boolean(fila.permitir_creditos),
    imprimirTicketAutomatico: Boolean(
      fila.imprimir_ticket_automatico
    ),
    mostrarLogoTicket: Boolean(fila.mostrar_logo_ticket),
    pieTicket: fila.pie_ticket,
    logoUrl: fila.logo_url,
    actualizadoEn: fila.actualizado_en,
  };
}

function convertirConfiguracion(
  configuracion: ConfiguracionTienda
) {
  return {
    nombre_tienda: configuracion.nombreTienda.trim(),
    slogan: configuracion.slogan.trim(),
    telefono: configuracion.telefono.trim() || null,
    correo: configuracion.correo.trim() || null,
    direccion: configuracion.direccion.trim() || null,
    colonia: configuracion.colonia.trim() || null,
    municipio_estado:
      configuracion.municipioEstado.trim() || null,
    codigo_postal:
      configuracion.codigoPostal.trim() || null,
    rfc: configuracion.rfc.trim() || null,
    moneda: configuracion.moneda.trim() || "MXN",
    simbolo_moneda:
      configuracion.simboloMoneda.trim() || "$",
    porcentaje_impuesto: configuracion.porcentajeImpuesto,
    stock_minimo_predeterminado:
      configuracion.stockMinimoPredeterminado,
    permitir_creditos: configuracion.permitirCreditos,
    imprimir_ticket_automatico:
      configuracion.imprimirTicketAutomatico,
    mostrar_logo_ticket:
      configuracion.mostrarLogoTicket,
    pie_ticket: configuracion.pieTicket.trim(),
    logo_url: configuracion.logoUrl.trim(),
    actualizado_en: new Date().toISOString(),
  };
}

export async function obtenerConfiguracion(): Promise<
  ConfiguracionTienda
> {
  const { data, error } = await supabase
    .from("configuracion_tienda")
    .select(campos)
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return convertirFila(data as ConfiguracionFila);
}

export async function guardarConfiguracion(
  configuracion: ConfiguracionTienda
): Promise<ConfiguracionTienda> {
  const { data, error } = await supabase
    .from("configuracion_tienda")
    .update(convertirConfiguracion(configuracion))
    .eq("id", 1)
    .select(campos)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const actualizada = convertirFila(
    data as ConfiguracionFila
  );

  localStorage.setItem(
    "configuracionTienda",
    JSON.stringify(actualizada)
  );

  return actualizada;
}