const https = require('https');
https.get('https://cdn.jsdelivr.net/gh/Alsarmad/Adhkar-json@main/adhkar.json', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    const j = JSON.parse(d);
    for (const c of j) {
      for (const a of c.array || []) {
        if ((a.text || '').includes('سَخَّر') || (a.text || '').includes('سخر')) {
          console.log(a.audio, (a.text || '').slice(0, 70));
        }
      }
    }
  });
});
