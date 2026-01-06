module.exports = {
  name: "menu",
  aliases: ["help", "commands"],
  description: "Menampilkan daftar command yang tersedia",
  usage: "!menu",

  async execute(sock, msg, args) {
    const from = msg.key.remoteJid;

    const menuText = `
🤖 *WhatsApp Bot Multi-Downloader*

Halo! Saya adalah bot downloader yang dapat membantu Anda mengunduh konten dari berbagai platform.

📋 *Daftar Command:*

*DOWNLOADER*
• !spotify <link>
  Download lagu dari Spotify
  Alias: !sp, !spdl
  Contoh: !spotify https://open.spotify.com/track/xxxxx

• !tiktok <link>
  Download video TikTok tanpa watermark
  Alias: !tt
  Contoh: !tiktok https://vt.tiktok.com/xxxxx

• !instagram <link>
  Download foto/video dari Instagram
  Contoh: !instagram https://www.instagram.com/reel/xxxxx

*INFO*
• !menu
  Menampilkan menu ini
  Alias: !help, !commands

• !ping
  Cek status bot dan kecepatan respon

⚙️ *Informasi Bot:*
• Rate Limit: 50 command per 30 menit
• Support: Spotify, TikTok, Instagram
• Status: Online & Siap Digunakan

💡 *Tips Penggunaan:*
• Pastikan link yang dikirim valid
• Untuk TikTok, bisa gunakan link pendek (vt.tiktok.com)
• Untuk Instagram, pastikan akun tidak private
• Untuk Spotify, gunakan link track (bukan playlist/album)

⚠️ *Catatan:*
• Bot akan menampilkan typing indicator saat memproses
• Jika ada error, bot akan memberitahu penyebabnya
• Rate limit diberlakukan untuk menjaga performa bot

📱 *Butuh bantuan?*
Kirim pesan dengan format command yang benar atau hubungi admin.

Selamat menggunakan! 🎉
    `.trim();

    await sock.sendMessage(from, {
      text: menuText
    });
  }
};