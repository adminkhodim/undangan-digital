/**
 * ====================================================================
 * LOGIKA PENDAFTARAN PENGGUNA BARU (SAAS REGISTRATION)
 * ====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  initFormInteractivity();
  initSlugChecker();
  initRegistrationSubmit();
});

function initFormInteractivity() {
  const groomInput = document.getElementById('input-groom');
  const brideInput = document.getElementById('input-bride');
  const dateInput = document.getElementById('input-date');
  const slugInput = document.getElementById('input-slug');

  const previewNames = document.getElementById('preview-screen-names');
  const previewDate = document.getElementById('preview-screen-date');
  const previewSlugUrl = document.getElementById('preview-slug-url');

  let slugManuallyEdited = false;

  slugInput?.addEventListener('input', () => {
    slugManuallyEdited = true;
    updateSlugDisplay();
  });

  function updateMockup() {
    const groom = groomInput?.value.trim() || 'Arya';
    const bride = brideInput?.value.trim() || 'Annisa';
    if (previewNames) {
      previewNames.textContent = `${groom} & ${bride}`;
    }

    if (dateInput?.value && previewDate) {
      const d = new Date(dateInput.value);
      if (!isNaN(d.getTime())) {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        previewDate.textContent = d.toLocaleDateString('id-ID', options);
      }
    }

    // Auto generate slug jika belum diubah manual
    if (!slugManuallyEdited && slugInput) {
      const cleanGroom = groom.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanBride = bride.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanGroom && cleanBride) {
        slugInput.value = `${cleanGroom}-${cleanBride}`;
      } else if (cleanGroom) {
        slugInput.value = cleanGroom;
      }
      updateSlugDisplay();
    }
  }

  function updateSlugDisplay() {
    if (!slugInput) return;
    const cleanSlug = slugInput.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    slugInput.value = cleanSlug;
    if (previewSlugUrl) {
      const baseUrl = window.location.origin + window.location.pathname.replace('daftar.html', '').replace(/\/$/, '');
      previewSlugUrl.innerHTML = `${baseUrl}/?u=<strong>${cleanSlug || 'nama-pasangan'}</strong>`;
    }
  }

  groomInput?.addEventListener('input', updateMockup);
  brideInput?.addEventListener('input', updateMockup);
  dateInput?.addEventListener('change', updateMockup);

  updateMockup();
}

/**
 * Pengecekan Ketersediaan Slug secara Realtime (Debounced)
 */
let debounceTimeout = null;
function initSlugChecker() {
  const slugInput = document.getElementById('input-slug');
  const slugBadge = document.getElementById('slug-status-badge');
  if (!slugInput || !slugBadge) return;

  slugInput.addEventListener('input', () => {
    const slug = slugInput.value.trim();
    if (!slug) {
      slugBadge.className = 'slug-badge checking';
      slugBadge.textContent = 'Menunggu input...';
      return;
    }

    slugBadge.className = 'slug-badge checking';
    slugBadge.textContent = 'Memeriksa...';

    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      const appsScriptUrl = (typeof WEDDING_CONFIG !== 'undefined' && WEDDING_CONFIG.appsScriptUrl) 
        ? WEDDING_CONFIG.appsScriptUrl 
        : '';

      if (!appsScriptUrl) {
        slugBadge.className = 'slug-badge available';
        slugBadge.textContent = 'Tersedia ✓';
        return;
      }

      try {
        const res = await fetch(`${appsScriptUrl}?action=check_slug&slug=${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (json && json.status === 'success') {
          if (json.available) {
            slugBadge.className = 'slug-badge available';
            slugBadge.textContent = 'Tersedia ✓';
          } else {
            slugBadge.className = 'slug-badge taken';
            slugBadge.textContent = 'Sudah Digunakan ✗';
          }
        }
      } catch (e) {
        // Fallback jika offline
        slugBadge.className = 'slug-badge available';
        slugBadge.textContent = 'Tersedia ✓';
      }
    }, 600);
  });
}

/**
 * Handle Form Submit Registrasi
 */
function initRegistrationSubmit() {
  const form = document.getElementById('register-form');
  const btnSubmit = document.getElementById('btn-submit');
  const successModal = document.getElementById('success-modal');

  if (!form || !btnSubmit) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const groom = document.getElementById('input-groom')?.value.trim();
    const bride = document.getElementById('input-bride')?.value.trim();
    const slug = document.getElementById('input-slug')?.value.trim();
    const whatsapp = document.getElementById('input-wa')?.value.trim();
    const email = document.getElementById('input-email')?.value.trim();
    const pin = document.getElementById('input-pin')?.value.trim();
    const date = document.getElementById('input-date')?.value;

    if (!groom || !bride) {
      showToast('Mohon lengkapi nama mempelai pria dan wanita.', 'error');
      return;
    }
    if (!slug) {
      showToast('Mohon tentukan tautan slug undangan Anda.', 'error');
      return;
    }
    if (!pin || pin.length < 4) {
      showToast('PIN Admin minimal harus 4 digit angka/karakter.', 'error');
      return;
    }

    const originalBtnText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membuat Undangan Eksklusif...';

    const appsScriptUrl = (typeof WEDDING_CONFIG !== 'undefined' && WEDDING_CONFIG.appsScriptUrl) 
      ? WEDDING_CONFIG.appsScriptUrl 
      : 'https://script.google.com/macros/s/AKfycbylw1T_Lv0lxniv9-KowxxcGcYGQyb3WLTj30UQQMTsf7dvb460vFn50NY0TdFo2Tes/exec';

    const urlPlan = new URLSearchParams(window.location.search).get('plan');
    let planName = 'Paket Gold (Terpopuler)';
    if (urlPlan === 'silver') planName = 'Paket Silver';
    else if (urlPlan === 'vip') planName = 'Paket VIP Platinum';

    const payload = {
      action: 'register_user',
      namaPria: groom,
      namaWanita: bride,
      namaPasangan: `${groom} & ${bride}`,
      slug: slug,
      whatsapp: whatsapp,
      email: email,
      pin: pin,
      weddingDate: date,
      paket: planName
    };

    try {
      let isSuccess = false;
      let userData = payload;

      if (appsScriptUrl) {
        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const resJson = await response.json();
        if (resJson && resJson.status === 'success') {
          isSuccess = true;
          if (resJson.user) userData = resJson.user;
        } else {
          showToast(resJson.message || 'Gagal mendaftar. Silakan coba kembali.', 'error');
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = originalBtnText;
          return;
        }
      } else {
        isSuccess = true;
      }

      if (isSuccess) {
        const baseUrl = window.location.origin + window.location.pathname.replace('daftar.html', '').replace(/\/$/, '');
        const guestLink = `${baseUrl}/?u=${slug}`;
        const adminLink = `${baseUrl}/admin.html?u=${slug}`;

        // Simpan sesi pendaftaran sementara di sessionStorage
        sessionStorage.setItem('saas_last_registered', JSON.stringify({
          slug, pin, namaPasangan: `${groom} & ${bride}`, guestLink, adminLink
        }));

        // Isi data modal
        document.getElementById('modal-couple-name').textContent = `${groom} & ${bride}`;
        document.getElementById('modal-guest-url').value = guestLink;
        document.getElementById('modal-admin-url').value = adminLink;
        document.getElementById('btn-to-admin').href = adminLink;
        document.getElementById('btn-to-guest').href = guestLink;

        // Buka Modal Sukses
        successModal?.classList.add('show');
      }

    } catch (err) {
      console.error('Error pendaftaran:', err);
      showToast('Koneksi terganggu. Pastikan internet aktif lalu coba lagi.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalBtnText;
    }
  });
}

// Salin tautan helper
window.copyLinkToClipboard = function(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    const originalText = btnEl.innerHTML;
    btnEl.innerHTML = '<i class="fa-solid fa-check"></i> Tersalin!';
    showToast('Tautan berhasil disalin ke papan klip!', 'success');
    setTimeout(() => {
      btnEl.innerHTML = originalText;
    }, 2000);
  });
};

function showToast(msg, type = 'success') {
  const toast = document.getElementById('saas-toast');
  const toastText = document.getElementById('saas-toast-text');
  if (!toast || !toastText) return;

  toast.className = `saas-toast show ${type}`;
  toastText.textContent = msg;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}
