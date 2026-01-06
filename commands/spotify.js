const axios = require("axios");
const { logger } = require("../utils/logger");

const API_URL = "https://chocomilk.amira.us.kg/v1/download/spotify";

module.exports = {
  name: "spotify",
  aliases: ["sp", "spdl"],
  description: "Spotify Music Downloader",
  usage: "!spotify <link>",

  async execute(sock, msg, args) {
    const from = msg.key.remoteJid;

    try {
      // Validate input
      if (!args[0]) {
        return sock.sendMessage(from, {
          text: 
            "❌ *Format Salah*\n\n" +
            "Gunakan format yang benar:\n" +
            "!spotify <link>\n\n" +
            "Contoh:\n" +
            "!spotify https://open.spotify.com/track/xxxxx"
        });
      }

      // Validate URL
      const cleanUrl = normalizeSpotifyUrl(args[0]);
      
      if (!isValidSpotifyUrl(cleanUrl)) {
        return sock.sendMessage(from, {
          text:
            "❌ *Link Tidak Valid*\n\n" +
            "Pastikan link adalah track Spotify yang valid.\n\n" +
            "Format yang benar:\n" +
            "https://open.spotify.com/track/xxxxx\n\n" +
            "Note: Playlist dan album tidak didukung."
        });
      }

      logger.info(`[SPOTIFY] Processing: ${cleanUrl}`);

      // Send processing message
      await sock.sendMessage(from, {
        text: "⏳ Memproses request Spotify...\nMohon tunggu sebentar."
      });

      // Call API
      const apiRes = await axios.get(API_URL, {
        params: { url: cleanUrl },
        timeout: 90000,
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      });

      if (!apiRes.data?.success) {
        throw new Error("API tidak mengembalikan success");
      }

      // Parse response
      const parsed = parseSpotify(apiRes.data.data);
      logger.info(`[SPOTIFY] Parsed: ${parsed.title} - ${parsed.artist}`);

      if (!parsed.audio) {
        throw new Error("URL audio tidak ditemukan");
      }

      // Send info message
      const infoMsg = await sock.sendMessage(from, {
        text: buildInfoText(parsed)
      });

      // Download audio
      logger.info(`[SPOTIFY] Downloading audio...`);
      const audioRes = await axios.get(parsed.audio, {
        responseType: "arraybuffer",
        timeout: 120000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      logger.success(`[SPOTIFY] Audio downloaded: ${audioRes.data.length} bytes`);

      // Send audio
      await sock.sendMessage(
        from,
        {
          audio: audioRes.data,
          mimetype: "audio/mpeg",
          fileName: parsed.filename || `${parsed.title}.mp3`,
          caption: buildCaption(parsed),
          ptt: false
        },
        { quoted: infoMsg }
      );

      logger.success(`[SPOTIFY] Completed successfully`);

    } catch (err) {
      logger.error("[SPOTIFY ERROR]", err.message);

      let errorMessage = "❌ *Download Gagal*\n\n";

      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        errorMessage += "⏱️ Timeout: Server Spotify sedang lambat atau tidak merespon.\n\n";
      } else if (err.response?.status === 404) {
        errorMessage += "🔍 Track tidak ditemukan atau telah dihapus.\n\n";
      } else if (err.response?.status === 429) {
        errorMessage += "🚫 Terlalu banyak request. Coba lagi nanti.\n\n";
      } else if (!err.response) {
        errorMessage += "🌐 Tidak dapat terhubung ke server.\n\n";
      } else {
        errorMessage += "⚠️ Terjadi kesalahan pada server.\n\n";
      }

      errorMessage +=
        "💡 *Tips:*\n" +
        "• Pastikan link adalah track Spotify (bukan playlist/album)\n" +
        "• Coba link track lain\n" +
        "• Tunggu beberapa saat dan coba lagi\n\n" +
        "Ketik !menu untuk bantuan.";

      await sock.sendMessage(from, { text: errorMessage });
    }
  }
};

/* ========================================
   HELPERS
======================================== */
function normalizeSpotifyUrl(url) {
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

function isValidSpotifyUrl(url) {
  try {
    const u = new URL(url);
    return (
      u.hostname === "open.spotify.com" &&
      u.pathname.includes("/track/")
    );
  } catch {
    return false;
  }
}

function parseSpotify(data) {
  const result = {
    title: "Unknown Title",
    artist: "Unknown Artist",
    album: "Unknown Album",
    duration: "Unknown",
    audio: null,
    filename: null
  };

  if (!data) return result;

  if (data.title) result.title = data.title;

  if (Array.isArray(data.artist)) {
    result.artist = data.artist.map(a => a.name).join(", ");
  } else if (data.artist) {
    result.artist = data.artist;
  }

  if (data.album) result.album = data.album;
  if (data.duration) result.duration = data.duration;

  if (data.media?.url) {
    result.audio = data.media.url;
    result.filename = data.media.filename;
  }

  return result;
}

function buildInfoText(d) {
  return (
    "🎵 *Spotify Track Info*\n\n" +
    `🎧 Judul: ${d.title}\n` +
    `👤 Penyanyi: ${d.artist}\n` +
    `💿 Album: ${d.album}\n` +
    `⏱️ Durasi: ${d.duration}\n\n` +
    "⬇️ Mengirim audio..."
  );
}

function buildCaption(d) {
  return `🎶 ${d.title}\n${d.artist}`;
}