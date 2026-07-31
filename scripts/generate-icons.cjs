const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function main() {
  const svg = fs.readFileSync(path.join(__dirname, '..', 'public', 'icon.svg'), 'utf8');
  for (const size of [192, 512]) {
    const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
    fs.writeFileSync(path.join(__dirname, '..', 'public', `icon-${size}.png`), png);
    console.log(`Created icon-${size}.png`);
  }
}
main().catch(console.error);
