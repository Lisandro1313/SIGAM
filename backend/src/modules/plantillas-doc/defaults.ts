export interface PlantillaDefault {
  titulo: string;
  descripcion: string;
  categoria: string;
  contenido: string;
  icono: string;
  color: string;
}

export const PLANTILLAS_DEFAULT: PlantillaDefault[] = [
  {
    titulo: 'Lista de retiro mensual',
    descripcion: 'Planilla con beneficiarios lista para llevar a campo y firmar al momento del retiro.',
    categoria: 'Operativo',
    icono: 'list',
    color: '#1976d2',
    contenido: `
<h1>Lista de retiro mensual</h1>
<div class="small">Programa: _____________________ &nbsp;&nbsp; Mes: _____________________</div>
{{LISTA_SELECCIONADOS}}
<div class="small" style="margin-top:14px;">Usuario: {{USUARIO}}</div>
<div style="margin-top:32px;">
  <div class="firma-box">Responsable de entrega</div>
  &nbsp;&nbsp;&nbsp;
  <div class="firma-box">Responsable del depósito</div>
</div>
`.trim(),
  },
  {
    titulo: 'Acta de entrega individual',
    descripcion: 'Comprobante imprimible de entrega para casos particulares o entregas fuera de cronograma.',
    categoria: 'Remitos',
    icono: 'receipt',
    color: '#43a047',
    contenido: `
<h1>Acta de entrega de mercadería</h1>
<p>En la ciudad de La Plata, a los <b>____</b> días del mes de <b>______________</b> del año <b>______</b>,
se realiza la entrega de mercadería al beneficiario detallado a continuación:</p>

<h2>Datos del beneficiario / espacio</h2>
<table>
  <tr><th style="width:30%;">Nombre</th><td></td></tr>
  <tr><th>Tipo</th><td>☐ Espacio &nbsp;&nbsp; ☐ Comedor &nbsp;&nbsp; ☐ Caso particular</td></tr>
  <tr><th>Dirección</th><td></td></tr>
  <tr><th>Responsable del retiro</th><td></td></tr>
  <tr><th>DNI</th><td></td></tr>
  <tr><th>Programa</th><td></td></tr>
</table>

<h2>Detalle de la entrega</h2>
<table>
  <thead>
    <tr><th>Artículo</th><th style="width:80px;">Cantidad</th><th style="width:80px;">Peso (kg)</th></tr>
  </thead>
  <tbody>
    <tr><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td></tr>
  </tbody>
</table>

<h2>Observaciones</h2>
<div class="obs"></div>

<div style="margin-top:32px;">
  <div class="firma-box">Firma del responsable</div>
  &nbsp;&nbsp;&nbsp;
  <div class="firma-box">Firma de quien entrega</div>
</div>
`.trim(),
  },
  {
    titulo: 'Planilla de relevamiento de espacio',
    descripcion: 'Para visitas a espacios y comedores: población asistida, infraestructura, modalidad y necesidades.',
    categoria: 'Beneficiarios',
    icono: 'restaurant',
    color: '#fb8c00',
    contenido: `
<h1>Planilla de relevamiento de espacio</h1>
<div class="small">Para uso en territorio por nutricionistas / trabajadoras sociales</div>

<h2>Datos generales</h2>
<table>
  <tr><th style="width:30%;">Nombre del espacio</th><td></td></tr>
  <tr><th>Dirección</th><td></td></tr>
  <tr><th>Localidad / barrio</th><td></td></tr>
  <tr><th>Responsable</th><td></td></tr>
  <tr><th>Teléfono de contacto</th><td></td></tr>
  <tr><th>Fecha de visita</th><td></td></tr>
</table>

<h2>Población asistida</h2>
<table>
  <tr><th>Niños 0-5</th><th>Niños 6-12</th><th>Adolescentes</th><th>Adultos</th><th>Total</th></tr>
  <tr><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<h2>Modalidad e infraestructura</h2>
<p>
  Modalidad: ☐ Retiran alimentos &nbsp;&nbsp; ☐ Comen en el lugar &nbsp;&nbsp; ☐ Mixto<br/>
  Tiene cocina: ☐ Sí ☐ No &nbsp;&nbsp; Agua potable: ☐ Sí ☐ No &nbsp;&nbsp; Heladera: ☐ Sí ☐ No
</p>

<h2>Estado general y necesidades</h2>
<p>Estado general: ☐ Bueno ☐ Regular ☐ Malo</p>
<div class="obs"></div>

<h2>Asistencias especiales detectadas</h2>
<p>☐ Celiaquía &nbsp;&nbsp; ☐ Diabetes &nbsp;&nbsp; ☐ Discapacidad &nbsp;&nbsp; ☐ Otro: _______________</p>

<div style="margin-top:32px;">
  <div class="firma-box">Firma del relevador</div>
</div>
`.trim(),
  },
  {
    titulo: 'Carta de solicitud de asistencia',
    descripcion: 'Modelo para que el solicitante presente formalmente el pedido de incorporación al programa.',
    categoria: 'Beneficiarios',
    icono: 'mail',
    color: '#8e24aa',
    contenido: `
<h1>Solicitud de asistencia alimentaria</h1>
<p style="margin-top:24px;">La Plata, ____ de ______________ de _______.</p>
<p style="margin-top:18px;">A la Secretaría de Desarrollo Social<br/>Dirección de Política Alimentaria<br/>S / D</p>

<p style="margin-top:24px; line-height:1.7;">
  Por medio de la presente, quien suscribe <b>_____________________________________________</b>,
  DNI N° <b>____________________</b>, con domicilio en <b>__________________________________</b>,
  barrio/localidad <b>____________________</b>, teléfono <b>____________________</b>,
  solicita ser incorporado/a como beneficiario/a del programa de asistencia alimentaria municipal
  por los siguientes motivos:
</p>
<div class="obs" style="min-height:120px;"></div>

<p style="margin-top:18px;">Composición del grupo familiar:</p>
<table>
  <thead><tr><th>Nombre</th><th>DNI</th><th>Edad</th><th>Vínculo</th></tr></thead>
  <tbody>
    <tr><td></td><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td><td></td></tr>
  </tbody>
</table>

<p style="margin-top:24px;">Sin otro particular, saluda atentamente.</p>

<div style="margin-top:48px;">
  <div class="firma-box">Firma del solicitante</div>
</div>
`.trim(),
  },
  {
    titulo: 'Planilla de rendición',
    descripcion: 'Planilla con espacios seleccionados lista para rendir: kg, fechas, firmas.',
    categoria: 'Remitos',
    icono: 'inventory',
    color: '#00897b',
    contenido: `
<h1>Rendición — Detalle de entregas</h1>
<div class="small">Período: del ____/____/____ al ____/____/____</div>

{{LISTA_SELECCIONADOS}}

<h2 style="margin-top:24px;">Resumen</h2>
<table>
  <tr><th>Total espacios atendidos</th><td>{{CANTIDAD_SELECCIONADOS}}</td></tr>
  <tr><th>Total kg distribuidos</th><td></td></tr>
  <tr><th>Observaciones</th><td><div class="obs" style="border:none;"></div></td></tr>
</table>

<div style="margin-top:48px;">
  <div class="firma-box">Responsable de programa</div>
  &nbsp;&nbsp;&nbsp;
  <div class="firma-box">Director/a</div>
</div>
`.trim(),
  },
];
