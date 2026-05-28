const puppeteer = require('puppeteer');
const axios = require('axios');

const GAS_URL = process.env.GAS_URL;

const VANILLA_URL = 'https://qzin.jp/form_reviews/?reviews_tenpoid=bisyoujyo&reviews_id=RFVsEd';
const COCOA_URL = 'https://cocoa-job.jp/reviewform/?k=63666a79476179736159652b75716a7a52692b6d43413d3d&gd=71476669794d38643076735a746232483874386351394332355931342f4f5461514c523761546c2f4855493d';

const NICKNAMES = [
  'さくら','ひまり','ゆい','あおい','みく','ここ','りん','なな','もも','はな',
  'つき','のの','らら','まい','りか','ゆな','かな','れな','あや','のあ',
  'ひな','みお','ゆか','えま','るな','らん','めい','ほの','あん','ねね',
  'ちか','のぞみ','まな','ゆず','こはる','みはる','あかり','ことね','いろは','ちひろ'
];
const VANILLA_AGES = ['20代前半','20代中盤','20代後半','30代前半','30代中盤','30代後半','40代','50代〜','ヒミツ♡'];
const COCOA_AGES = ['18〜19歳','20〜24歳','25〜29歳','30〜34歳','35〜39歳','40歳以上'];
const BUSTS = ['Aカップ','Bカップ','Cカップ','Dカップ','Eカップ','Fカップ以上'];
const BODY_TYPES = ['スリム','普通','グラマー','ぽっちゃり'];
const EXPERIENCES = ['未経験','経験あり'];

const rand = arr => arr[Math.floor(Math.random() * arr.length)];

// スプシの切り口 → バニラのカテゴリ
const VANILLA_CATEGORY_MAP = {
  '制度・待遇': '制度/待遇',
  'お客様・客層': 'お客様/客層',
  '客質・客層': 'お客様/客層',
  '面接内容の信用度': '面接/求人内容の信頼度',
  '求人ページの信頼度': '面接/求人内容の信頼度',
  '稼ぎやすさ': 'お給料',
  'シフト': 'シフト',
  'スタッフ同士の関係': 'スタッフ/女の子同士の関係',
};

// スプシの切り口 → ココアのカテゴリ
const COCOA_CATEGORY_MAP = {
  '制度・待遇': 'お店のサポート',
  'お客様・客層': '客質/客層',
  '客質・客層': '客質/客層',
  '面接内容の信用度': '求人ページの信頼度',
  '求人ページの信頼度': '求人ページの信頼度',
  '稼ぎやすさ': '稼ぎやすさ',
  'シフト': '働きやすさ',
  'スタッフ同士の関係': 'お店の雰囲気',
};

async function getUnpostedRows() {
  const res = await axios.get(`${GAS_URL}?action=getData`);
  return res.data;
}

async function markDone(rowIndex) {
  await axios.get(`${GAS_URL}?action=markDone&row=${rowIndex}`);
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
  console.log(`バニラ投稿開始: "${row1['切り口']}" + "${row2['切り口']}"`);
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  await page.goto(VANILLA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // デバッグ：ページの状態確認
  const pageInfo = await page.evaluate(() => {
    const selects = document.querySelectorAll('select');
    const links = document.querySelectorAll('a');
    return {
      url: window.location.href,
      title: document.title,
      selectCount: selects.length,
      selectOptions: Array.from(selects).map(s => ({
        name: s.name,
        options: Array.from(s.options).map(o => o.text)
      })),
      linkTexts: Array.from(links).map(l => l.textContent.trim()).filter(t => t.length > 0 && t.length < 20)
    };
  });
  console.log('ページ情報:', JSON.stringify(pageInfo, null, 2));

  // ニックネーム
  await page.evaluate((nick) => {
    const inputs = document.querySelectorAll('input[type="text"]');
    for (const input of inputs) {
      const label = input.closest('tr, div, li')?.textContent || '';
      if (label.includes('ニック') || input.placeholder?.includes('10文字')) {
        input.value = nick;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }
  }, rand(NICKNAMES));

  // 年代
  await page.evaluate((age) => {
    const selects = document.querySelectorAll('select');
    for (const sel of selects) {
      for (const opt of sel.options) {
        if (opt.text.includes(age)) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    }
  }, rand(VANILLA_AGES));

  await new Promise(r => setTimeout(r, 500));

  // カテゴリ①
  const cat1 = VANILLA_CATEGORY_MAP[row1['切り口']] || row1['切り口'];
  console.log(`カテゴリ①: ${cat1}`);
  await page.evaluate((cat) => {
    const selects = document.querySelectorAll('select');
    for (const sel of selects) {
      for (const opt of sel.options) {
        if (opt.text.includes(cat)) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    }
  }, cat1);

  await new Promise(r => setTimeout(r, 1000));

  // 評価アイコン①
  const iconIdx1 = Math.random() < 0.5 ? 0 : 1;
  await clickRadioByIndex(page, iconIdx1);
  await new Promise(r => setTimeout(r, 500));

  // 口コミ①
  await page.evaluate((text) => {
    const textareas = document.querySelectorAll('textarea');
    if (textareas[0]) {
      textareas[0].value = text;
      textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
      textareas[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, row1['口コミアイデア']);

  await new Promise(r => setTimeout(r, 500));

  // カテゴリ②（2番目のselectでcat2を選ぶ）
  const cat2 = VANILLA_CATEGORY_MAP[row2['切り口']] || row2['切り口'];
  console.log(`カテゴリ②: ${cat2}`);
  await page.evaluate((cat) => {
    const selects = document.querySelectorAll('select');
    let catSelectCount = 0;
    for (const sel of selects) {
      const hasMatch = Array.from(sel.options).some(opt => opt.text.includes(cat) || opt.text.includes('お給料'));
      if (hasMatch) {
        catSelectCount++;
        if (catSelectCount === 2) {
          for (const opt of sel.options) {
            if (opt.text.includes(cat)) {
              sel.value = opt.value;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
              return;
            }
          }
        }
      }
    }
  }, cat2);

  await new Promise(r => setTimeout(r, 1000));

  // 評価アイコン②
  const radioCount = await page.evaluate(() => document.querySelectorAll('input[type="radio"]').length);
  const offset = Math.floor(radioCount / 2);
  const iconIdx2 = Math.random() < 0.5 ? 0 : 1;
  await clickRadioByIndex(page, offset + iconIdx2);
  await new Promise(r => setTimeout(r, 500));

  // 口コミ②
  await page.evaluate((text) => {
    const textareas = document.querySelectorAll('textarea');
    if (textareas[1]) {
      textareas[1].value = text;
      textareas[1].dispatchEvent(new Event('input', { bubbles: true }));
      textareas[1].dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, row2['口コミアイデア']);

  await new Promise(r => setTimeout(r, 1000));

  // 確認画面へボタン
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button, input[type="submit"], a');
    for (const btn of btns) {
      if (btn.textContent.includes('確認')) {
        btn.click();
        return;
      }
    }
  });
  await new Promise(r => setTimeout(r, 3000));

  // 送信するボタン
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button, input[type="submit"], a');
    for (const btn of btns) {
      if (btn.textContent.includes('送信')) {
        btn.click();
        return;
      }
    }
  });
  await new Promise(r => setTimeout(r, 3000));

  await markDone(row1['_rowIndex']);
  await markDone(row2['_rowIndex']);
  console.log(`✅ バニラ投稿完了: row${row1['_rowIndex']} + row${row2['_rowIndex']}`);
  await page.close();
}

async function postCocoa(browser, row) {
  console.log(`ココア投稿開始: "${row['切り口']}"`);
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  await page.goto(COCOA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log(`ページ読み込み完了: ${page.url()}`);

  // 年齢（select[0]）
  const ageOptions = await page.$$eval('select:nth-of-type(1) option', opts => opts.map(o => o.value).filter(v => v));
  const ageVal = ageOptions[Math.floor(Math.random() * ageOptions.length)];
  await page.select('select:nth-of-type(1)', ageVal);
  console.log(`年齢選択: ${ageVal}`);
  await new Promise(r => setTimeout(r, 300));

  // バスト（select[1]）
  const bustOptions = await page.$$eval('select:nth-of-type(2) option', opts => opts.map(o => o.value).filter(v => v));
  const bustVal = bustOptions[Math.floor(Math.random() * bustOptions.length)];
  await page.select('select:nth-of-type(2)', bustVal);
  console.log(`バスト選択: ${bustVal}`);
  await new Promise(r => setTimeout(r, 300));

  // 体型（select[2]）
  const bodyOptions = await page.$$eval('select:nth-of-type(3) option', opts => opts.map(o => o.value).filter(v => v));
  const bodyVal = bodyOptions[Math.floor(Math.random() * bodyOptions.length)];
  await page.select('select:nth-of-type(3)', bodyVal);
  console.log(`体型選択: ${bodyVal}`);
  await new Promise(r => setTimeout(r, 300));

  // 業界経験（select[3]）
  const expOptions = await page.$$eval('select:nth-of-type(4) option', opts => opts.map(o => o.value).filter(v => v));
  const expVal = expOptions[Math.floor(Math.random() * expOptions.length)];
  await page.select('select:nth-of-type(4)', expVal);
  console.log(`経験選択: ${expVal}`);
  await new Promise(r => setTimeout(r, 500));

  // カテゴリリンクをhrefで直接取得してnavigation
  const cat = COCOA_CATEGORY_MAP[row['切り口']] || row['切り口'];
  console.log(`カテゴリ: ${cat}`);
  const catHref = await page.evaluate((cat) => {
    const links = document.querySelectorAll('a.js-categorySelectLink');
    for (const link of links) {
      if (link.textContent.trim().includes(cat)) {
        return link.href;
      }
    }
    return null;
  }, cat);

  if (!catHref) {
    console.log(`カテゴリリンク見つからず: ${cat}`);
    await page.close();
    return;
  }
  console.log(`カテゴリURL: ${catHref}`);

  await page.goto(catHref, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log(`カテゴリページ: ${page.url()}`);

  // 良い点テキストエリア
  const taCount = await page.$$eval('textarea', tas => tas.length);
  console.log(`textarea数: ${taCount}`);
  await page.focus('textarea:nth-of-type(1)');
  await page.type('textarea:nth-of-type(1)', row['口コミアイデア'], { delay: 10 });
  await new Promise(r => setTimeout(r, 1000));

  // 確認するボタン
  const confirmClicked = await page.evaluate(() => {
    const btns = document.querySelectorAll('button, input[type="submit"]');
    for (const btn of btns) {
      if (btn.textContent.includes('確認') || btn.value?.includes('確認')) {
        btn.click();
        return true;
      }
    }
    return false;
  });
  console.log(`確認ボタンクリック: ${confirmClicked}`);
  await new Promise(r => setTimeout(r, 3000));

  // 最終送信
  const submitClicked = await page.evaluate(() => {
    const btns = document.querySelectorAll('button, input[type="submit"]');
    for (const btn of btns) {
      if (btn.textContent.includes('送信') || btn.value?.includes('送信')) {
        btn.click();
        return true;
      }
    }
    return false;
  });
  console.log(`送信ボタンクリック: ${submitClicked}`);
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

  console.log(`バニラ未投稿: ${vanillaRows.length}件, ココア未投稿: ${cocoaRows.length}件`);

  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 60000,
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
