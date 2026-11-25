import {defineConfig} from 'vite';
import fs from 'node:fs';
export default defineConfig({base:"./",plugins:[{name:'inline-data',transformIndexHtml(html){return html.replace('__DATASET__',fs.readFileSync('public/data.json','utf8').replace(/</g,'\\u003c'));}}],build:{assetsInlineLimit:1000000},server:{host:'0.0.0.0'}});
