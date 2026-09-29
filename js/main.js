// ============================================================
// INICIALIZACIÓN
// ============================================================

db.init();
loadOrders();
appState.subscribe(() => {
  render();
  if (appState.tab === 'firmas') {
    setTimeout(initSignature, 100);
  }
});
render();
