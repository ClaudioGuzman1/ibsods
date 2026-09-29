// ============================================================
// NUBE: editar y guardar registro
// ============================================================

async function editCloudOrder(record) {
  // Cerrar modal si estaba abierto
  const modal = document.getElementById('cloud-modal');
  if (modal) modal.style.display = 'none';

  showToast('☁️ Cargando evidencias y firmas…', '#6366f1');

  // Convertir URL pública → base64 para poder editar/mostrar en el formulario

  // Cargar imágenes de evidencias en cache temporal en memoria (no persiste en localStorage)
  window._tmpImgCache = new Map();
  const tmpImages = { inicial: [], mediciones: [], instalacion: [], extras: [] };
  for (const cat of ['inicial', 'mediciones', 'instalacion', 'extras']) {
    const items = record.imagenes?.[cat] || [];
    for (const item of items) {
      if (!item.url) continue;
      const b64 = await urlToBase64(item.url);
      if (!b64) continue;
      const tmpId = 'tmp_' + cat + '_' + item.orden + '_' + Date.now() + '_' + Math.random();
      window._tmpImgCache.set(tmpId, b64);
      tmpImages[cat].push(tmpId);
    }
  }

  // Cargar firmas existentes
  let firmaCliente   = null;
  let firmaIngeniero = null;
  if (record.firma_cliente)   firmaCliente   = await urlToBase64(record.firma_cliente);
  if (record.firma_ingeniero) firmaIngeniero = await urlToBase64(record.firma_ingeniero);

  // Mapear snake_case → camelCase igual que printCloudPDF_ODS
  const order = {
    id:               null,   // no tiene id local; se guarda en cloudEditId
    numeroTicket:     record.numero_ticket     || '',
    fechaAtencion:    record.fecha_atencion    || '',
    fechaCreacion:    record.fecha_creacion    || '',
    ingeniero:        record.ingeniero         || '',
    tipoServicio:     record.tipo_servicio     || '',
    incidencia:       record.incidencia        || '',
    cliente:          record.cliente           || '',
    ubicacion:        record.ubicacion         || '',
    direccion:        record.direccion         || '',
    contacto:         record.contacto          || '',
    cargo:            record.cargo             || '',
    telefono:         record.telefono          || '',
    correo:           record.correo            || '',
    nombreTerminal:   record.nombre_terminal   || '',
    solicitaTerminal: record.solicita_terminal || false,
    modeloTerminal:   record.modelo_terminal   || '',
    serieRetirada:    record.serie_retirada    || '',
    macRetirada:      record.mac_retirada      || '',
    fallaRetirada:    record.falla_retirada    || '',
    serieInstalada:   record.serie_instalada   || '',
    macInstalada:     record.mac_instalada     || '',
    solucion:         record.solucion          || '',
    comentario:       record.comentario        || '',
    // Entregas: puede ser array directo o null
    entregas: Array.isArray(record.entregas)
      ? { materiales: record.entregas }
      : (record.entregas && Array.isArray(record.entregas.materiales)
          ? record.entregas
          : { materiales: [] }),
    images:           tmpImages,
    firmaCliente:     firmaCliente,
    firmaIngeniero:   firmaIngeniero,
  };

  appState.setState({
    currentOrder: order,
    cloudEditId:  record.id,
    view:         'form',
    tab:          'general'
  });
}

async function saveCloudOrder() {
  const order = appState.currentOrder;
  const cloudId = appState.cloudEditId;
  if (!cloudId) { showToast('⚠️ No hay registro de nube activo', '#ef4444'); return; }

  const SUPABASE_URL = window._SUPA_URL;
  const SUPABASE_KEY = window._SUPA_KEY;
  const BUCKET_NAME  = window._SUPA_BUCKET;

  // Helper: subir un archivo base64 a Supabase Storage y devolver URL pública

  try {
    showToast('☁️ Subiendo evidencias y firmas…', '#3b82f6');

    const ticketSlug = (order.numeroTicket || cloudId || Date.now()).toString().replace(/\s+/g, '_');
    const prefix      = `ods/${ticketSlug}`;

    // ── 1. Subir imágenes de evidencias vigentes (nuevas y ya existentes) ──
    async function subirCategoria(categoria) {
      const ids = order.images?.[categoria] || [];
      const urls = [];
      for (let i = 0; i < ids.length; i++) {
        const base64 = db.getImage(ids[i]);
        if (!base64) continue;
        const ext  = base64.startsWith('data:image/png') ? 'png' : 'jpg';
        const path = `${prefix}/${categoria}_${i + 1}.${ext}`;
        const url  = await supabaseUploadImage(base64, path);
        urls.push({ orden: i + 1, url });
      }
      return urls;
    }

    const [urlsInicial, urlsMediciones, urlsInstalacion, urlsExtras] = await Promise.all([
      subirCategoria('inicial'),
      subirCategoria('mediciones'),
      subirCategoria('instalacion'),
      subirCategoria('extras')
    ]);

    // ── 2. Subir firmas vigentes ─────────────────────────────────────
    let urlFirmaCliente   = null;
    let urlFirmaIngeniero = null;
    if (order.firmaCliente) {
      urlFirmaCliente = await supabaseUploadImage(order.firmaCliente, `${prefix}/firma_cliente.png`);
    }
    if (order.firmaIngeniero) {
      urlFirmaIngeniero = await supabaseUploadImage(order.firmaIngeniero, `${prefix}/firma_ingeniero.png`);
    }

    const payload = {
      // Generales
      numero_ticket:     order.numeroTicket  || null,
      fecha_atencion:    order.fechaAtencion || null,
      fecha_creacion:    order.fechaCreacion || null,
      ingeniero:         order.ingeniero     || null,
      tipo_servicio:     order.tipoServicio  || null,
      incidencia:        order.incidencia    || null,
      // Cliente / Sitio
      cliente:           order.cliente       || null,
      ubicacion:         order.ubicacion     || null,
      direccion:         order.direccion     || null,
      contacto:          order.contacto      || null,
      cargo:             order.cargo         || null,
      telefono:          order.telefono      || null,
      correo:            order.correo        || null,
      // Terminal
      nombre_terminal:   order.nombreTerminal   || null,
      solicita_terminal: order.solicitaTerminal  || false,
      modelo_terminal:   order.modeloTerminal    || null,
      // Retirada / Instalada
      serie_retirada:    order.serieRetirada  || null,
      mac_retirada:      order.macRetirada    || null,
      falla_retirada:    order.fallaRetirada  || null,
      serie_instalada:   order.serieInstalada || null,
      mac_instalada:     order.macInstalada   || null,
      // Solución
      solucion:          order.solucion    || null,
      comentario:        order.comentario  || null,
      // Entregas
      entregas: order.entregas && Array.isArray(order.entregas.materiales)
        ? order.entregas.materiales : [],
      // Evidencias (URLs públicas de Storage)
      imagenes: {
        inicial:     urlsInicial,
        mediciones:  urlsMediciones,
        instalacion: urlsInstalacion,
        extras:      urlsExtras
      },
      total_imagenes: urlsInicial.length + urlsMediciones.length +
                      urlsInstalacion.length + urlsExtras.length,
      // Firmas (URLs públicas de Storage)
      firma_cliente:         urlFirmaCliente,
      firma_ingeniero:       urlFirmaIngeniero,
      tiene_firma_cliente:   !!urlFirmaCliente,
      tiene_firma_ingeniero: !!urlFirmaIngeniero
    };

    showToast('☁️ Guardando en la Nube…', '#6366f1');
    const res = await cloudFetch(`/rest/v1/ods?id=eq.${cloudId}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    showToast('✅ Registro actualizado en la Nube');
    window._tmpImgCache = new Map();
    appState.setState({ cloudEditId: null, view: 'supabase' });
    await loadCloudOrders();
    render();
  } catch (err) {
    console.error('❌ Error al guardar en la Nube:', err);
    showToast('⚠️ Error al guardar: ' + err.message, '#ef4444');
  }
}
