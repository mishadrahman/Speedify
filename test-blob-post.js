import fetch, { Blob } from 'node-fetch';
async function run() {
  const payloadSize = 2 * 1024 * 1024;
  const payload = new Blob([new Uint8Array(payloadSize)], { type: 'text/plain' });
  const res = await fetch('https://speed.cloudflare.com/__up', {
    method: 'POST',
    body: payload,
    headers: { 'Origin': 'https://mishadrahman.github.io' }
  });
  console.log('POST status:', res.status);
}
run();
