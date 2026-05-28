const puppeteer = require('puppeteer');
const axios = require('axios');

const GAS_URL = process.env.GAS_URL;

const VANILLA_URL = 'https://qzin.jp/form_reviews/?reviews_tenpoid=bisyoujyo&reviews_id=RFVsEd';
const COCOA_URL = 'https://cocoa-job.jp/reviewform/?k=63666a79476179736159652b75716a7a52692b6d43413d3d&gd=71476669794d38643076735a746232483874386351394332355931342f4f5461514c523761546c2f4855493d';

// ニックネームランダム生成
const NICKNAMES = ['さくら','ひまり','ゆい','あおい','みく','ここ','りん','なな','もも','はな','つき','のの','らら','まい','りか'];
const randomNick = () => NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];

// 年代ランダム（バニラ用）
const VANILLA_AGES = ['20代前半','20代中盤','20代後半','30代前半','30代中盤','30代後半','40代','50代〜','ヒミツ♡'];
const randomAge = () => VANILLA_AGES[Math.floor(Math.random() * VANILLA_AGES.length)];

// バスト・体型ランダム（ココア用）
const BUSTS = ['Aカップ','Bカップ','Cカップ','Dカップ','Eカップ','Fカップ以上'];
const BODY_TYPES = ['スリム','普通','グラマー','ぽっちゃり'];
const EXPERIENCES = ['未経験','他店経験あり'];
const COCOA_AGES = ['18歳','19歳','20代前半','20代後半','30代前半','30代後半','40代以上'];

// カテゴリマッピング
const VANILLA_CATEGORY_MAP = {
  '制度・待遇': '制度/待遇',
  'お客様・客層': 'お客様/客層',
  '客質・客層': 'お客様/客層',
  '面接内容の信用度': '面接/求人内容の信頼度',
  '求人ページの信頼度': '面接/求人内容の信頼度',
  '稼ぎやすさ': 'お給料',
  'シフト': 'シフト',
  'スタッフ': 'スタッフ/女の子同士の関係',
};

const COCOA_CATEGORY_MAP = {
  '制度・待遇': 'お店のサポート',
  'お客様・客層': '客質/客層',
  '客質・客層': '客質/客層',
  '面接内容の信用度': '求人ページの信頼度',
  '求人ページの信頼度': '求人ページの信頼度',
  '稼ぎやすさ': '稼ぎやすさ',
  'シフト': '働きやすさ',
  'スタッフ': 'お店の雰囲気',
};

async function getUnpostedRows() {
  const res = await axios.get(`${GAS_URL}?action=getData`);
  return res.data;
}

async function markDone(rowIndex) {
  await axios.get(`${GAS_URL}?action=markDone&row=${rowIndex}`);
}

async function postVanilla(browser, rows) {
  if (rows.length < 2) return;
  const [row1, row2] = rows;

  const page = await browser.newPage();
  await page.goto(VANILLA_URL, { waitUntil: 'networkidle2' });

  // ニックネーム
  await page.type('input[name*="nickname"], input[placeholder*="10文字"]', randomNick());

  // 年代
  const age = randomAge();
  await page.select('select[name*="age"], select', age).catch(() => {});

  // カテゴリ①
  const cat1 = VANILLA_CATEGORY_MAP[row1['切り口']] || row1['切り口'];
  await page.evaluate((cat) => {
    const selects = document.querySelectorAll('select');
    for (const sel of selects) {
      for (const opt of sel.options) {
        if (opt.text.includes(cat)) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change'));
          break;
        }
      }
    }
  }, cat1);

  // 評価アイコン①（1番目か2番目をランダム）
  const iconIndex1 = Math.random() < 0.5 ? 0 : 1;
  await page.evaluate((idx) => {
    const radios = document.querySelectorAll('input[type="radio"]');
    if (radios[idx]) {
      radios[idx].checked = true;
      radios[idx].dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, iconIndex1);

  // 口コミ①
  const textareas = await page.$$('textarea');
  if (textareas[0]) await textareas[0].type(row1['口コミアイデア']);

  // カテゴリ②
  const cat2 = VANILLA_CATEGORY_MAP[row2['切り口']] || row2['切り口'];
  await page.evaluate((cat) => {
    const selects = document.querySelectorAll('select');
    let count = 0;
    for (const sel of selects) {
      for (const opt of sel.options) {
        if (opt.text.includes(cat) && count === 1) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change'));
          break;
        }
      }
      count++;
    }
  }, cat2);

  // 評価アイコン②
  const iconIndex2 = Math.random() < 0.5 ? 0 : 1;
  await page.evaluate((idx) => {
    const radios = document.querySelectorAll('input[type="radio"]');
    const offset = Math.floor(radios.length / 2);
    if (radios[offset + idx]) {
      radios[offset + idx].checked = true;
      radios[offset + idx].dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, iconIndex2);

  // 口コミ②
  if (textareas[1]) await textareas[1].type(row2['口コミアイデア']);

  // 送信
  await page.click('button[type="submit"], input[type="submit"], .submit-btn');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});

  await markDone(row1['_rowIndex']);
  await markDone(row2['_rowIndex']);
  console.log(`✅ バニラ投稿完了: row${row1['_rowIndex']} + row${row2['_rowIndex']}`);

  await page.close();
}

async function postCocoa(browser, rows) {
  if (rows.length < 2) return;
  const [row1, row2] = rows;

  const page = await browser.newPage();
  await page.goto(COCOA_URL, { waitUntil: 'networkidle2' });

  // 年齢
  const cocoaAge = COCOA_AGES[Math.floor(Math.random() * COCOA_AGES.length)];
  await page.evaluate((age) => {
    const selects = document.querySelectorAll('select');
    for (const opt of selects[0].options) {
      if (opt.text.includes(age)) { selects[0].value = opt.value; break; }
    }
  }, cocoaAge);

  // バスト
  const bust = BUSTS[Math.floor(Math.random() * BUSTS.length)];
  await page.evaluate((b) => {
    const selects = document.querySelectorAll('select');
    for (const opt of selects[1].options) {
      if (opt.text.includes(b)) { selects[1].value = opt.value; break; }
    }
  }, bust);

  // 体型
  const body = BODY_TYPES[Math.floor(Math.random() * BODY_TYPES.length)];
  await page.evaluate((bd) => {
    const selects = document.querySelectorAll('select');
    for (const opt of selects[2].options) {
      if (opt.text.includes(bd)) { selects[2].value = opt.value; break; }
    }
  }, body);

  // 業界経験
  const exp = EXPERIENCES[Math.floor(Math.random() * EXPERIENCES.length)];
  await page.evaluate((e) => {
    const selects = document.querySelectorAll('select');
    for (const opt of selects[3].options) {
      if (opt.text.includes(e)) { selects[3].value = opt.value; break; }
    }
  }, exp);

  // カテゴリ①ボタンクリック
  const cat1 = COCOA_CATEGORY_MAP[row1['切り口']] || row1['切り口'];
  await page.evaluate((cat) => {
    const btns = document.querySelectorAll('a, button, div');
    for (const btn of btns) {
      if (btn.textContent.trim().includes(cat)) { btn.click(); break; }
    }
  }, cat1);
  await new Promise(r => setTimeout(r, 1000));

  // 評価①＋口コミ①
  const radios1 = await page.$$('input[type="radio"]');
  const iconIndex1 = Math.random() < 0.5 ? 0 : 1;
  if (radios1[iconIndex1]) await radios1[iconIndex1].click();
  const textareas1 = await page.$$('textarea');
  if (textareas1[0]) await textareas1[0].type(row1['口コミアイデア']);

  // カテゴリ②ボタンクリック
  const cat2 = COCOA_CATEGORY_MAP[row2['切り口']] || row2['切り口'];
  await page.evaluate((cat) => {
    const btns = document.querySelectorAll('a, button, div');
    let count = 0;
    for (const btn of btns) {
      if (btn.textContent.trim().includes(cat)) {
        if (count === 1) { btn.click(); break; }
        count++;
      }
    }
  }, cat2);
  await new Promise(r => setTimeout(r, 1000));

  // 評価②＋口コミ②
  const radios2 = await page.$$('input[type="radio"]');
  const offset = Math.floor(radios2.length / 2);
  const iconIndex2 = Math.random() < 0.5 ? 0 : 1;
  if (radios2[offset + iconIndex2]) await radios2[offset + iconIndex2].click();
  const textareas2 = await page.$$('textarea');
  if (textareas2[1]) await textareas2[1].type(row2['口コミアイデア']);

  // 送信
  await page.click('button[type="submit"], input[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});

  await markDone(row1['_rowIndex']);
  await markDone(row2['_rowIndex']);
  console.log(`✅ ココア投稿完了: row${row1['_rowIndex']} + row${row2['_rowIndex']}`);

  await page.close();
}

async function main() {
  const rows = await getUnpostedRows();
  console.log(`未投稿件数: ${rows.length}`);

  const vanillaRows = rows.filter(r => r['サイト'] === 'バニラ');
  const cocoaRows = rows.filter(r => r['サイト'] === 'ココア');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // バニラ：2行ずつ処理
  for (let i = 0; i + 1 < vanillaRows.length && i < 2; i += 2) {
    await postVanilla(browser, [vanillaRows[i], vanillaRows[i + 1]]);
    await new Promise(r => setTimeout(r, 3000));
  }

  // ココア：2行ずつ処理
  for (let i = 0; i + 1 < cocoaRows.length && i < 2; i += 2) {
    await postCocoa(browser, [cocoaRows[i], cocoaRows[i + 1]]);
    await new Promise(r => setTimeout(r, 3000));
  }

  await browser.close();
  console.log('🎉 全投稿完了');
}

main().catch(console.error);
