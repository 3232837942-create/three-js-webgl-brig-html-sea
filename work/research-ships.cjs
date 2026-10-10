const fs=require('fs');fs.mkdirSync('work/research',{recursive:true});
async function go(){
const found=[];
for(const query of ['realistic brig','brigantine','naval brig','18th century sailing ship','realistic pirate ship','sailing ship']){
 const u='https://sketchfab.com/i/search?type=models&q='+encodeURIComponent(query)+'&downloadable=true&count=24';
 const r=await fetch(u);const j=await r.json();fs.writeFileSync('work/research/search-'+query.replaceAll(' ','-')+'.json',JSON.stringify(j,null,2));
 const items=(j.results||[]).filter(x=>x.downloadType==='free');
 console.log(JSON.stringify({query,items:items.map(x=>({uid:x.uid,name:x.name,author:x.user.displayName,likes:x.likeCount,url:x.viewerUrl,thumb:x.thumbnails.images.find(i=>i.width===720)?.url}))}));found.push(...items);
}
fs.writeFileSync('work/research/ship-results.json',JSON.stringify([...new Map(found.map(i=>[i.uid,i])).values()],null,2));
for(const [name,url] of [['kenney','https://kenney.nl/assets/pirate-kit'],['polypizza','https://poly.pizza/search/pirate%20ship']]){const t=await(await fetch(url)).text();fs.writeFileSync('work/research/'+name+'.html',t);console.log(name, [...t.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(m=>m[1]).filter(x=>/zip|download|\/m\/|preview|Sample|License|license/i.test(x)));}
}go().catch(e=>{console.error(e);process.exitCode=1});
