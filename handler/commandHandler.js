const fs = require("fs");
const path = require("path");
const { logger } = require("../utils/logger");
const { RateLimiter } = require("../utils/rateLimiter");

const COMMAND_PREFIX = "!";

// Rate limiter: 50 requests per 30 minutes
const rateLimiter = new RateLimiter(50, 30 * 60 * 1000);

// Load all commands
const commands = new Map();
const commandFiles = fs
  .readdirSync(path.join(__dirname, "../commands"))
  .filter(file => file.endsWith(".js"));

logger.info(`Loading ${commandFiles.length} commands...`);

for (const file of commandFiles) {
  try {
    const cmd = require(`../commands/${file}`);
    commands.set(cmd.name, cmd);

    if (Array.isArray(cmd.aliases)) {
      cmd.aliases.forEach(alias => {
        commands.set(alias, cmd);
      });
    }

    logger.success(`Loaded command: ${cmd.name}`);
  } catch (err) {
    logger.error(`Failed to load command ${file}:`, err);
  }
}

async function handleCommand(sock, msg) {
  try {
    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (!text) return;
    if (!text.startsWith(COMMAND_PREFIX)) return;

    // Parse command
    const args = text.slice(COMMAND_PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    // Check if command exists
    const command = commands.get(commandName);
    if (!command) {
      return sock.sendMessage(from, {
        text: `Command !${commandName} tidak ditemukan.\nKetik !menu untuk melihat daftar command.`
      });
    }

    // Log command
    logger.command(from, commandName, args);

    // Rate limiting check
    const userId = from;
    if (!rateLimiter.canMakeRequest(userId)) {
      const resetTime = rateLimiter.getResetTime(userId);
      const minutesLeft = Math.ceil(resetTime / 60000);
      
      logger.warn(`Rate limit exceeded for ${userId}`);
      
      return sock.sendMessage(from, {
        text: 
          "⚠️ *Rate Limit Exceeded*\n\n" +
          `Anda telah mencapai batas maksimal penggunaan (50 command per 30 menit).\n\n` +
          `Coba lagi dalam ${minutesLeft} menit.`
      });
    }

    // Show typing indicator
    await sock.sendPresenceUpdate("composing", from);

    // Execute command
    await command.execute(sock, msg, args);

    // Stop typing
    await sock.sendPresenceUpdate("paused", from);

  } catch (err) {
    logger.error("[COMMAND HANDLER ERROR]", err);
    
    // Send error message to user
    const from = msg.key.remoteJid;
    await sock.sendMessage(from, {
      text: "❌ Terjadi kesalahan saat memproses command. Silakan coba lagi."
    });
  }
}

module.exports = { handleCommand };