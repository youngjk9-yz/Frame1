/**
 * The Frame Foundation — Shared JavaScript
 * Handles: mobile navigation, gallery lightbox, donation form with Stripe
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

/* ===== DONATION PAGE WITH STRIPE ===== */
function initDonation() {
  const tiersGrid = document.getElementById('tiers-grid');
  const amountInput = document.getElementById('donation-amount');
  const customInput = document.getElementById('custom-amount');
  const donateForm = document.getElementById('donate-form');
  const formSuccess = document.getElementById('form-success');
  const paymentSection = document.getElementById('payment-section');
  const donateBtn = document.getElementById('donate-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');

  if (!tiersGrid) return;

  let selectedAmount = null;
  let paymentRevealed = false;
  let stripe = null;
  let cardElement = null;

  // ——— Initialize Stripe (key fetched from server) ———
  async function initStripe() {
    if (stripe) return; // Already initialized

    try {
      // Fetch publishable key from the server (keeps keys in .env only)
      const configRes = await fetch('/api/config');
      const { publishableKey } = await configRes.json();

      stripe = Stripe(publishableKey);
      const elements = stripe.elements({
        fonts: [
          { cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap' }
        ]
      });

      cardElement = elements.create('card', {
        style: {
          base: {
            fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
            fontSize: '16px',
            color: '#1a1a1a',
            '::placeholder': { color: '#7a7a7a' },
          },
          invalid: {
            color: '#dc3545',
            iconColor: '#dc3545',
          },
        },
        hidePostalCode: false,
      });

      cardElement.mount('#card-element');

      // Display card validation errors
      cardElement.on('change', (event) => {
        const errorEl = document.getElementById('card-errors');
        if (event.error) {
          errorEl.textContent = event.error.message;
        } else {
          errorEl.textContent = '';
        }
      });
    } catch (err) {
      console.warn('Stripe initialization failed. Is the server running?', err);
    }
  }

  // ——— Tier card selection ———
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

  // ——— Custom amount input ———
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

  // ——— Form submission (two-step flow) ———
  if (donateForm) {
    donateForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!selectedAmount || !amountInput.value) {
        alert('Please select a donation amount.');
        return;
      }

      // STEP 1: Reveal payment section
      if (!paymentRevealed) {
        paymentSection.classList.add('payment-section--visible');
        paymentRevealed = true;
        btnText.textContent = 'Complete Payment';

        // Initialize Stripe when payment section is revealed
        await initStripe();

        // Smooth scroll to payment section
        paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // STEP 2: Process payment with Stripe
      if (!stripe || !cardElement) {
        alert(
          'Payment not ready. Please make sure the server is running.\n\n' +
          'Run: npm start'
        );
        return;
      }

      // Show loading state
      donateBtn.disabled = true;
      btnText.style.display = 'none';
      btnSpinner.style.display = 'inline-flex';

      try {
        // 1. Ask the server to create a PaymentIntent
        const donorName = document.getElementById('donor-first').value + ' ' +
                          document.getElementById('donor-last').value;
        const donorEmail = document.getElementById('donor-email').value;
        const donorMessage = document.getElementById('donor-message').value;

        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(selectedAmount),
            email: donorEmail,
            name: donorName,
            message: donorMessage,
          }),
        });

        const data = await response.json();

        if (data.error) {
          document.getElementById('card-errors').textContent = data.error;
          donateBtn.disabled = false;
          btnText.style.display = 'inline';
          btnSpinner.style.display = 'none';
          return;
        }

        // 2. Confirm the payment with the card element
        const { error, paymentIntent } = await stripe.confirmCardPayment(
          data.clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: donorName,
                email: donorEmail,
              },
            },
          }
        );

        if (error) {
          document.getElementById('card-errors').textContent = error.message;
          donateBtn.disabled = false;
          btnText.style.display = 'inline';
          btnSpinner.style.display = 'none';
          return;
        }

        // 3. Payment succeeded!
        if (paymentIntent.status === 'succeeded') {
          console.log('✅ Payment succeeded:', paymentIntent.id);

          // Show success state
          donateForm.style.display = 'none';
          formSuccess.classList.add('form-success--visible');
          formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

      } catch (err) {
        console.error('Payment error:', err);
        document.getElementById('card-errors').textContent =
          'An unexpected error occurred. Please try again.';
        donateBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
      }
    });
  }
}
