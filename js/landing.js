/**
 * ====================================================================
 * SAAS MARKETING LANDING PAGE - JAVASCRIPT
 * Platform: Khodim Undangan Digital
 * ====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  initFaqAccordion();
  initSmoothScroll();
  initNavbarScrollEffect();
  initThemeCardInteractions();
});

/**
 * 1. FAQ Accordion Toggle
 */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isCurrentlyActive = item.classList.contains('active');

      // Tutup semua FAQ lainnya untuk accordion yang rapi
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
        }
      });

      // Toggle item yang diklik
      if (isCurrentlyActive) {
        item.classList.remove('active');
      } else {
        item.classList.add('active');
      }
    });
  });
}

/**
 * 2. Smooth Scrolling untuk Tautan Navigasi Anchor
 */
function initSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 90; // kompensasi tinggi sticky header
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * 3. Efek Shadow pada Sticky Navbar saat Halaman Di-scroll
 */
function initNavbarScrollEffect() {
  const header = document.querySelector('.landing-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header.style.boxShadow = '0 10px 30px rgba(197, 160, 89, 0.15)';
      header.style.background = 'rgba(250, 247, 242, 0.98)';
    } else {
      header.style.boxShadow = 'none';
      header.style.background = 'rgba(250, 247, 242, 0.92)';
    }
  }, { passive: true });
}

/**
 * 4. Interaksi Kartu Tema & Demo
 */
function initThemeCardInteractions() {
  const previewButtons = document.querySelectorAll('.btn-theme-preview');
  previewButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const themeId = btn.getAttribute('data-theme');
      if (themeId) {
        e.preventDefault();
        window.open(`undangan.html?theme=${encodeURIComponent(themeId)}&to=Tamu+Undangan`, '_blank');
      }
    });
  });
}
