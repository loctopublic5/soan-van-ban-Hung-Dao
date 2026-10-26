#!/usr/bin/env node
/**
 * tao_mau.js — Biến một văn bản đã soạn thật thành mẫu có ô trống.
 *
 * Cách làm mẫu ở đây khác cách thường gặp: thay vì gõ lại mẫu từ đầu, ta lấy đúng
 * file cán bộ đã ký ban hành rồi thay từng dữ kiện cụ thể bằng tên biến. Lý do là
 * thể thức văn bản hành chính (font, giãn dòng, vị trí khối chữ ký, khung quốc hiệu)
 * đã được duyệt rồi; gõ lại là tự chuốc rủi ro sai thể thức mà không được lợi gì.
 *
 * Dùng:
 *   node tao_mau.js --vao "BC goc.docx" --ra "mau_bc.docx" --bang bang_thay.json
 *   node tao_mau.js --vao "BC goc.docx" --ra "mau_bc.docx" --bang bang_thay.json --thu
 *
 * bang_thay.json là { "giá trị thật trong file": "ten_bien", ... }
 * Ví dụ: { "Nguyễn Văn A": "ben_nhan_ho_ten", "BC 602641": "gcn_cu_so" }
 *
 * Chuỗi dài nên đặt trước chuỗi ngắn nếu chúng lồng nhau: script tự sắp xếp giảm dần
 * theo độ dài để tránh cảnh thay "Nguyễn Văn A" xong thì "Nguyễn Văn" không còn
 * để thay nữa — nhưng vẫn nên tự kiểm lại kết quả bằng --thu trước khi ghi đè.
 *
 * THÊM ĐOẠN MÀ BẢN ĐÃ KÝ KHÔNG CÓ: khoá "@sau <chữ của một đoạn>" chèn một đoạn mới ngay sau
 * đoạn đó (sau khi đã thay xong), cùng định dạng, chữ là giá trị. Ví dụ dòng ghi chú tài sản
 * riêng mà bản ký tách thửa không đổi chủ không có:
 *   "@sau {{cau_ghi_chu_thua_thuoc}}": "[[?cau_ghi_chu_tai_san_rieng]]{{cau_ghi_chu_tai_san_rieng}}"
 * Đã có đoạn đó thì không chèn lại. Thêm đoạn vào một mẫu ĐÃ LÀM (không còn bản ký gốc bên
 * cạnh): node tao_mau.js --vao mau.docx --bang bang_thay.json --ra mau.docx --chi-them
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./docx_lib.js');

function docThamSo(argv) {
  const ts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const ten = a.slice(2);
      if (ten === 'thu' || ten === 'chi-them') ts[ten] = true;
      else ts[ten] = argv[++i];
    }
  }
  return ts;
}

/**
 * Gỡ những đoạn bị thay đến rỗng. Một giá trị trải qua nhiều đoạn (danh sách GCN 10 dòng
 * thay bằng một ô) thì thayChuoi() dồn ô vào đoạn đầu và xoá chữ ở các đoạn sau — nhưng
 * các đoạn đó vẫn còn, thành 9 dòng trống giữa văn bản (mẫu phân chia tài sản chung, phát
 * hiện 15/09/2026). Chỉ gỡ đoạn TRƯỚC có chữ mà SAU rỗng; đoạn trống vốn có của bản ký
 * (khoảng chữ ký, dòng cách) giữ nguyên. thayChuoi() không thêm bớt đoạn nào, nên đoạn
 * thứ i trước và sau khi thay là cùng một đoạn.
 */
function boDoanBiRong(xmlGoc, xmlMoi) {
  const RE = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  const goc = xmlGoc.match(RE) || [];
  let i = -1;
  let soBo = 0;
  const xml = xmlMoi.replace(RE, (p) => {
    i++;
    const coTruoc = goc[i] && L.chuPhang(goc[i]).trim() !== '';
    const rongSau = L.chuPhang(p).trim() === '' && !/<w:sectPr|<w:drawing|<w:pict|<w:object/.test(p);
    if (coTruoc && rongSau) { soBo++; return ''; }
    return p;
  });
  return { xml, soBo };
}

function main() {
  const ts = docThamSo(process.argv);
  if (!ts.vao || !ts.bang) {
    console.error('Thiếu tham số. Xem hướng dẫn ở đầu file tao_mau.js.');
    process.exit(2);
  }

  const bang = JSON.parse(fs.readFileSync(ts.bang, 'utf8'));
  const THEM = '@sau ';
  // --chi-them: mẫu đã làm rồi, chỉ chèn đoạn — chữ gốc của bảng thay không còn trong đó.
  // Chuỗi dài thay trước để chuỗi ngắn nằm lồng bên trong không nuốt mất chuỗi dài.
  const cap = ts['chi-them'] ? [] : Object.entries(bang)
    .filter(([g]) => !g.startsWith(THEM)).sort((a, b) => b[0].length - a[0].length);
  const them = Object.entries(bang).filter(([g]) => g.startsWith(THEM));
  const ketQuaThem = new Map(them.map(([g]) => [g, 'khong-thay']));

  const cacMuc = L.docZip(ts.vao);
  const thayThe = {};
  const thongKe = [];

  let tongBo = 0;
  for (const ten of L.cacPhanCoChu(cacMuc)) {
    let xml = L.giuKhoangTrang(L.layNoiDung(cacMuc, ten));
    const xmlGoc = xml;
    for (const [giaTri, bien] of cap) {
      // Thường chỉ cần tên biến và script tự bọc {{ }}. Nhưng khi cần đoạn có điều
      // kiện hay ghép nhiều dấu, cứ viết thẳng chuỗi thay thế đầy đủ trong bảng —
      // nhận ra bằng việc nó đã chứa sẵn {{ hoặc [[.
      //
      // Dấu "=" mở đầu nghĩa là thay bằng chữ cố định, không phải ô trống. Dùng để
      // sửa luôn trong mẫu những chỗ bản gốc chép sai mà mọi hồ sơ đều sai giống
      // nhau — điển hình là số hiệu văn bản pháp luật ghi nhầm năm. Sửa ở mẫu thì
      // hết một lần; sửa ở file kết quả thì hồ sơ sau lại sai y như cũ.
      const chuoiThay = bien.startsWith('=')
        ? bien.slice(1)
        : /\{\{|\[\[/.test(bien) ? bien : `{{${bien}}}`;
      const r = L.thayChuoi(xml, giaTri, chuoiThay);
      xml = r.xml;
      if (r.soLanThay) thongKe.push({ phan: ten, bien, giaTri, lan: r.soLanThay });
    }
    // Đơn vị diện tích "m2" → "m²" ngay trong mẫu (yêu cầu Chi nhánh 16/09/2026).
    xml = L.doiDonViM2Xml(xml).xml;
    const gon = boDoanBiRong(xmlGoc, xml);
    tongBo += gon.soBo;
    // Chèn đoạn SAU bước gỡ đoạn rỗng: bước đó so từng đoạn theo thứ tự với bản gốc.
    let xmlRa = gon.xml;
    for (const [khoa, noiDung] of them) {
      const r = L.themDoanSau(xmlRa, khoa.slice(THEM.length), noiDung);
      xmlRa = r.xml;
      if (r.so) ketQuaThem.set(khoa, 'da-chen');
      else if (r.daCo && ketQuaThem.get(khoa) !== 'da-chen') ketQuaThem.set(khoa, 'da-co');
    }
    thayThe[ten] = xmlRa;
  }

  const daThay = new Set(thongKe.map((t) => t.bien));
  const truot = cap.filter(([, b]) => !daThay.has(b));

  console.log(`Mẫu nguồn: ${ts.vao}`);
  for (const t of thongKe) console.log(`  ✓ ${t.bien.padEnd(28)} ${t.lan} lần   ← "${t.giaTri.slice(0, 60)}"`);
  if (tongBo) console.log(`  (gỡ ${tongBo} đoạn bị thay đến rỗng — phần đuôi của những giá trị trải nhiều đoạn)`);
  for (const [khoa, noiDung] of them) {
    const kq = ketQuaThem.get(khoa);
    const nhan = { 'da-chen': '✓ chèn đoạn', 'da-co': '= đã có đoạn', 'khong-thay': '✗ không thấy đoạn' }[kq];
    console.log(`  ${nhan} "${noiDung.slice(0, 60)}" sau "${khoa.slice(THEM.length, THEM.length + 50)}"`);
  }
  if (truot.length) {
    console.log('\n  Không tìm thấy trong văn bản (kiểm tra lại chính tả/khoảng trắng):');
    for (const [g, b] of truot) console.log(`  ✗ ${b.padEnd(28)} "${g.slice(0, 60)}"`);
  }

  if (ts.thu) {
    console.log('\n(--thu: chỉ thử, không ghi file)');
    return;
  }
  if (!ts.ra) { console.error('Thiếu --ra'); process.exit(2); }
  fs.mkdirSync(path.dirname(path.resolve(ts.ra)), { recursive: true });
  L.ghiZip(ts.ra, cacMuc, thayThe);
  console.log(`\nĐã ghi mẫu: ${ts.ra}`);

  const conSot = L.chuPhang(thayThe['word/document.xml'] || '');
  const oTrong = [...new Set((conSot.match(/\{\{[a-zA-Z0-9_]+\}\}/g) || []))];
  console.log(`Ô trống trong mẫu (${oTrong.length}): ${oTrong.join(', ')}`);
}

if (require.main === module) main();
