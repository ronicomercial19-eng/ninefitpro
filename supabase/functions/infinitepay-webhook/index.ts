// Fail closed: legacy payload user_email/plan_id is not proof of payment.
// Re-enable fulfillment only after provider event authenticity, payment verification,
// idempotency and canonical user_subscriptions updates pass an end-to-end test.
Deno.serve(async req => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const secret = Deno.env.get('INFINITEPAY_WEBHOOK_SECRET');
  if (!secret) return Response.json({ error: 'Payment verification not configured' }, { status: 503 });
  if (req.headers.get('x-webhook-secret') !== secret) return Response.json({ error: 'Unauthorized' }, { status: 403 });
  return Response.json({ error: 'Payment fulfillment pending validation' }, { status: 503 });
});
