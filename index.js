const puppeteer = require('puppeteer');
const axios = require('axios');

const GAS_URL = process.env.GAS_URL;

const VANILLA_URL = 'https://qzin.jp/form_reviews/?reviews_tenpoid=bisyoujyo&reviews_id=RFVsEd';
const COCOA_URL = 'https://cocoa-job.jp/reviewform/?k=63666a79476179736159652b75716a7a52692b6d43413d3d&gd=71476669794d38643076735a746232483874386351394332355931342f4f5461514c523761546c2f4855493d';

const NICKNAMES = ['さくら','ひまり','ゆい','あおい','みく','ここ','りん','なな','もも','はな','つき','のの','らら','まい','りか'];
const VANILLA_AGES = ['20代前半','20代中盤','20代後半','30代前半','30代中盤','30代後半','40代','50代〜','ヒミツ♡'];
const COCOA_AGES = ['18〜19歳','20〜24歳','25〜29歳','30〜34歳','35〜39歳','40歳以上'];
const BUSTS = ['Aカップ','Bカップ','Cカップ','Dカップ','Eカップ','Fカップ以上'];
const BODY_TYPES = ['スリム','普通','グラマー','ぽっちゃり'];
const EXPERIENCES = ['未経験','経験あり'];

const rand = arr => arr[Math.floor(Math.random() * arr.length)];

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

async function selectByText(page, selector, text) {
  await page.evaluate((sel, txt) => {
    const elements = document.querySelectorAll(sel);
    for (const el of elements) {
      for (const opt of el.options) {
        if (opt.text.includes(txt)) {
          el.value = opt.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    }
  }, selector, text);
}

async function clickRadioByIndex(page, index) {
  await page.evaluate((idx) => {
    const radios = document.querySelectorAll('input[type="radio"]');
    if (radios[idx]) {
      radios[idx].checked = true;
      radios[idx].dispatchEvent(new Event('change', { bubbles: true }));
      radios[idx].dispatchEvent(new Event('click', { bubbles: true }));
    }
  }, index);
}

async function postVanilla(browser, row1, row2) {
  const page = await browser.newPage();
  await page.goto(VANILLA_URL, { waitUntil: 'networkidle2' });

  // ニックネーム
  await page.evaluate((nick) => {
    const input = document.querySelector('input[name*="nickname"], input[placeholder*="10文字"]');
    if (input) { input.value = nick; input.dispatchEvent(new Event('input', { bubbles: true })); }
  }, rand(NICKNAMES));

  // 年代
  await selectByText(page, 'select', rand(VANILLA_AGES));

  // カテゴリ①
  const cat1 = VANILLA_CATEGORY_MAP[row1['切り口']] || row1['切り口'];
  await page.evaluate((cat) => {
    const selects = document.querySelectorAll('select');
    for (let i = 1; i < selects.length; i++) {
      for (const opt of selects[i].options) {
        if (opt.text.includes(cat)) {
          selects[i].value = opt.value;
          selects[i].dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    }
  }, cat1);

  await new Promise(r => setTimeout(r, 500));

  // 評価アイコン①（0か1をランダム）
  const iconIdx1 = Math.random() < 0.5 ? 0 : 1;
  await clickRadioByIndex(page, iconIdx1);

  // 口コミ①
  await page.evaluate((text) => {
    const textareas = document.querySelectorAll('textarea');
    if (textareas[0]) {
      textareas[0].value = text;
      textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, row1['口コミアイデア']);

  // カテゴリ②
  const cat2 = VANILLA_CATEGORY_MAP[row2['切り口']] || row2['切り口'];
  await page.evaluate((cat) => {
    const selects = document.querySelectorAll('select');
    let found = 0;
    for (let i = 1; i < selects.length; i++) {
      for (const opt of selects[i].options) {
        if (opt.text.includes(cat)) {
          if (found === 1) {
            selects[i].value = opt.value;
            selects[i].dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
          found++;
        }
      }
    }
  }, cat2);

  await new Promise(r => setTimeout(r, 500));

  // 評価アイコン②
  const radioCount = await page.evaluate(() => document.querySelectorAll('input[type="radio"]').length);
  const offset = Math.floor(radioCount / 2);
  const iconIdx2 = Math.random() < 0.5 ? 0 : 1;
  await clickRadioByIndex(page, offset + iconIdx2);

  // 口コミ②
  await page.evaluate((text) => {
    const textareas = document.querySelectorAll('textarea');
    if (textareas[1]) {
      textareas[1].value = text;
      textareas[1].dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, row2['口コミアイデア']);

  // 確認画面へ
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button, input[type="submit"], a');
    for (const btn of btns) {
      if (btn.textContent.includes('確認')) { btn.click(); return; }
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  // 送信する
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button, input[type="submit"], a');
    for (const btn of btns) {
      if (btn.textContent.includes('送信')) { btn.click(); return; }
    }
  });
  await new Promise(r => setTimeout(r, 3000));

  await markDone(row1['_rowIndex']);
  await markDone(row2['_rowIndex']);
  console.log(`✅ バニラ投稿完了: row${row1['_rowIndex']} + row${row2['_rowIndex']}`);
  await page.close();
}

async function postCocoa(browser, row) {
  const page = await browser.newPage();
  await page.goto(COCOA_URL, { waitUntil: 'networkidle2' });

  // 年齢
  await page.evaluate((age) => {
    const sel = document.querySelectorAll('select')[0];
    for (const opt of sel.options) {
      if (opt.text.includes(age)) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); return; }
    }
  }, rand(COCOA_AGES));

  // バスト
  await page.evaluate((bust) => {
    const sel = document.querySelectorAll('select')[1];
    for (const opt of sel.options) {
      if (opt.text.includes(bust)) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); return; }
    }
  }, rand(BUSTS));

  // 体型
  await page.evaluate((body) => {
    const sel = document.querySelectorAll('select')[2];
    for (const opt of sel.options) {
      if (opt.text.includes(body)) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); return; }
    }
  }, rand(BODY_TYPES));

  // 業界経験
  await page.evaluate((exp) => {
    const sel = document.querySelectorAll('select')[3];
    for (const opt of sel.options) {
      if (opt.text.includes(exp)) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); return; }
    }
  }, rand(EXPERIENCES));

  // カテゴリボタンクリック→別ページに遷移
  const cat = COCOA_CATEGORY_MAP[row['切り口']] || row['切り口'];
  await page.evaluate((cat) => {
    const links = document.querySelectorAll('a');
    for (const link of links) {
      if (link.textContent.trim().includes(cat)) { link.click(); return; }
    }
  }, cat);
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // 良い点テキストエリア
  await page.evaluate((text) => {
    const textareas = document.querySelectorAll('textarea');
    if (textareas[0]) {
      textareas[0].value = text;
      textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, row['口コミアイデア']);

  // 確認する
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button, input[type="submit"], a');
    for (const btn of btns) {
      if (btn.textContent.includes('確認')) { btn.click(); return; }
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  // 最終送信
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button, input[type="submit"], a');
    for (const btn of btns) {
      if (btn.textContent.includes('送信') || btn.textContent.includes('投稿')) { btn.click(); return; }
    }
  });
  await new Promise(r => setTimeout(r, 3000));

  await markDone(row['_rowIndex']);
  console.log(`✅ ココア投稿完了: row${row['_rowIndex']}`);
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

  // バニラ：2行で1投稿
  for (let i = 0; i + 1 < vanillaRows.length && i < 2; i += 2) {
    await postVanilla(browser, vanillaRows[i], vanillaRows[i + 1]);
    await new Promise(r => setTimeout(r, 3000));
  }

  // ココア：1行で1投稿、最大2件
  for (let i = 0; i < cocoaRows.length && i < 2; i++) {
    await postCocoa(browser, cocoaRows[i]);
    await new Promise(r => setTimeout(r, 3000));
  }

  await browser.close();
  console.log('🎉 全投稿完了');
}

main().catch(console.error);
