const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const Pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const { handleCommand } = require("./handler/commandHandler");
const { logger, banner } = require("./utils/logger");

let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const SESSION_PATH = "./session";

// Function to clear session
function clearSession() {
  try {
    if (fs.existsSync(SESSION_PATH)) {
      fs.rmSync(SESSION_PATH, { recursive: true, force: true });
      logger.warn("Session folder cleared");
      return true;
    }
  } catch (err) {
    logger.error("Failed to clear session:", err);
    return false;
  }
}

// Function to check if session is valid
function isSessionValid() {
  const credsPath = path.join(SESSION_PATH, "creds.json");
  
  if (!fs.existsSync(credsPath)) {
    return false;
  }

  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, "utf-8"));
    // Check if essential credentials exist
    return !!(creds.noiseKey && creds.signedIdentityKey && creds.signedPreKey);
  } catch {
    return false;
  }
}

async function startBot() {
  try {
    // Show banner only on first start
    if (reconnectAttempts === 0) {
      banner();
    }
    
    logger.info("Initializing WhatsApp Bot...");

    // Check session validity
    if (fs.existsSync(SESSION_PATH) && !isSessionValid()) {
      logger.warn("Detected invalid/corrupt session, clearing...");
      clearSession();
    }

    // Get latest Baileys version
    const { version } = await fetchLatestBaileysVersion();
    logger.info(`Using Baileys v${version.join(".")}`);

    // AUTH SESSION
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
    
    const hasSession = fs.existsSync(path.join(SESSION_PATH, "creds.json"));
    if (hasSession) {
      logger.info("Existing session found, attempting to connect...");
    } else {
      logger.info("No session found, please scan QR code");
    }

    // CREATE SOCKET with optimized settings
    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "silent" }))
      },
      logger: Pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: ["WhatsApp Bot", "Chrome", "1.0.0"],
      markOnlineOnConnect: true,
      getMessage: async (key) => {
        return { conversation: "" };
      },
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
      defaultQueryTimeoutMs: 60000
    });

    // SAVE CREDS
    sock.ev.on("creds.update", saveCreds);

    // CONNECTION HANDLER
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // SHOW QR
      if (qr) {
        logger.qr();
        console.log("\n");
        qrcode.generate(qr, { small: true });
        console.log("\n⚡ Scan QR code above to login\n");
      }

      if (connection === "open") {
        logger.success("Bot WhatsApp connected successfully!");
        logger.info("Bot is ready to receive commands");
        isReconnecting = false;
        reconnectAttempts = 0;
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.output?.payload?.error;

        logger.error(`Connection closed. Status: ${statusCode} | Reason: ${reason || "Unknown"}`);

        // Handle specific error codes
        if (statusCode === DisconnectReason.loggedOut) {
          logger.error("Device logged out. Clearing session...");
          clearSession();
          logger.info("Please restart the bot to scan QR code again");
          process.exit(0);
        } 
        else if (statusCode === 405 || statusCode === 401 || statusCode === 403) {
          // Bad session, invalid auth, or forbidden
          logger.warn("Invalid session detected (Error 405/401/403). Clearing session...");
          clearSession();
          
          if (!isReconnecting) {
            isReconnecting = true;
            logger.info("Restarting with fresh session in 3s...");
            setTimeout(() => {
              isReconnecting = false;
              reconnectAttempts = 0;
              startBot();
            }, 3000);
          }
        }
        else if (statusCode === DisconnectReason.connectionClosed ||
                 statusCode === DisconnectReason.connectionLost ||
                 statusCode === DisconnectReason.connectionReplaced ||
                 statusCode === DisconnectReason.timedOut ||
                 statusCode === DisconnectReason.restartRequired) {
          
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !isReconnecting) {
            isReconnecting = true;
            reconnectAttempts++;
            
            const delay = Math.min(5000 * reconnectAttempts, 15000);
            logger.warn(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay/1000}s...`);
            
            setTimeout(() => {
              isReconnecting = false;
              startBot();
            }, delay);
          } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            logger.error("Max reconnection attempts reached.");
            logger.info("Clearing session and restarting...");
            clearSession();
            reconnectAttempts = 0;
            setTimeout(() => startBot(), 3000);
          }
        }
        else {
          // Unknown error - try to reconnect
          logger.warn("Unknown disconnection reason, clearing session...");
          clearSession();
          
          if (!isReconnecting) {
            isReconnecting = true;
            setTimeout(() => {
              isReconnecting = false;
              reconnectAttempts = 0;
              startBot();
            }, 5000);
          }
        }
      }
    });

    // MESSAGE LISTENER
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      // Only handle new messages
      if (type !== "notify") return;

      const msg = messages[0];
      
      // Ignore empty messages
      if (!msg.message) return;
      
      // Ignore own messages
      if (msg.key.fromMe) return;

      // Ignore broadcast messages
      if (msg.key.remoteJid === "status@broadcast") return;

      try {
        // Get message text from various message types
        const text = 
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          "";
        
        const from = msg.key.remoteJid;
        
        // Log incoming message
        if (text) {
          logger.message(from, text);
        }

        // Handle command
        await handleCommand(sock, msg);
      } catch (err) {
        logger.error("Error processing message:", err);
      }
    });

    // ERROR HANDLER
    sock.ev.on("error", (err) => {
      logger.error("Socket error:", err);
    });

    return sock;

  } catch (err) {
    logger.error("Failed to start bot:", err);
    
    // Clear session on startup error
    if (err.message?.includes("401") || err.message?.includes("405")) {
      logger.warn("Auth error detected, clearing session...");
      clearSession();
    }
    
    if (!isReconnecting) {
      isReconnecting = true;
      logger.warn("Retrying in 5s...");
      setTimeout(() => {
        isReconnecting = false;
        reconnectAttempts = 0;
        startBot();
      }, 5000);
    }
  }
}

// Handle process errors
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down gracefully...");
  process.exit(0);
});

// START BOT
startBot();