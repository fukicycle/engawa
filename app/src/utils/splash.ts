/**
 * 起動スプラッシュ (index.html の #engawa-splash) の制御。
 *
 * ネイティブアプリの起動体験に寄せるため、起動直後の描画は
 * 「index.html に埋め込まれた静的スプラッシュ」1枚だけに統一する。
 * React 側は認証復元が終わった時点で hideSplash() を呼ぶだけでよく、
 * 全画面ローディングカードを挟まない。
 */

const SPLASH_ID = 'engawa-splash';
const FADE_DURATION = 450; // index.html の transition と揃える

let hidden = false;

/**
 * スプラッシュを静かにフェードアウトさせて DOM から取り除く。
 * 何度呼んでも安全（2回目以降は何もしない）。
 */
export const hideSplash = (): void => {
  if (hidden) return;
  hidden = true;

  const splash = document.getElementById(SPLASH_ID);
  if (!splash) return;

  // 1フレーム待ってからフェードを開始し、アプリ本体の初回描画と重ねる。
  // これにより「スプラッシュが消えた瞬間に白が挟まる」現象を防ぐ。
  requestAnimationFrame(() => {
    splash.classList.add('is-hidden');
    window.setTimeout(() => {
      splash.remove();
    }, FADE_DURATION);
  });
};
