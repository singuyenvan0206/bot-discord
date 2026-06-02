const https = require('https');

function parseEmojiInputToUrl(query) {
  if (!query) return null;

  // 1. If it's a HTTP/HTTPS URL, return it
  if (/^https?:\/\//i.test(query)) {
    return query;
  }

  // 2. If it's a custom Discord emoji <:name:id> or <a:name:id>
  const customEmojiMatch = query.match(/<(a)?:(\w+):(\d+)>/);
  if (customEmojiMatch) {
    const animated = !!customEmojiMatch[1];
    const id = customEmojiMatch[3];
    return `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;
  }

  // 3. If it is a Unicode emoji
  const codePoints = [...query].map(char => char.codePointAt(0).toString(16));
  if (codePoints.length > 0) {
    const firstCodePoint = parseInt(codePoints[0], 16);
    if (firstCodePoint >= 128) {
      const hasKeycap = codePoints.includes('20e3');
      const filtered = hasKeycap ? codePoints : codePoints.filter(cp => cp !== 'fe0f');
      const hex = filtered.join('-');
      return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${hex}.png`;
    }
  }

  return query;
}

function checkUrl(url) {
  return new Promise((resolve) => {
    https.request(url, { method: 'HEAD' }, (res) => {
      resolve(res.statusCode);
    }).on('error', (err) => {
      resolve(`Error: ${err.message}`);
    }).end();
  });
}

async function test() {
  const emojis = ['🐐', '❤️', '1️⃣', '👨‍👩‍👧‍👦', '🇻🇳', '<:kekw:123456789012345678>', 'https://google.com/logo.png'];
  for (const e of emojis) {
    const url = parseEmojiInputToUrl(e);
    console.log(`Input: ${e} -> URL: ${url}`);
    if (url && url.startsWith('http')) {
      const status = await checkUrl(url);
      console.log(`  Status: ${status}`);
    }
  }
}

test();
