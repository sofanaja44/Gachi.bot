const axios = require("axios");
const { logger } = require("../utils/logger");

const API_BASE = "https://chocomilk.amira.us.kg/v1";

module.exports = {
  name: "instagram",
  aliases: ["ig", "igdl"],
  description: "Instagram Photo/Video Downloader",
  usage: "!instagram <link>",

  async execute(sock, msg, args) {
    const from = msg.key.remoteJid;

    try {
      // Validate input
      if (!args[0]) {
        return sock.sendMessage(from, {
          text:
            "❌ *Format Salah*\n\n" +
            "Gunakan format yang benar:\n" +
            "!instagram <link>\n\n" +
            "Contoh:\n" +
            "!instagram https://www.instagram.com/p/xxxxx\n" +
            "!instagram https://www.instagram.com/reel/xxxxx"
        });
      }

      const rawUrl = args[0];
      logger.info(`[INSTAGRAM] Raw URL: ${rawUrl}`);

      // Validate URL
      if (!isValidInstagramUrl(rawUrl)) {
        return sock.sendMessage(from, {
          text:
            "❌ *Link Tidak Valid*\n\n" +
            "Pastikan link adalah post Instagram yang valid.\n\n" +
            "Format yang diterima:\n" +
            "• https://www.instagram.com/p/xxxxx\n" +
            "• https://www.instagram.com/reel/xxxxx\n" +
            "• https://www.instagram.com/tv/xxxxx"
        });
      }

      const url = normalizeInstagramUrl(rawUrl);
      logger.info(`[INSTAGRAM] Normalized URL: ${url}`);

      // Send processing message
      await sock.sendMessage(from, {
        text: "⏳ Memproses media Instagram...\nMohon tunggu sebentar."
      });

      // Call API
      const res = await axios.get(`${API_BASE}/download/instagram`, {
        params: { url },
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        },
        timeout: 45000
      });

      if (!res.data?.success) {
        throw new Error(
          res.data?.error?.message || "API tidak mengembalikan success"
        );
      }

      const data = res.data.data;
      const media = parseMedia(data);

      logger.info(`[INSTAGRAM] Found ${media.length} media items`);

      if (!media.length) {
        throw new Error("Media tidak ditemukan");
      }

      // Send media info
      const infoText = buildInfoText(data, media);
      await sock.sendMessage(from, { text: infoText });

      // Send each media
      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        
        logger.info(`[INSTAGRAM] Downloading media ${i + 1}/${media.length}`);
        
        const buf = await axios.get(m.url, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://www.instagram.com/"
          },
          timeout: 60000
        });

        logger.success(`[INSTAGRAM] Downloaded: ${buf.data.length} bytes`);

        const caption = media.length > 1 
          ? `📸 Media ${i + 1}/${media.length}` 
          : "📸 Instagram Media";

        await sock.sendMessage(from,
          m.type === "video"
            ? { video: buf.data, mimetype: "video/mp4", caption }
            : { image: buf.data, caption }
        );

        // Delay between media to avoid spam
        if (i < media.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.success(`[INSTAGRAM] Completed successfully`);

    } catch (err) {
      logger.error("[INSTAGRAM ERROR]", err.message);

      let errorMessage = "❌ *Download Gagal*\n\n";

      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        errorMessage += "⏱️ Timeout: Server Instagram tidak merespon.\n\n";
      } else if (err.response?.status === 404) {
        errorMessage += "🔍 Post tidak ditemukan atau telah dihapus.\n\n";
      } else if (err.message.includes("private")) {
        errorMessage += "🔒 Akun atau post ini bersifat private.\n\n";
      } else if (!err.response) {
        errorMessage += "🌐 Tidak dapat terhubung ke server.\n\n";
      } else {
        errorMessage += "⚠️ Terjadi kesalahan pada server.\n\n";
      }

      errorMessage +=
        "💡 *Tips:*\n" +
        "• Pastikan post tidak private atau dihapus\n" +
        "• Coba link post lain\n" +
        "• Gunakan link dari browser (bukan dari app)\n" +
        "• Tunggu beberapa saat dan coba lagi\n\n" +
        "Ketik !menu untuk bantuan.";

      await sock.sendMessage(from, { text: errorMessage });
    }
  }
};

/* ========================================
   HELPERS
======================================== */
function isValidInstagramUrl(url) {
  const validPatterns = [
    /instagram\.com\/p\/[\w-]+/,
    /instagram\.com\/reel\/[\w-]+/,
    /instagram\.com\/tv\/[\w-]+/
  ];

  return validPatterns.some(pattern => pattern.test(url));
}

function normalizeInstagramUrl(url) {
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

function parseMedia(data) {
  const out = [];
  const m = data.media || {};

  // Multiple media (carousel)
  if (Array.isArray(m.all)) {
    m.all.forEach(i => {
      if (i.url) {
        out.push({
          url: i.url,
          type: i.type === "video" ? "video" : "image"
        });
      }
    });
  }
  // Single media fallback
  else {
    if (m.video) {
      out.push({ url: m.video, type: "video" });
    } else if (m.image) {
      out.push({ url: m.image, type: "image" });
    } else if (m.url) {
      out.push({ url: m.url, type: m.type || "image" });
    }
  }

  return out;
}

function buildInfoText(data, media) {
  let text = "📸 *Instagram Media*\n\n";

  if (data.metadata?.username) {
    text += `👤 @${data.metadata.username}\n`;
  }

  if (data.metadata?.caption) {
    const caption = data.metadata.caption.substring(0, 100);
    text += `📝 ${caption}${data.metadata.caption.length > 100 ? "..." : ""}\n`;
  }

  text += `\n🎬 Total Media: ${media.length}\n`;
  
  const videos = media.filter(m => m.type === "video").length;
  const images = media.filter(m => m.type === "image").length;
  
  if (videos > 0) text += `📹 Video: ${videos}\n`;
  if (images > 0) text += `🖼️ Foto: ${images}\n`;

  text += "\n⬇️ Mengirim media...";

  return text;
}