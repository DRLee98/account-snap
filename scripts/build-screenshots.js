#!/usr/bin/env node
// App Store 스크린샷 생성기 (iPhone 6.9" + iPad 13")
// 사용법: node scripts/build-screenshots.js
//   1. screenshots/raw/01.png ~ 06.png 에 원본 스크린샷 배치 (iPhone 캡쳐 그대로)
//   2. 본 스크립트 실행
//   3. screenshots/output/iphone/ + screenshots/output/ipad/ 에 합성 이미지 생성

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BG_TOP = '#1E2D6E';
const BG_BOTTOM = '#3A52B0';
const ACCENT = '#FFD400';

const TARGETS = [
  { name: 'iphone', W: 1320, H: 2868, headFontSize: 110, subFontSize: 52, headTop: 280, subTop: 400, accentY: 445, screenshotTop: 560, screenshotWidthRatio: 0.78, brandFontSize: 44 },
  { name: 'ipad', W: 2064, H: 2752, headFontSize: 130, subFontSize: 62, headTop: 280, subTop: 410, accentY: 460, screenshotTop: 570, screenshotWidthRatio: 0.55, brandFontSize: 52 },
];

const SLIDES = [
  { headline: '사진 한 장이면 끝', sub: '계좌번호를 손으로 적지 마세요', raw: '01.png' },
  { headline: '원하는 부분만 칠해서', sub: '브러시로 영역 선택 → 정확하게 인식', raw: '02.png' },
  { headline: '은행도 자동으로', sub: '14개 주요 은행 자동 식별 + 포맷', raw: '03.png' },
  { headline: '토스로 바로 송금', sub: '인식 즉시 송금 화면 호출', raw: '04.png' },
  { headline: '위젯에서 한 번에', sub: '카메라 단축 + 즐겨찾기 한 탭 복사', raw: '05.png' },
  { headline: '복사와 즐겨찾기', sub: '자주 쓰는 계좌를 손쉽게', raw: '06.png' },
];

const RAW_DIR = path.join(__dirname, '..', 'screenshots', 'raw');
const OUT_DIR = path.join(__dirname, '..', 'screenshots', 'output');

const escapeXml = (s) =>
  s.replace(/[<>&"']/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  }[c]));

function buildBackgroundSvg(W, H) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${BG_TOP}"/>
        <stop offset="100%" stop-color="${BG_BOTTOM}"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
  </svg>`;
}

function buildTextSvg(t, headline, sub) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${t.W}" height="${t.H}">
    <text x="${t.W / 2}" y="${t.headTop}" font-family="Apple SD Gothic Neo, -apple-system, sans-serif"
          font-size="${t.headFontSize}" font-weight="800" fill="#ffffff"
          text-anchor="middle">${escapeXml(headline)}</text>
    <text x="${t.W / 2}" y="${t.subTop}" font-family="Apple SD Gothic Neo, -apple-system, sans-serif"
          font-size="${t.subFontSize}" font-weight="400" fill="#cfd6f0"
          text-anchor="middle">${escapeXml(sub)}</text>
    <rect x="${t.W / 2 - 50}" y="${t.accentY}" width="100" height="6" rx="3" fill="${ACCENT}"/>
    <text x="${t.W / 2}" y="${t.H - 80}" font-family="Apple SD Gothic Neo, -apple-system, sans-serif"
          font-size="${t.brandFontSize}" font-weight="600" fill="#ffffff" text-anchor="middle"
          opacity="0.8">스냅넘버</text>
  </svg>`;
}

function buildMaskSvg(w, h, radius) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="white"/>
  </svg>`;
}

async function buildSlide(target, slide, index) {
  const rawPath = path.join(RAW_DIR, slide.raw);
  const hasRaw = fs.existsSync(rawPath);
  if (!hasRaw) console.warn(`⚠️  ${slide.raw} 없음 → 빈 자리로 합성`);

  const targetW = Math.round(target.W * target.screenshotWidthRatio);
  let screenshotW = targetW;
  let screenshotH = 0;
  let screenshotBuffer = null;

  if (hasRaw) {
    const meta = await sharp(rawPath).metadata();
    const aspect = meta.height / meta.width;
    screenshotH = Math.round(screenshotW * aspect);
    const fitted = await sharp(rawPath)
      .resize({ width: screenshotW, height: screenshotH, fit: 'fill' })
      .toBuffer();
    const radius = Math.round(screenshotW * 0.045);
    const mask = Buffer.from(buildMaskSvg(screenshotW, screenshotH, radius));
    screenshotBuffer = await sharp(fitted)
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  const composites = [];
  composites.push({ input: Buffer.from(buildTextSvg(target, slide.headline, slide.sub)), top: 0, left: 0 });
  if (screenshotBuffer) {
    const offsetTop = target.screenshotTop;
    const offsetLeft = Math.round((target.W - screenshotW) / 2);
    composites.push({ input: screenshotBuffer, top: offsetTop, left: offsetLeft });
  }

  const output = await sharp(Buffer.from(buildBackgroundSvg(target.W, target.H)))
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();

  const outDir = path.join(OUT_DIR, target.name);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(
    outDir,
    `${String(index + 1).padStart(2, '0')}-${slide.raw.replace('.png', '')}.png`,
  );
  await sharp(output).toFile(outPath);
  console.log(`  ✅ ${target.name}/${path.basename(outPath)}`);
}

(async () => {
  for (const t of TARGETS) {
    console.log(`\n📱 ${t.name} (${t.W}×${t.H})`);
    for (let i = 0; i < SLIDES.length; i++) {
      await buildSlide(t, SLIDES[i], i);
    }
  }
  console.log(`\n📦 완료: ${OUT_DIR}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
