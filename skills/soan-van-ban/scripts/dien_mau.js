#!/usr/bin/env node
/**
 * dien_mau.js — Điền dữ liệu vào mẫu để ra văn bản .docx hoàn chỉnh.
 *
 * Dùng:
 *   node dien_mau.js --mau mau_bc.docx --du-lieu ho_so.json --ra "BC ket qua.docx"
 *   node dien_mau.js --mau mau_bc.docx --du-lieu ho_so.json --ra out.docx --nghiem-ngat
 *
 * Quy ước ô trống còn thiếu — đây là phần cần đọc kỹ, vì nó quyết định skill này an
 * toàn hay nguy hiểm:
 *
 *   - Biến có trong dữ liệu   → điền bình thường.
 *   - Biến KHÔNG có dữ liệu   → thay bằng «CẦN ĐIỀN: ten_bien» chứ KHÔNG xoá trắng
 *     và cũng không tự bịa. Một ô trống lộ liễu giữa trang thì cán bộ nhìn là thấy;
 *     một câu trôi chảy nhưng sai dữ kiện thì lọt qua mắt, và ký rồi mới biết.
 *   - --nghiem-ngat: thoát với mã lỗi nếu còn ô chưa điền, dùng khi chạy hàng loạt
 *     và muốn dừng ngay thay vì sinh ra một tập văn bản dở dang.
 *
 * Giá trị là mảng: mỗi phần tử thành một đoạn Word riêng, mang định dạng của chỗ đặt ô
 * (danh sách thửa sau tách, danh sách GCN cấp, mỗi hợp đồng một đoạn).
 *
 * Giá trị lặp lại chữ mẫu đặt sẵn sát ô ("- " trước ô, ", nội dung:" sau ô, "UBND xã "…)
 * thì phần lặp được gọt — xem gopMep().
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./docx_lib.js');

// Giá trị dạng danh sách phải xuống dòng trong cùng một đoạn Word, mà xuống dòng thì
// phải là thẻ <w:br/> thật. Không thể ghép sẵn thẻ đó vào giá trị: thayChuoi() thoát
// dấu XML cho toàn bộ nút chữ sau khi thay, nên thẻ sẽ bị biến thành chữ và in ra
// nguyên văn "</w:t><w:br/>…" giữa văn bản. Vì vậy dùng một ký tự thường không bao giờ
// xuất hiện trong hồ sơ làm dấu tạm, rồi đổi thành thẻ thật sau khi thay xong tất cả.
const NGAT_DONG = '';
const NGAT_DONG_XML = '</w:t><w:br/><w:t xml:space="preserve">';

function docThamSo(argv) {
  const ts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const ten = a.slice(2);
      if (ten === 'nghiem-ngat') ts.nghiemNgat = true;
      else ts[ten] = argv[++i];
    }
  }
  return ts;
}

/** Làm phẳng dữ liệu lồng nhau thành khoá kiểu "gcn_cu.so" để mẫu gọi được. */
function lamPhang(obj, tienTo = '', ra = {}) {
  for (const [k, v] of Object.entries(obj || {})) {
    const khoa = tienTo ? `${tienTo}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) lamPhang(v, khoa, ra);
    else ra[khoa] = v;
  }
  return ra;
}

/** Bỏ ký tự điều khiển mà XML không cho phép. Chữ rút bằng pdftotext có sẵn \f ngắt
 *  trang giữa các trang; chỉ cần chép lọt một ký tự đó vào ho_so.json là Word báo "tài
 *  liệu hỏng". Xuống dòng \n thì đổi thành khoảng trắng — muốn xuống dòng thật thì dùng
 *  mảng, mỗi phần tử một đoạn. */
function lamSach(s) {
  s = L.doiDonViM2(s);          // "80.0 m2" chép từ giấy tờ → "80.0 m²"
  return String(s).replace(/[\r\n\t]+/g, ' ').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
}

/** Chữ phẳng của một phần văn bản, có '\n' ở cuối mỗi đoạn — để biết chữ nào đứng ngay
 *  trước và ngay sau một ô trong CÙNG một đoạn. */
function chuTheoDoan(xml) {
  let ra = '';
  const RE = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<\/w:p>/g;
  let m;
  while ((m = RE.exec(xml)) !== null) ra += m[1] !== undefined ? L.boDauXML(m[1]) : '\n';
  return ra;
}

const LA_CHU = /[\p{L}\p{N}]/u;

/**
 * Gọt phần giá trị trùng với chữ mẫu đặt sẵn sát ô. Mẫu này có "- " trước ô, mẫu kia
 * không; mẫu này viết "UBND xã {{ô}}", mẫu kia "{{ô}}"; mẫu này có ", nội dung:" sau ô,
 * mẫu kia để câu trong ô tự kết thúc bằng nó. Giá trị (nhất là câu do ghep_cau.js ghép)
 * luôn viết ở dạng đầy đủ, rồi ở đây bỏ phần mẫu đã có — nên một câu dùng được cho mọi
 * mẫu, và giá trị viết tay cũng hết cảnh "- - Ngày…", "UBND xã UBND xã …".
 *
 * Chỉ gọt khi phần trùng là trọn từ (không cắt ngang một chữ) và chỉ gọt GIÁ TRỊ, không
 * bao giờ đụng vào chữ của mẫu. Mảng: gọt đầu phần tử đầu, gọt cuối phần tử cuối.
 */
function gopMep(gt, truoc, sau) {
  const phan = gt.split(NGAT_DONG);
  const a = phan[0];
  for (let k = Math.min(truoc.length, a.length - 1); k >= 2; k--) {
    const o = truoc.slice(-k);
    if (!o.trim() || !a.startsWith(o)) continue;
    const bienTruoc = k === truoc.length || !LA_CHU.test(truoc[truoc.length - k - 1]) || !LA_CHU.test(o[0]);
    const bienSau = !LA_CHU.test(o[o.length - 1]) || !LA_CHU.test(a[k] || '');
    if (bienTruoc && bienSau) { phan[0] = a.slice(k); break; }
  }
  const z = phan[phan.length - 1];
  for (let k = Math.min(sau.length, z.length - 1); k >= 1; k--) {
    const o = sau.slice(0, k);
    if (!o.trim() || !z.endsWith(o)) continue;
    if (k === 1 && !/[.,;:]/.test(o)) continue;
    const bienTruoc = !LA_CHU.test(o[0]) || !LA_CHU.test(z[z.length - k - 1] || '');
    const bienSau = !LA_CHU.test(o[o.length - 1]) || !LA_CHU.test(sau[k] || '');
    if (bienTruoc && bienSau) { phan[phan.length - 1] = z.slice(0, -k); break; }
  }
  return phan.join(NGAT_DONG);
}

function chuyenGiaTri(v) {
  if (v === null || v === undefined || v === false) return null;
  if (Array.isArray(v)) {
    const ds = v.map((x) => lamSach(typeof x === 'object' ? JSON.stringify(x) : x)).filter(Boolean);
    if (!ds.length) return null;
    // Không thoát dấu XML ở đây — thayChuoi() đã tự thoát cho cả nút chữ. Thoát hai lần
    // thì dấu "&" trong hồ sơ in ra thành "&amp;".
    return ds.join(NGAT_DONG);
  }
  const s = lamSach(v);
  return s === '' ? null : s;
}

function main() {
  const ts = docThamSo(process.argv);
  if (!ts.mau || !ts['du-lieu'] || !ts.ra) {
    console.error('Thiếu tham số. Cần --mau, --du-lieu, --ra. Xem đầu file dien_mau.js.');
    process.exit(2);
  }

  const duLieu = lamPhang(JSON.parse(fs.readFileSync(ts['du-lieu'], 'utf8')));
  // "<ô>_viet_hoa" = chính ô đó viết hoa chữ đầu: dòng "Kính gửi: Hộ ông A" và câu "…hồ sơ của
  // hộ ông A" là một dữ kiện — ghi một lần, không để hai chỗ nói khác nhau.
  for (const [k, v] of Object.entries(duLieu)) {
    const s = typeof v === 'string' ? v.trim() : '';
    if (s && duLieu[`${k}_viet_hoa`] === undefined) duLieu[`${k}_viet_hoa`] = s.charAt(0).toUpperCase() + s.slice(1);
  }
  const cacMuc = L.docZip(ts.mau);
  const thayThe = {};
  const daDien = [];
  const conThieu = new Set();
  const daBoDoan = [];

  const coGiaTri = (bien) => chuyenGiaTri(duLieu[bien]) !== null;
  // false = đã xét và hồ sơ này không có. Khác với để trống (= chưa biết → «CẦN ĐIỀN»).
  const laKhongApDung = (bien) => duLieu[bien] === false;
  const khongApDung = new Set();

  let soDauGop = 0;
  let soMepGot = 0;
  let soDoiDonVi = 0;
  for (const ten of L.cacPhanCoChu(cacMuc)) {
    let xml = L.giuKhoangTrang(L.layNoiDung(cacMuc, ten));
    // Đổi "m2" trong chữ mẫu TRƯỚC khi điền, để bước gọt mép thấy giá trị "80.0 m²" trùng đúng
    // chữ " m²" đặt sẵn sau ô — đổi sau thì ra "80.0 m² m²" ở mẫu cũ còn "m2".
    const dvTruoc = L.doiDonViM2Xml(xml);
    xml = dvTruoc.xml;
    soDoiDonVi += dvTruoc.so;
    const chuMau = L.chuPhang(xml);

    // Bỏ các đoạn không áp dụng trước, để chúng không bị tính vào danh sách ô thiếu.
    const truocKhiLoc = xml;
    for (const o of L.chuPhang(xml).match(/\{\{[a-zA-Z0-9_.]+\}\}/g) || []) {
      if (laKhongApDung(o.slice(2, -2))) khongApDung.add(o.slice(2, -2));
    }
    xml = L.xuLyDoanDieuKien(xml, coGiaTri);
    xml = L.boDoanKhongApDung(xml, laKhongApDung).xml;
    const soDoanBo = (truocKhiLoc.match(/<w:p[\s>]/g) || []).length - (xml.match(/<w:p[\s>]/g) || []).length;
    if (soDoanBo > 0) daBoDoan.push({ phan: ten, so: soDoanBo });
    // Gỡ dấu điều kiện ở các đoạn được giữ lại.
    for (const d of [...new Set((L.chuPhang(xml).match(/\[\[\?[a-zA-Z0-9_.]+\]\]/g) || []))]) {
      xml = L.thayChuoi(xml, d, '').xml;
    }

    const oTrong = [...new Set((L.chuPhang(xml).match(/\{\{[a-zA-Z0-9_.]+\}\}/g) || []))];

    for (const o of oTrong) {
      const bien = o.slice(2, -2);
      if (laKhongApDung(bien)) {
        // Ô nằm chung đoạn với chữ thật (vd. "V. Đối tượng miễn giảm: {{…}}") thì đoạn
        // được giữ ở bước trên; ở đây chỉ xoá ô, để lại tiêu đề mục.
        xml = L.thayChuoi(xml, o, '').xml;
        khongApDung.add(bien);
        continue;
      }
      const gt = chuyenGiaTri(duLieu[bien]);
      if (gt === null) {
        conThieu.add(bien);
        const r = L.thayChuoi(xml, o, `«CẦN ĐIỀN: ${bien}»`);
        xml = r.xml;
      } else {
        // Thay TỪNG chỗ một, vì mỗi chỗ có chữ mẫu quanh nó khác nhau.
        let lan = 0;
        for (;;) {
          const phang = chuTheoDoan(xml);
          const i = phang.indexOf(o);
          if (i < 0) break;
          const dau = phang.lastIndexOf('\n', i - 1) + 1;
          let cuoi = phang.indexOf('\n', i + o.length);
          if (cuoi < 0) cuoi = phang.length;
          const v = gopMep(gt, phang.slice(dau, i), phang.slice(i + o.length, cuoi));
          if (v !== gt) soMepGot++;
          const r = L.thayChuoi(xml, o, v, 1);
          if (!r.soLanThay) break;
          xml = r.xml;
          lan++;
        }
        if (lan) daDien.push({ bien, lan });
      }
    }
    // Dấu câu lặp ở mép ô: mẫu đặt sẵn ";" sau ô, giá trị lại tự kết thúc bằng ";" → ";;".
    // Mẫu đặt sẵn "- " trước ô, giá trị lại mở đầu bằng "- " → "- - ". Người viết giá trị
    // không nhìn thấy chữ cố định quanh ô nên lỗi này gần như chắc chắn xảy ra. Chỉ gộp
    // những kiểu lặp mà chính mẫu gốc không có, để không bao giờ sửa vào chữ của mẫu.
    for (const [lap, don] of [[';;', ';'], [',,', ','], ['- - ', '- '], [': :', ':']]) {
      if (chuMau.includes(lap)) continue;
      const r = L.thayChuoi(xml, lap, don);
      if (r.soLanThay) { xml = r.xml; soDauGop += r.soLanThay; }
    }

    // Mỗi phần tử của mảng thành một đoạn riêng, sau khi mọi lần thay đã xong. Không nối
    // bằng ngắt dòng mềm: trong đoạn căn đều, Word kéo giãn dòng đó cho đầy lề.
    // "m2" còn sót trong chữ cố định (mẫu làm trước 16/09/2026, hay mẫu sửa tay trong Word) → "m²".
    const dv = L.doiDonViM2Xml(xml);
    xml = dv.xml;
    soDoiDonVi += dv.so;

    thayThe[ten] = L.tachDoanTheoDau(xml, NGAT_DONG, NGAT_DONG_XML);
  }

  fs.mkdirSync(path.dirname(path.resolve(ts.ra)), { recursive: true });
  try {
    L.ghiZip(ts.ra, cacMuc, thayThe);
  } catch (e) {
    // In một dòng gọn cho bên gọi nhặt, thay vì để Node phun cả stack trace — trong đó
    // có luôn dòng mã nguồn, và bên gọi từng nhặt nhầm dòng mã đó làm "lý do lỗi".
    console.error(`LỖI: ${e.message}`);
    console.error(`Mẫu hỏng: ${ts.mau} — chạy kiem_tra_mau.js --file trên mẫu này để xem chi tiết.`);
    process.exit(1);
  }

  console.log(`Mẫu:      ${ts.mau}`);
  console.log(`Kết quả:  ${ts.ra}`);
  console.log(`Đã điền:  ${daDien.length} biến (${daDien.reduce((s, x) => s + x.lan, 0)} vị trí)`);
  const tongBo = daBoDoan.reduce((s, x) => s + x.so, 0);
  if (tongBo) console.log(`Đã bỏ:    ${tongBo} đoạn không áp dụng cho hồ sơ này`);
  if (khongApDung.size) console.log(`Không áp dụng (ghi false): ${[...khongApDung].sort().join(', ')}`);
  if (soDauGop) console.log(`Đã gộp:   ${soDauGop} chỗ dấu câu lặp ở mép ô (";;", "- - "…) — giá trị trùng dấu mẫu đã đặt sẵn`);
  if (soDoiDonVi) console.log(`Đơn vị:   ${soDoiDonVi} chỗ "m2" trong chữ mẫu đã đổi thành "m²"`);
  if (soMepGot) console.log(`Gọt mép:  ${soMepGot} chỗ giá trị lặp lại chữ mẫu đặt sẵn quanh ô ("- ", "UBND xã ", ", nội dung:"…)`);

  if (conThieu.size) {
    console.log(`\nCÒN ${conThieu.size} Ô CHƯA ĐIỀN — đã đánh dấu «CẦN ĐIỀN: ...» ngay trong file:`);
    for (const b of [...conThieu].sort()) console.log(`  - ${b}`);
    console.log('\nMở file, tìm dấu « để tới từng chỗ. Không ký khi còn dấu này.');
    if (ts.nghiemNgat) process.exit(1);
  } else {
    console.log('\nKhông còn ô trống nào.');
  }
}

module.exports = { gopMep, chuTheoDoan };

if (require.main === module) main();
