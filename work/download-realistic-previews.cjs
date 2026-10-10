const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, 'research', 'realistic-ships');
const ids = ['e9636c857e9e4f8690574ac3a74f8cba', '90a0b7174dd1474bae0e5d1e139b80fe', '78442db063634fb480a2ca20219a3c8b', '3116c6dc6ba54f8da5fccb9d72e011bf'];
async function main() {
  for (const id of ids) {
    const model = JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), 'utf8'));
    const image = model.thumbnails.images.find(x => x.width === 1024) ?? model.thumbnails.images[0];
    const response = await fetch(image.url);
    if (!response.ok) throw new Error(`${id}: ${response.status}`);
    fs.writeFileSync(path.join(dir, `${id}.jpg`), Buffer.from(await response.arrayBuffer()));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
