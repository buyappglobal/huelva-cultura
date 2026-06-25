const { chromium } = require('@playwright/test');

async function runTest() {
  const targetClientId = '3lxYOIcAPObwLVbssVk3AMoS8uk2';

  console.log("🚀 Iniciando navegador virtual (Chromium)...");
  const browser = await chromium.launch({ 
    headless: false, // false para ver visualmente lo que hace el agente
    slowMo: 1000     // velocidad lenta para ver clics
  }); 
  const context = await browser.newContext();

  const adminPage = await context.newPage();
  const tvPage = await context.newPage();

  // Escuchar logs y errores de la consola del Admin
  adminPage.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`\n🔴 [ERROR CONSOLA ADMIN]: ${msg.text()}`);
    } else {
      console.log(`[Admin Logs]: ${msg.text()}`);
    }
  });

  // Escuchar consola de la TV en tiempo real
  tvPage.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`\n🚨 [ERROR CONSOLA TV]: ${msg.text()}`);
    } else {
      console.log(`[TV Logs]: ${msg.text()}`);
    }
  });

  console.log("🔒 Accediendo al dominio para inyectar bypass de desarrollo...");
  await adminPage.goto('https://aura-business.pages.dev/admin/login');

  // Inyectar localstorage para saltarse el Login de Google
  await adminPage.evaluate(() => {
    localStorage.setItem('aura_dev_bypass', 'true');
  });

  console.log(`🔑 Entrando al Panel del Administrador impersonando al cliente: ${targetClientId}...`);
  await adminPage.goto(`https://aura-business.pages.dev/admin?uid=${targetClientId}`);

  console.log("⏳ Esperando carga del Panel de Control...");
  try {
    // Esperar a que los botones del menú de tabs estén visibles para asegurar la carga
    await adminPage.waitForSelector('button:has-text("Ajustes")', { timeout: 15000 });
    console.log("✅ ¡Sesión iniciada con éxito mediante Bypass de Desarrollo!");
  } catch (e) {
    console.error("❌ No se pudo cargar el panel de control.");
    await browser.close();
    process.exit(1);
  }

  console.log("📺 Abriendo la pantalla de TV de forma directa...");
  await tvPage.goto(`https://aura-business.pages.dev/tv?id=${targetClientId}`);
  await tvPage.waitForLoadState();
  console.log("📺 Pantalla de TV cargada.");

  // Esperar que la TV y el Admin sincronicen
  await tvPage.waitForTimeout(5000);

  // --- Pruebas de Interacción ---
  console.log("\n--- 🏁 INICIANDO PRUEBAS DE INTERACCIÓN ---");

  // 1. Forzar Modo Sunset (Tarde)
  console.log("\n⚡ 1. Probando forzar '🌅 Tarde' en el mando...");
  await adminPage.click('button:has-text("Tarde")');
  console.log("⏳ Esperando reacción en la TV...");
  await tvPage.waitForTimeout(5000);

  // 1b. Volver a Modo Auto
  console.log("\n⚡ 1b. Probando volver a Modo 'Auto' en el mando...");
  await adminPage.click('button:has-text("Auto")');
  console.log("⏳ Esperando reacción...");
  await tvPage.waitForTimeout(3000);

  // 2. Activar Modo Zen
  console.log("\n⚡ 2. Probando alternar 'Zen Mode'...");
  // Hacemos clic en el botón interruptor que está justo al lado del texto "Zen Mode"
  await adminPage.click('span:has-text("Zen Mode") + button');
  console.log("⏳ Esperando reacción en la TV...");
  await tvPage.waitForTimeout(4000);

  // Desactivar Modo Zen
  console.log("\n⚡ 3. Desactivando 'Zen Mode'...");
  await adminPage.click('span:has-text("Zen Mode") + button');
  console.log("⏳ Esperando reacción en la TV...");
  await tvPage.waitForTimeout(4000);

  console.log("\n--- 🎉 PRUEBAS COMPLETADAS ---");
  console.log("Cerrando el entorno de pruebas en 5 segundos...");
  await adminPage.waitForTimeout(5000);
  await browser.close();
}

runTest().catch(console.error);
