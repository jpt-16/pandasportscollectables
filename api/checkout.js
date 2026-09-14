// Vercel serverless function that starts a Stripe Checkout session for a
// single item. Every product here is one-of-a-kind, so quantity is always
// 1 and never adjustable — there's nothing to add more of.
//
// This does not reserve the item. Two people clicking "Buy" on the same
// piece at nearly the same moment is a real, if rare, possibility for a
// small shop — the webhook (api/webhook.js) archives the product the
// instant a payment succeeds, which closes that window to seconds, not
// minutes. If it ever does happen, refund the second payment by hand.

import Stripe from 'stripe';

function siteOrigin(req) {
  if (req.headers.origin) return req.headers.origin;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers.host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const priceId = typeof body.priceId === 'string' ? body.priceId.trim() : '';
  if (!priceId) {
    return res.status(400).json({ ok: false, message: 'Missing item.' });
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    console.error('api/checkout: missing STRIPE_SECRET_KEY environment variable.');
    return res.status(500).json({ ok: false, message: 'Shop is misconfigured.' });
  }

  const stripe = new Stripe(apiKey);

  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
    if (!price.active || !price.product || price.product.active === false) {
      return res.status(410).json({ ok: false, message: 'That piece is no longer available.' });
    }

    const origin = siteOrigin(req);
    const shippingCents = Number.parseInt(process.env.SHIPPING_FLAT_CENTS || '0', 10) || 0;
    const automaticTax = process.env.STRIPE_AUTOMATIC_TAX === 'true';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      shipping_address_collection: { allowed_countries: ['US'] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: shippingCents, currency: price.currency },
            display_name: shippingCents ? 'Shipping' : 'Free shipping',
          },
        },
      ],
      ...(automaticTax ? { automatic_tax: { enabled: true } } : {}),
      success_url: `${origin}/shop-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop.html?cancelled=1`,
      metadata: { productId: price.product.id },
    });

    return res.status(200).json({ ok: true, url: session.url });
  } catch (err) {
    console.error('api/checkout: failed to create session:', err);
    return res.status(502).json({
      ok: false,
      message: "That didn't go through — try again in a moment.",
    });
  }
}
