import { spawn } from 'child_process';
import { choose, goto, page } from './shared/browser.js';
import { basename, extname } from 'path';

const copyCmds = {
  win32: ['clip'],
  drawin: ['pbcopy'],
  linux: ['xclip', ['-selection', 'clipboard']],
}[process.platform];
if (!copyCmds) {
  throw new Error("Can't copy, unsupported platform: " + process.platform);
}

function debounce(fn, ms) {
  let timer;
  return function (...e) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, e), ms);
  };
}
async function cv(text) {
  (await page.$('div.CodeMirror-scroll'))?.evaluate((el) =>
    el.dispatchEvent(new MouseEvent('mousedown')),
  );
  const subprocess = spawn(...copyCmds);
  subprocess.stdin.write(text);
  subprocess.stdin.end();
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.press('KeyV');
  await page.keyboard.press('KeyS');
  await page.keyboard.up('Control');
}
async function update(name, code, config) {
  await goto.editor(name);
  (await page.waitForSelector('input[type="checkbox"]'))?.evaluate(
    (el) => el.checked || el.click(),
  );
  const fileEls = await page.$$('div.file');
  if (config) {
    await fileEls[1].click();
    await cv(config);
  }
  await fileEls[0].click();
  await cv(code);
}
/**@returns {import('rollup').Plugin} */
export function sync(debounce_ms = 3e3) {
  const update_debounce = debounce(update, debounce_ms);
  const configs = {};
  return {
    name: 'sync',
    transform(code, id) {
      return code.replace(/defineConfig\(([^\)]+)\)/, (_, g1) => {
        configs[id] = JSON.stringify(new Function('return ' + g1)(), null, 2);
        return 'hamibot.env';
      });
    },
    generateBundle(options, bundle) {
      Object.keys(bundle).forEach((filebase) => {
        const { code, facadeModuleId } = bundle[filebase];
        update_debounce(
          basename(filebase, extname(filebase)),
          code,
          configs[facadeModuleId],
        );
      });
    },
  };
}
