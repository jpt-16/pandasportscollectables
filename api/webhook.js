// Stripe webhook endpoint. Point a webhook at
// https://<your-domain>/api/webhook for the `checkout.session.completed`
// event (Stripe Dashboard → Developers → Webhooks → Add endpoint), then
// copy its signing secret into STRIPE_WEBHOOK_SECRET.
//
// On a completed, paid session this does two things: archives the Stripe
// Product that was bought (so the one-of-a-kind item can't be sold twice),
// and emails a confirmation to the buyer plus a "pack this up" notice to
// support@. Both are best-effort — a Resend failure here is logged, not
// retried, since Stripe already has its own delivery retries for the
// webhook itself and we don't want to fail the webhook (which would make
// Stripe retry the whole event, including the archive step) over an email
// that didn't send.
//
// Not handled: exact-once delivery. Stripe can deliver the same event more
// than once; archiving an already-archived product is harmless, but a
// retried delivery could in principle send a duplicate pair of emails.
// Fine for the volume this shop expects — revisit if it becomes a problem.

import Stripe from 'stripe';
import { Resend } from 'resend';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function formatAmount(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  }).format(amount / 100);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed.');
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    console.error('api/webhook: missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET.');
    return res.status(500).send('Webhook misconfigured.');
  }

  const stripe = new Stripe(stripeKey);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('api/webhook: signature verification failed:', err.message);
    return res.status(400).send(`Webhook signature verification failed.`);
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;
  if (session.payment_status !== 'paid') {
    return res.status(200).json({ received: true });
  }

  const productId = session.metadata && session.metadata.productId;
  let productName = 'your item';

  if (productId) {
    try {
      const product = await stripe.products.update(productId, { active: false });
      productName = product.name || productName;
    } catch (err) {
      console.error('api/webhook: failed to archive product', productId, err);
    }
  }

  const buyerEmail = session.customer_details && session.customer_details.email;
  const amount = formatAmount(session.amount_total, session.currency);
  const shippingAddress =
    session.shipping_details && session.shipping_details.address
      ? Object.values(session.shipping_details.address).filter(Boolean).join(', ')
      : 'not collected';

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const fromAddress =
      process.env.RESEND_FROM || 'Panda Sports Memorabilia <info@pandasportsmemorabilia.com>';
    const notifyTo = process.env.RESEND_NOTIFY_TO || 'support@pandasportsmemorabilia.com';

    try {
      await resend.emails.send({
        from: fromAddress,
        to: notifyTo,
        subject: `New order: ${productName}`,
        text: `${buyerEmail || 'unknown buyer'} just paid ${amount} for ${productName}.\n\nShip to: ${shippingAddress}\n\nStripe session: ${session.id}`,
      });
    } catch (err) {
      console.error('api/webhook: internal order notification failed:', err);
    }

    if (buyerEmail) {
      try {
        await resend.emails.send({
          from: fromAddress,
          replyTo: 'support@pandasportsmemorabilia.com',
          to: buyerEmail,
          subject: `Your Panda Sports Memorabilia order — ${productName}`,
          text: `You're getting ${productName} for ${amount}.\n\nWe'll have it packed and on its way soon — reply to this email any time if you have a question about it.\n\nThank you for supporting Panda. 10% of this sale goes to cancer research.`,
        });
      } catch (err) {
        console.error('api/webhook: buyer confirmation email failed:', err);
      }
    }
  } else {
    console.error('api/webhook: RESEND_API_KEY not set, skipping order emails.');
  }

  return res.status(200).json({ received: true });
}
