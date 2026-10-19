/**
 * ====================================================================
 * APLIKASI UTAMA UNDANGAN DIGITAL PERNIKAHAN
 * ====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // 0. Deteksi Tenant SaaS dari URL Query (?u=slug)
  const urlParams = new URLSearchParams(window.location.search);
  const tenantSlug = urlParams.get('u') || urlParams.get('slug') || '';
  const tenantStorageKey = tenantSlug ? `wedding_custom_config_${tenantSlug}` : 'wedding_custom_config';

  // 0b. Deteksi & Terapkan Tema Undangan
  initThemeSwitcher(urlParams);

  // Sinkronisasi Custom Config dari LocalStorage jika ada
  const customConfigStr = localStorage.getItem(tenantStorageKey);
  if (customConfigStr) {
    try {
      const parsedConfig = JSON.parse(customConfigStr);
      Object.assign(WEDDING_CONFIG, parsedConfig);
      if (parsedConfig.couple) {
        WEDDING_CONFIG.couple = parsedConfig.couple;
        WEDDING_CONFIG.groom = parsedConfig.couple.groom;
        WEDDING_CONFIG.bride = parsedConfig.couple.bride;
        WEDDING_CONFIG.heroPhoto = parsedConfig.couple.heroPhoto;
      }
      if (parsedConfig.theme && !urlParams.get('theme')) {
        applyTheme(parsedConfig.theme);
      }
    } catch (e) {
      console.warn('Gagal parse custom config dari localStorage:', e);
    }
  }

  // Tarik update konfigurasi terbaru dari Google Spreadsheet (Cloud Multi-Tenant)
  if (WEDDING_CONFIG.appsScriptUrl) {
    const tenantParam = tenantSlug ? `&u=${encodeURIComponent(tenantSlug)}` : '';
    fetch(`${WEDDING_CONFIG.appsScriptUrl}?action=get_config${tenantParam}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.status === 'success' && res.config) {
          const cloudConfig = res.config;
          localStorage.setItem(tenantStorageKey, JSON.stringify(cloudConfig));
          Object.assign(WEDDING_CONFIG, cloudConfig);
          if (cloudConfig.couple) {
            WEDDING_CONFIG.couple = cloudConfig.couple;
            WEDDING_CONFIG.groom = cloudConfig.couple.groom;
            WEDDING_CONFIG.bride = cloudConfig.couple.bride;
            WEDDING_CONFIG.heroPhoto = cloudConfig.couple.heroPhoto;
          }
          if (cloudConfig.theme && !urlParams.get('theme')) {
            applyTheme(cloudConfig.theme);
          }

          // Perbarui judul tab browser sesuai nama pasangan
          const groomName = (cloudConfig.groom && (cloudConfig.groom.shortName || cloudConfig.groom.fullName)) || 'Arya';
          const brideName = (cloudConfig.bride && (cloudConfig.bride.shortName || cloudConfig.bride.fullName)) || 'Annisa';
          document.title = `The Wedding of ${groomName} & ${brideName}`;

          // Perbarui tampilan dengan data terbaru dari cloud
          try {
            initCoupleData();
            initCountdown();
            initEvents();
            initLoveStory();
            initGallery();
            initGifts();
            if (typeof observeReveals === 'function') {
              observeReveals();
            }
          } catch (err) {
            console.error('[App] Error updating cloud config view:', err);
          }
        }
        if (res && res.statusUser) {
          renderPreviewModeBadge(res.statusUser, res.paket);
        }
      })
      .catch((err) => {
        console.warn('[App] Gagal mengambil cloud config:', err);
      });
  }

  const tasks = [
    { name: 'GuestName', fn: initGuestName },
    { name: 'Cover', fn: initCover },
    { name: 'AutoScroll', fn: initAutoScroll },
    { name: 'Countdown', fn: initCountdown },
    { name: 'CoupleData', fn: initCoupleData },
    { name: 'Events', fn: initEvents },
    { name: 'LoveStory', fn: initLoveStory },
    { name: 'Gallery', fn: initGallery },
    { name: 'Gifts', fn: initGifts },
    { name: 'RSVP', fn: initRSVP },
    { name: 'ScrollAnimations', fn: initScrollAnimations },
    { name: 'ScrollSpy', fn: initScrollSpy },
    { name: 'Audio', fn: initAudio }
  ];

  tasks.forEach(task => {
    try {
      task.fn();
    } catch (err) {
      console.error(`[App] Error initializing ${task.name}:`, err);
    }
  });
});

/* ====================================================================
   0. MANAJEMEN TEMA UNDANGAN (MULTI-THEME SWITCHER)
   ==================================================================== */
function initThemeSwitcher(urlParams) {
  const queryTheme = urlParams ? (urlParams.get('theme') || '') : '';
  const activeTheme = queryTheme || (typeof WEDDING_CONFIG !== 'undefined' && WEDDING_CONFIG.theme) || 'champagne';
  
  applyTheme(activeTheme);

  // Jika URL memiliki parameter ?demo= atau ?theme=, tampilkan floating preview selector
  if (urlParams && (urlParams.has('theme') || urlParams.has('demo'))) {
    renderThemePreviewPill(activeTheme);
  }
}

window.applyTheme = function(themeName) {
  const validThemes = ['champagne', 'sand', 'emerald'];
  const theme = validThemes.includes(themeName) ? themeName : 'champagne';
  
  document.body.classList.remove('theme-champagne', 'theme-sand', 'theme-emerald');
  document.body.setAttribute('data-theme', theme);
  document.body.classList.add(`theme-${theme}`);
  
  // Update tombol active pada preview pill jika ada
  document.querySelectorAll('.theme-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
  });

  // Update theme-color browser
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    if (theme === 'sand') metaThemeColor.setAttribute('content', '#9E8062');
    else if (theme === 'emerald') metaThemeColor.setAttribute('content', '#20604A');
    else metaThemeColor.setAttribute('content', '#C5A059');
  }
};

function renderThemePreviewPill(currentTheme) {
  if (document.getElementById('theme-preview-pill')) return;

  const pill = document.createElement('div');
  pill.id = 'theme-preview-pill';
  pill.className = 'theme-preview-pill';
  pill.innerHTML = `
    <div class="theme-pill-label">
      <i class="fa-solid fa-palette"></i> Tema:
    </div>
    <div class="theme-pill-options">
      <button type="button" class="theme-pill-btn ${currentTheme === 'champagne' ? 'active' : ''}" data-theme="champagne" onclick="applyTheme('champagne')">Champagne</button>
      <button type="button" class="theme-pill-btn ${currentTheme === 'sand' ? 'active' : ''}" data-theme="sand" onclick="applyTheme('sand')">Sand</button>
      <button type="button" class="theme-pill-btn ${currentTheme === 'emerald' ? 'active' : ''}" data-theme="emerald" onclick="applyTheme('emerald')">Emerald</button>
    </div>
  `;
  document.body.appendChild(pill);
}

/* ====================================================================
   1. EKSTRAKSI NAMA TAMU DARI URL PARAMETER (?to=Nama+Tamu)
   ==================================================================== */
function initGuestName() {
  const urlParams = new URLSearchParams(window.location.search);
  const guestNameParam = urlParams.get('to') || urlParams.get('u') || urlParams.get('guest');
  
  const guestDisplayElements = document.querySelectorAll('.guest-name-placeholder');
  const guestName = guestNameParam ? decodeURIComponent(guestNameParam.replace(/\+/g, ' ')) : 'Tamu Undangan';
  
  guestDisplayElements.forEach(el => {
    el.textContent = guestName;
  });

  // Pre-fill input nama di RSVP
  const rsvpNameInput = document.getElementById('rsvp-name');
  if (rsvpNameInput && guestName !== 'Tamu Undangan') {
    rsvpNameInput.value = guestName;
  }
}

/* ====================================================================
   2. COVER OVERLAY & BUKA UNDANGAN
   ==================================================================== */
function initCover() {
  const coverOverlay = document.getElementById('cover-overlay');
  const btnOpen = document.getElementById('btn-open-invitation');
  const bottomDock = document.getElementById('bottom-dock');
  const musicToggle = document.getElementById('music-toggle');
  const autoscrollToggle = document.getElementById('autoscroll-toggle');

  if (!btnOpen || !coverOverlay) return;

  btnOpen.addEventListener('click', () => {
    coverOverlay.classList.add('opened');
    document.body.style.overflow = 'auto';

    if (bottomDock) bottomDock.classList.add('active');
    if (musicToggle) musicToggle.style.display = 'flex';
    if (autoscrollToggle) autoscrollToggle.style.display = 'flex';

    // Play Music
    playBackgroundMusic();

    // Trigger reveal animations immediately
    if (typeof observeReveals === 'function') observeReveals();
    else checkReveals();
    setTimeout(() => {
      if (typeof observeReveals === 'function') observeReveals();
      else checkReveals();
      window.dispatchEvent(new Event('scroll'));
    }, 300);

    // Aktifkan Auto Scroll secara otomatis setelah cover selesai membuka (jika diaktifkan di admin)
    if (typeof WEDDING_CONFIG === 'undefined' || WEDDING_CONFIG.autoScrollAutoStart !== false) {
      setTimeout(() => {
        startAutoScroll();
      }, 800);
    }
  });
}

/* ====================================================================
   AUTO SCROLL ENGINE & KONTROL INTERAKTIF
   ==================================================================== */
let isAutoScrolling = false;
let autoScrollAnimId = null;
const AUTO_SCROLL_SPEED = (typeof WEDDING_CONFIG !== 'undefined' && WEDDING_CONFIG.autoScrollSpeed) ? WEDDING_CONFIG.autoScrollSpeed : 2.8; // Kecepatan optimal (~170px per detik pada 60fps)
let lastAutoScrollTimestamp = null;

function initAutoScroll() {
  const autoscrollBtn = document.getElementById('autoscroll-toggle');
  if (autoscrollBtn) {
    autoscrollBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAutoScroll();
    });
  }

  // Jeda auto-scroll saat pengguna berinteraksi manual (scroll / sentuh layar)
  const handleUserInterrupt = (e) => {
    if (isAutoScrolling) {
      if (e && e.target && (e.target.closest('#autoscroll-toggle') || e.target.closest('#music-toggle'))) {
        return;
      }
      stopAutoScroll();
    }
  };

  window.addEventListener('wheel', handleUserInterrupt, { passive: true });
  window.addEventListener('touchstart', handleUserInterrupt, { passive: true });
  window.addEventListener('pointerdown', handleUserInterrupt, { passive: true });

  // Jeda saat klik salah satu link di bottom dock agar navigasi anchor tidak terganggu
  const dockLinks = document.querySelectorAll('#bottom-dock a');
  dockLinks.forEach(link => {
    link.addEventListener('click', () => {
      stopAutoScroll();
    });
  });
}

function startAutoScroll() {
  if (isAutoScrolling) return;
  isAutoScrolling = true;
  lastAutoScrollTimestamp = null;
  document.documentElement.classList.add('is-autoscrolling');
  updateAutoScrollBtn(true);

  function autoScrollStep(timestamp) {
    if (!isAutoScrolling) return;

    if (!lastAutoScrollTimestamp) lastAutoScrollTimestamp = timestamp;
    const elapsed = timestamp - lastAutoScrollTimestamp;
    lastAutoScrollTimestamp = timestamp;

    // Normalisasi delta waktu agar kecepatan stabil di layar 60Hz, 90Hz, 120Hz
    const deltaMultiplier = Math.min(Math.max(elapsed / 16.67, 0.5), 2.5);
    const scrollStep = AUTO_SCROLL_SPEED * deltaMultiplier;

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (window.scrollY >= maxScroll - 6) {
      // Sampai di bagian bawah halaman
      stopAutoScroll();
      return;
    }

    window.scrollBy(0, scrollStep);
    autoScrollAnimId = requestAnimationFrame(autoScrollStep);
  }

  autoScrollAnimId = requestAnimationFrame(autoScrollStep);
}

function stopAutoScroll() {
  isAutoScrolling = false;
  if (autoScrollAnimId) {
    cancelAnimationFrame(autoScrollAnimId);
    autoScrollAnimId = null;
  }
  document.documentElement.classList.remove('is-autoscrolling');
  updateAutoScrollBtn(false);
}

function toggleAutoScroll() {
  if (isAutoScrolling) {
    stopAutoScroll();
    if (typeof showToast === 'function') {
      showToast('Auto scroll dijeda');
    }
  } else {
    // Jika sudah di paling bawah, gulir sedikit ke atas
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (window.scrollY >= maxScroll - 10) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => startAutoScroll(), 600);
    } else {
      startAutoScroll();
    }
    if (typeof showToast === 'function') {
      showToast('Auto scroll diaktifkan');
    }
  }
}

function updateAutoScrollBtn(scrolling) {
  const btn = document.getElementById('autoscroll-toggle');
  if (!btn) return;

  if (scrolling) {
    btn.classList.add('scrolling');
    btn.innerHTML = '<i class="fa-solid fa-angles-down"></i>';
    btn.setAttribute('title', 'Auto Scroll Aktif (Klik untuk Jeda)');
  } else {
    btn.classList.remove('scrolling');
    btn.innerHTML = '<i class="fa-solid fa-play" style="margin-left: 2px;"></i>';
    btn.setAttribute('title', 'Lanjutkan Auto Scroll');
  }
}

/* ====================================================================
   3. BACKGROUND MUSIC & WEB AUDIO SYNTHESIZER FALLBACK
   ==================================================================== */
let audioPlayer = null;
let isMusicPlaying = false;
let audioContext = null;
let synthInterval = null;

function initAudio() {
  const musicToggle = document.getElementById('music-toggle');
  audioPlayer = document.getElementById('wedding-audio');
  
  if (!audioPlayer) {
    audioPlayer = new Audio();
    audioPlayer.loop = true;
    audioPlayer.src = WEDDING_CONFIG.music.audioFile;
  }

  if (musicToggle) {
    musicToggle.addEventListener('click', toggleMusic);
  }
}

function playBackgroundMusic() {
  const musicToggle = document.getElementById('music-toggle');
  
  if (audioPlayer) {
    const playPromise = audioPlayer.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          isMusicPlaying = true;
          if (musicToggle) musicToggle.classList.add('playing');
        })
        .catch((err) => {
          console.warn('Audio play blocked or error, activating fallback ambient piano:', err);
          startAmbientPianoSynthesizer();
          isMusicPlaying = true;
          if (musicToggle) musicToggle.classList.add('playing');
        });
    }
  } else {
    startAmbientPianoSynthesizer();
    isMusicPlaying = true;
    if (musicToggle) musicToggle.classList.add('playing');
  }
}

function toggleMusic() {
  const musicToggle = document.getElementById('music-toggle');

  if (isMusicPlaying) {
    if (audioPlayer && !audioPlayer.paused) {
      audioPlayer.pause();
    }
    stopAmbientPianoSynthesizer();
    isMusicPlaying = false;
    if (musicToggle) musicToggle.classList.remove('playing');
  } else {
    playBackgroundMusic();
  }
}

// Gentle ambient romantic piano harp synthesizer using Web Audio API
function startAmbientPianoSynthesizer() {
  if (synthInterval) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();

    // Romantic Canon in D chords notes (Hz)
    const notes = [
      [293.66, 369.99, 440.00], // D Major
      [220.00, 277.18, 329.63], // A Major
      [246.94, 293.66, 369.99], // B Minor
      [185.00, 220.00, 277.18], // F# Minor
      [196.00, 246.94, 293.66], // G Major
      [146.83, 185.00, 220.00], // D Major
      [196.00, 246.94, 293.66], // G Major
      [220.00, 277.18, 329.63]  // A Major
    ];

    let chordIndex = 0;

    const playChord = () => {
      if (!isMusicPlaying || !audioContext) return;
      const currentChord = notes[chordIndex % notes.length];
      chordIndex++;

      currentChord.forEach((freq, idx) => {
        setTimeout(() => {
          if (!isMusicPlaying) return;
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioContext.currentTime);

          // Soft bell/piano envelope
          gain.gain.setValueAtTime(0.001, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 3.2);

          osc.connect(gain);
          gain.connect(audioContext.destination);

          osc.start();
          osc.stop(audioContext.currentTime + 3.3);
        }, idx * 280);
      });
    };

    playChord();
    synthInterval = setInterval(playChord, 2800);
  } catch (e) {
    console.error('Web Audio API not supported', e);
  }
}

function stopAmbientPianoSynthesizer() {
  if (synthInterval) {
    clearInterval(synthInterval);
    synthInterval = null;
  }
}

/* ====================================================================
   4. COUNTDOWN TIMER
   ==================================================================== */
function initCountdown() {
  const targetDate = new Date(WEDDING_CONFIG.targetDate).getTime();

  function updateTimer() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      document.getElementById('days').textContent = '00';
      document.getElementById('hours').textContent = '00';
      document.getElementById('minutes').textContent = '00';
      document.getElementById('seconds').textContent = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);

  // Google Calendar Link Generator
  const gcalBtn = document.getElementById('btn-add-calendar');
  if (gcalBtn) {
    const groomName = (WEDDING_CONFIG.groom && (WEDDING_CONFIG.groom.shortName || WEDDING_CONFIG.groom.fullName)) || 'Arya';
    const brideName = (WEDDING_CONFIG.bride && (WEDDING_CONFIG.bride.shortName || WEDDING_CONFIG.bride.fullName)) || 'Annisa';
    const cal = WEDDING_CONFIG.googleCalendar || {
      title: `Pernikahan ${groomName} & ${brideName}`,
      details: `Doa restu pernikahan ${groomName} & ${brideName}`,
      location: (WEDDING_CONFIG.events && WEDDING_CONFIG.events[0] && WEDDING_CONFIG.events[0].venue) || 'Tempat Acara'
    };
    const dt = new Date(WEDDING_CONFIG.targetDate);
    const startIso = !isNaN(dt.getTime()) ? dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : '20261023T010000Z';
    const endIso = !isNaN(dt.getTime()) ? new Date(dt.getTime() + 4 * 3600000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : '20261023T050000Z';
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(cal.title || `Pernikahan ${groomName} & ${brideName}`)}&dates=${cal.start || startIso}/${cal.end || endIso}&details=${encodeURIComponent(cal.details || '')}&location=${encodeURIComponent(cal.location || '')}`;
    gcalBtn.href = gcalUrl;
  }
}

/* ====================================================================
   5. FORMAT TANGGAL SAMPUL & HERO BANNER
   ==================================================================== */
function formatInvitationDate() {
  let day = '';
  let month = '';
  let year = '';
  let fullDateText = '';
  let dayName = '';

  const idDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
  const idMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const urlParams = new URLSearchParams(window.location.search);
  const isMultiTenant = !!(urlParams.get('u') || urlParams.get('slug'));

  // 1. Ambil dari event pertama jika tersedia
  if (WEDDING_CONFIG.events && WEDDING_CONFIG.events.length > 0) {
    const ev = WEDDING_CONFIG.events[0];
    dayName = ev.dayName || '';
    fullDateText = ev.dateFormatted || '';

    if (fullDateText) {
      // Contoh format: "23 Oktober 2026" atau "23-10-2026" atau "2026-10-23"
      const parts = fullDateText.trim().split(/[\s,.-]+/);
      if (parts.length >= 3) {
        if (parts[0].length === 4) {
          // Format ISO: YYYY-MM-DD
          year = parts[0];
          month = parts[1].padStart(2, '0');
          day = parts[2].padStart(2, '0');
        } else {
          // Format DD Bulan YYYY atau DD-MM-YYYY
          day = parts[0].padStart(2, '0');
          const monthsMap = {
            'januari': '01', 'jan': '01', '01': '01', '1': '01',
            'februari': '02', 'feb': '02', '02': '02', '2': '02',
            'maret': '03', 'mar': '03', '03': '03', '3': '03',
            'april': '04', 'apr': '04', '04': '04', '4': '04',
            'mei': '05', '05': '05', '5': '05',
            'juni': '06', 'jun': '06', '06': '06', '6': '06',
            'juli': '07', 'jul': '07', '07': '07', '7': '07',
            'agustus': '08', 'ags': '08', 'agu': '08', '08': '08', '8': '08',
            'september': '09', 'sep': '09', '09': '09', '9': '09',
            'oktober': '10', 'okt': '10', '10': '10',
            'november': '11', 'nov': '11', '11': '11',
            'desember': '12', 'des': '12', '12': '12'
          };
          const mKey = parts[1].toLowerCase();
          if (monthsMap[mKey]) month = monthsMap[mKey];
          year = parts[2];
        }
      }
    }
  }

  // 2. Jika targetDate ada dan data tanggal belum lengkap, sinkronkan dari targetDate
  if (WEDDING_CONFIG.targetDate) {
    const dt = new Date(WEDDING_CONFIG.targetDate);
    if (!isNaN(dt.getTime())) {
      if (!day) day = String(dt.getDate()).padStart(2, '0');
      if (!month) month = String(dt.getMonth() + 1).padStart(2, '0');
      if (!year) year = String(dt.getFullYear());
      if (!dayName) dayName = idDays[dt.getDay()];
      if (!fullDateText) fullDateText = `${dt.getDate()} ${idMonths[dt.getMonth()]} ${dt.getFullYear()}`;
    }
  }

  // Fallback default hanya jika BUKAN multi-tenant (halaman demo utama)
  if (!isMultiTenant) {
    if (!day) day = '20';
    if (!month) month = '12';
    if (!year) year = '2026';
    if (!fullDateText) fullDateText = `${day} ${idMonths[parseInt(month, 10) - 1] || 'Desember'} ${year}`;
    if (!dayName) dayName = 'Minggu';
  }

  // Update Cover Date Text: "23 . 10 . 2026"
  const coverDateEl = document.getElementById('cover-date-text');
  if (coverDateEl) {
    if (day && month && year) {
      coverDateEl.textContent = `${day} . ${month} . ${year}`;
    } else {
      coverDateEl.textContent = '';
    }
  }

  // Update Hero Date Badge: "Jum'at, 23 Oktober 2026"
  const heroDateEl = document.getElementById('hero-date-badge');
  if (heroDateEl) {
    if (fullDateText) {
      heroDateEl.textContent = (dayName && !fullDateText.includes(dayName)) ? `${dayName}, ${fullDateText}` : fullDateText;
    } else {
      heroDateEl.textContent = '';
    }
  }
}

/* ====================================================================
   5b. DATA MEMPELAI & QUOTE
   ==================================================================== */
function initCoupleData() {
  const groom = (WEDDING_CONFIG.couple && WEDDING_CONFIG.couple.groom) || WEDDING_CONFIG.groom || {};
  const bride = (WEDDING_CONFIG.couple && WEDDING_CONFIG.couple.bride) || WEDDING_CONFIG.bride || {};
  const quote = WEDDING_CONFIG.quote || {};

  // Quote
  const arabicEl = document.getElementById('quote-arabic');
  const transEl = document.getElementById('quote-translation');
  const sourceEl = document.getElementById('quote-source');
  if (arabicEl && quote.arabic) arabicEl.textContent = quote.arabic;
  if (transEl && quote.translation) transEl.textContent = `"${quote.translation}"`;
  if (sourceEl && quote.source) sourceEl.textContent = quote.source;

  const formatMotherTitle = (name) => {
    if (!name) return '';
    const trimmed = name.trim();
    if (/^(ibu|hj\.|hajjah|ny\.|dr\.)/i.test(trimmed)) {
      return trimmed;
    }
    return `Ibu ${trimmed}`;
  };

  // Groom
  const groomNameEl = document.getElementById('groom-name');
  if (groomNameEl && groom.fullName) groomNameEl.textContent = groom.fullName;
  const groomOrderEl = document.getElementById('groom-order');
  if (groomOrderEl && groom.childOrder) groomOrderEl.textContent = groom.childOrder;
  const groomParentsEl = document.getElementById('groom-parents');
  if (groomParentsEl && (groom.fatherName || groom.motherName)) {
    const fName = (groom.fatherName || '').trim();
    const mName = formatMotherTitle(groom.motherName);
    groomParentsEl.textContent = (fName && mName) ? `${fName} & ${mName}` : (fName || mName);
  }
  const groomAddressEl = document.getElementById('groom-address');
  if (groomAddressEl) {
    const gAddr = (groom.address || groom.origin || '').trim();
    if (gAddr) {
      groomAddressEl.innerHTML = `<i class="fa-solid fa-location-dot text-gold" style="font-size: 0.78rem;"></i> <span>${escapeHtml(gAddr)}</span>`;
      groomAddressEl.style.display = 'flex';
    } else {
      groomAddressEl.style.display = 'none';
    }
  }
  const groomBioEl = document.getElementById('groom-bio');
  if (groomBioEl && groom.bio) groomBioEl.textContent = groom.bio;
  const groomIg = document.getElementById('groom-ig');
  if (groomIg && groom.instagram) {
    groomIg.href = groom.instagram;
    groomIg.textContent = groom.instagramHandle || '@instagram';
  }

  // Bride
  const brideNameEl = document.getElementById('bride-name');
  if (brideNameEl && bride.fullName) brideNameEl.textContent = bride.fullName;
  const brideOrderEl = document.getElementById('bride-order');
  if (brideOrderEl && bride.childOrder) brideOrderEl.textContent = bride.childOrder;
  const brideParentsEl = document.getElementById('bride-parents');
  if (brideParentsEl && (bride.fatherName || bride.motherName)) {
    const fName = (bride.fatherName || '').trim();
    const mName = formatMotherTitle(bride.motherName);
    brideParentsEl.textContent = (fName && mName) ? `${fName} & ${mName}` : (fName || mName);
  }
  const brideAddressEl = document.getElementById('bride-address');
  if (brideAddressEl) {
    const bAddr = (bride.address || bride.origin || '').trim();
    if (bAddr) {
      brideAddressEl.innerHTML = `<i class="fa-solid fa-location-dot text-gold" style="font-size: 0.78rem;"></i> <span>${escapeHtml(bAddr)}</span>`;
      brideAddressEl.style.display = 'flex';
    } else {
      brideAddressEl.style.display = 'none';
    }
  }
  const brideBioEl = document.getElementById('bride-bio');
  if (brideBioEl && bride.bio) brideBioEl.textContent = bride.bio;
  const brideIg = document.getElementById('bride-ig');
  if (brideIg && bride.instagram) {
    brideIg.href = bride.instagram;
    brideIg.textContent = bride.instagramHandle || '@instagram';
  }

  const urlParams = new URLSearchParams(window.location.search);
  const isMultiTenant = !!(urlParams.get('u') || urlParams.get('slug'));

  // Update Foto Mempelai & Hero
  const groomPhotoEl = document.getElementById('groom-photo');
  if (groomPhotoEl && groom.photo) {
    if (!isMultiTenant || !groom.photo.includes('groom.jpg')) {
      groomPhotoEl.src = groom.photo;
    }
  }

  const bridePhotoEl = document.getElementById('bride-photo');
  if (bridePhotoEl && bride.photo) {
    if (!isMultiTenant || !bride.photo.includes('bride.jpg')) {
      bridePhotoEl.src = bride.photo;
    }
  }

  let heroPhoto = (WEDDING_CONFIG.couple && WEDDING_CONFIG.couple.heroPhoto) || WEDDING_CONFIG.heroPhoto;
  if (isMultiTenant && heroPhoto && heroPhoto.includes('couple_hero.jpg')) {
    heroPhoto = '';
  }

  if (heroPhoto) {
    const heroSec = document.getElementById('hero');
    if (heroSec) {
      heroSec.style.setProperty('background-image', `linear-gradient(180deg, rgba(23, 21, 19, 0.1) 0%, rgba(23, 21, 19, 0.85) 100%), url('${heroPhoto}')`, 'important');
    }
    const coverContainer = document.querySelector('.cover-container');
    if (coverContainer) {
      coverContainer.style.setProperty('background-image', `linear-gradient(180deg, rgba(23, 21, 19, 0.5) 0%, rgba(23, 21, 19, 0.75) 100%), url('${heroPhoto}')`, 'important');
    }
  }

  // Update Nama Cover, Hero, dan Closing
  const groomShort = groom.shortName || 'Arya';
  const brideShort = bride.shortName || 'Annisa';

  const coverGroom = document.getElementById('cover-groom-name');
  if (coverGroom) coverGroom.textContent = groomShort;

  const coverBride = document.getElementById('cover-bride-name');
  if (coverBride) coverBride.textContent = brideShort;

  const heroNames = document.getElementById('hero-names');
  if (heroNames) heroNames.textContent = `${groomShort} & ${brideShort}`;

  const closingNames = document.querySelector('.closing-names');
  if (closingNames) closingNames.textContent = `${groomShort} & ${brideShort}`;

  // Format Tanggal Cover & Hero
  formatInvitationDate();
}

/* ====================================================================
   6. RANGKAIAN ACARA & MAPS TOGGLE
   ==================================================================== */
function parseMapUrls(rawUrl, rawEmbedUrl, venue, address) {
  let navUrl = (rawUrl || '').toString().trim();
  let embedUrl = (rawEmbedUrl || '').toString().trim();

  // Jika navUrl berisi tag <iframe>
  if (navUrl.includes('<iframe') || navUrl.includes('src=')) {
    const srcMatch = navUrl.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      embedUrl = srcMatch[1];
    }
    const query = [venue, address].filter(Boolean).join(', ');
    navUrl = query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : 'https://maps.google.com';
  }

  // Jika embedUrl berisi tag <iframe>
  if (embedUrl.includes('<iframe') || embedUrl.includes('src=')) {
    const srcMatch = embedUrl.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      embedUrl = srcMatch[1];
    }
  }

  // Jika embedUrl belum ada tapi navUrl adalah url embed
  if (!embedUrl && navUrl.includes('/maps/embed')) {
    embedUrl = navUrl;
    const query = [venue, address].filter(Boolean).join(', ');
    navUrl = query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : 'https://maps.google.com';
  }

  // Fallback jika navUrl kosong
  if (!navUrl) {
    const query = [venue, address].filter(Boolean).join(', ');
    navUrl = query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : 'https://maps.google.com';
  }

  // Fallback jika embedUrl kosong
  if (!embedUrl) {
    const query = [venue, address].filter(Boolean).join(', ');
    embedUrl = query ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : '';
  }

  return { navUrl, embedUrl };
}

function initEvents() {
  const container = document.getElementById('events-container');
  if (!container) return;

  const events = (WEDDING_CONFIG.events && Array.isArray(WEDDING_CONFIG.events)) ? WEDDING_CONFIG.events : [];
  if (events.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.95rem;">
        <i class="fa-regular fa-calendar-check text-gold" style="font-size: 2.2rem; margin-bottom: 0.8rem; display: block;"></i>
        Informasi detail rangkaian acara akan segera diperbarui.
      </div>
    `;
    return;
  }

  container.innerHTML = events.map((evt, idx) => {
    const mapInfo = parseMapUrls(evt.mapsUrl, evt.mapsEmbedUrl, evt.venue, evt.address);
    const dayName = evt.dayName || 'Acara';
    const dateFormatted = evt.dateFormatted || '';
    const dateDisplay = (dayName && dateFormatted) ? `<strong>${escapeHtml(dayName)}</strong>, ${escapeHtml(dateFormatted)}` : escapeHtml(dateFormatted || dayName);

    return `
      <div class="event-card reveal">
        <span class="event-badge">${escapeHtml(evt.badge || 'Acara')}</span>
        <h3 class="event-title">${escapeHtml(evt.title || 'Rangkaian Acara')}</h3>
        <div class="event-details">
          <div class="event-detail-item">
            <i class="fa-regular fa-calendar text-gold"></i>
            <span>${dateDisplay}</span>
          </div>
          ${evt.time ? `
          <div class="event-detail-item">
            <i class="fa-regular fa-clock text-gold"></i>
            <span>${escapeHtml(evt.time)}</span>
          </div>` : ''}
          ${evt.venue ? `<div class="event-venue">${escapeHtml(evt.venue)}</div>` : ''}
          ${evt.address ? `<div class="event-address">${escapeHtml(evt.address)}</div>` : ''}
        </div>
        <div class="event-actions">
          <a href="${escapeHtml(mapInfo.navUrl)}" target="_blank" rel="noopener noreferrer" class="btn-maps">
            <i class="fa-solid fa-location-dot"></i> Buka Petunjuk Arah (Maps)
          </a>
          ${mapInfo.embedUrl ? `
          <button type="button" class="btn-view-map" onclick="toggleMapEmbed('map-embed-${idx}')">
            <i class="fa-solid fa-map"></i> Lihat Denah Lokasi
          </button>` : ''}
        </div>
        ${mapInfo.embedUrl ? `
        <div id="map-embed-${idx}" class="map-embed-wrapper">
          <iframe src="${escapeHtml(mapInfo.embedUrl)}" allowfullscreen="" loading="lazy"></iframe>
        </div>` : ''}
      </div>
    `;
  }).join('');

  if (typeof observeReveals === 'function') {
    observeReveals();
  }
}

window.toggleMapEmbed = function(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.classList.toggle('active');
  }
};

/* ====================================================================
   7. KISAH CINTA (LOVE STORY TIMELINE)
   ==================================================================== */
function initLoveStory() {
  const container = document.getElementById('timeline-container');
  if (!container) return;

  const stories = (WEDDING_CONFIG.loveStory && Array.isArray(WEDDING_CONFIG.loveStory)) ? WEDDING_CONFIG.loveStory : [];
  if (stories.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = stories.map((story) => `
    <div class="timeline-item reveal">
      <div class="timeline-dot"></div>
      <div class="timeline-card">
        <span class="timeline-year">${escapeHtml(story.year || '')}</span>
        <h4 class="timeline-title">${escapeHtml(story.title || '')}</h4>
        <p class="timeline-desc">${escapeHtml(story.description || '')}</p>
      </div>
    </div>
  `).join('');

  if (typeof observeReveals === 'function') {
    observeReveals();
  }
}

/* ====================================================================
   8. GALERI FOTO & LIGHTBOX MODAL
   ==================================================================== */
function initGallery() {
  const grid = document.getElementById('gallery-grid');
  const modal = document.getElementById('lightbox-modal');
  const modalImg = document.getElementById('lightbox-img');
  const modalCaption = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('lightbox-close');

  if (!grid) return;

  const photos = (WEDDING_CONFIG.gallery && Array.isArray(WEDDING_CONFIG.gallery)) ? WEDDING_CONFIG.gallery : [];
  if (photos.length === 0) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = photos.map((item, idx) => `
    <div class="gallery-item ${idx === 0 || idx === 5 ? 'span-2' : ''} reveal" onclick="openLightbox('${escapeHtml(item.url)}', '${escapeHtml(item.title)}')">
      <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}" loading="lazy">
      <div class="gallery-item-overlay">
        <span class="gallery-item-title">${escapeHtml(item.title)}</span>
      </div>
    </div>
  `).join('');

  window.openLightbox = (url, caption) => {
    modalImg.src = url;
    modalCaption.textContent = caption;
    modal.classList.add('active');
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  if (typeof observeReveals === 'function') {
    observeReveals();
  }
}

/* ====================================================================
   9. AMPLOP DIGITAL, QRIS & SALIN REKENING
   ==================================================================== */
function initGifts() {
  const qrisContainer = document.getElementById('qris-card-container');
  const container = document.getElementById('bank-accounts-container');
  const physicalContainer = document.getElementById('physical-gift-container');

  // Update Teks Pengantar
  const introEl = document.querySelector('.gift-intro');
  if (introEl && WEDDING_CONFIG.gifts && WEDDING_CONFIG.gifts.introText) {
    introEl.textContent = WEDDING_CONFIG.gifts.introText;
  }

  // Render QRIS Card
  const qris = WEDDING_CONFIG.gifts && WEDDING_CONFIG.gifts.qris;
  if (qrisContainer) {
    if (qris && qris.enable) {
      qrisContainer.innerHTML = `
        <div class="qris-card reveal">
          <div class="qris-badge-top">
            <span class="qris-logo-text">QRIS</span>
            <span class="qris-subtext">Standar Pembayaran Nasional</span>
          </div>
          <p class="qris-desc">Pindai QRIS untuk mengirim tanda kasih via BCA Mobile, Mandiri Livin', GoPay, OVO, Dana, atau ShopeePay</p>
          <button type="button" class="btn-qris" onclick="openQrisModal()">
            <i class="fa-solid fa-qrcode"></i> <span>Tampilkan QRIS</span>
          </button>
        </div>
      `;

      const qrisImgTag = document.getElementById('qris-img-tag');
      if (qrisImgTag && qris.image) qrisImgTag.src = qris.image;

      const qrisMerchantEl = document.getElementById('qris-modal-merchant');
      if (qrisMerchantEl && qris.accountName) qrisMerchantEl.textContent = qris.accountName;

      const btnDownloadQris = document.getElementById('btn-download-qris');
      if (btnDownloadQris && qris.image) btnDownloadQris.href = qris.image;
    } else {
      qrisContainer.innerHTML = '';
    }
  }

  // Render Bank Accounts
  if (container) {
    const bankAccounts = (WEDDING_CONFIG.gifts && Array.isArray(WEDDING_CONFIG.gifts.bankAccounts)) ? WEDDING_CONFIG.gifts.bankAccounts : [];
    container.innerHTML = bankAccounts.map((acc, idx) => {
      const accNum = (acc.accountNumber !== undefined && acc.accountNumber !== null) ? String(acc.accountNumber).trim() : '';
      const bankName = acc.badge || acc.bank || 'Bank';
      const holder = acc.accountName || '';

      return `
        <div class="bank-card reveal">
          <div class="bank-card-top">
            <span class="bank-badge text-gold">${escapeHtml(bankName)}</span>
            <div class="bank-chip"></div>
          </div>
          <div class="account-number-wrapper">
            <div class="account-label">Nomor Rekening</div>
            <div class="account-number" id="acc-num-${idx}">${escapeHtml(accNum)}</div>
          </div>
          <div class="account-name">a.n. ${escapeHtml(holder)}</div>
          <button type="button" class="btn-copy" data-copy="${escapeHtml(accNum)}" onclick="copyFromData(this)">
            <i class="fa-regular fa-copy"></i> <span>Salin No. Rekening</span>
          </button>
        </div>
      `;
    }).join('');
  }

  // Render Physical Gift
  if (physicalContainer) {
    const gift = WEDDING_CONFIG.gifts && WEDDING_CONFIG.gifts.physicalGift;
    if (gift && gift.enable && (gift.address || gift.recipientName)) {
      const recipient = gift.recipientName || '';
      const phone = gift.phone ? `(${gift.phone})` : '';
      const address = gift.address || '';

      physicalContainer.innerHTML = `
        <div class="physical-gift-card reveal">
          <i class="fa-solid fa-gift text-gold" style="font-size: 2rem; margin-bottom: 0.8rem;"></i>
          <h4 class="physical-gift-title">Kirim Hadiah Fisik</h4>
          <p class="physical-gift-address">
            <strong>Penerima:</strong> ${escapeHtml(recipient)} ${escapeHtml(phone)}<br>
            ${escapeHtml(address)}
          </p>
          <button type="button" class="btn-copy" data-copy="${escapeHtml(address)}" onclick="copyFromData(this)">
            <i class="fa-regular fa-copy"></i> <span>Salin Alamat Lengkap</span>
          </button>
        </div>
      `;
    } else {
      physicalContainer.innerHTML = '';
    }
  }

  // Modal QRIS Event Listener
  const qrisModal = document.getElementById('qris-modal');
  if (qrisModal) {
    qrisModal.addEventListener('click', (e) => {
      if (e.target === qrisModal) closeQrisModal();
    });
  }

  if (typeof observeReveals === 'function') {
    observeReveals();
  }
}

window.openQrisModal = function() {
  const modal = document.getElementById('qris-modal');
  if (modal) modal.classList.add('active');
};

window.closeQrisModal = function() {
  const modal = document.getElementById('qris-modal');
  if (modal) modal.classList.remove('active');
};

window.copyFromData = function(btnElement) {
  const text = btnElement.getAttribute('data-copy') || '';
  window.copyToClipboard(text, btnElement);
};

window.copyToClipboard = function(text, btnElement) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Berhasil disalin ke papan klip!');
      indicateButtonSuccess(btnElement);
    });
  } else {
    // Fallback execCommand
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast('Berhasil disalin ke papan klip!');
    indicateButtonSuccess(btnElement);
  }
};

function indicateButtonSuccess(btn) {
  if (!btn) return;
  const originalHtml = btn.innerHTML;
  btn.classList.add('copied');
  btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Tersalin!</span>';
  setTimeout(() => {
    btn.classList.remove('copied');
    btn.innerHTML = originalHtml;
  }, 2500);
}

function showToast(message) {
  let toast = document.getElementById('toast-notice');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notice';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/* ====================================================================
   10. RSVP & BUKU DOA (GOOGLE APPS SCRIPT + LOCALSTORAGE CACHE)
   ==================================================================== */
function initRSVP() {
  const form = document.getElementById('rsvp-form');
  const wishesContainer = document.getElementById('wishes-container');

  const urlParams = new URLSearchParams(window.location.search);
  const tenantSlug = urlParams.get('u') || urlParams.get('slug') || '';
  const tenantWishesKey = tenantSlug ? `wedding_wishes_${tenantSlug}` : 'wedding_wishes_arya_annisa';

  // 1. Tampilkan data dari cache lokal / initialWishes langsung (tanpa loading delay)
  let storedWishes = JSON.parse(localStorage.getItem(tenantWishesKey));
  if (!storedWishes || !Array.isArray(storedWishes) || storedWishes.length === 0) {
    storedWishes = WEDDING_CONFIG.initialWishes || [];
    localStorage.setItem(tenantWishesKey, JSON.stringify(storedWishes));
  }

  renderWishes(storedWishes);

  // 2. Sinkronkan dengan database Google Spreadsheet secara asynchronous jika ada endpoint Apps Script
  if (WEDDING_CONFIG.appsScriptUrl) {
    const tenantParam = tenantSlug ? `?action=get_wishes&u=${encodeURIComponent(tenantSlug)}` : '';
    fetch(`${WEDDING_CONFIG.appsScriptUrl}${tenantParam}`)
      .then(res => res.json())
      .then(result => {
        if (result && result.status === 'success' && Array.isArray(result.data) && result.data.length > 0) {
          storedWishes = result.data;
          localStorage.setItem(tenantWishesKey, JSON.stringify(storedWishes));
          renderWishes(storedWishes);
        }
      })
      .catch(err => {
        console.warn('Menggunakan cache ucapan offline:', err);
      });
  }

  // 3. Tangani Submit Form Doa & RSVP
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const nameInput = document.getElementById('rsvp-name');
      const messageInput = document.getElementById('rsvp-message');
      const submitBtn = form.querySelector('button[type="submit"]');

      const name = nameInput ? nameInput.value.trim() : '';
      const status = document.querySelector('input[name="attendance"]:checked')?.value || 'hadir';
      const message = messageInput ? messageInput.value.trim() : '';

      if (!name || !message) {
        alert('Mohon lengkapi nama dan pesan ucapan Anda.');
        return;
      }

      // Optimistic UI: Tampilkan ucapan langsung ke daftar ucapan
      const newWish = {
        name: name,
        status: status,
        message: message,
        time: 'Baru saja'
      };

      storedWishes.unshift(newWish);
      localStorage.setItem(tenantWishesKey, JSON.stringify(storedWishes));
      renderWishes(storedWishes);

      // Reset form
      if (messageInput) messageInput.value = '';
      if (wishesContainer) wishesContainer.scrollTop = 0;

      // Ubah status tombol kirim
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirimkan...';
      }

      showToast('Mengirimkan ucapan & doa restu Anda...');

      // Kirim ke Google Apps Script (Google Sheets tenant)
      if (WEDDING_CONFIG.appsScriptUrl) {
        try {
          const payload = Object.assign({}, newWish, {
            action: 'rsvp',
            u: tenantSlug
          });
          const response = await fetch(WEDDING_CONFIG.appsScriptUrl, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          const resJson = await response.json();
          if (resJson && resJson.status === 'success') {
            showToast('Terima kasih! Doa Anda berhasil tercatat di Buku Tamu.');
          } else {
            showToast('Doa Anda telah tercatat!');
          }
        } catch (err) {
          console.warn('Gagal sinkron ke Google Apps Script, disimpan di peramban:', err);
          showToast('Doa Anda tersimpan di perangkat.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
          }
        }
      } else {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
        showToast('Terima kasih atas doa dan konfirmasinya!');
      }
    });
  }
}

function renderWishes(wishes) {
  const container = document.getElementById('wishes-container');
  if (!container) return;

  const countEl = document.getElementById('wishes-count');
  if (countEl) countEl.textContent = `(${wishes.length})`;

  container.innerHTML = wishes.map((item) => {
    let statusText = 'Hadir';
    let statusClass = 'hadir';
    if (item.status === 'tidak-hadir') {
      statusText = 'Tidak Hadir';
      statusClass = 'tidak-hadir';
    } else if (item.status === 'ragu') {
      statusText = 'Masih Ragu';
      statusClass = 'ragu';
    }

    const firstLetter = item.name ? item.name.charAt(0).toUpperCase() : 'T';

    return `
      <div class="wish-item">
        <div class="wish-header">
          <div class="wish-author">
            <div class="wish-avatar">${firstLetter}</div>
            <span>${item.name}</span>
          </div>
          <span class="wish-badge ${statusClass}">${statusText}</span>
        </div>
        <p class="wish-message">${escapeHtml(item.message)}</p>
        <span class="wish-time">${item.time}</span>
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ====================================================================
   11. SCROLL REVEAL ANIMATIONS (DUAL OBSERVER & FALLBACK)
   ==================================================================== */
let revealObserver = null;

function checkReveals() {
  const reveals = document.querySelectorAll('.reveal:not(.visible)');
  const windowHeight = window.innerHeight;
  reveals.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top <= windowHeight + 150) {
      el.classList.add('visible');
    }
  });
}

function observeReveals() {
  const reveals = document.querySelectorAll('.reveal:not(.visible)');
  if ('IntersectionObserver' in window) {
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.05,
        rootMargin: '120px 0px 120px 0px'
      });
    }

    reveals.forEach(el => {
      revealObserver.observe(el);
    });
  }

  // Jalankan checkReveals agar elemen yang sudah ada di viewport langsung terlihat
  checkReveals();
}

function initScrollAnimations() {
  observeReveals();

  // Scroll listener untuk fallback dan keandalan penuh
  let scrollTimeout = null;
  window.addEventListener('scroll', () => {
    if (!scrollTimeout) {
      scrollTimeout = setTimeout(() => {
        checkReveals();
        scrollTimeout = null;
      }, 100);
    }
  }, { passive: true });

  // Panggil ulang saat resize atau tab berganti
  window.addEventListener('resize', checkReveals);
}

/* ====================================================================
   12. SCROLL SPY FOR BOTTOM DOCK (OPTIMIZED WITH RAF)
   ==================================================================== */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const dockItems = document.querySelectorAll('.dock-item');
  if (sections.length === 0 || dockItems.length === 0) return;

  let isTicking = false;
  let activeSectionId = '';

  window.addEventListener('scroll', () => {
    if (!isTicking) {
      window.requestAnimationFrame(() => {
        let current = '';
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
          const sectionTop = section.offsetTop - 140;
          const sectionHeight = section.offsetHeight;
          if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
          }
        });

        if (current && current !== activeSectionId) {
          activeSectionId = current;
          dockItems.forEach(item => {
            const matches = item.getAttribute('href') === `#${current}`;
            item.classList.toggle('active', matches);
          });
        }
        isTicking = false;
      });
      isTicking = true;
    }
  }, { passive: true });
}

/* ====================================================================
   14. PREVIEW MODE BADGE (STATUS: MENUNGGU PEMBAYARAN)
   ==================================================================== */
function renderPreviewModeBadge(statusUser, planName) {
  const isPending = (statusUser && (
    statusUser.toLowerCase().includes('menunggu') || 
    statusUser.toLowerCase().includes('pending') || 
    statusUser.toLowerCase().includes('belum')
  ));

  const existingBadge = document.getElementById('preview-mode-banner');
  if (isPending) {
    if (existingBadge) return;
    const badge = document.createElement('div');
    badge.id = 'preview-mode-banner';
    badge.className = 'preview-mode-banner';
    badge.innerHTML = `
      <i class="fa-solid fa-eye"></i>
      <span>Mode Pratinjau Undangan — Menunggu Aktivasi Pembayaran (${planName || 'Paket Gold'})</span>
    `;
    document.body.appendChild(badge);
  } else {
    if (existingBadge) existingBadge.remove();
  }
}
