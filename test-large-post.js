async function run() {
  const payloadSize = 2 * 1024 * 1024;
  const payload = '0'.repeat(payloadSize);
  const res = await fetch('https://speed.cloudflare.com/__up', {
    method: 'POST',
    body: payload,
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
  });
  console.log('POST status:', res.status);
  console.log('Body:', await res.text());
}
run();
