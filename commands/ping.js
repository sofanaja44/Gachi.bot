module.exports = {
  name: "ping",
  description: "Cek status bot dan kecepatan respon",
  usage: "!ping",

  async execute(sock, msg, args) {
    const from = msg.key.remoteJid;
    const start = Date.now();

    await sock.sendMessage(from, {
      text: "🏓 Pong! Mengukur kecepatan..."
    });

    const latency = Date.now() - start;
    const uptime = process.uptime();
    
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const responseText = `
🤖 *Status Bot*

✅ Status: Online & Aktif
⚡ Latency: ${latency}ms
⏱️ Uptime: ${hours}j ${minutes}m ${seconds}d

📊 *System Info*
💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB
🔧 Node.js: ${process.version}
📦 Platform: ${process.platform}

Bot berjalan dengan lancar! 🚀
    `.trim();

    await sock.sendMessage(from, {
      text: responseText
    });
  }
};