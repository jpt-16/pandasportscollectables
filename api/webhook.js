// Stripe webhook endpoint. Point a webhook at
// https://<your-domain>/api/webhook for these two events (Stripe Dashboard
// → Developers → Webhooks → Add endpoint), then copy its signing secret
// into STRIPE_WEBHOOK_SECRET:
//   - checkout.session.completed — fires the moment a buyer's card is
//     authorized (see api/checkout.js: capture_method is 'manual', so this
//     is a hold, not a charge yet). Archives the Stripe Product so the
//     one-of-a-kind item can't be authorized twice, and emails the buyer
//     + support@ that the order is confirmed but the card hasn't been
//     charged.
//   - payment_intent.succeeded — fires when someone captures that
//     PaymentIntent by hand from the Stripe Dashboard (Payments → find the
//     uncaptured payment → Capture), which is the moment to do when the
//     item actually ships. Emails the buyer that the card was just charged
//     and the order's on its way.
//
// Both handlers are best-effort on email — a Resend failure here is
// logged, not retried, since Stripe already has its own delivery retries
// for the webhook itself and we don't want to fail the webhook (which
// would make Stripe retry the whole event, including the archive step)
// over an email that didn't send.
//
// Not handled: exact-once delivery. Stripe can deliver the same event more
// than once; archiving an already-archived product is harmless, but a
// retried delivery could in principle send a duplicate email. Fine for the
// volume this shop expects — revisit if it becomes a problem.

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

  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress =
    process.env.RESEND_FROM || 'Panda Sports Memorabilia <info@pandasportsmemorabilia.com>';
  const notifyTo = process.env.RESEND_NOTIFY_TO || 'support@pandasportsmemorabilia.com';

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // With capture_method: 'manual', a completed session means the card was
    // authorized, not charged — payment_status is 'unpaid' until someone
    // captures it. Checkout only fires this event once that authorization
    // succeeds, so there's nothing further to check here.
    const productId = session.metadata && session.metadata.productId;
    let productName = (session.metadata && session.metadata.productName) || 'your item';

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
    const captureBy = new Date(session.created * 1000 + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    if (resendKey) {
      const resend = new Resend(resendKey);

      try {
        await resend.emails.send({
          from: fromAddress,
          to: notifyTo,
          subject: `New order (capture on ship): ${productName}`,
          text: `${buyerEmail || 'unknown buyer'} just authorized ${amount} for ${productName} — card is on hold, not charged yet.\n\nShip to: ${shippingAddress}\n\nWhen it ships: Stripe Dashboard → Payments → find this payment → Capture. Do it by roughly ${captureBy} — authorization holds expire if never captured, usually around 7 days out, and the buyer would need to pay again.\n\nStripe session: ${session.id}\nPaymentIntent: ${session.payment_intent || 'n/a'}`,
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
            text: `You're getting ${productName} for ${amount} — order confirmed.\n\nWe don't charge your card until your order actually ships. Nothing is due right now; you'll get a separate email the moment it's on its way and your card is charged.\n\nReply to this email any time if you have a question about it.\n\nThank you for supporting Panda. 10% of this sale goes to cancer research.`,
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

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    if (paymentIntent.capture_method !== 'manual') {
      return res.status(200).json({ received: true });
    }

    const productName = (paymentIntent.metadata && paymentIntent.metadata.productName) || 'your item';
    const amount = formatAmount(paymentIntent.amount, paymentIntent.currency);

    let buyerEmail = null;
    try {
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: paymentIntent.id,
        limit: 1,
      });
      const session = sessions.data[0];
      buyerEmail = session && session.customer_details && session.customer_details.email;
    } catch (err) {
      console.error('api/webhook: failed to look up session for payment intent', paymentIntent.id, err);
    }

    if (resendKey && buyerEmail) {
      const resend = new Resend(resendKey);
      try {
        await resend.emails.send({
          from: fromAddress,
          replyTo: 'support@pandasportsmemorabilia.com',
          to: buyerEmail,
          subject: `You've been charged — ${productName} is on its way`,
          text: `Your card was just charged ${amount} for ${productName} — it's packed and shipping now.\n\nReply to this email any time if you have a question about it.\n\nThank you for supporting Panda. 10% of this sale goes to cancer research.`,
        });
      } catch (err) {
        console.error('api/webhook: capture confirmation email failed:', err);
      }
    } else if (resendKey && !buyerEmail) {
      console.error('api/webhook: no buyer email found for captured payment intent', paymentIntent.id);
    }

    return res.status(200).json({ received: true });
  }

  return res.status(200).json({ received: true });
}
