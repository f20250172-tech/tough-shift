import { build } from 'esbuild'; import fs from 'fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><title>TOUGH SHIFT: hands-first pressure drills</title></head>
<body><script>${js}</script></body></html>`;
fs.writeFileSync('index.html', html); console.log('built', (html.length / 1024).toFixed(0) + ' KB');
