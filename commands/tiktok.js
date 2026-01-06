const axios = require("axios");
const { logger } = require("../utils/logger");

const API_URL = "https://chocomilk.amira.us.kg/v1/download/tiktok";

module.exports = {
  name: "tiktok",
  aliases: ["tt"],
  description: "TikTok Video Downloader (No Watermark)",
  usage: "!tiktok <link>",

  async execute(sock, msg, args) {
    const from = msg.key.remoteJid;

    try {
      // Validate input
      if (!args[0]) {
        return sock.sendMessage(from, {
          text:
            "❌ *Format Salah*\n\n" +
            "Gunakan format yang benar:\n" +
            "!tiktok <link>\n\n" +
            "Contoh:\n" +
            "!tiktok https://vt.tiktok.com/xxxxx\n" +
            "!tiktok https://www.tiktok.com/@user/video/xxxxx"
        });
      }

      const rawUrl = args[0];
      logger.info(`[TIKTOK] Raw URL: ${rawUrl}`);

      // Validate URL
      if (!isValidTiktokUrl(rawUrl)) {
        return sock.sendMessage(from, {
          text:
            "❌ *Link Tidak Valid*\n\n" +
            "Pastikan link adalah video TikTok yang valid.\n\n" +
            "Format yang diterima:\n" +
            "• https://vt.tiktok.com/xxxxx\n" +
            "• https://vm.tiktok.com/xxxxx\n" +
            "• https://www.tiktok.com/@user/video/xxxxx"
        });
      }

      // Send processing message
      await sock.sendMessage(from, {
        text: "⏳ Memproses video TikTok...\nMohon tunggu sebentar."
      });

      // Resolve short URL
      const resolvedUrl = await resolveTiktokUrl(rawUrl);
      logger.info(`[TIKTOK] Resolved URL: ${resolvedUrl}`);

      // Call API
      const res = await axios.get(API_URL, {
        params: { url: resolvedUrl },
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        },
        timeout: 45000
      });

      if (!res.data || res.data.success !== true) {
        throw new Error(
          res.data?.error?.message || "API tidak mengembalikan success"
        );
      }

      const apiData = res.data.data;
      const videoUrl = extractTiktokVideo(apiData);

      logger.info(`[TIKTOK] Video URL found: ${videoUrl ? "Yes" : "No"}`);

      if (!videoUrl) {
        throw new Error("Video tidak ditemukan di response API");
      }

      // Download video
      logger.info(`[TIKTOK] Downloading video...`);
      const videoRes = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Referer": "https://www.tiktok.com/"
        },
        timeout: 90000
      });

      logger.success(`[TIKTOK] Video downloaded: ${videoRes.data.length} bytes`);

      // Build caption
      const caption = buildCaption(apiData);

      // Send video
      await sock.sendMessage(from, {
        video: videoRes.data,
        mimetype: "video/mp4",
        caption
      });

      logger.success(`[TIKTOK] Completed successfully`);

    } catch (err) {
      logger.error("[TIKTOK ERROR]", err.message);

      let errorMessage = "❌ *Download Gagal*\n\n";

      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        errorMessage += "⏱️ Timeout: Server TikTok tidak merespon.\n\n";
      } else if (err.response?.status === 404) {
        errorMessage += "🔍 Video tidak ditemukan atau telah dihapus.\n\n";
      } else if (err.message.includes("private")) {
        errorMessage += "🔒 Video ini bersifat private.\n\n";
      } else if (!err.response) {
        errorMessage += "🌐 Tidak dapat terhubung ke server.\n\n";
      } else {
        errorMessage += "⚠️ Terjadi kesalahan pada server.\n\n";
      }

      errorMessage +=
        "💡 *Tips:*\n" +
        "• Pastikan video tidak private atau dihapus\n" +
        "• Coba link video lain\n" +
        "• Gunakan link pendek (vt.tiktok.com)\n" +
        "• Tunggu beberapa saat dan coba lagi\n\n" +
        "Ketik !menu untuk bantuan.";

      await sock.sendMessage(from, { text: errorMessage });
    }
  }
};

/* ========================================
   HELPERS
======================================== */
function isValidTiktokUrl(url) {
  const validPatterns = [
    /tiktok\.com\/@[\w.-]+\/video\/\d+/,
    /vt\.tiktok\.com\/[\w-]+/,
    /vm\.tiktok\.com\/[\w-]+/,
    /tiktok\.com\/t\/[\w-]+/
  ];

  return validPatterns.some(pattern => pattern.test(url));
}

async function resolveTiktokUrl(url) {
  // If not short link, return as is
  if (!url.includes("vt.tiktok.com") && 
      !url.includes("vm.tiktok.com") &&
      !url.includes("tiktok.com/t/")) {
    return url;
  }

  try {
    logger.info(`[TIKTOK] Resolving short URL...`);
    
    const res = await axios.get(url, {
      maxRedirects: 0,
      validateStatus: status => status >= 300 && status < 400,
      timeout: 10000
    });

    const resolved = res.headers.location || url;
    logger.info(`[TIKTOK] Resolved to: ${resolved}`);
    
    return resolved;
  } catch (err) {
    if (err.response?.headers?.location) {
      return err.response.headers.location;
    }
    
    logger.warn(`[TIKTOK] Failed to resolve, using original URL`);
    return url;
  }
}

function extractTiktokVideo(data) {
  if (!data) return null;

  // Format baru: data.media.video (string)
  if (typeof data.media?.video === "string") {
    return data.media.video;
  }

  // Fallback formats
  if (data.video?.url) return data.video.url;
  if (data.play) return data.play;
  if (data.wmplay) return data.wmplay;

  if (Array.isArray(data.media?.videos)) {
    return data.media.videos[0]?.url;
  }

  if (Array.isArray(data.media)) {
    return data.media[0]?.url;
  }

  return null;
}

function buildCaption(data) {
  let caption = "🎵 *TikTok Video*\n\n";

  if (data.metadata?.title) {
    const title = data.metadata.title.substring(0, 100);
    caption += `📝 ${title}\n`;
  }

  if (data.metadata?.author) {
    caption += `👤 @${data.metadata.author}\n`;
  }

  if (data.metadata?.likes) {
    caption += `❤️ ${formatNumber(data.metadata.likes)} likes\n`;
  }

  caption += "\n✨ Downloaded via Bot";

  return caption;
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}