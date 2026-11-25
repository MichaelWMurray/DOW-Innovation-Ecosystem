import fs from 'node:fs';
let html=fs.readFileSync('dist/index.html','utf8');
html=html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,(_,src)=>`<script type="module">${fs.readFileSync('dist/'+src.replace(/^\//,''),'utf8').replace(/<\/script/gi,'<\\/script')}</script>`);
html=html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,(_,src)=>`<style>${fs.readFileSync('dist/'+src.replace(/^\//,''),'utf8')}</style>`);
fs.writeFileSync('dist/Innovation_Ecosystem_Prototype.html',html);
console.log('Standalone prototype saved.');
