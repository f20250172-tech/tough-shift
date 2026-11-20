/*
 * Copyright 2026 The TOUGH SHIFT Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { build } from 'esbuild'; import fs from 'fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const banner = '<!--\n  TOUGH SHIFT\n  Copyright 2026 The TOUGH SHIFT Authors\n\n  Licensed under the Apache License, Version 2.0 (the "License");\n  you may not use this file except in compliance with the License.\n  You may obtain a copy of the License at\n\n      http://www.apache.org/licenses/LICENSE-2.0\n\n  Unless required by applicable law or agreed to in writing, software\n  distributed under the License is distributed on an "AS IS" BASIS,\n  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  See the License for the specific language governing permissions and\n  limitations under the License.\n\n  SPDX-License-Identifier: Apache-2.0\n\n  This file bundles three.js, Copyright 2010-2026 three.js authors, MIT License.\n  Full notices: LICENSE, NOTICE and THIRD_PARTY_NOTICES.md in the source repository.\n-->';
const html = `<!DOCTYPE html>
${banner}
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><title>TOUGH SHIFT: hands-first pressure drills</title></head>
<body><script>${js}</script></body></html>`;
fs.writeFileSync('index.html', html); console.log('built', (html.length / 1024).toFixed(0) + ' KB');
