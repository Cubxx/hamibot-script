import 'dotenv/config';
import { ElementHandle, launch } from 'puppeteer-core';
import { scripts } from './json.js';

const browser = await launch({
  executablePath: process.env.browser,
  headless: false,
  args: [`--window-position=${1920 - 800},60`],
});
export const page = await browser.newPage();
page.setCookie(
  {
    name: 'auth.strategy',
    value: 'local',
    domain: 'hamibot.com',
  },
  {
    name: 'auth._token.local',
    value: process.env.token,
    domain: 'hamibot.com',
  },
);

/**
 * @template T
 * @param {Promise<ElementHandle<T>[]>} handles
 * @param {(handle: ElementHandle<T>) => Promise<boolean>} cb
 */
export async function choose(handles, cb) {
  for (const handle of await handles) if (await cb(handle)) return handle;
  throw new Error('No element found');
}
export const goto = Object.assign(
  async function (path) {
    const host = 'https://hamibot.com/';
    const url = host + path;
    if (page.url() === url) return;
    await page.goto(url);
    if (page.url() === host + 'login') throw new Error('Login failed');
  },
  {
    console() {
      return goto('dashboard/scripts/console');
    },
    async create(name) {
      await goto('dashboard/scripts/create');
      await page.locator('form input[name="name"]').fill(name);
      await page.locator('form button').click();
    },
    async editor(name) {
      const id = scripts[name];
      if (id) return goto('dashboard/scripts/edit/' + id);
      await goto.console();
      await page.waitForSelector('table');
      const row = await choose(page.$$('tbody > tr'), (el) =>
        el
          .$eval('td', (el) => el.innerText)
          .then((text) => text.includes(name)),
      ).catch(() => goto.create(name));
      if (!row) return goto.editor(name);
      const btn = await choose(row.$$('button'), (el) =>
        el.evaluate((el) => el.innerText.includes('源码')),
      ).catch(() => {
        throw Error('Edit button not found');
      });
      await btn.evaluate((el) => el.click());
      await page.waitForNavigation();
      scripts[name] = page.url().split('/').pop();
    },
  },
);
