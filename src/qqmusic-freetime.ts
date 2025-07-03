import { $, check, loop, toSearchParams, type Page } from '~/helper';

const cfg = defineConfig([
  {
    label: '模式',
    name: 'mode',
    type: 'select',
    options: {
      ad: '免费畅听模式',
      gift: '免费领礼物',
    },
  },
  {
    label: '点击跳转时长',
    name: 'clickSkipDuration',
    help: '单位: ms',
    type: 'text',
  },
  {
    label: '页面检查间隔',
    name: 'checkInterval',
    help: '单位: ms',
    type: 'text',
  },
]);
cfg.APP_ENV === 'development' && console.show();

const pkgName = 'com.tencent.qqmusic';
const nav = {
  qqmusic() {
    log('goto qqmusic');
    app.launchPackage(pkgName);
  },
  back() {
    log('back');
    currentPackage() !== pkgName ? nav.qqmusic() : back();
  },
};
const home = (_do: Page['do']): Page => ({
  name: '首页',
  is: () => $('d=听歌识曲').el,
  do: _do,
});
const firstAD: Page = {
  name: '首屏广告',
  is: () => $('t=跳过').el,
  do: () => $('t=跳过').click(),
};

auto.waitFor();
const pages = (
  {
    ad: () => [
      {
        name: '免费模式',
        is: () => $('t?免费模式剩余时长').el,
        do() {
          $('t^浏览5秒').click();
          $('t=领取奖励').click();
          if (!$('t=去浏览').click()) {
            sleep(11e3);
            back();
          }
          $('t=我知道了').click();
          return $('t=续时长').click() && $('t=去开启').click();
        },
      },
      home(() => {
        log('goto freetime');
        const shareUrl = 'https://y.qq.com/tmead/h5/2022/free2/index.html';
        app.startActivity({
          action: 'VIEW',
          packageName: pkgName,
          data:
            'qqmusic://qq.com/ui/openUrl?' +
            toSearchParams({ p: { url: shareUrl }, source: shareUrl }),
        });
      }),
      {
        name: '广告',
        is: () => $('t?免费听歌').el || $('t^观看完视频，可获得奖励').el,
        do() {
          if ($('t^已获得免费听歌').el)
            return (
              $('t=关闭').click() &&
              $('t?跳过').click() &&
              $('d=关闭广告').click()
            );
          if (
            !(
              $('t=点击一下，获得奖励').click() &&
              $('t^只需点一下').click() &&
              $('t=立即点击').click()
            )
          )
            return;
          const text = ocr.recognizeText(captureScreen());
          if (text.includes('已获得')) {
            click(999, 273); // 右上角关闭按钮
            return;
          }
          if (text.includes('点击跳转')) {
            if (click(516, 2190)) {
              sleep(+cfg.clickSkipDuration);
              nav.back();
            } else {
              log('点击广告失败');
            }
          }
        },
      },
      {
        name: '次数用完',
        is: () => $('t=今日免费畅听次数已用完').el,
        do() {
          log(`次数用完, 即将退出`);
          sleep(3e3);
          throw 0;
        },
      },
      firstAD,
    ],
    gift: () => [
      {
        name: '看广告领好礼',
        is: () => $('t=看广告领好礼').el,
        do() {
          if ($('t^已领取').el) {
            log(`已领取，即将关闭`);
            sleep(3e3);
            throw 0;
          }
          while (true) {
            $('t=浏览').click() || sleep(16e3) || nav.back();
            if (!$('t=待领取').click()) break;
          }
        },
      },
      {
        name: '金币',
        is: () => $('t=金币订单').el,
        do: () => $('t=免费领礼物').click(),
      },
      {
        name: '我的',
        is: () => $('t=本地').el,
        do: () => $('t=提现').el?.parent()?.click(),
      },
      home(() => $('t=我的').click()),
      firstAD,
    ],
  } as Record<typeof cfg.mode, () => Page[]>
)[cfg.mode]();
if (!requestScreenCapture()) {
  toastLog('没有授予 Hamibot 屏幕截图权限');
  hamibot.exit();
}
loop(() => check(pages, nav.back), +cfg.checkInterval);
