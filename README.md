# 🤖 WhatsApp Bot Multi-Downloader

Bot WhatsApp yang dapat mengunduh konten dari berbagai platform seperti Spotify, TikTok, dan Instagram dengan fitur rate limiting dan logging yang lengkap.

## ✨ Fitur

- **Multi-Platform Support**
  - 🎵 Spotify Music Downloader
  - 🎬 TikTok Video Downloader (No Watermark)
  - 📸 Instagram Photo/Video Downloader

- **Advanced Features**
  - ⚡ Rate Limiting (50 command per 30 menit)
  - 📝 File Logging untuk debugging
  - 🎨 Beautiful terminal output dengan Chalk
  - ⌨️ Typing indicator saat memproses
  - 🔄 Auto-reconnect jika koneksi terputus
  - ✅ URL validation untuk setiap platform
  - 📊 Command !ping untuk cek status bot

## 📋 Requirements

- Node.js v18 atau lebih tinggi
- NPM atau Yarn
- Koneksi internet yang stabil

## 🚀 Installation

1. Clone repository ini:
```bash
git clone <repository-url>
cd whatsapp-bot-downloader
```

2. Install dependencies:
```bash
npm install
```

3. Jalankan bot:
```bash
npm start
```

4. Scan QR Code yang muncul di terminal menggunakan WhatsApp

## 📱 Command List

### Downloader Commands

**!spotify** `<link>` - Download lagu dari Spotify
- Aliases: `!sp`, `!spdl`
- Contoh: `!spotify https://open.spotify.com/track/xxxxx`

**!tiktok** `<link>` - Download video TikTok
- Aliases: `!tt`
- Contoh: `!tiktok https://vt.tiktok.com/xxxxx`

**!instagram** `<link>` - Download foto/video Instagram
- Aliases: `!ig`, `!igdl`
- Contoh: `!instagram https://www.instagram.com/reel/xxxxx`

### Utility Commands

**!menu** - Menampilkan daftar command
- Aliases: `!help`, `!commands`

**!ping** - Cek status dan kecepatan bot

## 📁 Struktur Folder

```
whatsapp-bot-downloader/
├── index.js                 # Entry point
├── package.json            # Dependencies
├── handler/
│   └── commandHandler.js   # Command handler dengan rate limiting
├── commands/
│   ├── menu.js            # Command menu
│   ├── ping.js            # Command ping
│   ├── spotify.js         # Spotify downloader
│   ├── tiktok.js          # TikTok downloader
│   └── instagram.js       # Instagram downloader
├── utils/
│   ├── logger.js          # Logger utility dengan file logging
│   └── rateLimiter.js     # Rate limiter utility
├── session/               # WhatsApp session (auto-generated)
└── logs/                  # Log files (auto-generated)
    └── bot-YYYY-MM-DD.log
```

## 🔧 Configuration

### Rate Limiting
Default: 50 command per 30 menit

Untuk mengubah, edit file `handler/commandHandler.js`:
```javascript
const rateLimiter = new RateLimiter(50, 30 * 60 * 1000);
//                                  ^^  ^^^^^^^^^^^^^^
//                                  |   Time window (ms)
//                                  Max requests
```

### Command Prefix
Default: `!`

Untuk mengubah, edit file `handler/commandHandler.js`:
```javascript
const COMMAND_PREFIX = "!";
```

## 📝 Logging

Bot akan membuat file log otomatis di folder `logs/` dengan format:
- Nama file: `bot-YYYY-MM-DD.log`
- Isi log: Timestamp, level, dan pesan
- Log types: INFO, SUCCESS, WARN, ERROR, COMMAND, MESSAGE

Contoh log:
```
[06/01/2026 14:30:15] [INFO] Bot WhatsApp connected successfully!
[06/01/2026 14:30:20] [COMMAND] 628123456789 executed: !spotify https://...
[06/01/2026 14:30:25] [SUCCESS] SPOTIFY Completed successfully
```

## 🎨 Terminal Output

Bot menggunakan Chalk untuk tampilan terminal yang cantik:
- 🔵 INFO - Biru
- ✅ SUCCESS - Hijau
- ⚠️ WARN - Kuning
- ❌ ERROR - Merah
- ► COMMAND - Magenta
- 💬 MESSAGE - Biru muda

## ⚠️ Troubleshooting

### Bot tidak terhubung
- Pastikan session folder kosong atau hapus jika ada masalah
- Scan ulang QR code
- Pastikan WhatsApp Web aktif di device

### Rate limit terlalu ketat
- Edit konfigurasi rate limiter di `commandHandler.js`
- Atau tunggu hingga window reset (30 menit)

### Download gagal
- Pastikan URL valid untuk platform tersebut
- Cek koneksi internet
- Lihat log file untuk detail error

### API Error
- API yang digunakan mungkin sedang down
- Coba beberapa saat lagi
- Cek log untuk detail error

## 🔐 Security Notes

- Jangan share folder `session/` karena berisi kredensial WhatsApp
- Backup session secara berkala
- Gunakan rate limiting untuk mencegah spam
- Monitor log file untuk aktivitas mencurigakan

## 📊 Deployment (Coming Soon)

Untuk production, akan ditambahkan:
- PM2 configuration untuk process management
- Environment variables untuk konfigurasi
- Health check endpoint
- Monitoring dashboard

## 🤝 Contributing

Contributions are welcome! Silakan buat PR untuk:
- Menambah platform downloader baru
- Improve error handling
- Optimize performance
- Fix bugs

## 📄 License

MIT License - feel free to use for personal or commercial projects

## 👨‍💻 Author

Your Name

## 🙏 Credits

- Baileys - WhatsApp Web API
- Chocomilk API - Downloader API
- Chalk - Terminal styling
- Axios - HTTP client

---

Made with ❤️ for WhatsApp Bot enthusiasts