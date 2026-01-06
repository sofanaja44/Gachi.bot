const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

// Create logs directory if not exists
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file path
const logFile = path.join(logsDir, `bot-${getDateString()}.log`);

// Colors
const colors = {
  info: chalk.cyan,
  success: chalk.green,
  warn: chalk.yellow,
  error: chalk.red,
  command: chalk.magenta,
  message: chalk.blue
};

function getTimestamp() {
  const now = new Date();
  return now.toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function getDateString() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function formatPhone(jid) {
  return jid.replace("@s.whatsapp.net", "").replace("@g.us", " (Group)");
}

function writeToFile(message) {
  const timestamp = getTimestamp();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) console.error("Failed to write log:", err);
  });
}

const logger = {
  info: (message, ...args) => {
    const msg = `${message} ${args.join(" ")}`;
    console.log(`${colors.info("ℹ")} ${colors.info(msg)}`);
    writeToFile(`[INFO] ${msg}`);
  },

  success: (message, ...args) => {
    const msg = `${message} ${args.join(" ")}`;
    console.log(`${colors.success("✓")} ${colors.success(msg)}`);
    writeToFile(`[SUCCESS] ${msg}`);
  },

  warn: (message, ...args) => {
    const msg = `${message} ${args.join(" ")}`;
    console.log(`${colors.warn("⚠")} ${colors.warn(msg)}`);
    writeToFile(`[WARN] ${msg}`);
  },

  error: (message, ...args) => {
    const msg = `${message} ${args.map(a => a.stack || a).join(" ")}`;
    console.log(`${colors.error("✗")} ${colors.error(msg)}`);
    writeToFile(`[ERROR] ${msg}`);
  },

  command: (from, command, args) => {
    const phone = formatPhone(from);
    const msg = `${phone} executed: !${command} ${args.join(" ")}`;
    console.log(`${colors.command("►")} ${colors.command(msg)}`);
    writeToFile(`[COMMAND] ${msg}`);
  },

  message: (from, text) => {
    const phone = formatPhone(from);
    const preview = text.substring(0, 50) + (text.length > 50 ? "..." : "");
    const msg = `${phone}: ${preview}`;
    console.log(`${colors.message("💬")} ${colors.message(msg)}`);
    writeToFile(`[MESSAGE] ${msg}`);
  },

  qr: () => {
    console.log(chalk.cyan.bold("\n📱 Scan QR Code di bawah ini:\n"));
  }
};

function banner() {
  console.clear();
  console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════╗
║                                               ║
║     🤖 WhatsApp Bot Multi-Downloader 🤖      ║
║                                               ║
║     Spotify • TikTok • Instagram              ║
║                                               ║
║     Version: 2.0.0                            ║
║     Author: Your Name                         ║
║                                               ║
╚═══════════════════════════════════════════════╝
  `));
  console.log(chalk.gray(`Starting at: ${getTimestamp()}\n`));
}

module.exports = { logger, banner };