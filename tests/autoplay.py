# Copyright 2026 The TOUGH SHIFT Authors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0
import sys
from playwright.sync_api import sync_playwright
MODS = sys.argv[1] if len(sys.argv)>1 else '{}'
SHOT = len(sys.argv)>2
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width':1280,'height':720}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)[:400])); pg.on('console', lambda m: errs.append('C:'+m.text[:300]) if m.type=='error' else None)
    pg.goto('file://' + __import__('os').path.abspath('index.html') + ''); pg.wait_for_timeout(1500)
    cats = pg.evaluate("window.__ts.CATS.map(c=>[c.id,c.drills.map(d=>d.id)])")
    for ci,(cid,ds) in enumerate(cats):
        for di,did in enumerate(ds):
            n0=len(errs)
            pg.evaluate(f"(()=>{{const t=window.__ts;t.E.bot=0;const c=t.CATS[{ci}];t.startDrill(c,c.drills[{di}],{{mods:{MODS},assist:0}});}})()")
            if SHOT: pg.wait_for_timeout(700); pg.screenshot(path=f'screenshots/{cid}_{did}.png')
            pg.evaluate("window.__ts.E.bot=30")
            ok=False; stt=None
            for i in range(36):
                pg.wait_for_timeout(400)
                stt = pg.evaluate("(()=>{const g=window.__ts.game;return {on:g.on,si:g.si,n:g.steps.length,say:g.step&&g.step.say,t:g.step&&g.step.t}})()")
                if not stt['on']: ok=True; break
            last = pg.evaluate("(()=>{const g=window.__ts.game;return [g.failed, g.errors.map(e=>e.msg).slice(0,4)]})()")
            print(cid,did,'DONE' if ok else ('STUCK '+str(stt)), last, errs[n0:n0+2])
    pg.evaluate("window.__ts.E.bot=0"); pg.wait_for_timeout(500); pg.screenshot(path='screenshots/debrief.png')
    b.close()
