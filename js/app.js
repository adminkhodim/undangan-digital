/**
 * ====================================================================
 * APLIKASI UTAMA UNDANGAN DIGITAL PERNIKAHAN
 * ====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // 0. Sinkronisasi Custom Config dari Portal Editor jika tersimpan di LocalStorage
  const customConfigStr = localStorage.getItem('wedding_custom_config');
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
    } catch (e) {
      console.warn('Gagal parse custom config dari localStorage:', e);
    }
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
    checkReveals();
    setTimeout(() => {
      checkReveals();
      window.dispatchEvent(new Event('scroll'));
    }, 300);

    // Aktifkan Auto Scroll secara otomatis setelah cover selesai membuka
    setTimeout(() => {
      startAutoScroll();
    }, 800);
  });
}

/* ====================================================================
   AUTO SCROLL ENGINE & KONTROL INTERAKTIF
   ==================================================================== */
let isAutoScrolling = false;
let autoScrollAnimId = null;
const AUTO_SCROLL_SPEED = 0.95; // Pixels per frame pada 60fps (~57px per detik)
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
    const cal = WEDDING_CONFIG.googleCalendar;
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(cal.title)}&dates=${cal.start}/${cal.end}&details=${encodeURIComponent(cal.details)}&location=${encodeURIComponent(cal.location)}`;
    gcalBtn.href = gcalUrl;
  }
}

/* ====================================================================
   5. DATA MEMPELAI & QUOTE
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

  // Groom
  const groomNameEl = document.getElementById('groom-name');
  if (groomNameEl && groom.fullName) groomNameEl.textContent = groom.fullName;
  const groomOrderEl = document.getElementById('groom-order');
  if (groomOrderEl && groom.childOrder) groomOrderEl.textContent = groom.childOrder;
  const groomParentsEl = document.getElementById('groom-parents');
  if (groomParentsEl && (groom.fatherName || groom.motherName)) {
    groomParentsEl.textContent = `${groom.fatherName || ''} & Ibu ${groom.motherName || ''}`;
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
    brideParentsEl.textContent = `${bride.fatherName || ''} & Ibu ${bride.motherName || ''}`;
  }
  const brideBioEl = document.getElementById('bride-bio');
  if (brideBioEl && bride.bio) brideBioEl.textContent = bride.bio;
  const brideIg = document.getElementById('bride-ig');
  if (brideIg && bride.instagram) {
    brideIg.href = bride.instagram;
    brideIg.textContent = bride.instagramHandle || '@instagram';
  }

  // Update Foto Mempelai & Hero
  const groomPhotoEl = document.getElementById('groom-photo');
  if (groomPhotoEl && groom.photo) groomPhotoEl.src = groom.photo;

  const bridePhotoEl = document.getElementById('bride-photo');
  if (bridePhotoEl && bride.photo) bridePhotoEl.src = bride.photo;

  const heroPhoto = (WEDDING_CONFIG.couple && WEDDING_CONFIG.couple.heroPhoto) || WEDDING_CONFIG.heroPhoto;
  if (heroPhoto) {
    const heroSec = document.getElementById('hero');
    if (heroSec) {
      heroSec.style.backgroundImage = `linear-gradient(180deg, rgba(23, 21, 19, 0.1) 0%, rgba(23, 21, 19, 0.85) 100%), url('${heroPhoto}')`;
    }
    const coverContainer = document.querySelector('.cover-container');
    if (coverContainer) {
      coverContainer.style.backgroundImage = `linear-gradient(180deg, rgba(23, 21, 19, 0.5) 0%, rgba(23, 21, 19, 0.75) 100%), url('${heroPhoto}')`;
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
}

/* ====================================================================
   6. RANGKAIAN ACARA & MAPS TOGGLE
   ==================================================================== */
function initEvents() {
  const container = document.getElementById('events-container');
  if (!container) return;

  container.innerHTML = WEDDING_CONFIG.events.map((evt, idx) => `
    <div class="event-card reveal">
      <span class="event-badge">${evt.badge}</span>
      <h3 class="event-title">${evt.title}</h3>
      <div class="event-details">
        <div class="event-detail-item">
          <i class="fa-regular fa-calendar text-gold"></i>
          <span><strong>${evt.dayName}</strong>, ${evt.dateFormatted}</span>
        </div>
        <div class="event-detail-item">
          <i class="fa-regular fa-clock text-gold"></i>
          <span>${evt.time}</span>
        </div>
        <div class="event-venue">${evt.venue}</div>
        <div class="event-address">${evt.address}</div>
      </div>
      <div class="event-actions">
        <a href="${evt.mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-maps">
          <i class="fa-solid fa-location-dot"></i> Buka Petunjuk Arah (Maps)
        </a>
        <button type="button" class="btn-view-map" onclick="toggleMapEmbed('map-embed-${idx}')">
          <i class="fa-solid fa-map"></i> Lihat Denah Lokasi
        </button>
      </div>
      <div id="map-embed-${idx}" class="map-embed-wrapper">
        <iframe src="${evt.mapsEmbedUrl}" allowfullscreen="" loading="lazy"></iframe>
      </div>
    </div>
  `).join('');
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

  container.innerHTML = WEDDING_CONFIG.loveStory.map((story) => `
    <div class="timeline-item reveal">
      <div class="timeline-dot"></div>
      <div class="timeline-card">
        <span class="timeline-year">${story.year}</span>
        <h4 class="timeline-title">${story.title}</h4>
        <p class="timeline-desc">${story.description}</p>
      </div>
    </div>
  `).join('');
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

  grid.innerHTML = WEDDING_CONFIG.gallery.map((item, idx) => `
    <div class="gallery-item ${idx === 0 || idx === 5 ? 'span-2' : ''} reveal" onclick="openLightbox('${item.url}', '${item.title}')">
      <img src="${item.url}" alt="${item.title}" loading="lazy">
      <div class="gallery-item-overlay">
        <span class="gallery-item-title">${item.title}</span>
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
}

/* ====================================================================
   9. AMPLOP DIGITAL, QRIS & SALIN REKENING
   ==================================================================== */
function initGifts() {
  const qrisContainer = document.getElementById('qris-card-container');
  const container = document.getElementById('bank-accounts-container');
  const physicalContainer = document.getElementById('physical-gift-container');

  // Render QRIS Card
  const qris = WEDDING_CONFIG.gifts && WEDDING_CONFIG.gifts.qris;
  if (qrisContainer && qris && qris.enable) {
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
  }

  // Render Bank Accounts
  if (container) {
    container.innerHTML = WEDDING_CONFIG.gifts.bankAccounts.map((acc, idx) => `
      <div class="bank-card reveal">
        <div class="bank-card-top">
          <span class="bank-badge text-gold">${acc.badge || acc.bank}</span>
          <div class="bank-chip"></div>
        </div>
        <div class="account-number-wrapper">
          <div class="account-label">Nomor Rekening</div>
          <div class="account-number" id="acc-num-${idx}">${acc.accountNumber}</div>
        </div>
        <div class="account-name">a.n. ${acc.accountName}</div>
        <button type="button" class="btn-copy" onclick="copyToClipboard('${acc.accountNumber}', this)">
          <i class="fa-regular fa-copy"></i> <span>Salin No. Rekening</span>
        </button>
      </div>
    `).join('');
  }

  if (physicalContainer && WEDDING_CONFIG.gifts.physicalGift && WEDDING_CONFIG.gifts.physicalGift.enable) {
    const gift = WEDDING_CONFIG.gifts.physicalGift;
    physicalContainer.innerHTML = `
      <div class="physical-gift-card reveal">
        <i class="fa-solid fa-gift text-gold" style="font-size: 2rem; margin-bottom: 0.8rem;"></i>
        <h4 class="physical-gift-title">Kirim Hadiah Fisik</h4>
        <p class="physical-gift-address">
          <strong>Penerima:</strong> ${gift.recipientName} (${gift.phone})<br>
          ${gift.address}
        </p>
        <button type="button" class="btn-copy" onclick="copyToClipboard('${gift.address}', this)">
          <i class="fa-regular fa-copy"></i> <span>Salin Alamat Lengkap</span>
        </button>
      </div>
    `;
  }

  // Modal QRIS Event Listener
  const qrisModal = document.getElementById('qris-modal');
  if (qrisModal) {
    qrisModal.addEventListener('click', (e) => {
      if (e.target === qrisModal) closeQrisModal();
    });
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
const STORAGE_KEY = 'wedding_wishes_arya_annisa';

function initRSVP() {
  const form = document.getElementById('rsvp-form');
  const wishesContainer = document.getElementById('wishes-container');

  // 1. Tampilkan data dari cache lokal / initialWishes langsung (tanpa loading delay)
  let storedWishes = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (!storedWishes || !Array.isArray(storedWishes) || storedWishes.length === 0) {
    storedWishes = WEDDING_CONFIG.initialWishes || [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedWishes));
  }

  renderWishes(storedWishes);

  // 2. Sinkronkan dengan database Google Spreadsheet secara asynchronous jika ada endpoint Apps Script
  if (WEDDING_CONFIG.appsScriptUrl) {
    fetch(WEDDING_CONFIG.appsScriptUrl)
      .then(res => res.json())
      .then(result => {
        if (result && result.status === 'success' && Array.isArray(result.data) && result.data.length > 0) {
          storedWishes = result.data;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(storedWishes));
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedWishes));
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

      // Kirim ke Google Apps Script (Google Sheets)
      if (WEDDING_CONFIG.appsScriptUrl) {
        try {
          const response = await fetch(WEDDING_CONFIG.appsScriptUrl, {
            method: 'POST',
            body: JSON.stringify(newWish)
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
function checkReveals() {
  const reveals = document.querySelectorAll('.reveal:not(.visible)');
  const windowHeight = window.innerHeight;
  reveals.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top <= windowHeight + 120) {
      el.classList.add('visible');
    }
  });
}

function initScrollAnimations() {
  const reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '100px 0px 100px 0px'
    });

    reveals.forEach(el => revealObserver.observe(el));
  }

  // Backup scroll & resize listener
  window.addEventListener('scroll', checkReveals, { passive: true });
  window.addEventListener('resize', checkReveals, { passive: true });
  checkReveals();
}

/* ====================================================================
   12. SCROLL SPY FOR BOTTOM DOCK
   ==================================================================== */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const dockItems = document.querySelectorAll('.dock-item');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    dockItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href') === `#${current}`) {
        item.classList.add('active');
      }
    });
  });
}
