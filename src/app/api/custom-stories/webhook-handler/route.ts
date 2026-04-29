import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe-server';
import { CUSTOM_STORY_STATUS } from '@/lib/custom-stories/config';
import { generateCustomStoryFromOrder } from '@/lib/custom-stories/service';

export const runtime = 'nodejs';

async function handleCheckoutComplete(sessionObj: Stripe.Checkout.Session) {
  const orderId = sessionObj.metadata?.custom_story_order_id?.trim();
  const order =
    (orderId
      ? await prisma.customStoryOrder.findUnique({ where: { id: orderId } })
      : null) ??
    (sessionObj.id
      ? await prisma.customStoryOrder.findFirst({ where: { stripeSessionId: sessionObj.id } })
      : null);
  if (!order) return;
  if (order.status === CUSTOM_STORY_STATUS.COMPLETED || order.status === CUSTOM_STORY_STATUS.GENERATING) return;

  const marked = await prisma.customStoryOrder.update({
    where: { id: order.id },
    data: {
      status: CUSTOM_STORY_STATUS.PAID,
      paidAt: new Date(),
      stripeSessionId: sessionObj.id || order.stripeSessionId,
    },
  });
  if (!marked.storyStudioDraftId) {
    await generateCustomStoryFromOrder(marked);
  }
}

export async function POST(req: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe webhook not configured.' }, { status: 503 });
  }
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  const buf = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'verify failed';
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const sessionObj = event.data.object as Stripe.Checkout.Session;
        if (sessionObj.mode === 'payment') {
          await handleCheckoutComplete(sessionObj);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error('[custom-stories/webhook-handler]', e);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
