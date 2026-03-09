/**
 * The Frame Foundation — Shared JavaScript
 * Handles: mobile navigation, gallery lightbox, donation form
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initLightbox();
  initDonation();
});

/* ===== MOBILE NAVIGATION ===== */
function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('nav__links--open');
    toggle.setAttribute('aria-expanded', links.classList.contains('nav__links--open'));
  });

  // Close nav when clicking a link
  links.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('nav__links--open');
    });
  });
}

/* ===== GALLERY LIGHTBOX ===== */
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  if (!lightbox) return;

  // Open lightbox on gallery item click
  document.querySelectorAll('.gallery__item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (img) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add('lightbox--active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  // Close lightbox
  function closeLightbox() {
    lightbox.classList.remove('lightbox--active');
    document.body.style.overflow = '';
    lightboxImg.src = '';
  }

  lightboxClose.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('lightbox--active')) {
      closeLightbox();
    }
  });
}

/* ===== DONATION PAGE ===== */
function initDonation() {
  const tiersGrid = document.getElementById('tiers-grid');
  const amountInput = document.getElementById('donation-amount');
  const customInput = document.getElementById('custom-amount');
  const donateForm = document.getElementById('donate-form');
  const formSuccess = document.getElementById('form-success');

  if (!tiersGrid) return;

  let selectedAmount = null;

  // Tier card selection
  tiersGrid.querySelectorAll('.tier-card').forEach(card => {
    card.addEventListener('click', () => {
      // Remove previous selection
      tiersGrid.querySelectorAll('.tier-card').forEach(c => c.classList.remove('tier-card--selected'));
      card.classList.add('tier-card--selected');

      const amount = card.dataset.amount;
      if (amount !== 'custom') {
        selectedAmount = amount;
        amountInput.value = '$' + amount;
        if (customInput) customInput.value = '';
      } else {
        // Focus the custom input
        if (customInput) {
          customInput.focus();
          if (customInput.value) {
            selectedAmount = customInput.value;
            amountInput.value = '$' + customInput.value;
          } else {
            amountInput.value = '';
          }
        }
      }
    });
  });

  // Custom amount input
  if (customInput) {
    customInput.addEventListener('input', () => {
      const val = customInput.value;
      if (val && parseInt(val) > 0) {
        selectedAmount = val;
        amountInput.value = '$' + val;
        // Select the custom card
        tiersGrid.querySelectorAll('.tier-card').forEach(c => c.classList.remove('tier-card--selected'));
        customInput.closest('.tier-card').classList.add('tier-card--selected');
      } else {
        amountInput.value = '';
      }
    });

    // Prevent the tier card click from firing when clicking the input
    customInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Form submission
  if (donateForm) {
    donateForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!selectedAmount || !amountInput.value) {
        alert('Please select a donation amount.');
        return;
      }

      // Show success message
      donateForm.style.display = 'none';
      formSuccess.classList.add('form-success--visible');

      // Scroll to success message
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}
