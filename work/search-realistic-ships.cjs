const fs=require('node:fs');
const queries=['two masted sailing ship','two mast ship','18th century brig','historical sailing ship','naval sailing ship','schooner ship'];
async function main(){
 const all=new Map();
 for(const q of queries){
  const u='https://sketchfab.com/i/search?type=models&q='+encodeURIComponent(q)+'&downloadable=true&count=48';
  const r=await fetch(u); const j=await r.json();
  const kept=(j.results||[]).filter(x=>x.downloadType==='free' && /ship|brig|schooner|sailing|frigate|galleon|pinnace|barque|barque|vessel|boat/i.test(x.name));
  for(const x of kept) all.set(x.uid,x);
  console.log(JSON.stringify({query:q,results:kept.map(x=>({uid:x.uid,name:x.name,author:x.user?.displayName,likes:x.likeCount,url:x.viewerUrl,thumbnail:x.thumbnails?.images?.find(i=>i.width===720)?.url}))}));
 }
 fs.writeFileSync('work/research/realistic-ship-search-results.json',JSON.stringify([...all.values()],null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
