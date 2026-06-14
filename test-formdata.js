import fetch, { FormData, Blob } from 'node-fetch';
async function run() {
  const payloadSize = 2 * 1024 * 1024;
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(payloadSize)]));
  
  const res = await fetch('https://speed.cloudflare.com/__up', {
    method: 'POST',
    body: formData,
    headers: { 'Origin': 'https://mishadrahman.github.io' }
  });
  console.log('POST status:', res.status);
  for (const [k, v] of res.headers.entries()) {
    console.log(k, v);
  }
}
run();
