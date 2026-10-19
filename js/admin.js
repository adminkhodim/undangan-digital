/**
 * ====================================================================
 * LOGIKA PORTAL EDITOR & ADMIN UNDANGAN DIGITAL (SAAS MULTI-TENANT)
 * ====================================================================
 */

// 0. Deteksi Tenant Pasangan dari URL Query (?u=slug)
const urlParams = new URLSearchParams(window.location.search);
const tenantSlug = (urlParams.get('u') || urlParams.get('slug') || '').toLowerCase().trim();
const STORAGE_CONFIG_KEY = tenantSlug ? `wedding_custom_config_${tenantSlug}` : 'wedding_custom_config';
const STORAGE_WISHES_KEY = tenantSlug ? `wedding_wishes_${tenantSlug}` : 'wedding_wishes_arya_annisa';

let currentConfig = null;

document.addEventListener('DOMContentLoaded', () => {
  initTenantHeader();
  initTabs();
  checkTenantPinProtection(() => {
    loadConfig();
  });
  initDynamicListControls();
  initSaveButton();
  initDownloadButton();
  initGuestGenerator();
  initRSVPManagement();
  initPreviewListeners();
  initImageUploaders();
  initAutoScrollAdminControls();
  initThemeAdminControls();
});

/* ====================================================================
   0. INISIALISASI IDENTITAS TENANT & KEAMANAN PIN
   ==================================================================== */
function initTenantHeader() {
  const subtitleEl = document.querySelector('.brand-subtitle');
  if (subtitleEl && tenantSlug) {
    subtitleEl.innerHTML = `Kelola Undangan: <strong style="color:var(--primary); font-family:monospace; background:rgba(197,160,89,0.15); padding:2px 8px; border-radius:6px;">${tenantSlug}</strong>`;
  }

  // Sesuaikan link pratinjau agar membuka undangan pasangan yang bersangkutan
  const previewLink = document.querySelector('a.btn-secondary[title*="Pratinjau"]');
  if (previewLink) {
    previewLink.href = tenantSlug ? `undangan.html?u=${encodeURIComponent(tenantSlug)}` : 'undangan.html';
  }
}

function checkTenantPinProtection(onVerified) {
  // Jika tenant adalah default master (arya-annisa) atau kosong, tidak perlu PIN
  if (!tenantSlug || tenantSlug === 'arya-annisa') {
    if (onVerified) onVerified();
    return;
  }

  const sessionKey = `pin_verified_${tenantSlug}`;
  if (sessionStorage.getItem(sessionKey) === 'true') {
    if (onVerified) onVerified();
    return;
  }

  // Tampilkan dialog PIN
  const userPin = prompt(`Portal Admin Pasangan [${tenantSlug}]:\nMasukkan 6-digit PIN Keamanan Anda untuk mengelola undangan:`);
  if (!userPin) {
    alert('Akses dibatalkan. Anda akan dialihkan ke halaman utama.');
    window.location.href = `undangan.html?u=${encodeURIComponent(tenantSlug)}`;
    return;
  }

  // Verifikasi ke backend
  if (WEDDING_CONFIG.appsScriptUrl) {
    fetch(`${WEDDING_CONFIG.appsScriptUrl}?action=verify_pin&u=${encodeURIComponent(tenantSlug)}&pin=${encodeURIComponent(userPin)}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.verified) {
          sessionStorage.setItem(sessionKey, 'true');
          showAdminToast(`Selamat datang, ${res.namaPasangan || tenantSlug}!`, 'success');
          if (onVerified) onVerified();
        } else {
          alert('PIN Keamanan yang Anda masukkan salah.');
          window.location.reload();
        }
      })
      .catch(() => {
        // Fallback jika offline
        sessionStorage.setItem(sessionKey, 'true');
        if (onVerified) onVerified();
      });
  } else {
    sessionStorage.setItem(sessionKey, 'true');
    if (onVerified) onVerified();
  }
}

/* ====================================================================
   1. TAB SWITCHING
   ==================================================================== */
function initTabs() {
  const tabBtns = Array.from(document.querySelectorAll('.nav-tab-btn'));
  const panes = document.querySelectorAll('.tab-pane');
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const closeBtn = document.getElementById('btn-close-sidebar');
  const triggerBtn = document.getElementById('mobile-current-tab-trigger');
  const prevBtn = document.getElementById('mobile-nav-prev');
  const nextBtn = document.getElementById('mobile-nav-next');

  // Mobile Text / Icon elements
  const catEl = document.getElementById('mobile-tab-category');
  const titleEl = document.getElementById('mobile-tab-title');
  const iconEl = document.getElementById('mobile-tab-icon');
  const stepEl = document.getElementById('mobile-tab-step');

  function openDrawer() {
    sidebar?.classList.add('open');
    backdrop?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    sidebar?.classList.remove('open');
    backdrop?.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggleBtn?.addEventListener('click', openDrawer);
  triggerBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);

  function activateTab(index, smoothScroll = false) {
    if (index < 0 || index >= tabBtns.length) return;
    const btn = tabBtns[index];
    const targetId = btn.getAttribute('data-tab');
    const targetPane = document.getElementById(targetId);

    tabBtns.forEach(b => b.classList.remove('active'));
    panes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    if (targetPane) {
      targetPane.classList.add('active');
    }

    // Update Mobile Nav Bar
    const category = btn.getAttribute('data-category') || 'Pengaturan Konten';
    const title = btn.getAttribute('data-title') || btn.querySelector('span')?.textContent || '';
    const iconClass = btn.getAttribute('data-icon') || 'fa-user-group';
    const step = btn.getAttribute('data-step') || `${index + 1} / ${tabBtns.length}`;

    if (catEl) catEl.textContent = category;
    if (titleEl) titleEl.textContent = title;
    if (stepEl) stepEl.textContent = step;
    if (iconEl) {
      iconEl.className = `fa-solid ${iconClass} text-primary`;
    }

    // Update Prev / Next buttons state
    if (prevBtn) {
      prevBtn.disabled = (index === 0);
      prevBtn.style.opacity = index === 0 ? '0.35' : '1';
    }
    if (nextBtn) {
      nextBtn.disabled = (index === tabBtns.length - 1);
      nextBtn.style.opacity = index === tabBtns.length - 1 ? '0.35' : '1';
    }

    closeDrawer();

    if (smoothScroll && window.innerWidth <= 900) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  tabBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      activateTab(idx, true);
    });
  });

  prevBtn?.addEventListener('click', () => {
    const curIdx = tabBtns.findIndex(b => b.classList.contains('active'));
    if (curIdx > 0) {
      activateTab(curIdx - 1, true);
    }
  });

  nextBtn?.addEventListener('click', () => {
    const curIdx = tabBtns.findIndex(b => b.classList.contains('active'));
    if (curIdx < tabBtns.length - 1) {
      activateTab(curIdx + 1, true);
    }
  });

  // Global helper for step wizard buttons
  window.goToAdminTab = function(tabId) {
    const idx = tabBtns.findIndex(b => b.getAttribute('data-tab') === tabId);
    if (idx !== -1) {
      activateTab(idx, true);
    }
  };

  // Initialize with the currently active tab
  const initialIndex = tabBtns.findIndex(b => b.classList.contains('active'));
  activateTab(initialIndex >= 0 ? initialIndex : 0, false);
}

/* ====================================================================
   2. LOAD CONFIGURATION
   ==================================================================== */
function loadConfig() {
  // 1. Ambil dari localStorage atau fallback ke objek WEDDING_CONFIG dari config.js
  const localConfig = localStorage.getItem(STORAGE_CONFIG_KEY);
  if (localConfig) {
    try {
      currentConfig = JSON.parse(localConfig);
    } catch (e) {
      console.warn('Gagal parse localStorage config, menggunakan WEDDING_CONFIG bawaan');
      currentConfig = WEDDING_CONFIG;
    }
  } else {
    currentConfig = WEDDING_CONFIG;
  }

  populateForm(currentConfig);

  // 2. Tarik konfigurasi terbaru dari Google Spreadsheet (Cloud Multi-Tenant) jika tersedia
  if (WEDDING_CONFIG.appsScriptUrl) {
    const tenantParam = tenantSlug ? `&u=${encodeURIComponent(tenantSlug)}` : '';
    fetch(`${WEDDING_CONFIG.appsScriptUrl}?action=get_config${tenantParam}`)
      .then(res => res.json())
      .then(resJson => {
        if (resJson && resJson.status === 'success' && resJson.config) {
          currentConfig = resJson.config;
          localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(currentConfig));
          populateForm(currentConfig);
          console.log('[Admin] Konfigurasi cloud dari Google Sheets berhasil dimuat');
        }
      })
      .catch(err => {
        console.warn('[Admin] Menggunakan konfigurasi offline/lokal:', err);
      });
  }
}

function populateForm(cfg) {
  if (!cfg) return;

  const groom = (cfg.couple && cfg.couple.groom) || cfg.groom || {};
  const bride = (cfg.couple && cfg.couple.bride) || cfg.bride || {};
  const heroPhoto = (cfg.couple && cfg.couple.heroPhoto) || cfg.heroPhoto || 'assets/images/couple_hero.jpg';

  // 1. Mempelai Pria
  setVal('groom-fullName', groom.fullName);
  setVal('groom-shortName', groom.shortName);
  setVal('groom-childOrder', groom.childOrder);
  setVal('groom-fatherName', groom.fatherName);
  setVal('groom-motherName', groom.motherName);
  setVal('groom-instagramHandle', groom.instagramHandle);
  setVal('groom-bio', groom.bio);
  setVal('groom-photo', groom.photo);
  setImgSrc('preview-groom-photo', groom.photo);

  // 2. Mempelai Wanita
  setVal('bride-fullName', bride.fullName);
  setVal('bride-shortName', bride.shortName);
  setVal('bride-childOrder', bride.childOrder);
  setVal('bride-fatherName', bride.fatherName);
  setVal('bride-motherName', bride.motherName);
  setVal('bride-instagramHandle', bride.instagramHandle);
  setVal('bride-bio', bride.bio);
  setVal('bride-photo', bride.photo);
  setImgSrc('preview-bride-photo', bride.photo);

  // 3. Foto Hero Utama
  setVal('heroPhoto', heroPhoto);
  setImgSrc('preview-hero-photo', heroPhoto);

  // 4. Doa & Ayat
  const quote = cfg.quote || {};
  setVal('quote-arabic', quote.arabic);
  setVal('quote-translation', quote.translation);
  setVal('quote-source', quote.source);

  // 5. Acara & Target Countdown
  if (cfg.targetDate) {
    // Format YYYY-MM-DDTHH:mm untuk input datetime-local
    const dt = new Date(cfg.targetDate);
    if (!isNaN(dt.getTime())) {
      const pad = n => String(n).padStart(2, '0');
      const formatted = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
      setVal('targetDate', formatted);
    }
  }
  renderEventsEditList(cfg.events || []);

  // 6. Kisah Cinta
  renderStoryEditList(cfg.loveStory || []);

  // 7. Galeri Foto
  renderGalleryEditList(cfg.gallery || []);

  // 8. Hadiah, QRIS & Kado
  const gifts = cfg.gifts || {};
  setVal('gift-introText', gifts.introText);
  if (gifts.qris) {
    const qrisCheckbox = document.getElementById('qris-enable');
    if (qrisCheckbox) qrisCheckbox.checked = gifts.qris.enable !== false;
    setVal('qris-accountName', gifts.qris.accountName);
    setVal('qris-nmid', gifts.qris.nmid);
    setVal('qris-image', gifts.qris.image);
    setImgSrc('preview-qris-image', gifts.qris.image);
  }
  renderBankEditList(gifts.bankAccounts || []);
  if (gifts.physicalGift) {
    setVal('gift-recipientName', gifts.physicalGift.recipientName);
    setVal('gift-phone', gifts.physicalGift.phone);
    setVal('gift-address', gifts.physicalGift.address);
  }

  // 9. Musik
  const music = cfg.music || {};
  setVal('music-title', music.title);
  setVal('music-audioFile', music.audioFile);
  const audioPreview = document.getElementById('admin-audio-preview');
  if (audioPreview && music.audioFile) {
    audioPreview.src = music.audioFile;
  }

  // 10. Auto Scroll
  const scrollSpeed = cfg.autoScrollSpeed || 2.8;
  const speedSlider = document.getElementById('autoscroll-speed-slider');
  const speedInput = document.getElementById('autoscroll-speed-input');
  if (speedSlider) speedSlider.value = scrollSpeed;
  if (speedInput) speedInput.value = scrollSpeed;

  const autoStartCheck = document.getElementById('autoscroll-autostart');
  if (autoStartCheck) {
    autoStartCheck.checked = cfg.autoScrollAutoStart !== false;
  }

  // Trigger event agar badge & deskripsi terupdate visualnya
  if (speedSlider) {
    speedSlider.dispatchEvent(new Event('input'));
  }

  // 11. Tema Undangan
  const currentTheme = cfg.theme || 'champagne';
  const themeRadios = document.querySelectorAll('input[name="admin-theme"]');
  themeRadios.forEach(radio => {
    radio.checked = (radio.value === currentTheme);
  });
  updateThemeCardUI(currentTheme);

  // Update generator tamu dengan nama mempelai
  updateGuestSharePreview();
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function setImgSrc(id, src) {
  const el = document.getElementById(id);
  if (el && src) el.src = src;
}

/* ====================================================================
   3. PREVIEW LISTENERS (GAMBAR & AUDIO)
   ==================================================================== */
function initPreviewListeners() {
  const groomInput = document.getElementById('groom-photo');
  if (groomInput) {
    groomInput.addEventListener('input', () => setImgSrc('preview-groom-photo', groomInput.value));
  }

  const brideInput = document.getElementById('bride-photo');
  if (brideInput) {
    brideInput.addEventListener('input', () => setImgSrc('preview-bride-photo', brideInput.value));
  }

  const heroInput = document.getElementById('heroPhoto');
  if (heroInput) {
    heroInput.addEventListener('input', () => setImgSrc('preview-hero-photo', heroInput.value));
  }

  const musicInput = document.getElementById('music-audioFile');
  if (musicInput) {
    musicInput.addEventListener('change', () => {
      const audioPreview = document.getElementById('admin-audio-preview');
      if (audioPreview) audioPreview.src = musicInput.value;
    });
  }
}

/* ====================================================================
   4. DYNAMIC LISTS (EVENTS, STORIES, GALLERY, BANKS)
   ==================================================================== */
function initDynamicListControls() {
  // Tambah Acara
  document.getElementById('btn-add-event')?.addEventListener('click', () => {
    const list = getEventsFromDOM();
    list.push({
      id: 'acara-' + Date.now(),
      title: 'Sesi Acara Baru',
      badge: 'Spesial',
      dayName: 'Minggu',
      dateFormatted: '20 Desember 2026',
      time: '14.00 - 17.00 WIB',
      venue: 'Nama Gedung / Tempat',
      address: 'Alamat lengkap tempat acara',
      mapsUrl: 'https://maps.google.com',
      mapsEmbedUrl: ''
    });
    renderEventsEditList(list);
  });

  // Tambah Kisah Cinta
  document.getElementById('btn-add-story')?.addEventListener('click', () => {
    const list = getStoryFromDOM();
    list.push({
      year: '2026',
      title: 'Momen Indah Baru',
      description: 'Ceritakan kisah berkesan di sini...'
    });
    renderStoryEditList(list);
  });

  // Tambah Foto Galeri
  document.getElementById('btn-add-gallery')?.addEventListener('click', () => {
    const list = getGalleryFromDOM();
    list.push({
      url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
      title: 'Momen Bahagia',
      tag: 'Prewedding'
    });
    renderGalleryEditList(list);
  });

  // Tambah Rekening
  document.getElementById('btn-add-bank')?.addEventListener('click', () => {
    const list = getBanksFromDOM();
    list.push({
      bank: 'BCA',
      accountNumber: '1234567890',
      accountName: 'Nama Pemilik Rekening',
      logoColor: '#005596',
      badge: 'Bank BCA'
    });
    renderBankEditList(list);
  });
}

// Render Events
function renderEventsEditList(events) {
  const container = document.getElementById('events-edit-list');
  if (!container) return;

  container.innerHTML = events.map((evt, idx) => `
    <div class="item-box" data-event-idx="${idx}">
      <div class="item-box-top">
        <span class="item-box-title">Acara #${idx + 1}: ${evt.title}</span>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeEventItem(${idx})">
          <i class="fa-solid fa-trash-can"></i> Hapus Acara
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Nama Acara</label>
          <input type="text" class="form-control evt-title" value="${evt.title || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Label / Badge</label>
          <input type="text" class="form-control evt-badge" value="${evt.badge || ''}" placeholder="Contoh: Sakral & Intimate">
        </div>
        <div class="form-group">
          <label class="form-label">Hari & Tanggal</label>
          <input type="text" class="form-control evt-dateFormatted" value="${evt.dateFormatted || ''}" placeholder="20 Desember 2026">
        </div>
        <div class="form-group">
          <label class="form-label">Waktu / Jam</label>
          <input type="text" class="form-control evt-time" value="${evt.time || ''}" placeholder="08.00 - 10.00 WIB">
        </div>
        <div class="form-group col-span-2">
          <label class="form-label">Nama Gedung / Tempat</label>
          <input type="text" class="form-control evt-venue" value="${evt.venue || ''}" placeholder="Grand Ballroom Hotel...">
        </div>
        <div class="form-group col-span-2">
          <label class="form-label">Alamat Lengkap</label>
          <textarea class="form-control evt-address" placeholder="Jalan, kelurahan, kecamatan, kota...">${evt.address || ''}</textarea>
        </div>
        <div class="form-group col-span-2">
          <label class="form-label">Link Navigasi Google Maps</label>
          <input type="text" class="form-control evt-mapsUrl" value="${evt.mapsUrl || ''}">
        </div>
      </div>
    </div>
  `).join('');
}

window.removeEventItem = function(index) {
  const list = getEventsFromDOM();
  list.splice(index, 1);
  renderEventsEditList(list);
};

function getEventsFromDOM() {
  const boxes = document.querySelectorAll('#events-edit-list .item-box');
  const result = [];
  boxes.forEach((box, i) => {
    result.push({
      id: 'acara-' + i,
      title: box.querySelector('.evt-title')?.value || '',
      badge: box.querySelector('.evt-badge')?.value || '',
      dayName: 'Minggu',
      dateFormatted: box.querySelector('.evt-dateFormatted')?.value || '',
      time: box.querySelector('.evt-time')?.value || '',
      venue: box.querySelector('.evt-venue')?.value || '',
      address: box.querySelector('.evt-address')?.value || '',
      mapsUrl: box.querySelector('.evt-mapsUrl')?.value || 'https://maps.google.com',
      mapsEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.360875471801!2d106.79633637586884!3d-6.216047360882654!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f14d86b62057%3A0x6335a96ca2608447!2sHotel%20Mulia%20Senayan%2C%20Jakarta!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid'
    });
  });
  return result;
}

// Render Story
function renderStoryEditList(stories) {
  const container = document.getElementById('story-edit-list');
  if (!container) return;

  container.innerHTML = stories.map((item, idx) => `
    <div class="item-box">
      <div class="item-box-top">
        <span class="item-box-title">Momen #${idx + 1}</span>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeStoryItem(${idx})">
          <i class="fa-solid fa-trash-can"></i> Hapus
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Tahun / Waktu Momen</label>
          <input type="text" class="form-control story-year" value="${item.year || ''}" placeholder="Contoh: 2020">
        </div>
        <div class="form-group">
          <label class="form-label">Judul Momen</label>
          <input type="text" class="form-control story-title" value="${item.title || ''}" placeholder="Contoh: Pertama Kali Bertemu">
        </div>
        <div class="form-group col-span-2">
          <label class="form-label">Cerita / Deskripsi</label>
          <textarea class="form-control story-desc" placeholder="Tuliskan kisah perjalanan cinta...">${item.description || ''}</textarea>
        </div>
      </div>
    </div>
  `).join('');
}

window.removeStoryItem = function(index) {
  const list = getStoryFromDOM();
  list.splice(index, 1);
  renderStoryEditList(list);
};

function getStoryFromDOM() {
  const boxes = document.querySelectorAll('#story-edit-list .item-box');
  const result = [];
  boxes.forEach(box => {
    result.push({
      year: box.querySelector('.story-year')?.value || '',
      title: box.querySelector('.story-title')?.value || '',
      description: box.querySelector('.story-desc')?.value || ''
    });
  });
  return result;
}

// Render Gallery
function renderGalleryEditList(gallery) {
  const container = document.getElementById('gallery-edit-list');
  if (!container) return;

  container.innerHTML = gallery.map((item, idx) => `
    <div class="item-box">
      <div class="item-box-top">
        <span class="item-box-title">Foto #${idx + 1}</span>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeGalleryItem(${idx})">
          <i class="fa-solid fa-trash-can"></i> Hapus
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">URL / Path Foto</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" class="form-control gal-url" value="${item.url || ''}" oninput="updateGalPreview(this, ${idx})">
            <label class="btn btn-secondary btn-sm" style="cursor: pointer; white-space: nowrap;">
              <i class="fa-solid fa-cloud-arrow-up"></i> Upload
              <input type="file" accept="image/*" class="file-uploader-input" style="display: none;" onchange="uploadGalleryPhoto(this, ${idx})">
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Judul / Caption Foto</label>
          <input type="text" class="form-control gal-title" value="${item.title || ''}" placeholder="Kebersamaan Penuh Doa">
        </div>
        <div class="form-group col-span-2">
          <img id="gal-preview-${idx}" src="${item.url || ''}" alt="Preview" class="image-preview" style="width: 100px; height: 100px;">
        </div>
      </div>
    </div>
  `).join('');
}

window.uploadGalleryPhoto = function(fileInput, idx) {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      showAdminToast('Mengunggah foto galeri...', 'success');
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, dataUrl: e.target.result })
      });
      const data = await res.json();
      if (data.success && data.filePath) {
        const boxes = document.querySelectorAll('#gallery-edit-list .item-box');
        if (boxes[idx]) {
          const urlInput = boxes[idx].querySelector('.gal-url');
          if (urlInput) urlInput.value = data.filePath;
          const preview = document.getElementById(`gal-preview-${idx}`);
          if (preview) preview.src = data.filePath;
        }
        showAdminToast('Foto galeri berhasil diunggah!', 'success');
      } else {
        showAdminToast('Gagal upload: ' + (data.error || 'Server error'), 'error');
      }
    } catch (err) {
      showAdminToast('Gagal upload foto galeri', 'error');
    }
  };
  reader.readAsDataURL(file);
};

window.updateGalPreview = function(input, idx) {
  const preview = document.getElementById(`gal-preview-${idx}`);
  if (preview) preview.src = input.value;
};

window.removeGalleryItem = function(index) {
  const list = getGalleryFromDOM();
  list.splice(index, 1);
  renderGalleryEditList(list);
};

function getGalleryFromDOM() {
  const boxes = document.querySelectorAll('#gallery-edit-list .item-box');
  const result = [];
  boxes.forEach(box => {
    result.push({
      url: box.querySelector('.gal-url')?.value || '',
      title: box.querySelector('.gal-title')?.value || '',
      tag: 'Prewedding'
    });
  });
  return result;
}

// Render Banks
function renderBankEditList(banks) {
  const container = document.getElementById('bank-edit-list');
  if (!container) return;

  container.innerHTML = banks.map((item, idx) => `
    <div class="item-box">
      <div class="item-box-top">
        <span class="item-box-title">Rekening #${idx + 1}: ${item.badge || item.bank}</span>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeBankItem(${idx})">
          <i class="fa-solid fa-trash-can"></i> Hapus
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Nama Bank / Dompet Digital</label>
          <input type="text" class="form-control bank-badge" value="${item.badge || item.bank || ''}" placeholder="Contoh: Bank BCA / Mandiri / Dana">
        </div>
        <div class="form-group">
          <label class="form-label">Nomor Rekening</label>
          <input type="text" class="form-control bank-accNum" value="${item.accountNumber || ''}" placeholder="Contoh: 8415291039">
        </div>
        <div class="form-group col-span-2">
          <label class="form-label">Atas Nama (Pemilik Rekening)</label>
          <input type="text" class="form-control bank-accName" value="${item.accountName || ''}" placeholder="Contoh: Raden Arya Pratama">
        </div>
      </div>
    </div>
  `).join('');
}

window.removeBankItem = function(index) {
  const list = getBanksFromDOM();
  list.splice(index, 1);
  renderBankEditList(list);
};

function getBanksFromDOM() {
  const boxes = document.querySelectorAll('#bank-edit-list .item-box');
  const result = [];
  boxes.forEach(box => {
    result.push({
      bank: box.querySelector('.bank-badge')?.value || 'BANK',
      badge: box.querySelector('.bank-badge')?.value || 'Bank',
      accountNumber: box.querySelector('.bank-accNum')?.value || '',
      accountName: box.querySelector('.bank-accName')?.value || '',
      logoColor: '#005596'
    });
  });
  return result;
}

/* ====================================================================
   5. SAVE CONFIGURATION (KE LOCALSTORAGE + SERVER API)
   ==================================================================== */
function initSaveButton() {
  const saveBtn = document.getElementById('btn-save-all');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', async () => {
    const updated = collectAllDataFromDOM();

    // 1. Simpan ke LocalStorage agar langsung aktif di browser
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(updated));

    const originalBtnHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

    let cloudSaved = false;

    // 2. Simpan ke Google Spreadsheet (Sheet "Pengaturan_Admin") via Google Apps Script
    if (WEDDING_CONFIG.appsScriptUrl) {
      try {
        const gasResponse = await fetch(WEDDING_CONFIG.appsScriptUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'save_config',
            u: tenantSlug,
            config: updated
          })
        });
        const gasJson = await gasResponse.json();
        if (gasJson && gasJson.status === 'success') {
          cloudSaved = true;
          showAdminToast('Pengaturan berhasil disimpan permanen ke Google Sheets!', 'success');
        }
      } catch (gasErr) {
        console.warn('Gagal simpan ke Google Apps Script:', gasErr);
      }
    }

    // 3. Simpan ke config.js lokal (jika dijalankan via node server.js di localhost)
    try {
      const response = await fetch('/api/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updated)
      });

      const resJson = await response.json();
      if (resJson.success) {
        showAdminToast('Perubahan berhasil disimpan ke config.js lokal!', 'success');
      }
    } catch (err) {
      if (!cloudSaved) {
        showAdminToast('Perubahan berhasil disimpan di peramban Anda!', 'success');
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnHtml;
    }

    // Update pratinjau teks whatsapp
    updateGuestSharePreview();
  });
}

function collectAllDataFromDOM() {
  const groom = {
    fullName: getVal('groom-fullName'),
    shortName: getVal('groom-shortName'),
    childOrder: getVal('groom-childOrder'),
    fatherName: getVal('groom-fatherName'),
    motherName: getVal('groom-motherName'),
    instagram: 'https://instagram.com/' + getVal('groom-instagramHandle').replace('@', ''),
    instagramHandle: getVal('groom-instagramHandle'),
    photo: getVal('groom-photo'),
    bio: getVal('groom-bio')
  };

  const bride = {
    fullName: getVal('bride-fullName'),
    shortName: getVal('bride-shortName'),
    childOrder: getVal('bride-childOrder'),
    fatherName: getVal('bride-fatherName'),
    motherName: getVal('bride-motherName'),
    instagram: 'https://instagram.com/' + getVal('bride-instagramHandle').replace('@', ''),
    instagramHandle: getVal('bride-instagramHandle'),
    photo: getVal('bride-photo'),
    bio: getVal('bride-bio')
  };

  const heroPhoto = getVal('heroPhoto');

  const quote = {
    arabic: getVal('quote-arabic'),
    translation: getVal('quote-translation'),
    source: getVal('quote-source')
  };

  const targetDateInput = getVal('targetDate');
  const targetDate = targetDateInput ? targetDateInput + ':00' : '2026-12-20T08:00:00';

  const events = getEventsFromDOM();
  const loveStory = getStoryFromDOM();
  const gallery = getGalleryFromDOM();

  const qrisEnable = document.getElementById('qris-enable')?.checked ?? true;
  const gifts = {
    introText: getVal('gift-introText'),
    qris: {
      enable: qrisEnable,
      image: getVal('qris-image') || 'assets/images/qris.svg',
      accountName: getVal('qris-accountName') || 'Raden Arya & Annisa',
      nmid: getVal('qris-nmid') || 'ID1020261220999'
    },
    bankAccounts: getBanksFromDOM(),
    physicalGift: {
      enable: true,
      recipientName: getVal('gift-recipientName'),
      phone: getVal('gift-phone'),
      address: getVal('gift-address')
    }
  };

  const music = {
    audioFile: getVal('music-audioFile'),
    title: getVal('music-title'),
    fallbackSynthesizer: true
  };

  const autoScrollSpeed = parseFloat(getVal('autoscroll-speed-input') || getVal('autoscroll-speed-slider')) || 2.8;
  const autoScrollAutoStart = document.getElementById('autoscroll-autostart')?.checked ?? true;

  const selectedThemeRadio = document.querySelector('input[name="admin-theme"]:checked');
  const theme = selectedThemeRadio ? selectedThemeRadio.value : 'champagne';

  return {
    theme,
    couple: {
      groom,
      bride,
      heroPhoto
    },
    groom,
    bride,
    heroPhoto,
    quote,
    targetDate,
    events,
    googleCalendar: {
      title: `Pernikahan ${groom.shortName || 'Arya'} & ${bride.shortName || 'Annisa'}`,
      details: `Doa restu pernikahan ${groom.fullName} & ${bride.fullName}.`,
      location: events[0]?.venue || 'Lokasi Acara',
      start: '20261220T010000Z',
      end: '20261220T070000Z'
    },
    loveStory,
    gallery,
    gifts,
    music,
    initialWishes: WEDDING_CONFIG.initialWishes || [],
    appsScriptUrl: WEDDING_CONFIG.appsScriptUrl || '',
    spreadsheetUrl: WEDDING_CONFIG.spreadsheetUrl || '',
    autoScrollSpeed,
    autoScrollAutoStart
  };
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/* ====================================================================
   6. DOWNLOAD CONFIG.JS BUTTON
   ==================================================================== */
function initDownloadButton() {
  const downloadBtn = document.getElementById('btn-download-config');
  if (!downloadBtn) return;

  downloadBtn.addEventListener('click', () => {
    const updated = collectAllDataFromDOM();
    const fileContent = `/**
 * ====================================================================
 * KONFIGURASI DATA UNDANGAN PERNIKAHAN DIGITAL
 * Unduhan dari Portal Admin Editor
 * ====================================================================
 */

const WEDDING_CONFIG = ${JSON.stringify(updated, null, 2)};

// Shortcut aliases untuk kemudahan akses
if (typeof WEDDING_CONFIG.couple !== 'undefined') {
  WEDDING_CONFIG.groom = WEDDING_CONFIG.couple.groom;
  WEDDING_CONFIG.bride = WEDDING_CONFIG.couple.bride;
  WEDDING_CONFIG.heroPhoto = WEDDING_CONFIG.couple.heroPhoto;
}
`;

    const blob = new Blob([fileContent], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAdminToast('Berkas config.js berhasil diunduh!', 'success');
  });
}

/* ====================================================================
   7. GENERATOR TAUTAN TAMU & WHATSAPP
   ==================================================================== */
function initGuestGenerator() {
  const nameInput = document.getElementById('gen-guest-name');
  const phoneInput = document.getElementById('gen-guest-phone');
  const copyLinkBtn = document.getElementById('btn-copy-guest-link');
  const copyTextBtn = document.getElementById('btn-copy-wa-text');

  if (nameInput) {
    nameInput.addEventListener('input', updateGuestSharePreview);
  }
  if (phoneInput) {
    phoneInput.addEventListener('input', updateGuestSharePreview);
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      const link = document.getElementById('gen-guest-link')?.value;
      if (link) {
        navigator.clipboard.writeText(link).then(() => {
          showAdminToast('Tautan undangan berhasil disalin!', 'success');
        });
      }
    });
  }

  if (copyTextBtn) {
    copyTextBtn.addEventListener('click', () => {
      const text = document.getElementById('gen-message-preview')?.textContent;
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          showAdminToast('Teks pesan WhatsApp berhasil disalin!', 'success');
        });
      }
    });
  }
}

function updateGuestSharePreview() {
  const guestName = getVal('gen-guest-name') || 'Tamu Undangan';
  const phone = getVal('gen-guest-phone');
  const groomShort = getVal('groom-shortName') || 'Arya';
  const brideShort = getVal('bride-shortName') || 'Annisa';

  // Base URL
  const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', '').replace('admin', '');
  const tenantParam = tenantSlug ? `u=${encodeURIComponent(tenantSlug)}&` : '';
  const guestUrl = `${baseUrl.replace(/\/$/, '')}/?${tenantParam}to=${encodeURIComponent(guestName)}`;

  const linkInput = document.getElementById('gen-guest-link');
  if (linkInput) linkInput.value = guestUrl;

  const messageText = `Kepada Yth.
Bapak/Ibu/Saudara/i: *${guestName}*

Assalamu’alaikum Warahmatullahi Wabarakatuh.

Dengan memohon ridho dan rahmat Allah SWT, kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu pada hari bahagia pernikahan kami:

*${groomShort} & ${brideShort}*

Detail informasi acara serta konfirmasi kehadiran dapat diakses melalui tautan undangan digital resmi berikut:
🔗 ${guestUrl}

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan mendoakan kebaikan bagi bahtera rumah tangga kami.

Terima kasih atas perhatian dan doa hangatnya.

Wassalamu’alaikum Warahmatullahi Wabarakatuh.
Kami yang berbahagia,
*${groomShort} & ${brideShort}*`;

  const previewBox = document.getElementById('gen-message-preview');
  if (previewBox) previewBox.textContent = messageText;

  // Tombol Kirim WhatsApp
  const waBtn = document.getElementById('btn-send-whatsapp');
  if (waBtn) {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }
    const phoneParam = cleanPhone ? `phone=${cleanPhone}&` : '';
    waBtn.href = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(messageText)}`;
  }
}

/* ====================================================================
   8. MANAJEMEN BUKU TAMU & RSVP
   ==================================================================== */
function initRSVPManagement() {
  renderRSVPTable();

  // Tombol Sinkronkan dengan Google Sheets
  const btnSync = document.getElementById('btn-sync-sheets');
  btnSync?.addEventListener('click', async () => {
    if (!WEDDING_CONFIG.appsScriptUrl) {
      showAdminToast('URL Google Apps Script belum dikonfigurasi.', 'danger');
      return;
    }

    const originalHtml = btnSync.innerHTML;
    btnSync.disabled = true;
    btnSync.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menarik Data...';

    try {
      const tenantParam = tenantSlug ? `?action=get_wishes&u=${encodeURIComponent(tenantSlug)}` : '';
      const response = await fetch(`${WEDDING_CONFIG.appsScriptUrl}${tenantParam}`);
      const resJson = await response.json();
      if (resJson && resJson.status === 'success' && Array.isArray(resJson.data)) {
        localStorage.setItem(STORAGE_WISHES_KEY, JSON.stringify(resJson.data));
        renderRSVPTable();
        showAdminToast(`Berhasil disinkronkan! ${resJson.data.length} data ucapan ditarik dari Google Spreadsheet.`, 'success');
      } else {
        showAdminToast('Gagal memuat data dari Spreadsheet.', 'warning');
      }
    } catch (err) {
      console.error('Gagal sinkron:', err);
      showAdminToast('Koneksi ke Google Apps Script gagal. Periksa koneksi internet Anda.', 'danger');
    } finally {
      btnSync.disabled = false;
      btnSync.innerHTML = originalHtml;
    }
  });

  // Export Data Button
  document.getElementById('btn-export-wishes')?.addEventListener('click', () => {
    const wishes = JSON.parse(localStorage.getItem(STORAGE_WISHES_KEY)) || [];
    const jsonStr = JSON.stringify(wishes, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'buku_tamu_undangan.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAdminToast('Data buku tamu berhasil diekspor!', 'success');
  });

  // Clear All Wishes
  document.getElementById('btn-clear-wishes')?.addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh data ucapan di buku tamu?')) {
      localStorage.removeItem(STORAGE_WISHES_KEY);
      renderRSVPTable();
      showAdminToast('Seluruh data ucapan telah dibersihkan.', 'success');
    }
  });
}

function renderRSVPTable() {
  const tbody = document.getElementById('rsvp-table-body');
  if (!tbody) return;

  const wishes = JSON.parse(localStorage.getItem(STORAGE_WISHES_KEY)) || WEDDING_CONFIG.initialWishes || [];

  let countHadir = 0;
  let countRagu = 0;
  let countTidak = 0;

  wishes.forEach(item => {
    if (item.status === 'hadir') countHadir++;
    else if (item.status === 'ragu') countRagu++;
    else if (item.status === 'tidak-hadir') countTidak++;
  });

  const elHadir = document.getElementById('count-hadir');
  const elRagu = document.getElementById('count-ragu');
  const elTidak = document.getElementById('count-tidak');
  if (elHadir) elHadir.textContent = countHadir;
  if (elRagu) elRagu.textContent = countRagu;
  if (elTidak) elTidak.textContent = countTidak;

  if (wishes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada doa dan konfirmasi kehadiran.</td></tr>`;
    return;
  }

  tbody.innerHTML = wishes.map((item, idx) => {
    let badgeClass = 'badge-success';
    let statusText = 'Hadir';
    if (item.status === 'ragu') {
      badgeClass = 'badge-warning';
      statusText = 'Masih Ragu';
    } else if (item.status === 'tidak-hadir') {
      badgeClass = 'badge-danger';
      statusText = 'Tidak Hadir';
    }

    return `
      <tr>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td><span class="badge ${badgeClass}">${statusText}</span></td>
        <td style="max-width: 320px; word-break: break-word;">${escapeHtml(item.message)}</td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${item.time || '-'}</td>
        <td>
          <button type="button" class="btn btn-danger btn-sm" onclick="deleteWish(${idx})" title="Hapus ucapan ini">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.deleteWish = function(index) {
  let wishes = JSON.parse(localStorage.getItem(STORAGE_WISHES_KEY)) || WEDDING_CONFIG.initialWishes || [];
  if (index >= 0 && index < wishes.length) {
    wishes.splice(index, 1);
    localStorage.setItem(STORAGE_WISHES_KEY, JSON.stringify(wishes));
    renderRSVPTable();
    showAdminToast('Ucapan berhasil dihapus.', 'success');
  }
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

/* ====================================================================
   9. TOAST NOTIFICATION
   ==================================================================== */
function showAdminToast(msg, type = 'success') {
  const toast = document.getElementById('admin-toast');
  const toastText = document.getElementById('admin-toast-text');
  if (!toast || !toastText) return;

  toast.className = `admin-toast show ${type}`;
  toastText.textContent = msg;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

/* ====================================================================
   10. FILE UPLOADER LANGSUNG DARI KOMPUTER
   ==================================================================== */
function initImageUploaders() {
  document.addEventListener('change', async (e) => {
    const target = e.target;
    if (target && target.classList.contains('file-uploader-input') && !target.hasAttribute('onchange')) {
      const file = target.files[0];
      if (!file) return;

      const targetInputId = target.getAttribute('data-target-input');
      const targetPreviewId = target.getAttribute('data-target-preview');

      // Batasi ukuran maksimal 10MB
      if (file.size > 10 * 1024 * 1024) {
        showAdminToast('Ukuran file maksimal 10MB', 'error');
        return;
      }

      showAdminToast(`Mengunggah "${file.name}" ke Google Drive...`, 'success');

      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target.result;

        // 1. Coba upload langsung ke Google Drive via Google Apps Script
        if (WEDDING_CONFIG.appsScriptUrl) {
          try {
            const gasRes = await fetch(WEDDING_CONFIG.appsScriptUrl, {
              method: 'POST',
              body: JSON.stringify({
                action: 'upload_image',
                u: tenantSlug,
                filename: file.name,
                dataUrl: dataUrl
              })
            });
            const gasData = await gasRes.json();
            if (gasData && gasData.status === 'success' && gasData.fileUrl) {
              if (targetInputId) {
                const inputEl = document.getElementById(targetInputId);
                if (inputEl) {
                  inputEl.value = gasData.fileUrl;
                  inputEl.dispatchEvent(new Event('input'));
                }
              }
              if (targetPreviewId) {
                const prevEl = document.getElementById(targetPreviewId);
                if (prevEl) prevEl.src = gasData.fileUrl;
              }
              showAdminToast('Foto berhasil diunggah ke Google Drive dan diterapkan!', 'success');
              return;
            } else {
              const gasMsg = gasData && gasData.message ? gasData.message : 'Gagal memproses upload';
              console.warn('Gagal upload ke Google Apps Script:', gasMsg);
              // Jika di hosting cloud (bukan localhost), tampilkan langsung pesan error dari Apps Script
              const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
              if (!isLocalhost) {
                showAdminToast(`Gagal: ${gasMsg}`, 'error');
                return;
              }
            }
          } catch (gasErr) {
            console.warn('Gagal menghubungi Google Apps Script, mencoba server lokal:', gasErr);
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (!isLocalhost) {
              showAdminToast('Gagal menghubungi Google Apps Script. Periksa koneksi internet.', 'error');
              return;
            }
          }
        }

        // 2. Fallback: Upload ke server lokal jika dijalankan via node server.js
        try {
          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              dataUrl: dataUrl
            })
          });

          const data = await res.json();
          if (data.success && data.filePath) {
            if (targetInputId) {
              const inputEl = document.getElementById(targetInputId);
              if (inputEl) {
                inputEl.value = data.filePath;
                inputEl.dispatchEvent(new Event('input'));
              }
            }
            if (targetPreviewId) {
              const prevEl = document.getElementById(targetPreviewId);
              if (prevEl) prevEl.src = data.filePath;
            }
            showAdminToast('Foto berhasil diunggah ke server lokal!', 'success');
          } else {
            showAdminToast('Gagal upload: ' + (data.error || 'Terjadi kesalahan'), 'error');
          }
        } catch (err) {
          console.error('Upload error:', err);
          showAdminToast('Gagal mengunggah foto. Pastikan server lokal berjalan atau koneksi internet aktif.', 'error');
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

/* ====================================================================
   10. PENGATURAN KECEPATAN AUTO SCROLL DI PORTAL ADMIN
   ==================================================================== */
function initAutoScrollAdminControls() {
  const slider = document.getElementById('autoscroll-speed-slider');
  const input = document.getElementById('autoscroll-speed-input');
  const badge = document.getElementById('autoscroll-speed-badge');
  const desc = document.getElementById('autoscroll-speed-desc');
  const presets = document.querySelectorAll('.btn-speed-preset');

  function updateSpeedDisplay(val) {
    const num = parseFloat(val) || 2.8;
    if (slider) slider.value = num;
    if (input) input.value = num;
    if (badge) badge.textContent = `${num.toFixed(1)}x`;

    let descText = '(Sedang)';
    let badgeClass = 'badge-success';

    if (num < 1.6) {
      descText = '(Santai & Perlahan)';
      badgeClass = 'badge-secondary';
    } else if (num < 2.4) {
      descText = '(Sedang & Halus)';
      badgeClass = 'badge-secondary';
    } else if (num <= 3.2) {
      descText = '(Lincah & Rekomendasi)';
      badgeClass = 'badge-success';
    } else if (num <= 4.2) {
      descText = '(Cepat & Gesit)';
      badgeClass = 'badge-warning';
    } else {
      descText = '(Sangat Cepat / Kilat)';
      badgeClass = 'badge-danger';
    }

    if (desc) desc.textContent = descText;
    if (badge) {
      badge.className = `badge ${badgeClass}`;
    }

    // Highlight preset button if match
    presets.forEach(btn => {
      const pSpeed = parseFloat(btn.getAttribute('data-speed'));
      if (Math.abs(pSpeed - num) < 0.15) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
      } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }
    });
  }

  slider?.addEventListener('input', (e) => {
    updateSpeedDisplay(e.target.value);
  });

  input?.addEventListener('input', (e) => {
    updateSpeedDisplay(e.target.value);
  });

  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = btn.getAttribute('data-speed');
      updateSpeedDisplay(speed);
    });
  });
}

/* ====================================================================
   10. KONTROL PEMILIHAN TEMA DI PORTAL ADMIN
   ==================================================================== */
function initThemeAdminControls() {
  const cards = document.querySelectorAll('.theme-select-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        updateThemeCardUI(radio.value);
      }
    });
  });
}

function updateThemeCardUI(selectedTheme) {
  const themes = ['champagne', 'sand', 'emerald'];
  themes.forEach(t => {
    const card = document.getElementById(`theme-card-${t}`);
    if (card) {
      if (t === selectedTheme) {
        card.style.borderColor = 'var(--primary)';
        card.style.boxShadow = '0 6px 20px rgba(197, 160, 89, 0.25)';
        card.style.background = '#FFFFFF';
      } else {
        card.style.borderColor = 'var(--border-color)';
        card.style.boxShadow = 'none';
        card.style.background = '#FAF7F2';
      }
    }
  });

  // Perbarui tombol pratinjau agar langsung memuat tema yang dipilih
  const previewLink = document.querySelector('a.btn-secondary[title*="Pratinjau"]');
  if (previewLink) {
    const baseHref = tenantSlug ? `undangan.html?u=${encodeURIComponent(tenantSlug)}` : 'undangan.html';
    previewLink.href = `${baseHref}${baseHref.includes('?') ? '&' : '?'}theme=${encodeURIComponent(selectedTheme)}`;
  }
}

