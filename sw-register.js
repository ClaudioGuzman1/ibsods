// Registrador mejorado del Service Worker
if ("serviceWorker" in navigator) {
  // Detectar la ruta base
  const pathArray = window.location.pathname.split('/').filter(Boolean);
  const basePath = pathArray.length > 0 && !pathArray[0].includes('.') 
    ? '/' + pathArray[0] + '/' 
    : '/';
  
  const swPath = basePath + 'service-worker.js';
  
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swPath, { scope: basePath })
      .then(registration => {
        console.log('✅ Service Worker registrado exitosamente');
        console.log('   Ruta:', swPath);
        console.log('   Scope:', basePath);
        
        // Verificar actualizaciones cada hora
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch(error => {
        console.warn('❌ Error al registrar Service Worker:', error);
        console.warn('   Ruta intentada:', swPath);
        console.warn('   Scope:', basePath);
      });
  });
} else {
  console.warn('⚠️ Este navegador no soporta Service Workers');
}
