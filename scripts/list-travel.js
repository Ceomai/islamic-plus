const https = require('https');
https.get('https://cdn.jsdelivr.net/gh/Alsarmad/Adhkar-json@main/adhkar.json', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    const j = JSON.parse(d);
    const c = j.find((x) => (x.category || '').includes('دعاء السفر'));
    for (const a of c?.array || []) {
      console.log(a.audio, (a.text || '').slice(0, 90));
    }
  });
});
