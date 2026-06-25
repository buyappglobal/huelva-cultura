export function generateContractHTML(email: string, slug: string, city: string, dni: string = '', address: string = '') {
  const dateStr = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Contrato de Servicio - Aura Business</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          margin: 40px;
          font-size: 13px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 2px solid #a855f7;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 4px;
          color: #111;
        }
        .subtitle {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-top: 5px;
        }
        h2 {
          text-align: center;
          text-transform: uppercase;
          font-size: 16px;
          margin-bottom: 30px;
        }
        .section-title {
          font-weight: bold;
          margin-top: 20px;
          text-transform: uppercase;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .details-table td {
          padding: 8px;
          border: 1px solid #ddd;
        }
        .details-table td.label {
          font-weight: bold;
          background-color: #f9f9f9;
          width: 30%;
        }
        .signatures {
          margin-top: 60px;
          display: flex;
          justify-content: space-between;
        }
        .signature-box {
          width: 45%;
          text-align: center;
          border-top: 1px solid #333;
          padding-top: 10px;
        }
        @media print {
          body { margin: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">AURA BUSINESS</div>
        <div class="subtitle">Sensory Playout & Signage System</div>
      </div>

      <h2>Contrato de Prestación de Servicios de Cartelería Digital</h2>

      <p>En Madrid, a ${dateStr}.</p>

      <p><strong>REUNIDOS:</strong></p>
      <p>De una parte, <strong>AURA SENSORY PLAYOUT S.L.</strong>, con domicilio social en Madrid, España, en adelante el <strong>Prestador</strong>.</p>
      <p>Y de otra parte, el cliente registrado en el sistema Aura con los siguientes datos identificativos (en adelante, el <strong>Cliente</strong>):</p>

      <table class="details-table">
        <tr>
          <td class="label">Código de Cuenta (ID)</td>
          <td><strong>${slug.toUpperCase()}</strong></td>
        </tr>
        <tr>
          <td class="label">Email del Administrador</td>
          <td>${email}</td>
        </tr>
        ${dni ? `<tr><td class="label">NIF / CIF</td><td><strong>${dni.toUpperCase()}</strong></td></tr>` : ''}
        ${address ? `<tr><td class="label">Dirección Fiscal</td><td>${address}</td></tr>` : ''}
        <tr>
          <td class="label">Ubicación / Ciudad</td>
          <td>${city || 'No especificada'}</td>
        </tr>
        <tr>
          <td class="label">Fecha de Alta</td>
          <td>${dateStr}</td>
        </tr>
      </table>

      <p>Ambas partes se reconocen mutuamente capacidad legal suficiente para obligarse y suscribir el presente documento, a cuyo efecto:</p>

      <div class="section-title">1. Objeto del Contrato</div>
      <p>El Prestador otorga al Cliente una licencia de uso no exclusiva, intransferible y temporal del software Aura Sensory Playout System para la reproducción de música reactiva, contenido visual circadiano y cartelería digital publicitaria.</p>

      <div class="section-title">2. Duración</div>
      <p>El presente acuerdo tendrá una vigencia anual (12 meses) desde la fecha de firma del presente documento, renovable automáticamente por periodos iguales salvo manifestación expresa en contrario con 30 días de antelación.</p>

      <div class="section-title">3. Obligaciones y Soporte</div>
      <p>El Prestador se compromete a garantizar la disponibilidad del servicio del portal de administración y la reproducción óptima en Smart TVs homologadas. El Cliente es responsable de mantener la conexión a internet activa y de proveer el hardware necesario para la emisión del playout.</p>

      <div class="section-title">4. Tratamiento de Datos</div>
      <p>Las partes cumplen rigurosamente con la normativa vigente en protección de datos de carácter personal (RGPD). Los datos del Cliente se procesan de forma confidencial única y exclusivamente para la correcta prestación del servicio de playout.</p>

      <div class="signatures">
        <div class="signature-box">
          <strong>Por el Prestador</strong><br>
          Aura Sensory Playout S.L.<br>
          Fdo. Representante Legal
        </div>
        <div class="signature-box">
          <strong>Por el Cliente</strong><br>
          Código Cuenta: ${slug.toUpperCase()}<br>
          Fdo. Administrador del Local
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;
}

export function generateInvoiceHTML(email: string, slug: string, city: string, dni: string = '', address: string = '') {
  const dateStr = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });
  const invoiceNumber = `AUR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Factura ${invoiceNumber} - Aura Business</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          margin: 40px;
          font-size: 13px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #a855f7;
          padding-bottom: 20px;
          margin-bottom: 40px;
        }
        .logo-box {
          text-align: left;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 4px;
          color: #111;
        }
        .subtitle {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .invoice-details {
          text-align: right;
        }
        .invoice-details h2 {
          margin: 0;
          color: #a855f7;
          font-size: 20px;
        }
        .addresses {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .address-box {
          width: 45%;
        }
        .address-box h3 {
          margin-top: 0;
          font-size: 12px;
          text-transform: uppercase;
          color: #666;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .item-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
        }
        .item-table th {
          background-color: #f9f9f9;
          font-weight: bold;
          text-align: left;
          padding: 10px;
          border-bottom: 2px solid #ddd;
        }
        .item-table td {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        .totals {
          margin-left: auto;
          width: 40%;
        }
        .totals-table {
          width: 100%;
          border-collapse: collapse;
        }
        .totals-table td {
          padding: 8px;
          text-align: right;
        }
        .totals-table td.label {
          font-weight: bold;
        }
        .totals-table tr.grand-total {
          border-top: 2px solid #a855f7;
          font-size: 15px;
          font-weight: bold;
        }
        .footer {
          margin-top: 60px;
          text-align: center;
          color: #999;
          font-size: 10px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-box">
          <div class="logo">AURA BUSINESS</div>
          <div class="subtitle">Sensory Playout System</div>
        </div>
        <div class="invoice-details">
          <h2>FACTURA</h2>
          <p><strong>Nº Factura:</strong> ${invoiceNumber}<br>
          <strong>Fecha:</strong> ${dateStr}<br>
          <strong>ID Cliente:</strong> ${slug.toUpperCase()}</p>
        </div>
      </div>

      <div class="addresses">
        <div class="address-box">
          <h3>Emisor</h3>
          <p><strong>AURA SENSORY PLAYOUT S.L.</strong><br>
          NIF: B-88776655<br>
          Paseo de la Castellana 95<br>
          28046 Madrid, España<br>
          Email: facturas@aurabusiness.es</p>
        </div>
        <div class="address-box">
          <h3>Cliente</h3>
          <p><strong>Código de Cuenta:</strong> ${slug.toUpperCase()}<br>
          <strong>Email:</strong> ${email}<br>
          ${dni ? `<strong>NIF / CIF:</strong> ${dni.toUpperCase()}<br>` : ''}
          ${address ? `<strong>Dirección:</strong> ${address}<br>` : ''}
          <strong>Ubicación:</strong> ${city || 'No especificada'}</p>
        </div>
      </div>

      <table class="item-table">
        <thead>
          <tr>
            <th>Concepto / Descripción</th>
            <th style="text-align: right; width: 15%;">Cantidad</th>
            <th style="text-align: right; width: 20%;">Precio Unitario</th>
            <th style="text-align: right; width: 20%;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Suscripción Anual Aura sensory playout</strong><br>
              <span style="color: #666; font-size: 11px;">Licencia de cartelería digital, playout musical circadiano y control remoto de Smart TV.</span>
            </td>
            <td style="text-align: right;">1</td>
            <td style="text-align: right;">499,00 €</td>
            <td style="text-align: right;">499,00 €</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <table class="totals-table">
          <tr>
            <td class="label">Base Imponible:</td>
            <td>499,00 €</td>
          </tr>
          <tr>
            <td class="label">IVA (21%):</td>
            <td>104,79 €</td>
          </tr>
          <tr class="grand-total">
            <td class="label">Total Factura:</td>
            <td>603,79 €</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p>Gracias por confiar en Aura Business. El pago se girará según las condiciones comerciales acordadas.<br>
        AURA SENSORY PLAYOUT S.L. - Inscrita en el Registro Mercantil de Madrid.</p>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;
}
