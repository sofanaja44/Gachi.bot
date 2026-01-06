const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const Pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const { handleCommand } = require("./handler/commandHandler");
const { logger, banner } = require("./utils/logger");

const SESSION_PATH = "./session";

async function connectToWhatsApp() {
  // Load auth state
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

  // Fetch latest version (penting untuk compatibility)
  const { version, isLatest } = await fetchLatestBaileysVersion();
  
  console.log(`📦 Baileys Version: ${version.join(".")}`);
  console.log(`✅ Is Latest: ${isLatest}\n`);

  // Create socket - MINIMAL CONFIG
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: Pino({ level: "silent" }),
    // Hapus semua config advanced yang bisa bikin konflik
    browser: ["Chrome (Linux)", "", ""]
  });

  // Save credentials
  sock.ev.on("creds.update", saveCreds);

  // Connection updates
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n╔════════════════════════════════╗");
      console.log("║   📱 SCAN QR CODE SEKARANG!    ║");
      console.log("╚════════════════════════════════╝\n");
      qrcode.generate(qr, { small: true });
      console.log("");
    }

    if (connection === "open") {
      console.log("\n✅ CONNECTED!\n");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`\n❌ Disconnected: ${statusCode}\n`);

      if (statusCode === DisconnectReason.loggedOut) {
        console.log("⚠️  LOGGED OUT - Hapus folder 'session' dan restart\n");
        process.exit(0);
      }

      if (shouldReconnect) {
        console.log("🔄 Reconnecting in 3s...\n");
        setTimeout(() => connectToWhatsApp(), 3000);
      }
    }
  });

  // Messages
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      "";

    if (text) {
      console.log(`📩 ${m.pushName}: ${text.substring(0, 50)}`);
    }

    try {
      await handleCommand(sock, m);
    } catch (err) {
      console.error("Handler error:", err.message);
    }
  });

  return sock;
}

// Clear banner
console.clear();
banner();

// Start
connectToWhatsApp().catch(console.error);