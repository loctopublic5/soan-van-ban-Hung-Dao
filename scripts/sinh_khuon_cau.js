#!/usr/bin/env node
/**
 * sinh_khuon_cau.js — Rút KHUÔN CÂU của từng bộ mẫu từ chính văn bản đã ký.
 *
 * Vì sao: các ô "tự viết cả câu" phải viết đúng như cán bộ Chi nhánh vẫn viết, mà mỗi
 * bộ mẫu viết một kiểu. Cùng là câu kết luận, mẫu giao dịch trang 4 viết "do nhận chuyển
 * nhượng là đủ điều kiện", mẫu tách thửa viết "nhận tặng cho là đủ điều kiện giải quyết";
 * cùng là mục "Cấp GCN", mẫu phân chia tài sản chung viết "2.1 Bà … số seri GCN … nội
 * dung:", mẫu tách thửa phát sinh chủ viết "- Số … cho ông …, nội dung:". Một công thức
 * chung cho mọi mẫu thì chắc chắn sai ở phần lớn các mẫu — đã sai thật ở 5/7 bộ mẫu.
 *
 * Câu gốc của từng ô đã nằm sẵn trong bảng thay (bang_thay_*.json: "câu gốc" → "tên ô"),
 * vì đó chính là thứ đã được thay bằng ô trống lúc làm mẫu. Script này lấy câu gốc đó và
 * thay mọi dữ liệu cá nhân bằng chỗ trống có nhãn — còn lại đúng KHUÔN: thứ tự các vế, từ
 * nối, dấu câu, gạch đầu dòng, ngoặc kép, kể cả những thói quen riêng của bản đã ký.
 *
 * Dữ liệu cá nhân bị xoá: họ tên sau ông/bà, số giấy tờ, số seri GCN, ngày tháng, năm
 * sinh, số công chứng, địa chỉ nơi ở. Dữ kiện của hồ sơ gốc cũng bị xoá — số thửa, số tờ,
 * diện tích, số thửa tách ra, tên xã, tên văn phòng công chứng: chúng không chỉ ra được
 * ai, nhưng để nguyên trong khuôn thì có ngày bị chép sang hồ sơ khác ("tờ bản đồ số 150"
 * của hồ sơ mẫu nằm trong Báo cáo của hồ sơ mới). Bản đầu đã giữ chúng lại để khuôn cho
 * thấy cách viết số; nhãn <0N> và "diện tích ghi đúng như trên GCN" đủ làm việc đó.
 *
 * Dùng:
 *   node scripts/sinh_khuon_cau.js              in khuôn câu của mọi bộ mẫu để soát
 *   node scripts/sinh_khuon_cau.js --ghi <file> ghi ra file JSON
 * dong_goi.js tự gọi hàm này và đưa kết quả vào gói (bảng thay thì không vào gói).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const GOC = path.resolve(__dirname, '..');

/* ------------------------------------------------------------ xoá dữ liệu ---- */

// Ranh giới từ phải tự viết: \b của JavaScript chỉ hiểu chữ ASCII, nên KHÔNG BAO GIỜ thấy
// ranh giới trước "ông" hay "địa" — đã từng làm bước xoá tên bỏ sót toàn bộ tên sau "ông".
const DAU_TU = '(?<![\\p{L}\\p{N}])';
const TU_HOA = '\\p{Lu}[\\p{Ll}\\p{M}]*';

function xoaDuLieu(s) {
  let r = String(s).normalize('NFC');
  r = r.replace(/(?<![A-Z0-9])[A-Z]{2}\s?\d{6,8}(?!\d)/g, '<seri>');
  r = r.replace(/(?<!\d)\d{2,6}\/\d{4}\/[A-ZĐ-]+/g, '<số>/<năm>/CCGD');
  r = r.replace(/(?<!\d)\d{1,2}\/\d{1,2}\/?\d{4}(?!\d)/g, '<ngày>');
  r = r.replace(/sinh năm \d{4}/g, 'sinh năm <năm>');
  r = r.replace(/(?<!\d)\d{9,12}(?!\d)/g, '<số giấy tờ>');
  // Họ tên: sau "ông"/"bà" (cả "Hộ ông", "vợ là bà") là 2-5 chữ viết hoa đầu.
  r = r.replace(new RegExp(`${DAU_TU}((?:[Hh]ộ\\s+)?(?:[Ôô]ng|[Bb]à))\\s+${TU_HOA}(?:\\s+${TU_HOA}){1,4}`, 'gu'), '$1 <Họ tên>');
  // Địa chỉ nơi ở của người (chữ thường "địa chỉ:", khác "Địa chỉ thửa đất:"): tới hết vế.
  r = r.replace(new RegExp(`${DAU_TU}(địa chỉ:\\s*)[^;]*?(?=\\s+theo\\s|;|\\.$|\\.\\s|$)`, 'gu'), '$1<địa chỉ>');
  // Dữ kiện hồ sơ gốc. Giữ nguyên chữ nhãn ("Thửa đất số:", "tờ", "thửa") vì mỗi mẫu viết
  // nhãn một kiểu — đó chính là khuôn; chỉ con số phía sau bị thay.
  r = r.replace(new RegExp(`${DAU_TU}((?:[Tt]hửa)(?: đất)?(?: số)?:?\\s*)\\d+[a-z]?(?:\\s*,\\s*\\d+[a-z]?(?![\\d.,]*\\s*m[2²]))*`, 'gu'), '$1<số thửa>');
  r = r.replace(new RegExp(`${DAU_TU}([Tt]ờ(?: bản đồ)?(?: số)?:?\\s*)\\d+[a-z]?`, 'gu'), '$1<số tờ>');
  r = r.replace(/(?<![\d.,])\d+(?:[.,]\d+)?(\s*m[2²])/g, '<…>$1');
  r = r.replace(new RegExp(`${DAU_TU}((?:làm|thành)\\s+)\\d{1,2}(\\s+thửa)`, 'gu'), '$1<0N>$2');
  r = r.replace(new RegExp(`${DAU_TU}((?:[Xx]ã|[Pp]hường|[Tt]hị trấn)\\s+)${TU_HOA}(?:\\s+${TU_HOA}){0,3}`, 'gu'), '$1<tên xã>');
  r = r.replace(new RegExp(`${DAU_TU}((?:[Tt]hôn|[Xx]óm|[Cc]ụm)\\s+)${TU_HOA}(?:\\s+${TU_HOA}){0,3}`, 'gu'), '$1<tên thôn>');
  r = r.replace(new RegExp(`${DAU_TU}((?:VPCC|Văn phòng công chứng)\\s+)${TU_HOA}(?:\\s+${TU_HOA}){0,4}`, 'gu'), '$1<tên VPCC>');
  return r;
}

/** Lấy mọi họ tên người trong một câu gốc bằng cách TÁCH TỪ — cố ý không dùng lại biểu
 *  thức của xoaDuLieu. Phép soát mà dùng chung cách làm với thứ nó soát thì cùng mù một
 *  chỗ: bản đầu đã báo "sạch" trong khi còn nguyên tên sau "ông". */
function tenNguoi(s) {
  const tu = String(s).normalize('NFC').split(/\s+/);
  const ra = new Set();
  for (let i = 0; i < tu.length; i++) {
    if (!/^(ông|bà)$/i.test(tu[i])) continue;
    const ten = [];
    for (let j = i + 1; j < tu.length && ten.length < 5; j++) {
      const w = tu[j].replace(/[,.;:()“”"]+$/u, '');
      const dau = w.charAt(0);
      if (!w || dau === dau.toLowerCase() || dau.toLowerCase() === dau.toUpperCase()) break;
      ten.push(w);
      if (w !== tu[j]) break;              // có dấu câu ngay sau → hết tên
    }
    if (ten.length >= 2) ra.add(ten.join(' '));
  }
  return ra;
}

/** Địa chỉ nơi ở trong câu gốc, cũng bằng cách cắt chuỗi thường chứ không dùng biểu thức. */
function diaChiNguoi(s) {
  const t = String(s).normalize('NFC');
  const ra = [];
  let i = t.indexOf('địa chỉ:');
  while (i >= 0) {
    let dc = t.slice(i + 8);
    for (const moc of [' theo ', ';']) { const k = dc.indexOf(moc); if (k >= 0) dc = dc.slice(0, k); }
    dc = dc.trim().replace(/\.$/, '');
    if (dc.length > 8) ra.push(dc);
    i = t.indexOf('địa chỉ:', i + 8);
  }
  return ra;
}

/** Chữ Word gộp nhiều đoạn thành một chuỗi liền (bảng thay chụp chữ phẳng). Tách lại
 *  bằng dấu ¶ ở những chỗ bản đã ký xuống dòng, để khuôn đọc được như văn bản thật. */
function tachDoan(s) {
  return s
    // "+ …" là dòng mới khi đứng sau "nội dung:" hoặc sau dấu chấm hết câu. KHÔNG tách
    // "Ghi chú: + Số tờ bản đồ…" — bản đã ký viết liền trên một dòng.
    .replace(/(nội dung:|\.|;)\s*(?=\+ )/gu, '$1 ¶ ')
    // "…bản đồ Vlap+ Thửa đất này…", "…tờ bản đồ số: <số tờ>+ Địa chỉ…": hai đoạn dính liền
    .replace(/([\p{L}\p{N}>])(?=\+ )/gu, '$1 ¶ ')
    .replace(/\s*(?=Ghi chú:|- Số |Thửa đất: |\d\.\d? (?:Bà|Ông) |\d\. (?:Bà|Ông) )/gu, ' ¶ ')
    .replace(/(\.)(?=(?:Thửa đất số|Tặng cho|Chuyển nhượng))/gu, '$1 ¶ ')
    .replace(/(\.)(?=- )/gu, '$1 ¶ ')                // "…đất ở.- Thửa đất số…": hai dòng dính liền
    // \s* ở trên khớp cả chuỗi rỗng ngay sau lần khớp có dấu cách → "¶  ¶" ở chỗ có sẵn
    // dấu cách. Gộp lại một lần ở cuối thay vì vá từng biểu thức.
    .replace(/(?:\s*¶)+\s*/gu, ' ¶ ')
    .replace(/^ ¶ /, '');
}

/* ---------------------------------------------------------------- rút khuôn ---- */

/** Trả { <bộ mẫu>: { <tên ô>: "<khuôn câu>" } } cho các ô là câu (ô mà mẫu để nguyên một
 *  ô cho cả câu, hoặc nhận mảng, hoặc đọc từ GCN mới). Ô dữ liệu đơn (số GCN, ngày…) bỏ
 *  qua — không có khuôn câu gì để học. */
function cacCauGoc() {
  const nguon = JSON.parse(fs.readFileSync(path.join(GOC, 'assets/nguon_bien.json'), 'utf8'));
  const laCau = new Set([
    ...nguon.cau_ghep_tu_viet.bien,
    ...nguon.nhan_mang.bien,
    ...((nguon.doc_tu_gcn_moi || {}).bien || []),
  ]);
  const ra = [];
  const thuMucMau = path.join(GOC, 'assets/mau');
  for (const bo of fs.readdirSync(thuMucMau).sort()) {
    const tm = path.join(thuMucMau, bo);
    if (!fs.statSync(tm).isDirectory()) continue;
    for (const f of fs.readdirSync(tm).filter((x) => /^bang_thay.*\.json$/.test(x)).sort()) {
      const bang = JSON.parse(fs.readFileSync(path.join(tm, f), 'utf8'));
      for (const [goc, bien] of Object.entries(bang)) {
        if (/^[a-z0-9_]+$/.test(bien) && laCau.has(bien)) ra.push({ bo, bien, goc });
      }
    }
  }
  return ra;
}

function khuonCau() {
  const ra = {};
  for (const { bo, bien, goc } of cacCauGoc()) {
    (ra[bo] = ra[bo] || {});
    if (!ra[bo][bien]) ra[bo][bien] = tachDoan(xoaDuLieu(goc));
  }
  return ra;
}

/** Soát lần cuối, độc lập với bước xoá: lấy mọi họ tên và địa chỉ nơi ở có trong các câu
 *  gốc (bằng cách tách từ, cắt chuỗi), rồi đòi không cái nào còn lại trong khuôn. Kèm
 *  soát dãy số trông như số giấy tờ. Dùng trong dong_goi.js — sót là không đóng gói. */
function conDuLieuCaNhan(khuon) {
  const tatCa = Object.values(khuon).flatMap((ds) => Object.values(ds)).join('\n').normalize('NFC');
  const loi = new Set();
  for (const { bo, bien, goc } of cacCauGoc()) {
    for (const ten of tenNguoi(goc)) if (tatCa.includes(ten)) loi.add(`còn họ tên "${ten}" (nguồn: ${bo}/${bien})`);
    for (const dc of diaChiNguoi(goc)) if (tatCa.includes(dc)) loi.add(`còn địa chỉ "${dc.slice(0, 40)}…" (nguồn: ${bo}/${bien})`);
  }
  if (/(?<!\d)\d{9,12}(?!\d)/.test(tatCa)) loi.add('còn dãy 9-12 chữ số trông như số giấy tờ');
  return [...loi];
}

/** Dữ kiện hồ sơ gốc còn sót (số thửa, số tờ, diện tích, tên xã, tên VPCC) — cũng soát
 *  bằng cách tách từ. Không phải dữ liệu cá nhân nên chỉ CẢNH BÁO, không chặn đóng gói;
 *  nhưng còn sót thì nên sửa xoaDuLieu, vì khuôn mang số cũ là mời chép nhầm. */
function conDuKienCu(khuon) {
  const ra = new Set();
  for (const [bo, ds] of Object.entries(khuon)) {
    for (const [bien, s] of Object.entries(ds)) {
      const tu = String(s).normalize('NFC').split(/\s+/).map((w) => w.replace(/^[(“"]+|[,.;:)”"]+$/gu, ''));
      for (let i = 0; i + 1 < tu.length; i++) {
        const a = tu[i].toLowerCase(), b = tu[i + 1];
        const soSau = /^\d/.test(b) || (/^(số|đất|bản)$/.test(b) && /^\d/.test(tu[i + 2] || ''))
          || (b === 'bản' && tu[i + 2] === 'đồ' && /^\d/.test((tu[i + 3] === 'số' ? tu[i + 4] : tu[i + 3]) || ''));
        if ((a === 'thửa' || a === 'tờ') && soSau) ra.add(`${bo}/${bien}: "${tu.slice(i, i + 4).join(' ')}"`);
        if (/^\d/.test(tu[i]) && /^m[2²]/.test(b)) ra.add(`${bo}/${bien}: "${tu[i]} ${b}"`);
        if (/^(xã|vpcc)$/.test(a) && b && b.charAt(0) !== '<' && b.charAt(0) !== b.charAt(0).toLowerCase()) {
          ra.add(`${bo}/${bien}: "${tu[i]} ${b}"`);
        }
      }
    }
  }
  return [...ra];
}

/** Mọi họ tên người dân có trong các bản đã ký (toàn bộ bảng thay, không riêng câu mẫu) —
 *  để dong_goi.js soát không file nào đi vào gói còn nhắc tới họ. Đã có lần tên thật lọt
 *  vào chú thích mã nguồn và ví dụ trong tài liệu (15/09/2026). */
function hoTenTrongBanDaKy() {
  const ra = new Set();
  const thuMucMau = path.join(GOC, 'assets/mau');
  for (const bo of fs.readdirSync(thuMucMau)) {
    const tm = path.join(thuMucMau, bo);
    if (!fs.statSync(tm).isDirectory()) continue;
    for (const f of fs.readdirSync(tm).filter((x) => /^bang_thay.*\.json$/.test(x))) {
      const bang = JSON.parse(fs.readFileSync(path.join(tm, f), 'utf8'));
      for (const goc of Object.keys(bang)) for (const ten of tenNguoi(goc)) ra.add(ten);
    }
  }
  return ra;
}

module.exports = { khuonCau, xoaDuLieu, conDuLieuCaNhan, conDuKienCu, hoTenTrongBanDaKy };

if (require.main === module) {
  const ghi = process.argv.indexOf('--ghi');
  const k = khuonCau();
  if (ghi > 0) {
    fs.writeFileSync(process.argv[ghi + 1], JSON.stringify(k, null, 2), 'utf8');
    console.log(`Đã ghi: ${process.argv[ghi + 1]}`);
  } else {
    for (const [bo, ds] of Object.entries(k)) {
      console.log(`\n######## ${bo}`);
      for (const [b, s] of Object.entries(ds)) console.log(`  [${b}]\n     ${s}`);
    }
  }
  const loi = conDuLieuCaNhan(k);
  console.log(loi.length ? `\nCÒN DỮ LIỆU CÁ NHÂN:\n  ${loi.join('\n  ')}` : '\nSoát: không còn họ tên hay số giấy tờ nào.');
  if (loi.length) process.exitCode = 1;
  const cu = conDuKienCu(k);
  console.log(cu.length ? `Cảnh báo — còn dữ kiện hồ sơ gốc trong khuôn:\n  ${cu.join('\n  ')}` : 'Soát: không còn số thửa, số tờ, diện tích, tên xã hay tên VPCC của hồ sơ gốc.');
}
