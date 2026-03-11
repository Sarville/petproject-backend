import crypto from 'crypto';
import http from 'http';

const WEBHOOK_SECRET = 'whsec_ac7ff4a807e5ffef983e9bf0e5067f9f318c1a6c48ffa41e3ca4802b937f20eb';

function sendEvent(eventType, index) {
  return new Promise((resolve) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const eventId = 'evt_test_' + index + '_' + Date.now();
    const piId = 'pi_test_' + index + '_' + Date.now();

    const event = {
      id: eventId,
      object: 'event',
      type: eventType,
      created: timestamp,
      data: {
        object: {
          id: piId,
          object: 'payment_intent',
          amount: 10000,
          currency: 'usd',
          status: eventType === 'payment_intent.succeeded' ? 'succeeded' : 'requires_payment_method',
          payment_method: null,
          setup_future_usage: null,
          last_payment_error: eventType === 'payment_intent.payment_failed' ? { message: 'Insufficient funds' } : null,
          metadata: {}
        }
      }
    };

    const payload = JSON.stringify(event);
    const signedPayload = timestamp + '.' + payload;
    const sig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(signedPayload).digest('hex');
    const stripeSignature = 't=' + timestamp + ',v1=' + sig;
    const startTime = Date.now();

    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/payments/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'stripe-signature': stripeSignature,
      }
    }, (res) => {
      const elapsed = Date.now() - startTime;
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ index, eventType, eventId, status: res.statusCode, elapsed, body }));
    });
    req.on('error', e => resolve({ index, eventType, eventId, status: 'ERR', elapsed: 0, body: e.message }));
    req.write(payload);
    req.end();
  });
}

const events = [
  ['payment_intent.succeeded',      1],
  ['payment_intent.succeeded',      2],
  ['payment_intent.payment_failed', 3],
  ['payment_intent.succeeded',      4],
  ['payment_intent.payment_failed', 5],
];

const pad = (s, n) => String(s).padEnd(n);

console.log('');
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║   ТЕСТ WEBHOOK QUEUE — 5 событий одновременно       ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('');
console.log('⏱  Время старта:', new Date().toTimeString().split(' ')[0]);
console.log('');

const results = await Promise.all(events.map(([type, idx]) => sendEvent(type, idx)));

console.log('┌────┬────────────────────────────────────────┬────────┬──────────┐');
console.log('│ #  │ Тип события                            │ Статус │  Ответ   │');
console.log('├────┼────────────────────────────────────────┼────────┼──────────┤');
for (const r of results) {
  const icon = r.eventType === 'payment_intent.succeeded' ? '✅' : '❌';
  const type = (icon + ' ' + r.eventType).padEnd(40);
  const status = pad(r.status, 6);
  const elapsed = pad(r.elapsed + 'ms', 8);
  console.log('│ ' + pad(r.index, 2) + ' │ ' + type + ' │ ' + status + ' │ ' + elapsed + ' │');
}
console.log('└────┴────────────────────────────────────────┴────────┴──────────┘');

const avgMs = Math.round(results.reduce((s, r) => s + r.elapsed, 0) / results.length);
console.log('');
console.log('📊 Среднее время ответа:', avgMs + 'ms');
console.log('');
console.log('Что происходит СЕЙЧАС в фоне:');
console.log('');
console.log('  T+0s    Эндпоинт ответил 200, задачи в Redis-очереди');
console.log('  T+0s    payment_failed (x2) обрабатываются СРАЗУ');
console.log('  T+25s   payment_succeeded (x3) завершатся поочерёдно');
console.log('');
console.log('Если один succeeded упадёт → retry через 3s, 6s, 12s, 24s, 48s');
console.log('');
