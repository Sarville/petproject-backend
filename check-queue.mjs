import { Queue } from 'bullmq';

const q = new Queue('payments', { connection: { host: 'localhost', port: 6379 } });

const [waiting, active, completed, failed, delayed] = await Promise.all([
  q.getWaiting(),
  q.getActive(),
  q.getCompleted(),
  q.getFailed(),
  q.getDelayed(),
]);

console.log('');
console.log('=== СОСТОЯНИЕ ОЧЕРЕДИ Redis/BullMQ ===');
console.log('');
console.log('  ⏳ Ожидают (waiting):  ', waiting.length);
console.log('  🔄 В обработке (active):', active.length);
for (const j of active) {
  console.log('      └─ ' + j.id + ' | ' + j.data.event.type + ' | попытка ' + (j.attemptsMade + 1));
}
console.log('  ✅ Завершены (completed):', completed.length);
for (const j of completed) {
  console.log('      └─ ' + j.id + ' | ' + j.data.event.type);
}
console.log('  ❌ Упали (failed):      ', failed.length);
console.log('  ⏰ Backoff (delayed):   ', delayed.length);
console.log('');

await q.close();
process.exit(0);
