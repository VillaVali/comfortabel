const url = process.env.BUILT_IN_FORGE_API_URL;
const key = process.env.BUILT_IN_FORGE_API_KEY;

const form = new FormData();
form.append('file', new Blob(['hello world'], { type: 'text/plain' }), 'test.txt');
form.append('path', 'documents/test.txt');

const r = await fetch(url + '/v1/storage/upload', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + key },
  body: form
});
const text = await r.text();
console.log(`POST /v1/storage/upload: ${r.status} — ${text.substring(0, 400)}`);
