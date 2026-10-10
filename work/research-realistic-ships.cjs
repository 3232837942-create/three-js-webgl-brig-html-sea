const fs = require('node:fs');
const path = require('node:path');
const research = path.join(__dirname, 'research', 'realistic-ships');
fs.mkdirSync(research, { recursive: true });

const queries = ['realistic sailing ship', '18th century brig', 'sailing brig', 'brigantine', 'naval brig', 'age of sail ship'];
const seen = new Map();

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}
async function main() {
  for (const query of queries) {
    const search = await getJson(`https://sketchfab.com/i/search?type=models&q=${encodeURIComponent(query)}&downloadable=true&count=24`);
    fs.writeFileSync(path.join(research, `${query.replaceAll(' ', '-')}.json`), JSON.stringify(search, null, 2));
    for (const item of search.results ?? []) if (item.downloadType === 'free') seen.set(item.uid, item);
  }
  const basic = [...seen.values()];
  const details = await Promise.all(basic.map(async item => {
    try {
      const detail = await getJson(`https://api.sketchfab.com/v3/models/${item.uid}`);
      fs.writeFileSync(path.join(research, `${item.uid}.json`), JSON.stringify(detail, null, 2));
      const image = detail.thumbnails?.images?.find(x => Number(x.width) >= 720) ?? detail.thumbnails?.images?.[0];
      return { uid:item.uid, name:detail.name, author:detail.user?.displayName, url:detail.viewerUrl, triangles:detail.faceCount, vertices:detail.vertexCount, license:detail.license?.slug, downloadable:detail.isDownloadable, animations:detail.animationCount, likes:detail.likeCount, description:(detail.description ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(), thumb:image?.url };
    } catch (error) { return { uid:item.uid, error:String(error) }; }
  }));
  details.sort((a,b) => (b.likes ?? 0) - (a.likes ?? 0));
  fs.writeFileSync(path.join(research, 'candidates.json'), JSON.stringify(details, null, 2));
  console.log(JSON.stringify(details.map(x => ({uid:x.uid,name:x.name,author:x.author,triangles:x.triangles,license:x.license,likes:x.likes,description:x.description?.slice(0,180),thumb:x.thumb})), null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
