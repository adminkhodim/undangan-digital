/**
 * ====================================================================
 * BACKEND GOOGLE APPS SCRIPT - UNDANGAN PERNIKAHAN DIGITAL (SAAS READY)
 * ====================================================================
 * Fitur:
 * 1. Multi-Tab Terstruktur sesuai Menu Sidebar Admin (Mempelai, Acara, Galeri, dll.)
 * 2. Auto-Provisioning: Membuat tab, header emas, dan data awal otomatis jika kosong
 * 3. Upload Foto langsung ke Google Drive Folder (Public CDN Link)
 * 4. Sinkronisasi Buku Tamu & RSVP dua arah
 * 5. SaaS Ready: Dilengkapi fungsi kloning template untuk pengguna baru
 * ====================================================================
 */

// KONFIGURASI UTAMA
var CONFIG = {
  DRIVE_FOLDER_ID: '1YGP-Xt08hGBKfHrzFXFdlFMy07bxQGF8', // ID Folder Google Drive Foto
  DEFAULT_SLUG: 'arya-annisa'
};

// WARNA STYLING TAB SPREADSHEET (Champagne Gold Theme)
var THEME = {
  HEADER_BG: '#C5A880',
  HEADER_FG: '#FFFFFF',
  BORDER_COLOR: '#E2D5C3',
  ZEBRA_BG: '#FAF7F2'
};

/**
 * Endpoint HTTP GET (Menerima request pembacaan data)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'get_wishes';
  var slug = (e && e.parameter && (e.parameter.u || e.parameter.slug)) ? (e.parameter.u || e.parameter.slug).toLowerCase().trim() : '';

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tenantInfo = getTenantInfo(ss, slug);
    var targetSs = getTenantSpreadsheet(ss, slug);

    // 1. Ambil Konfigurasi Undangan (Support Multi-Tenant ?u=slug)
    if (action === 'get_config') {
      var configData = readAllConfigFromSheets(targetSs);
      return createJsonResponse({
        status: 'success',
        tenant: tenantInfo.slug || CONFIG.DEFAULT_SLUG,
        namaPasangan: tenantInfo.namaPasangan || '',
        statusUser: tenantInfo.status || 'Aktif',
        paket: tenantInfo.paket || 'Paket Gold',
        config: configData
      });
    }

    // 2. Verifikasi PIN Admin untuk Portal Editor
    if (action === 'verify_pin') {
      var reqPin = (e && e.parameter && e.parameter.pin) ? e.parameter.pin.toString().trim() : '';
      var isPinValid = tenantInfo.found && (tenantInfo.pin ? tenantInfo.pin.toString().trim() === reqPin : true);
      return createJsonResponse({
        status: 'success',
        verified: isPinValid,
        slug: tenantInfo.slug,
        namaPasangan: tenantInfo.namaPasangan || '',
        statusUser: tenantInfo.status || 'Aktif',
        paket: tenantInfo.paket || 'Paket Gold'
      });
    }

    // 3. Inisialisasi / Rapikan Tab
    if (action === 'init_tabs' || action === 'rapikan_sheet') {
      initAllTabs(ss);
      return createJsonResponse({
        status: 'success',
        message: 'Semua tab (termasuk Data_Pengguna & Buku_Tamu_RSVP) berhasil diinisialisasi dan dirapikan!'
      });
    }

    // 4. Cek Ketersediaan Slug
    if (action === 'check_slug') {
      var checkSlug = (e && e.parameter && e.parameter.slug) ? e.parameter.slug.toLowerCase().trim() : '';
      var isAvailable = isSlugAvailable(ss, checkSlug);
      return createJsonResponse({
        status: 'success',
        slug: checkSlug,
        available: isAvailable
      });
    }

    // 5. Default: Ambil data ucapan / RSVP untuk buku tamu tenant
    var wishes = readRSVPData(targetSs);
    return createJsonResponse({
      status: 'success',
      tenant: tenantInfo.slug,
      total: wishes.length,
      data: wishes
    });

  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: err.toString()
    });
  }
}

/**
 * Endpoint HTTP POST (Menerima simpan data, upload foto, dan RSVP baru)
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var postData = {};

    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        postData = e.parameter || {};
      }
    } else {
      postData = e.parameter || {};
    }

    var action = postData.action || 'rsvp';
    var slug = postData.u || postData.slug || (e && e.parameter && (e.parameter.u || e.parameter.slug)) || '';
    var tenantInfo = getTenantInfo(ss, slug);
    var targetSs = getTenantSpreadsheet(ss, slug);

    // 1. SIMPAN KONFIGURASI KE SHEET TENANT
    if (action === 'save_config') {
      var cfg = postData.config;
      if (!cfg) throw new Error('Data konfigurasi kosong.');
      saveAllConfigToSheets(targetSs, cfg);
      return createJsonResponse({
        status: 'success',
        tenant: tenantInfo.slug,
        message: 'Konfigurasi berhasil disimpan ke sheet pasangan ' + (tenantInfo.namaPasangan || tenantInfo.slug) + '!'
      });
    }

    // 2. UPLOAD FOTO KE GOOGLE DRIVE TENANT
    if (action === 'upload_image') {
      var filename = postData.filename || ('foto_' + new Date().getTime() + '.jpg');
      var dataUrl = postData.dataUrl;
      if (!dataUrl) throw new Error('dataUrl gambar tidak ditemukan.');

      var targetFolderId = tenantInfo.driveFolderId || CONFIG.DRIVE_FOLDER_ID;
      var uploadedUrl = uploadBase64ToDrive(targetFolderId, filename, dataUrl);
      return createJsonResponse({
        status: 'success',
        tenant: tenantInfo.slug,
        fileUrl: uploadedUrl,
        message: 'Foto berhasil diunggah ke Google Drive!'
      });
    }

    // 3. TAMBAH UCAPAN / RSVP BARU DARI TAMU
    if (action === 'rsvp') {
      var rsvpSheet = getOrCreateSheet(targetSs, 'Buku_Tamu_RSVP', [
        'Waktu', 'Nama Tamu', 'Konfirmasi Kehadiran', 'Jumlah Tamu', 'Ucapan / Doa Restu'
      ]);

      var now = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
      var name = postData.name || 'Tamu Undangan';
      var status = postData.status || 'hadir';
      var guestCount = postData.guestCount || 1;
      var message = postData.message || '';

      rsvpSheet.appendRow([now, name, status, guestCount, message]);

      return createJsonResponse({
        status: 'success',
        tenant: tenantInfo.slug,
        message: 'Terima kasih, ucapan dan konfirmasi kehadiran Anda berhasil disimpan!'
      });
    }

    // 4. DAFTAR PENGGUNA BARU (AUTOMATED SAAS PROVISIONING)
    if (action === 'register_user') {
      var sUsers = getOrCreateSheet(ss, 'Data_Pengguna', [
        'ID_User', 'Tanggal_Daftar', 'Nama_Pasangan', 'Slug_Undangan', 
        'Email', 'No_WhatsApp', 'PIN_Admin', 'Paket', 'Status', 'Spreadsheet_ID', 'Drive_Folder_ID'
      ]);

      var newSlug = (postData.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').trim();
      if (!newSlug) throw new Error('Tautan slug undangan wajib diisi.');

      if (!isSlugAvailable(ss, newSlug)) {
        return createJsonResponse({
          status: 'error',
          message: 'Tautan slug "' + newSlug + '" sudah digunakan oleh pasangan lain. Silakan pilih slug lain.'
        });
      }

      var namaPria = postData.namaPria || 'Groom';
      var namaWanita = postData.namaWanita || 'Bride';
      var namaPasangan = postData.namaPasangan || (namaPria + ' & ' + namaWanita);
      var email = postData.email || '';
      var whatsapp = postData.whatsapp || '';
      var pin = postData.pin || '123456';
      var weddingDate = postData.weddingDate || '2026-12-20';
      var paket = postData.paket || 'Paket Gold';
      var statusUser = 'Menunggu Pembayaran';

      var newUserId = 'USR-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyMM') + '-' + Math.floor(100 + Math.random() * 900);
      var regDate = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');

      // 1. Buat folder Google Drive khusus untuk foto pasangan ini
      var clientFolderId = CONFIG.DRIVE_FOLDER_ID;
      try {
        var parentFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
        var newFolder = parentFolder.createFolder('Undangan ' + namaPasangan + ' (' + newSlug + ')');
        newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        clientFolderId = newFolder.getId();
      } catch (fErr) {
        Logger.log('Gagal buat subfolder Drive: ' + fErr);
      }

      // 2. Kloning Master Spreadsheet menjadi spreadsheet khusus pasangan ini
      var clientSsId = ss.getId();
      try {
        var masterFile = DriveApp.getFileById(ss.getId());
        var copiedFile = masterFile.makeCopy('Undangan Digital - ' + namaPasangan, DriveApp.getFolderById(clientFolderId));
        clientSsId = copiedFile.getId();
        
        var clientSs = SpreadsheetApp.openById(clientSsId);
        
        // Hapus tab Data_Pengguna di file klien
        var sClientUsers = clientSs.getSheetByName('Data_Pengguna');
        if (sClientUsers) {
          try { clientSs.deleteSheet(sClientUsers); } catch(e){}
        }

        // Sesuaikan nama mempelai awal di tab Mempelai
        var sClientMempelai = clientSs.getSheetByName('Mempelai');
        if (sClientMempelai) {
          clearDataRows(sClientMempelai);
          sClientMempelai.appendRow(['Mempelai Pria', namaPria, namaPria, 'Putra dari', '-', '-', '', 'assets/images/groom.jpg', '']);
          sClientMempelai.appendRow(['Mempelai Wanita', namaWanita, namaWanita, 'Putri dari', '-', '-', '', 'assets/images/bride.jpg', '']);
          sClientMempelai.appendRow(['Foto Hero Bersama', '-', '-', '-', '-', '-', '', 'assets/images/couple_hero.jpg', 'Foto Utama Undangan']);
        }

        // Sesuaikan tanggal pernikahan di Pengaturan_Umum
        var sClientSettings = clientSs.getSheetByName('Pengaturan_Umum');
        if (sClientSettings) {
          clearDataRows(sClientSettings);
          sClientSettings.appendRow(['targetDate', weddingDate + 'T08:00:00', 'Waktu target hitung mundur']);
          sClientSettings.appendRow(['autoScrollSpeed', 2.8, 'Kecepatan autoscroll peramban']);
          sClientSettings.appendRow(['autoScrollAutoStart', 'true', 'Mulai autoscroll otomatis']);
          sClientSettings.appendRow(['slug_undangan', newSlug, 'Identifier unik tenant']);
        }

        // Bersihkan data ucapan awal
        var sClientRsvp = clientSs.getSheetByName('Buku_Tamu_RSVP');
        if (sClientRsvp) {
          clearDataRows(sClientRsvp);
        }

      } catch (cpErr) {
        Logger.log('Gagal kloning spreadsheet: ' + cpErr);
      }

      // 3. Catat ke Master Sheet Data_Pengguna
      sUsers.appendRow([
        newUserId,
        regDate,
        namaPasangan,
        newSlug,
        email,
        whatsapp,
        pin,
        paket,
        statusUser,
        clientSsId,
        clientFolderId
      ]);

      return createJsonResponse({
        status: 'success',
        message: 'Pendaftaran undangan digital berhasil! Selamat datang, ' + namaPasangan + '.',
        user: {
          id: newUserId,
          namaPasangan: namaPasangan,
          slug: newSlug,
          spreadsheetId: clientSsId,
          driveFolderId: clientFolderId,
          adminUrl: 'admin.html?u=' + newSlug,
          guestUrl: 'index.html?u=' + newSlug,
          statusUser: statusUser,
          paket: paket
        }
      });
    }

    return createJsonResponse({
      status: 'error',
      message: 'Aksi tidak dikenali: ' + action
    });

  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: err.toString()
    });
  }
}

/* ====================================================================
   SAAS TENANT HELPERS
   ==================================================================== */
function getTenantInfo(masterSs, slug) {
  if (!masterSs) masterSs = SpreadsheetApp.getActiveSpreadsheet();
  slug = (slug || '').toString().toLowerCase().trim();

  var defaultTenant = {
    found: true,
    slug: CONFIG.DEFAULT_SLUG,
    namaPasangan: 'Raden Arya & Annisa Larasati',
    pin: '123456',
    paket: 'Paket Gold',
    status: 'Aktif',
    spreadsheetId: masterSs.getId(),
    driveFolderId: CONFIG.DRIVE_FOLDER_ID
  };

  if (!slug || slug === CONFIG.DEFAULT_SLUG) {
    return defaultTenant;
  }

  var sUsers = masterSs.getSheetByName('Data_Pengguna');
  if (!sUsers || sUsers.getLastRow() <= 1) {
    return defaultTenant;
  }

  var rows = sUsers.getRange(2, 1, sUsers.getLastRow() - 1, sUsers.getLastColumn()).getValues();
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var rowSlug = (r[3] || '').toString().toLowerCase().trim();
    if (rowSlug === slug) {
      return {
        found: true,
        id: r[0],
        tanggal: r[1],
        namaPasangan: r[2],
        slug: rowSlug,
        email: r[4],
        whatsapp: r[5],
        pin: r[6],
        paket: r[7],
        status: r[8],
        spreadsheetId: r[9] || masterSs.getId(),
        driveFolderId: r[10] || CONFIG.DRIVE_FOLDER_ID
      };
    }
  }

  return { found: false, slug: slug };
}

function getTenantSpreadsheet(masterSs, slug) {
  var tenant = getTenantInfo(masterSs, slug);
  if (tenant.found && tenant.spreadsheetId && tenant.spreadsheetId !== masterSs.getId()) {
    try {
      return SpreadsheetApp.openById(tenant.spreadsheetId);
    } catch (e) {
      Logger.log('Gagal buka spreadsheet tenant ' + slug + ', fallback ke master: ' + e);
    }
  }
  return masterSs;
}

/* ====================================================================
   1. AUTO-PROVISIONING & INISIALISASI TAB
   ==================================================================== */
function rapikanSheet1(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet1 = ss.getSheetByName('Sheet1');
  var rsvpSheet = ss.getSheetByName('Buku_Tamu_RSVP');

  if (sheet1) {
    if (!rsvpSheet) {
      // Jika Buku_Tamu_RSVP belum ada, ubah nama Sheet1 menjadi Buku_Tamu_RSVP
      sheet1.setName('Buku_Tamu_RSVP');
      formatHeaderRow(sheet1, Math.max(sheet1.getLastColumn(), 5));
    } else {
      // Jika Buku_Tamu_RSVP sudah ada, salin data dari Sheet1 jika ada
      var s1LastRow = sheet1.getLastRow();
      if (s1LastRow > 1) {
        var s1Data = sheet1.getRange(2, 1, s1LastRow - 1, sheet1.getLastColumn()).getValues();
        s1Data.forEach(function(row) {
          var waktu = row[0] || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
          var nama = row[1] || '';
          var hadir = row[2] || 'hadir';
          var ucapan = row[3] || '';
          rsvpSheet.appendRow([waktu, nama, hadir, 1, ucapan]);
        });
      }
      try {
        ss.deleteSheet(sheet1);
      } catch (delErr) {}
    }
  }

  var targetRsvp = ss.getSheetByName('Buku_Tamu_RSVP');
  if (targetRsvp) {
    formatHeaderRow(targetRsvp, Math.max(targetRsvp.getLastColumn(), 5));
  }
}

function initAllTabs(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Rapikan Sheet1 menjadi Buku_Tamu_RSVP
  rapikanSheet1(ss);

  // 2. Tab Data_Pengguna (Master Tenants SaaS)
  var sUsers = getOrCreateSheet(ss, 'Data_Pengguna', [
    'ID_User', 'Tanggal_Daftar', 'Nama_Pasangan', 'Slug_Undangan', 
    'Email', 'No_WhatsApp', 'PIN_Admin', 'Paket', 'Status', 'Spreadsheet_ID', 'Drive_Folder_ID'
  ]);
  if (sUsers.getLastRow() <= 1) {
    var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
    sUsers.appendRow([
      'USR-001',
      nowStr,
      'Raden Arya & Annisa Larasati',
      'arya-annisa',
      'admin@undangan.id',
      '081234567890',
      '123456',
      'Premium Master',
      'Aktif',
      ss.getId(),
      CONFIG.DRIVE_FOLDER_ID
    ]);
  }

  // Tab 1: Mempelai
  getOrCreateSheet(ss, 'Mempelai', [
    'Peran', 'Nama Lengkap & Gelar', 'Nama Panggilan', 'Urutan Anak', 
    'Nama Ayah', 'Nama Ibu', 'Instagram Handle', 'URL Foto', 'Kutipan / Bio Singkat'
  ]);

  // Tab 2: Doa_Ayat
  getOrCreateSheet(ss, 'Doa_Ayat', [
    'Tipe', 'Teks Kaligrafi Arab', 'Terjemahan Bahasa Indonesia', 'Sumber / Nama Surat'
  ]);

  // Tab 3: Rangkaian_Acara
  getOrCreateSheet(ss, 'Rangkaian_Acara', [
    'ID Acara', 'Nama Acara', 'Badge Acara', 'Hari', 'Tanggal Acara', 
    'Waktu / Jam', 'Nama Tempat / Gedung', 'Alamat Lengkap', 'Link Google Maps', 'Link Google Maps Embed'
  ]);

  // Tab 4: Kisah_Cinta
  getOrCreateSheet(ss, 'Kisah_Cinta', [
    'Urutan', 'Tahun / Fase', 'Judul Cerita', 'Deskripsi Kisah'
  ]);

  // Tab 5: Galeri_Foto
  getOrCreateSheet(ss, 'Galeri_Foto', [
    'Urutan', 'Judul / Caption Foto', 'Tag / Kategori', 'URL Foto'
  ]);

  // Tab 6: Amplop_Digital
  getOrCreateSheet(ss, 'Amplop_Digital', [
    'Jenis (Bank/QRIS/Kado)', 'Nama Bank / Vendor', 'Nomor Rekening / HP / NMID', 
    'Atas Nama', 'URL Gambar / QRIS', 'Alamat Pengiriman Kado'
  ]);

  // Tab 7: Pengaturan_Umum
  getOrCreateSheet(ss, 'Pengaturan_Umum', [
    'Kategori / Kunci', 'Nilai (Value)', 'Keterangan'
  ]);

  // Tab 8: Buku_Tamu_RSVP
  getOrCreateSheet(ss, 'Buku_Tamu_RSVP', [
    'Waktu', 'Nama Tamu', 'Konfirmasi Kehadiran', 'Jumlah Tamu', 'Ucapan / Doa Restu'
  ]);
}

/**
 * Ambil atau buat Sheet baru lengkap dengan Header Styling Emas
 */
function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Jika sheet masih baru atau kosong, buatkan header
  if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  }

  return sheet;
}

/**
 * Format baris Header agar terlihat mewah & profesional
 */
function formatHeaderRow(sheet, colCount) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setBackground(THEME.HEADER_BG)
             .setFontColor(THEME.HEADER_FG)
             .setFontWeight('bold')
             .setFontSize(10)
             .setHorizontalAlignment('center')
             .setVerticalAlignment('middle')
             .setWrap(false);
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);
  for (var c = 1; c <= colCount; c++) {
    sheet.autoResizeColumn(c);
  }
}

/* ====================================================================
   2. SIMPAN DATA KE TAB-TAB TERSTRUKTUR (SAVE_CONFIG)
   ==================================================================== */
function saveAllConfigToSheets(ss, cfg) {
  // 1. TAB MEMPELAI
  var sMempelai = getOrCreateSheet(ss, 'Mempelai', [
    'Peran', 'Nama Lengkap & Gelar', 'Nama Panggilan', 'Urutan Anak', 
    'Nama Ayah', 'Nama Ibu', 'Instagram Handle', 'URL Foto', 'Kutipan / Bio Singkat'
  ]);
  clearDataRows(sMempelai);

  var groom = (cfg.couple && cfg.couple.groom) || cfg.groom || {};
  var bride = (cfg.couple && cfg.couple.bride) || cfg.bride || {};
  var heroPhoto = (cfg.couple && cfg.couple.heroPhoto) || cfg.heroPhoto || '';

  sMempelai.appendRow([
    'Mempelai Pria',
    groom.fullName || '',
    groom.shortName || '',
    groom.childOrder || '',
    groom.fatherName || '',
    groom.motherName || '',
    groom.instagramHandle || '',
    groom.photo || '',
    groom.bio || ''
  ]);

  sMempelai.appendRow([
    'Mempelai Wanita',
    bride.fullName || '',
    bride.shortName || '',
    bride.childOrder || '',
    bride.fatherName || '',
    bride.motherName || '',
    bride.instagramHandle || '',
    bride.photo || '',
    bride.bio || ''
  ]);

  sMempelai.appendRow([
    'Foto Hero Bersama',
    '-', '-', '-', '-', '-', '-',
    heroPhoto,
    'Foto Utama / Hero Banner Undangan'
  ]);

  // 2. TAB DOA & AYAT
  var sDoa = getOrCreateSheet(ss, 'Doa_Ayat', [
    'Tipe', 'Teks Kaligrafi Arab', 'Terjemahan Bahasa Indonesia', 'Sumber / Nama Surat'
  ]);
  clearDataRows(sDoa);
  var quote = cfg.quote || {};
  sDoa.appendRow([
    'Kutipan Utama',
    quote.arabic || '',
    quote.translation || '',
    quote.source || ''
  ]);

  // 3. TAB RANGKAIAN ACARA
  var sAcara = getOrCreateSheet(ss, 'Rangkaian_Acara', [
    'ID Acara', 'Nama Acara', 'Badge Acara', 'Hari', 'Tanggal Acara', 
    'Waktu / Jam', 'Nama Tempat / Gedung', 'Alamat Lengkap', 'Link Google Maps', 'Link Google Maps Embed'
  ]);
  clearDataRows(sAcara);
  var events = cfg.events || [];
  events.forEach(function(ev, idx) {
    var rawMapsUrl = (ev.mapsUrl || '').toString().trim();
    var rawMapsEmbed = (ev.mapsEmbedUrl || '').toString().trim();
    var venue = (ev.venue || '').toString().trim();
    var address = (ev.address || '').toString().trim();

    // Auto-ekstrak jika user menempelkan kode <iframe ...>
    if (rawMapsUrl.indexOf('<iframe') !== -1 || rawMapsUrl.indexOf('src=') !== -1) {
      var matchSrc = rawMapsUrl.match(/src=["']([^"']+)["']/i);
      if (matchSrc && matchSrc[1]) {
        rawMapsEmbed = matchSrc[1];
      }
      var query = [venue, address].filter(Boolean).join(', ');
      rawMapsUrl = query ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query) : 'https://maps.google.com';
    }
    if (rawMapsEmbed.indexOf('<iframe') !== -1 || rawMapsEmbed.indexOf('src=') !== -1) {
      var matchSrc2 = rawMapsEmbed.match(/src=["']([^"']+)["']/i);
      if (matchSrc2 && matchSrc2[1]) {
        rawMapsEmbed = matchSrc2[1];
      }
    }

    sAcara.appendRow([
      ev.id || ('acara-' + idx),
      ev.title || '',
      ev.badge || '',
      ev.dayName || '',
      ev.dateFormatted || '',
      ev.time || '',
      venue,
      address,
      rawMapsUrl,
      rawMapsEmbed
    ]);
  });

  // 4. TAB KISAH CINTA
  var sStory = getOrCreateSheet(ss, 'Kisah_Cinta', [
    'Urutan', 'Tahun / Fase', 'Judul Cerita', 'Deskripsi Kisah'
  ]);
  clearDataRows(sStory);
  var loveStory = cfg.loveStory || [];
  loveStory.forEach(function(item, idx) {
    sStory.appendRow([
      idx + 1,
      item.year || '',
      item.title || '',
      item.description || ''
    ]);
  });

  // 5. TAB GALERI FOTO
  var sGallery = getOrCreateSheet(ss, 'Galeri_Foto', [
    'Urutan', 'Judul / Caption Foto', 'Tag / Kategori', 'URL Foto'
  ]);
  clearDataRows(sGallery);
  var gallery = cfg.gallery || [];
  gallery.forEach(function(item, idx) {
    sGallery.appendRow([
      idx + 1,
      item.title || '',
      item.tag || 'Prewedding',
      item.url || ''
    ]);
  });

  // 6. TAB AMPLOP DIGITAL & KADO
  var sGifts = getOrCreateSheet(ss, 'Amplop_Digital', [
    'Jenis (Bank/QRIS/Kado)', 'Nama Bank / Vendor', 'Nomor Rekening / HP / NMID', 
    'Atas Nama', 'URL Gambar / QRIS', 'Alamat Pengiriman Kado'
  ]);
  clearDataRows(sGifts);
  var gifts = cfg.gifts || {};

  // Baris QRIS
  if (gifts.qris) {
    sGifts.appendRow([
      'QRIS',
      'QRIS Pembayaran Digital',
      gifts.qris.nmid || '',
      gifts.qris.accountName || '',
      gifts.qris.image || '',
      gifts.qris.enable ? 'Aktif' : 'Nonaktif'
    ]);
  }

  // Baris Bank
  var bankAccounts = gifts.bankAccounts || [];
  bankAccounts.forEach(function(b) {
    sGifts.appendRow([
      'Rekening Bank',
      b.bank || b.badge || 'Bank',
      b.accountNumber || '',
      b.accountName || '',
      b.logoColor || '#005596',
      '-'
    ]);
  });

  // Baris Kado Fisik
  if (gifts.physicalGift) {
    sGifts.appendRow([
      'Kado Fisik',
      gifts.physicalGift.recipientName || '',
      gifts.physicalGift.phone || '',
      gifts.physicalGift.recipientName || '',
      '-',
      gifts.physicalGift.address || ''
    ]);
  }

  // 7. TAB PENGATURAN UMUM
  var sSettings = getOrCreateSheet(ss, 'Pengaturan_Umum', [
    'Kategori / Kunci', 'Nilai (Value)', 'Keterangan'
  ]);
  clearDataRows(sSettings);

  var music = cfg.music || {};
  var settingsData = [
    ['targetDate', cfg.targetDate || '2026-12-20T08:00:00', 'Waktu target hitung mundur (ISO string)'],
    ['autoScrollSpeed', cfg.autoScrollSpeed || 2.8, 'Kecepatan autoscroll peramban'],
    ['autoScrollAutoStart', cfg.autoScrollAutoStart !== false ? 'true' : 'false', 'Mulai autoscroll otomatis setelah buka cover'],
    ['music_audioFile', music.audioFile || 'assets/audio/satu_shaf_di_belakangku.mp3', 'URL atau file musik MP3 latar'],
    ['music_title', music.title || 'Satu Shaf Di Belakangku - Arvian Dwi', 'Judul musik yang berputar'],
    ['gift_introText', gifts.introText || '', 'Teks pengantar di section Amplop Digital'],
    ['theme', cfg.theme || 'champagne', 'Tema palet warna undangan (champagne, sand, emerald)'],
    ['slug_undangan', CONFIG.DEFAULT_SLUG, 'Identifier unik pasangan (SaaS Ready)'],
    ['terakhir_diperbarui', Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'), 'Timestamp perubahan terakhir']
  ];

  settingsData.forEach(function(row) {
    sSettings.appendRow(row);
  });
}

/* ====================================================================
   3. BACA DATA DARI TAB TERSTRUKTUR (GET_CONFIG)
   ==================================================================== */
function readAllConfigFromSheets(ss) {
  initAllTabs(ss);

  // Fallback objek dasar
  var result = {
    couple: {
      groom: {},
      bride: {},
      heroPhoto: ''
    },
    groom: {},
    bride: {},
    heroPhoto: '',
    quote: {},
    targetDate: '2026-12-20T08:00:00',
    events: [],
    loveStory: [],
    gallery: [],
    gifts: {
      introText: '',
      qris: { enable: true, image: 'assets/images/qris.svg', accountName: '', nmid: '' },
      bankAccounts: [],
      physicalGift: { enable: true, recipientName: '', phone: '', address: '' }
    },
    music: {
      audioFile: 'assets/audio/satu_shaf_di_belakangku.mp3',
      title: 'Satu Shaf Di Belakangku - Arvian Dwi',
      fallbackSynthesizer: true
    },
    autoScrollSpeed: 2.8,
    autoScrollAutoStart: true,
    theme: 'champagne'
  };

  // 1. Baca Mempelai
  var sMempelai = ss.getSheetByName('Mempelai');
  if (sMempelai && sMempelai.getLastRow() > 1) {
    var rowsM = sMempelai.getRange(2, 1, sMempelai.getLastRow() - 1, 9).getValues();
    rowsM.forEach(function(r) {
      var peran = (r[0] || '').toString().toLowerCase();
      if (peran.indexOf('pria') !== -1) {
        result.groom = {
          fullName: r[1] || '',
          shortName: r[2] || '',
          childOrder: r[3] || '',
          fatherName: r[4] || '',
          motherName: r[5] || '',
          instagramHandle: r[6] || '',
          instagram: 'https://instagram.com/' + (r[6] || '').toString().replace('@', ''),
          photo: r[7] || '',
          bio: r[8] || ''
        };
      } else if (peran.indexOf('wanita') !== -1) {
        result.bride = {
          fullName: r[1] || '',
          shortName: r[2] || '',
          childOrder: r[3] || '',
          fatherName: r[4] || '',
          motherName: r[5] || '',
          instagramHandle: r[6] || '',
          instagram: 'https://instagram.com/' + (r[6] || '').toString().replace('@', ''),
          photo: r[7] || '',
          bio: r[8] || ''
        };
      } else if (peran.indexOf('hero') !== -1 || peran.indexOf('bersama') !== -1) {
        result.heroPhoto = r[7] || '';
      }
    });
    result.couple.groom = result.groom;
    result.couple.bride = result.bride;
    result.couple.heroPhoto = result.heroPhoto;
  }

  // 2. Baca Doa & Ayat
  var sDoa = ss.getSheetByName('Doa_Ayat');
  if (sDoa && sDoa.getLastRow() > 1) {
    var rDoa = sDoa.getRange(2, 1, 1, 4).getValues()[0];
    result.quote = {
      arabic: rDoa[1] || '',
      translation: rDoa[2] || '',
      source: rDoa[3] || ''
    };
  }

  // 3. Baca Rangkaian Acara
  var sAcara = ss.getSheetByName('Rangkaian_Acara');
  if (sAcara && sAcara.getLastRow() > 1) {
    var rowsA = sAcara.getRange(2, 1, sAcara.getLastRow() - 1, 10).getValues();
    rowsA.forEach(function(r, idx) {
      var rawMapsUrl = (r[8] || '').toString().trim();
      var rawMapsEmbed = (r[9] || '').toString().trim();
      var venue = (r[6] || '').toString().trim();
      var address = (r[7] || '').toString().trim();

      // Sanitasi jika tersimpan tag iframe
      if (rawMapsUrl.indexOf('<iframe') !== -1 || rawMapsUrl.indexOf('src=') !== -1) {
        var matchSrc = rawMapsUrl.match(/src=["']([^"']+)["']/i);
        if (matchSrc && matchSrc[1]) {
          if (!rawMapsEmbed || rawMapsEmbed.indexOf('Hotel Mulia') !== -1) {
            rawMapsEmbed = matchSrc[1];
          }
        }
        var query = [venue, address].filter(Boolean).join(', ');
        rawMapsUrl = query ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query) : 'https://maps.google.com';
      }
      if (rawMapsEmbed.indexOf('<iframe') !== -1 || rawMapsEmbed.indexOf('src=') !== -1) {
        var matchSrc2 = rawMapsEmbed.match(/src=["']([^"']+)["']/i);
        if (matchSrc2 && matchSrc2[1]) {
          rawMapsEmbed = matchSrc2[1];
        }
      }

      result.events.push({
        id: r[0] || ('acara-' + idx),
        title: r[1] || '',
        badge: r[2] || '',
        dayName: r[3] || '',
        dateFormatted: r[4] || '',
        time: r[5] || '',
        venue: venue,
        address: address,
        mapsUrl: rawMapsUrl,
        mapsEmbedUrl: rawMapsEmbed
      });
    });
  }

  // 4. Baca Kisah Cinta
  var sStory = ss.getSheetByName('Kisah_Cinta');
  if (sStory && sStory.getLastRow() > 1) {
    var rowsS = sStory.getRange(2, 1, sStory.getLastRow() - 1, 4).getValues();
    rowsS.forEach(function(r) {
      result.loveStory.push({
        year: r[1] || '',
        title: r[2] || '',
        description: r[3] || ''
      });
    });
  }

  // 5. Baca Galeri Foto
  var sGallery = ss.getSheetByName('Galeri_Foto');
  if (sGallery && sGallery.getLastRow() > 1) {
    var rowsG = sGallery.getRange(2, 1, sGallery.getLastRow() - 1, 4).getValues();
    rowsG.forEach(function(r) {
      result.gallery.push({
        title: r[1] || '',
        tag: r[2] || 'Prewedding',
        url: r[3] || ''
      });
    });
  }

  // 6. Baca Amplop Digital
  var sGifts = ss.getSheetByName('Amplop_Digital');
  if (sGifts && sGifts.getLastRow() > 1) {
    var rowsGift = sGifts.getRange(2, 1, sGifts.getLastRow() - 1, 6).getValues();
    rowsGift.forEach(function(r) {
      var tipe = (r[0] || '').toString().toLowerCase();
      if (tipe.indexOf('qris') !== -1) {
        result.gifts.qris = {
          enable: (r[5] || '').toString().toLowerCase() !== 'nonaktif',
          image: r[4] || 'assets/images/qris.svg',
          accountName: r[3] || '',
          nmid: (r[2] !== undefined && r[2] !== null) ? r[2].toString().trim() : ''
        };
      } else if (tipe.indexOf('bank') !== -1 || tipe.indexOf('rekening') !== -1) {
        result.gifts.bankAccounts.push({
          bank: r[1] || 'Bank',
          badge: r[1] || 'Bank',
          accountNumber: (r[2] !== undefined && r[2] !== null) ? r[2].toString().trim() : '',
          accountName: r[3] || '',
          logoColor: r[4] || '#005596'
        });
      } else if (tipe.indexOf('kado') !== -1 || tipe.indexOf('fisik') !== -1) {
        result.gifts.physicalGift = {
          enable: true,
          recipientName: r[1] || '',
          phone: (r[2] !== undefined && r[2] !== null) ? r[2].toString().trim() : '',
          address: r[5] || ''
        };
      }
    });
  }

  // 7. Baca Pengaturan Umum
  var sSettings = ss.getSheetByName('Pengaturan_Umum');
  if (sSettings && sSettings.getLastRow() > 1) {
    var rowsSet = sSettings.getRange(2, 1, sSettings.getLastRow() - 1, 2).getValues();
    rowsSet.forEach(function(r) {
      var key = (r[0] || '').toString();
      var val = r[1];
      if (key === 'targetDate' && val) result.targetDate = val;
      if (key === 'autoScrollSpeed' && val) result.autoScrollSpeed = parseFloat(val) || 2.8;
      if (key === 'autoScrollAutoStart') result.autoScrollAutoStart = (val === true || val === 'true');
      if (key === 'music_audioFile' && val) result.music.audioFile = val;
      if (key === 'music_title' && val) result.music.title = val;
      if (key === 'gift_introText' && val) result.gifts.introText = val;
      if (key === 'theme' && val) result.theme = val;
    });
  }

  return result;
}

/* ====================================================================
   4. BACA BUKU TAMU / RSVP
   ==================================================================== */
function readRSVPData(ss) {
  var sheet = ss.getSheetByName('Buku_Tamu_RSVP') || ss.getSheetByName('RSVP') || ss.getSheetByName('Sheet1');
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var wishes = [];

  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    var timestamp = r[0];
    var formattedTime = 'Baru saja';
    if (timestamp instanceof Date) {
      formattedTime = formatRelativeTime(timestamp);
    } else if (timestamp) {
      formattedTime = timestamp.toString();
    }

    wishes.push({
      timestamp: formattedTime,
      name: r[1] || 'Anonim',
      status: r[2] || 'hadir',
      guestCount: r[3] || 1,
      message: r[4] || '',
      time: formattedTime
    });
  }

  return wishes;
}

/* ====================================================================
   5. UPLOAD GAMBAR KE GOOGLE DRIVE & GENERATE PUBLIC LINK
   ==================================================================== */
function uploadBase64ToDrive(folderId, filename, dataUrl) {
  var folder = DriveApp.getFolderById(folderId);

  var parts = dataUrl.split(',');
  var metadata = parts[0];
  var base64Data = parts[1];

  var mimeType = 'image/jpeg';
  var matches = metadata.match(/:(.*?);/);
  if (matches && matches.length > 1) {
    mimeType = matches[1];
  }

  var decodedBytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decodedBytes, mimeType, filename);
  var file = folder.createFile(blob);

  // Buka akses agar gambar dapat di-load oleh siapa saja di internet
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Link Direct Google Usercontent CDN (sangat cepat & tidak ada popup download)
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

/* ====================================================================
   6. FUNGSI BANTUAN SAAS: DUPLIKASI MASTER TEMPLATE UNTUK KLIEN BARU
   ==================================================================== */
/**
 * Contoh implementasi SaaS: Otomatis menduplikasi spreadsheet ini untuk pasangan baru
 * @param {string} namaPasangan Contoh: "Dimas & Rara"
 * @returns {object} ID Spreadsheet baru dan Web App siap pakai
 */
function buatTemplateUndanganBaru(namaPasangan) {
  var activeSs = SpreadsheetApp.getActiveSpreadsheet();
  var title = 'Undangan Digital - ' + (namaPasangan || 'Klien Baru');
  var newFile = DriveApp.getFileById(activeSs.getId()).makeCopy(title);
  
  // Masukkan file ke folder khusus klien jika diperlukan
  var newSs = SpreadsheetApp.openById(newFile.getId());
  
  // Set identifier pasangan baru
  var sSettings = newSs.getSheetByName('Pengaturan_Umum');
  if (sSettings) {
    sSettings.appendRow(['slug_undangan', namaPasangan.toLowerCase().replace(/[^a-z0-9]/g, '-'), 'Slug Tenant']);
  }

  return {
    spreadsheetId: newSs.getId(),
    spreadsheetUrl: newSs.getUrl()
  };
}

/* ====================================================================
   7. HELPER UTILITIES
   ==================================================================== */
function clearDataRows(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function isSlugAvailable(ss, slug) {
  if (!slug) return false;
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var sUsers = ss.getSheetByName('Data_Pengguna');
  if (!sUsers || sUsers.getLastRow() <= 1) return true;

  var slugs = sUsers.getRange(2, 4, sUsers.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < slugs.length; i++) {
    if ((slugs[i][0] || '').toString().toLowerCase().trim() === slug.toLowerCase().trim()) {
      return false; // Sudah terpakai
    }
  }
  return true;
}

/**
 * Fungsi manual untuk merapikan Sheet1 langsung dari editor toolbar
 */
function jalankanPerapihanSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  rapikanSheet1(ss);
  initAllTabs(ss);
  Logger.log('Perapihan tab sheet berhasil diselesaikan!');
}

function formatRelativeTime(date) {
  try {
    var now = new Date();
    var diffMs = now.getTime() - date.getTime();
    var seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return 'Baru saja';
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + ' menit yang lalu';
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' jam yang lalu';
    var days = Math.floor(hours / 24);
    if (days < 30) return days + ' hari yang lalu';
    return Utilities.formatDate(date, 'Asia/Jakarta', 'dd MMM yyyy');
  } catch (e) {
    return 'Baru saja';
  }
}


