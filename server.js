const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // API: Simpan Konfigurasi ke config.js
  if (req.method === 'POST' && pathname === '/api/save-config') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const configData = JSON.parse(body);
        
        // Generate formatted JavaScript config file
        const fileContent = `/**
 * ====================================================================
 * KONFIGURASI DATA UNDANGAN PERNIKAHAN DIGITAL
 * Disimpan otomatis melalui Portal Editor Admin
 * Waktu Simpan: ${new Date().toLocaleString('id-ID')}
 * ====================================================================
 */

const WEDDING_CONFIG = ${JSON.stringify(configData, null, 2)};

// Shortcut aliases untuk kemudahan akses
if (typeof WEDDING_CONFIG.couple !== 'undefined') {
  WEDDING_CONFIG.groom = WEDDING_CONFIG.couple.groom;
  WEDDING_CONFIG.bride = WEDDING_CONFIG.couple.bride;
  WEDDING_CONFIG.heroPhoto = WEDDING_CONFIG.couple.heroPhoto;
}
`;

        fs.writeFileSync(path.join(BASE_DIR, 'config.js'), fileContent, 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Konfigurasi berhasil disimpan ke config.js!' }));
      } catch (err) {
        console.error('Gagal menyimpan config:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Upload Gambar Langsung dari Admin
  if (req.method === 'POST' && pathname === '/api/upload-image') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { filename, dataUrl } = payload;

        if (!dataUrl || !filename) {
          throw new Error('Data gambar atau nama file tidak valid.');
        }

        // Ekstraksi data base64
        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new Error('Format data URI gambar tidak didukung.');
        }

        const buffer = Buffer.from(matches[2], 'base64');
        
        // Bersihkan nama file dan tambahkan timestamp agar unik
        const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const ext = path.extname(cleanName) || '.jpg';
        const base = path.basename(cleanName, ext);
        const finalFilename = `${base}_${Date.now()}${ext}`;

        const uploadDir = path.join(BASE_DIR, 'assets', 'images');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const savePath = path.join(uploadDir, finalFilename);
        fs.writeFileSync(savePath, buffer);

        const relativePath = `assets/images/${finalFilename}`;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Foto berhasil diunggah!',
          filePath: relativePath
        }));
      } catch (err) {
        console.error('Gagal mengunggah foto:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Ambil konfigurasi terkini dalam format JSON
  if (req.method === 'GET' && pathname === '/api/get-config') {
    try {
      const configPath = path.join(BASE_DIR, 'config.js');
      const fileContent = fs.readFileSync(configPath, 'utf8');
      
      // Ambil objek JSON di antara "const WEDDING_CONFIG = " dan ";"
      const match = fileContent.match(/const\s+WEDDING_CONFIG\s*=\s*(\{[\s\S]*?\});/);
      if (match && match[1]) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(match[1]);
        return;
      }
    } catch (err) {
      console.warn('Gagal membaca config.js via regex:', err);
    }
  }

  // Static File Serving
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(BASE_DIR, pathname);

  // Security check: cegah path traversal
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403);
    res.end('Akses ditolak');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Berkas tidak ditemukan: ' + pathname);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support HTTP Range Requests (penting untuk streaming audio & video mp3/mp4)
    const range = req.headers.range;
    const fileSize = stats.size;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`
        });
        res.end();
        return;
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server Undangan Digital berjalan di: http://localhost:${PORT}`);
  console.log(`Portal Admin Editor: http://localhost:${PORT}/admin.html`);
});
