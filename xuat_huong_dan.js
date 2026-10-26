#!/usr/bin/env node
/**
 * xuat_huong_dan.js — Xuất HUONG_DAN_CAN_BO.html (cẩm nang cho cán bộ) sang .docx để in.
 *
 * Nguồn duy nhất là file .html (bản xem trên trình duyệt). Script chuyển nó thành HTML mà
 * Word đọc được — thay biến màu CSS bằng màu thật của giao diện sáng, bỏ giao diện tối,
 * đổi phông web sang phông có sẵn trên máy Windows, đặt ngoặc vuông quanh chỗ phải thay —
 * rồi nhờ Word (qua PowerShell) lưu thành .docx khổ A4.
 *
 * Chỉ chạy trên máy Windows có Word. Không nằm trong gói skill (dong_goi.js chỉ lấy
 * scripts/, references/, assets/ và SKILL.md).
 *
 * Dùng:  node xuat_huong_dan.js                 → ghi HUONG_DAN_CAN_BO.docx cạnh file .html
 *        node xuat_huong_dan.js --pdf <file>    → ghi thêm bản PDF (xem nhanh, in)
 *
 * Đóng Word phải truyền [ref]: PowerShell 5.1 báo lỗi với Close(0)/Quit(0), Word ở lại
 * chạy ngầm giữ file ~$…, lần mở sau đứng chờ hộp thoại "file đang dùng" không ai thấy.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const GOC = __dirname;
const NGUON = path.join(GOC, 'HUONG_DAN_CAN_BO.html');
const RA = path.join(GOC, 'HUONG_DAN_CAN_BO.docx');

/** Bỏ mọi khối `đầu {…}` (kể cả ngoặc lồng) mà phần đầu khớp mẫu. */
function boKhoi(css, mauDau) {
  let ra = '';
  let i = 0;
  while (i < css.length) {
    const m = mauDau.exec(css.slice(i));
    if (!m) { ra += css.slice(i); break; }
    const batDau = i + m.index;
    ra += css.slice(i, batDau);
    let j = css.indexOf('{', batDau);
    let sau = 0;
    for (; j < css.length; j++) {
      if (css[j] === '{') sau++;
      else if (css[j] === '}' && --sau === 0) break;
    }
    i = j + 1;
  }
  return ra;
}

function htmlChoWord(nguon) {
  const tieuDe = (nguon.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'Cẩm nang';
  let css = (nguon.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
  let than = nguon.slice(nguon.indexOf('</style>') + '</style>'.length);

  // Màu của giao diện sáng, lấy từ khối :root đầu tiên.
  const goc = (css.match(/:root\s*\{([\s\S]*?)\}/) || [])[1] || '';
  const bien = {};
  for (const m of goc.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) bien[m[1]] = m[2].trim();
  // Phông web không có trên máy in của Chi nhánh: đổi sang phông Windows có sẵn.
  Object.assign(bien, {
    'f-display': '"Times New Roman", serif',
    'f-body': 'Arial, sans-serif',
    'f-mono': 'Consolas, monospace',
  });

  css = boKhoi(css, /@media[^{]*\{/);
  css = boKhoi(css, /:root[^{]*\{/);
  css = css.replace(/var\(--([\w-]+)\)/g, (_, k) => bien[k] || 'inherit');
  // Word không hiểu rem: quy về px theo cỡ gốc 16px.
  css = css.replace(/(\d*\.?\d+)rem\b/g, (_, n) => `${+(n * 16).toFixed(1)}px`);
  css += `
body { padding: 0; font-size: 12pt; background: #FFFFFF; }
.bon-phan { border: none; padding-top: 0; }
.bon-phan dt { margin-top: 6pt; }
.bon-phan dd { margin-left: 0; }
h2, h3, .nhan, .go-nhan { page-break-after: avoid; }
code { border: none; background: none; padding: 0; font-size: 10.5pt; }
.ten { background: none; padding: 0; }
.cong-thuc, .go, .canh-bao { padding: 8pt 10pt; }
h2 { margin-top: 20pt; }
`;

  than = than
    .replace(/<span class="o">([\s\S]*?)<\/span>/g, '<span class="o">[$1]</span>')
    // Word không có inline-block: mỗi tên mẫu một dòng, không dính vào nhau.
    .replace(/<\/span><span class="ten">/g, '</span><br><span class="ten">');

  return `<html><head><meta charset="utf-8"><title>${tieuDe}</title><style>${css}</style></head><body>${than}</body></html>`;
}

function main() {
  const iPdf = process.argv.indexOf('--pdf');
  const filePdf = iPdf > 0 ? path.resolve(process.argv[iPdf + 1]) : '';
  const tam = fs.mkdtempSync(path.join(os.tmpdir(), 'huongdan-'));
  const fileHtml = path.join(tam, 'huong_dan_word.html');
  fs.writeFileSync(fileHtml, '﻿' + htmlChoWord(fs.readFileSync(NGUON, 'utf8')), 'utf8');
  const q = (s) => s.replace(/'/g, "''");

  const ps = `
$ErrorActionPreference = 'Stop'
$w = New-Object -ComObject Word.Application
$w.Visible = $false; $w.DisplayAlerts = 0
try {
  $d = $w.Documents.Open('${q(fileHtml)}', $false, $true)
  $d.PageSetup.PaperSize = 7
  $d.PageSetup.TopMargin = 56.7; $d.PageSetup.BottomMargin = 56.7
  $d.PageSetup.LeftMargin = 62.4; $d.PageSetup.RightMargin = 51
  $d.ActiveWindow.View.Type = 3
  $d.SaveAs2('${q(RA)}', 16)
  ${filePdf ? `$d.ExportAsFixedFormat('${q(filePdf)}', 17)` : ''}
  Write-Output ("Trang: " + $d.ComputeStatistics(2))
  $d.Close([ref]0)
} finally { $w.Quit([ref]0) }
`;
  const kq = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  fs.rmSync(tam, { recursive: true, force: true });
  console.log(`Đã ghi ${RA}  (${kq.trim()})`);
}

if (require.main === module) main();
module.exports = { htmlChoWord };
