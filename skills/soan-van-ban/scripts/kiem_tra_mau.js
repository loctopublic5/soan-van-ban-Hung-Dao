#!/usr/bin/env node
/**
 * kiem_tra_mau.js — Soi một mẫu xem còn sót dữ liệu của hồ sơ mẫu hay không.
 *
 * VÌ SAO CẦN: mẫu được làm bằng cách lấy một văn bản đã ký thật rồi thay từng dữ kiện
 * bằng tên biến. Nếu bỏ sót một dữ kiện — vì nó xuất hiện hai lần mà chỉ thay được một,
 * hoặc vì người làm mẫu không nhận ra nó là dữ kiện — thì giá trị đó **nằm chết trong
 * mẫu** và sẽ in ra ở MỌI hồ sơ về sau. Hồ sơ của ông A mang số Giấy chứng nhận của
 * ông B là loại sai không ai nhìn ra khi đọc lướt, mà hậu quả thì nặng.
 *
 * Đây là rủi ro lớn nhất của cách làm mẫu từ văn bản thật, nên phải có công cụ soi
 * riêng chứ không trông vào việc đọc lại bằng mắt.
 *
 * Dùng:
 *   node kiem_tra_mau.js --file assets/mau/<bo>/BC-tham-tra.docx
 *   node kiem_tra_mau.js --tat-ca            (soi mọi mẫu trong assets/mau)
 *
 * Hai lớp kiểm tra:
 *   1. Đối chiếu bang_thay_*.json nằm cạnh mẫu: giá trị nào đáng lẽ đã thay mà vẫn còn
 *      → chắc chắn sót, mức NẶNG.
 *   2. Quét theo dấu hiệu: số Giấy chứng nhận, số căn cước, ngày tháng, số hợp đồng
 *      công chứng, số tiền, mã hồ sơ. Những thứ này gần như luôn là dữ kiện của một hồ
 *      sơ cụ thể. Riêng ngày tháng nằm cạnh chữ "Luật/Nghị định/Thông tư/Quyết định/
 *      Nghị quyết/Điều" thì là ngày ban hành văn bản pháp luật — giữ nguyên mới đúng,
 *      nên được xếp riêng để khỏi làm nhiễu.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./docx_lib.js');

const DAU_HIEU = [
  { ten: 'số Giấy chứng nhận', re: /\b[A-Z]{2}\s?\d{6,8}\b/g },
  { ten: 'số căn cước/CCCD',   re: /\b\d{9,12}\b/g },
  { ten: 'số công chứng',      re: /\b\d{1,6}\/\d{4}\/[A-ZĐ]+\b/g },
  { ten: 'mã hồ sơ',           re: /\bH\d{2}(?:\.\d+){2,4}-\d{6}-\d{4}\b/g },
  { ten: 'ngày tháng',         re: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g },
  { ten: 'số tiền',            re: /\b\d{1,3}(?:\.\d{3}){2,}\s*(?:đ|đồng)/g },
];

const DON_VI = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/cau_hinh_chi_nhanh.json'), 'utf8')).gia_tri;
const GIU_TEN_DON_VI = /(2030 huyện|Điểm tiếp nhận huyện) [^,.]{0,30}?(?= được| tiếp nhận)/g;
const TU_PHAP_LY = /(Luật|Nghị định|Thông tư|Quyết định|Nghị quyết|Kế hoạch|Chỉ thị|Thủ tướng|Điều|NĐ-CP|TT-BTNMT|QĐ-|KH-|CT-TTg|HĐND|TCĐC)/;

function docThamSo(argv) {
  const ts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const t = a.slice(2); if (t === 'tat-ca') ts.tatCa = true; else ts[t] = argv[++i]; }
  }
  return ts;
}

function chuCuaMau(duongDan) {
  const cacMuc = L.docZip(duongDan);
  let chu = '';
  for (const ten of L.cacPhanCoChu(cacMuc)) chu += L.chuPhang(L.layNoiDung(cacMuc, ten)) + '\n';
  return chu;
}

function soi(duongDan) {
  const chu = chuCuaMau(duongDan);
  const nang = [];
  const ngo = [];
  const phapLy = [];

  // Lớp 0 — cấu trúc. Hai lớp dưới chỉ đọc CHỮ nên không thấy được một bảng bị cắt
  // ngang: chữ vẫn đủ, mẫu vẫn "sạch", mà Word thì không mở được. Soi cấu trúc trước.
  const cacMuc = L.docZip(duongDan);
  const hong = [];
  for (const m of cacMuc) {
    if (!/\.(xml|rels)$/i.test(m.ten)) continue;
    const loi = L.kiemTraXML(L.layNoiDung(cacMuc, m.ten));
    if (loi) hong.push(`${m.ten}: ${loi}`);
  }

  // Lớp 1 — đối chiếu mọi bảng thay nằm cùng thư mục.
  const thuMuc = path.dirname(duongDan);
  for (const f of fs.readdirSync(thuMuc).filter((x) => /^bang_thay.*\.json$/i.test(x))) {
    const bang = JSON.parse(fs.readFileSync(path.join(thuMuc, f), 'utf8'));
    for (const [giaTri, thay] of Object.entries(bang)) {
      // Bỏ qua các khoá vốn là câu khuôn có sẵn ô trống (đã chứa {{ }}).
      if (/\{\{/.test(giaTri)) continue;
      // Chuỗi thay GIỮ LẠI chính chữ gốc và chỉ chèn thêm ô ("V. Đối tượng miễn giảm:" →
      // "V. Đối tượng miễn giảm: {{doi_tuong_mien_giam}}") thì chữ gốc còn trong mẫu là
      // đúng, không phải sót.
      if (String(thay).replace(/^=/, '').normalize('NFD').includes(giaTri.normalize('NFD'))) continue;
      if (chu.normalize('NFD').includes(giaTri.normalize('NFD'))) {
        nang.push({ giaTri, bang: f });
      }
    }
  }

  // Tên đơn vị đang cấu hình phải đi qua biến, kể cả mẫu mới làm từ văn bản đã ký: sót một chỗ
  // là phòng khác dùng phôi sẽ in nhầm tên đơn vị. Hai đoạn GIU_TEN_DON_VI là căn cứ, nơi tiếp
  // nhận gắn với địa bàn, chữ của chúng không đổi theo cấu hình.
  const chuBoGiu = chu.normalize('NFC').replace(GIU_TEN_DON_VI, '');
  for (const k of ['tieu_de_chi_nhanh', 'ky_hieu_chi_nhanh', 'ten_chi_nhanh']) {
    if (DON_VI[k] && chuBoGiu.includes(DON_VI[k].normalize('NFC'))) nang.push({ giaTri: `${DON_VI[k]} (phải dùng {{${k}}})`, bang: 'cau_hinh_chi_nhanh.json' });
  }

  // Lớp 2 — quét theo dấu hiệu.
  for (const dh of DAU_HIEU) {
    dh.re.lastIndex = 0;
    let m;
    while ((m = dh.re.exec(chu)) !== null) {
      const nganh = chu.slice(Math.max(0, m.index - 60), m.index + m[0].length + 25).replace(/\s+/g, ' ');
      const muc = { loai: dh.ten, gt: m[0], nganh };
      (TU_PHAP_LY.test(nganh) ? phapLy : ngo).push(muc);
    }
  }
  return { hong, nang, ngo, phapLy, soOTrong: new Set(chu.match(/\{\{[a-zA-Z0-9_.]+\}\}/g) || []).size };
}

function main() {
  const ts = docThamSo(process.argv);
  const goc = path.resolve(__dirname, '..');
  let ds = [];
  if (ts.tatCa) {
    const duyet = (d) => { for (const x of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, x.name);
      if (x.isDirectory()) duyet(p); else if (x.name.endsWith('.docx')) ds.push(p);
    } };
    duyet(path.join(goc, 'assets/mau'));
  } else if (ts.file) ds = [ts.file];
  else { console.error('Cần --file hoặc --tat-ca'); process.exit(2); }

  let tongNang = 0, tongNgo = 0;
  for (const f of ds.sort()) {
    const r = soi(f);
    tongNang += r.nang.length + r.hong.length; tongNgo += r.ngo.length;
    const ten = f.replace(goc + '/', '');
    console.log(`\n### ${ten}   (${r.soOTrong} ô trống)`);

    if (r.hong.length) {
      console.log('  HỎNG CẤU TRÚC — Word sẽ báo "document may be corrupt", mọi văn bản sinh từ mẫu này đều không mở được:');
      for (const x of r.hong) console.log(`    ✗ ${x}`);
    }
    if (r.nang.length) {
      console.log(`  NẶNG — ${r.nang.length} giá trị đáng lẽ đã thay nhưng vẫn còn trong mẫu:`);
      for (const x of r.nang) console.log(`    ✗ "${x.giaTri.slice(0, 90)}"`);
    }
    if (r.ngo.length) {
      console.log(`  NGỜ — ${r.ngo.length} chỗ trông như dữ kiện của một hồ sơ cụ thể:`);
      for (const x of r.ngo) console.log(`    ? [${x.loai}] ${x.gt}\n        …${x.nganh}…`);
    }
    if (!r.hong.length && !r.nang.length && !r.ngo.length) console.log('  Sạch — không thấy dữ kiện hồ sơ nào sót lại.');
    if (r.phapLy.length) console.log(`  (bỏ qua ${r.phapLy.length} ngày/số hiệu nằm trong căn cứ pháp lý — giữ nguyên là đúng)`);
  }

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`Tổng: ${tongNang} lỗi nặng | ${tongNgo} chỗ cần nhìn lại | ${ds.length} mẫu`);
  if (tongNang) process.exitCode = 1;
}

if (require.main === module) main();
