#!/usr/bin/env node
/**
 * xem_mau.js — Xem một file .docx: chữ phẳng, danh sách ô trống, hoặc cả hai.
 *
 * Ba việc hay cần làm mà không muốn mở Word:
 *   node xem_mau.js --file x.docx            → in toàn văn (để đọc/đối chiếu)
 *   node xem_mau.js --file x.docx --o-trong  → chỉ liệt kê {{bien}} có trong mẫu
 *   node xem_mau.js --file x.docx --tim "AH 496977"  → tìm chuỗi, in ngữ cảnh quanh nó
 *
 * `--tim` hữu ích khi lập bảng thay cho tao_mau.js: trước khi khai một giá trị, tìm
 * thử xem nó xuất hiện mấy lần và ở đâu, tránh thay nhầm một chuỗi quá phổ thông
 * (ví dụ thay "Hà Nội" thì hỏng cả quốc hiệu lẫn địa danh ký).
 */
'use strict';
const L = require('./docx_lib.js');

function docThamSo(argv) {
  const ts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const ten = a.slice(2);
      if (ten === 'o-trong') ts.oTrong = true;
      else ts[ten] = argv[++i];
    }
  }
  return ts;
}

function main() {
  const ts = docThamSo(process.argv);
  if (!ts.file) { console.error('Thiếu --file'); process.exit(2); }

  const cacMuc = L.docZip(ts.file);
  for (const ten of L.cacPhanCoChu(cacMuc)) {
    const xml = L.layNoiDung(cacMuc, ten);
    const chu = L.chuPhang(xml);

    if (ts.oTrong) {
      const o = [...new Set((chu.match(/\{\{[a-zA-Z0-9_.]+\}\}/g) || []))].sort();
      console.log(`\n### ${ten} — ${o.length} ô trống`);
      for (const x of o) console.log('  ' + x);
      continue;
    }

    if (ts.tim) {
      console.log(`\n### ${ten}`);
      let i = -1, dem = 0;
      while ((i = chu.indexOf(ts.tim, i + 1)) >= 0) {
        dem++;
        console.log(`  [${dem}] ...${chu.slice(Math.max(0, i - 70), i)}«${ts.tim}»${chu.slice(i + ts.tim.length, i + ts.tim.length + 70)}...`);
      }
      if (!dem) console.log('  (không tìm thấy)');
      continue;
    }

    // In toàn văn, tách đoạn theo <w:p> để dễ đọc.
    console.log(`\n### ${ten}`);
    const doan = xml.split(/<w:p\b/).map((khoi) => {
      const chuKhoi = (khoi.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [])
        .map((t) => L.boDauXML(t.replace(/<[^>]+>/g, ''))).join('');
      return chuKhoi.trim();
    }).filter(Boolean);
    for (const d of doan) console.log(d);
  }
}

if (require.main === module) main();
