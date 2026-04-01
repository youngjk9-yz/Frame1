const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      description: 'Donation to The Frame Foundation',
      receipt_email: email,
      payment_method_types: ['card'],
      metadata: {
        donor_name: name,
        donor_email: email,
        donor_message: message || '',
        source: 'frame-foundation-website',
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({
      error: 'Payment processing failed. Please try again.',
    });
  }
};
