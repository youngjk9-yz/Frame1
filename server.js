/**
 * The Frame Foundation — Donation Server
 * Express server with Stripe PaymentIntent API
 * 
 * This server:
 * 1. Serves all static files (HTML, CSS, JS, images)
 * 2. Provides a /api/create-payment-intent endpoint for Stripe
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// ——— Validate environment variables ———
if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_YOUR_SECRET_KEY_HERE') {
  console.error('\n❌ ERROR: Stripe secret key not configured!');
  console.error('   Open the .env file and paste your Stripe secret key.');
  console.error('   Get your key from: https://dashboard.stripe.com/apikeys\n');
  process.exit(1);
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = process.env.PORT || 3000;

// ——— Middleware ———
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// ——— API: Get publishable key ———
// The frontend fetches this so the key lives in .env only
app.get('/api/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

// ——— API: Create Payment Intent ———
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, email, name, message } = req.body;

    // Validate amount
    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (!amountInCents || amountInCents < 50) {
      return res.status(400).json({
        error: 'Invalid donation amount. Minimum is $0.50.',
      });
    }

    // Create a PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      description: `Donation to The Frame Foundation`,
      receipt_email: email,
      metadata: {
        donor_name: name,
        donor_email: email,
        donor_message: message || '',
        source: 'frame-foundation-website',
      },
      // Automatically send a receipt email
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(`✅ PaymentIntent created: ${paymentIntent.id} — $${(amountInCents / 100).toFixed(2)} from ${name}`);

    res.json({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (err) {
    console.error('❌ Stripe error:', err.message);
    res.status(500).json({
      error: 'Payment processing failed. Please try again.',
    });
  }
});

// ——— Start server ———
app.listen(PORT, () => {
  const isTest = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('   🏛️  The Frame Foundation — Donation Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   🌐  http://localhost:${PORT}`);
  console.log(`   💳  Stripe mode: ${isTest ? '🧪 TEST' : '🔴 LIVE'}`);
  console.log(`   📁  Serving from: ${__dirname}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  if (isTest) {
    console.log('   Test card: 4242 4242 4242 4242');
    console.log('   Any future date, any CVC, any ZIP');
    console.log('');
  }
});
