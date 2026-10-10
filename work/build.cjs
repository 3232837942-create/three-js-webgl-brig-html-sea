const fs=require('fs'),vm=require('vm');
const scripts=['three.min.js','ocean.js','ship.js','combat.js','wake.js','helm.js','main.js'];
let body='';
for(const file of scripts){const code=fs.readFileSync('work/'+file,'utf8');new vm.Script(code,{filename:file});body+='<script>\n'+code.replace(/<\/script/gi,'<\\/script')+'\n</script>\n';}
const html=fs.readFileSync('work/shell.html','utf8').replace('<!--HELM_STYLE-->',()=>'<style>'+fs.readFileSync('work/helm.css','utf8')+'</style>').replace('<!--SCRIPTS-->',()=>body);
for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
for(const output of ['outputs/brig.html','outputs/黑燕号-完整交互版.html'])fs.writeFileSync(output,html);
console.log('Built '+html.length+' characters; all '+scripts.length+' scripts parse.');
