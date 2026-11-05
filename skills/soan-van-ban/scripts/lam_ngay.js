#!/usr/bin/env node
/**
 * lam_ngay.js — LỐI TẮT: người dùng đã tự chỉ định hồ sơ và bộ mẫu, đi thẳng ra file.
 *
 * KHI NÀO DÙNG: khi người dùng nói kiểu "soạn file này bằng mẫu tách thửa" — tức là họ
 * đã tự làm xong hai việc mà quy trình đầy đủ phải hỏi han mới biết: hồ sơ nào và dùng
 * mẫu nào. Không có gì để phân loại, không có nhánh nào để chọn, nên bỏ hết phần đó đi.
 *
 * BỎ ĐƯỢC NHỮNG GÌ SO VỚI chay_cuon_chieu.js:
 *   - Không đọc nhật ký phân loại, không suy rổ, không hỏi nhánh Trang 4 / Cấp đổi.
 *   - Không chốt lô, không sổ tiến độ — một hồ sơ thì trạng thái nhìn là biết.
 *   - Claude KHÔNG phải nạp references/bien-so.md (17 KB). Script tự mở đúng các mẫu
 *     của bộ đã chọn, rút ra danh sách biến thật sự cần, chia theo tầng nguồn rồi in ra.
 *     Danh sách rút từ chính file .docx nên luôn khớp mẫu, kể cả sau khi sửa mẫu.
 *   - Các giá trị cố định của Chi nhánh (tên giám đốc, cán bộ, cơ quan thuế) được trộn
 *     sẵn, không ai phải gõ lại.
 *   - Gộp các trang đã lọc thành mini.pdf để đọc MỘT lần, thay vì mở từng ảnh một.
 *
 * BỐN LƯỢT LÀ XONG MỘT HỒ SƠ:
 *   1. chạy lệnh này            → lọc trang, dựng mini.pdf, sinh khung ho_so.json
 *   2. đọc mini.pdf             → một lần đọc, không mở bản scan gốc
 *   3. điền giá trị vào khung   → chỉ điền, tên biến đã có sẵn
 *   4. chạy LẠI ĐÚNG LỆNH ĐÓ    → ra .docx
 *
 * Lệnh ở lượt 1 và lượt 4 giống hệt nhau: script tự biết đang ở lượt nào theo file đã
 * có trên đĩa. Không phải nhớ hai lệnh khác nhau.
 *
 * Dùng:
 *   node lam_ngay.js --vao "D:\hs\tặng cho T4.pdf" --bo-mau giao-dich-trang-4 \
 *     --goc-ra "C:\Users\Admin\Desktop\Ket qua"
 *
 *   node lam_ngay.js --vao "D:\hs\lô tách thửa\" --bo-mau tach-thua-khong-doi-chu \
 *     --goc-ra "C:\...\Ket qua"          (cả thư mục, mọi hồ sơ dùng chung một bộ mẫu)
 *
 *   node lam_ngay.js --bo-mau ?           (xem có những bộ mẫu nào)
 *   node lam_ngay.js --bo-mau "trả lại"   (xem các dạng thông báo trả lại hồ sơ)
 *
 *   node lam_ngay.js --vao "D:\lô 27-10\" --theo-thu-muc --goc-ra "C:\...\Ket qua"
 *     (lô nhiều mẫu: mỗi thư mục con mang TÊN MẪU — "trả lại chậm lũ", "tách thửa tặng
 *      cho"… — hồ sơ nằm trong thư mục của mẫu nó cần)
 *
 * Tên gọi mẫu trả lại luôn bắt đầu bằng "trả lại": mẫu trả lại chỉ được chọn khi có chữ đó,
 * bộ BC-TB-PC chỉ được chọn khi không có chữ đó.
 *
 * THƯ MỤC CỦA PHÒNG — --vao nằm trong "hs chuyển" hoặc "hs trả lại" thì không cần --goc-ra:
 *   <gốc>\hs chuyển\...     → <gốc>\kết quả chuyển\<từng hồ sơ>\
 *   <gốc>\hs trả lại\...    → <gốc>\kết quả trả lại\<từng hồ sơ>\
 *   Trỏ thẳng vào hai thư mục đó mà không có --bo-mau: tự chạy như --theo-thu-muc. Trong
 *   "hs trả lại" tên mẫu được bỏ chữ "trả lại" ("vi phạm"); "hs chuyển" không nhận mẫu trả lại.
 *   Hồ sơ đã soạn rồi được bỏ qua, nên hồ sơ cũ nằm lại trong thư mục nguồn không bị soạn lại.
 *
 * Cờ khác:
 *   --soan-lai         soạn lại cả hồ sơ đã soạn, ghi đè văn bản cũ
 *   --can-bo "Hải Yến" cán bộ hợp đồng của lượt này (danh sách trong cau_hinh_chi_nhanh.json)
 *   --lv <thư mục>     nơi để file trung gian (mặc định "<--goc-ra>/_lam_viec")
 *   --trang 1,7,12     bỏ hẳn bước lọc, dùng đúng các trang này
 *   --dpi 80           ảnh nét hơn cho bản scan mờ
 *   --khong-cau-hinh   không trộn assets/cau_hinh_chi_nhanh.json
 *   --lam-lai          xoá kết quả lọc cũ và lọc lại từ đầu
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./docx_lib.js');
const { bienGhepDuoc, khungDuKien } = require('./ghep_cau.js');

const GOC_SKILL = path.resolve(__dirname, '..');

function docThamSo(argv) {
  const ts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const ten = a.slice(2);
    if (ten === 'khong-cau-hinh' || ten === 'lam-lai' || ten === 'theo-thu-muc' || ten === 'soan-lai') ts[ten] = true;
    else ts[ten] = argv[++i];
  }
  return ts;
}

function boDau(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim().replace(/[\s_]+/g, '-');
}
function docJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

/** Khung mới sinh có biến dạng mảng khởi tạo là [] và khối du_kien toàn chuỗi rỗng. Nếu
 *  chỉ kiểm tra khác '' và khác null thì [] và {…} lọt qua, script tưởng khung đã điền và
 *  đi thẳng sang bước sinh văn bản với một hồ sơ rỗng — ra đủ bộ .docx mà ô nào cũng
 *  «CẦN ĐIỀN». Nên xét tới tận giá trị lá; khoá "_…" là lời dặn, không tính. */
function coGiaTri(v) {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.some(coGiaTri);
  if (typeof v === 'object') return Object.entries(v).some(([k, x]) => !k.startsWith('_') && coGiaTri(x));
  if (typeof v === 'boolean') return true;
  return String(v).trim() !== '';
}
function timPdf(goc) {
  const ra = [];
  for (const m of fs.readdirSync(goc, { withFileTypes: true })) {
    const p = path.join(goc, m.name);
    if (m.isDirectory()) ra.push(...timPdf(p));
    else if (/\.pdf$/i.test(m.name)) ra.push(p);
  }
  return ra;
}
/** Cùng một tên tiếng Việt có thể ở hai dạng tổ hợp dấu; chuẩn hoá NFC rồi mới so. */
function thuMucHoSo(gocLamViec, ten) {
  const thang = path.join(gocLamViec, ten);
  if (fs.existsSync(thang)) return thang;
  const can = ten.normalize('NFC');
  try {
    for (const m of fs.readdirSync(gocLamViec, { withFileTypes: true })) {
      if (m.isDirectory() && m.name.normalize('NFC') === can) return path.join(gocLamViec, m.name);
    }
  } catch { /* chưa có thư mục làm việc */ }
  return thang;
}

/* --------------------------------------------------------- thư mục nguồn ---- */

/** Quy hoạch thư mục của phòng: hai nguồn, mỗi nguồn trả về một thư mục kết quả cạnh nó.
 *  Nhận theo tên thư mục (bỏ dấu, nên không vướng dạng tổ hợp dấu hay chữ hoa). */
const NGUON = {
  'hs-chuyen': { nhom: 'chuyen', ketQua: 'kết quả chuyển' },
  'hs-tra-lai': { nhom: 'tra-lai', ketQua: 'kết quả trả lại' },
};
function nguonHoSo(vao) {
  for (let p = path.resolve(vao); ; p = path.dirname(p)) {
    const n = NGUON[boDau(path.basename(p))];
    if (n) return { ...n, thuMuc: p, goc: path.dirname(p) };
    if (path.dirname(p) === p) return null;
  }
}
/** Trong "hs trả lại" thì "vi phạm" đã rõ nghĩa là "trả lại vi phạm". */
function tenTheoNguon(ten, nguon) {
  if (!nguon || nguon.nhom !== 'tra-lai' || !ten || ten === '?') return ten;
  return /(^|-)tra-lai(-|$)/.test(boDau(ten)) ? ten : `trả lại ${ten}`;
}

/* ----------------------------------------------------------------- bộ mẫu ---- */

/** Chữ người dùng hay gõ kèm mà không mang nghĩa phân biệt mẫu ("mẫu trang 4", "dùng bộ
 *  tách thửa tặng cho"). Không bỏ "cho", "hop": chúng nằm trong "tặng cho", "hợp thửa". */
const TU_THUA = new Set(['mau', 'bo', 'dung', 'bang', 'theo', 'va']);
function tuCua(s) {
  return boDau(s).replace(/([a-z])(\d)/g, '$1-$2')
    .split(/[^a-z0-9]+/).filter((w) => w && !TU_THUA.has(w));
}

/** Người dùng gõ tên bộ mẫu bằng tiếng Việt tự nhiên ("tặng cho trang 4", "tách thửa
 *  không phát sinh chủ"), không phải mã thư mục. Mỗi bộ mẫu có nhiều tên: mã, tên mô tả,
 *  ten_goi_khac, và tên mọi rổ phân loại trỏ về nó — nên tên rổ skill phân loại in ra
 *  ("Tặng cho - Trang 4") gõ lại là khớp. Trước 15/09/2026 chỉ tách thửa phát sinh chủ có
 *  tên gọi khác: "tặng cho trang 4", "chuyển nhượng cấp đổi", "thừa kế trang 4" đều báo
 *  "không có bộ mẫu nào khớp". Tên thiếu ý ("cấp đổi", "tách thửa") thì vẫn khớp nhiều bộ
 *  và phải hỏi lại — đúng như mong muốn. */
function chonBoMau(banDo, nhap) {
  const tatCa = Object.keys(banDo.bo_mau);
  if (!nhap || nhap === '?') return { loi: 'chua-chon', cac: tatCa };
  if (tatCa.includes(nhap)) return { ten: nhap };
  // Hai danh mục chung một kho mẫu: bộ BC-TB-PC và thông báo TRẢ LẠI hồ sơ. Mẫu trả lại chỉ
  // được chọn khi câu gọi có chữ "trả lại", và ngược lại — để "cấp đổi" không bao giờ ra
  // nhầm "trả lại cấp đổi", hay "trả lại cấp đổi" ra nhầm bộ BC-TB-PC cấp đổi.
  const traLai = /(^|-)tra-lai(-|$)/.test(boDau(nhap));
  // Riêng bộ khai "goi_khong_tra_lai" (mất GCN: hồ sơ được giải quyết chứ không bị trả lại) nhận
  // cả tên không có chữ đó.
  const cac = tatCa.filter((x) => (banDo.bo_mau[x].nhom === 'tra-lai') === traLai
    || (!traLai && banDo.bo_mau[x].goi_khong_tra_lai));
  // Mẫu trả lại khớp theo mã và tên gọi thôi, không theo câu mô tả: mô tả dài ("…tách thửa
  // vướng quy hoạch…") làm "trả lại tách thửa" rơi đúng vào một dạng trong khi nhiều dạng
  // khác cũng là hồ sơ tách thửa.
  const tenCua = Object.fromEntries(cac.map((x) => {
    const b = banDo.bo_mau[x];
    return [x, [x, ...(b.nhom === 'tra-lai' ? [] : [b.ten]), ...(b.ten_goi_khac || [])].map(tuCua)];
  }));
  for (const [ro, r] of Object.entries(banDo.ro_dung_bo_mau || {})) {
    if (tenCua[r.bo_mau]) tenCua[r.bo_mau].push(tuCua(ro));
  }
  const can = tuCua(nhap);
  if (!can.length) return { loi: 'khong-thay', cac };

  // Trùng hẳn một tên.
  const khoa = can.join('-');
  const trung = cac.filter((x) => tenCua[x].some((t) => t.join('-') === khoa));
  if (trung.length === 1) return { ten: trung[0] };

  // Mọi từ gõ vào đều có trong MỘT tên của bộ mẫu ("tách thửa tặng cho" không là cụm
  // liền trong tên nào, nhưng đủ từ trong "Tách thửa - Tặng cho").
  const chua = (t) => { const tap = new Set(t); return can.every((w) => tap.has(w)); };
  const theoTu = cac.filter((x) => tenCua[x].some(chua));
  if (theoTu.length === 1) return { ten: theoTu[0] };
  if (theoTu.length > 1) {
    // "không" đảo nghĩa: "tách thửa phát sinh" nằm gọn trong "tách thửa KHÔNG phát sinh
    // chủ". Chỉ dùng để chốt khi còn đúng một bộ; còn nhiều thì hỏi lại với đủ các bộ.
    const coKhong = can.includes('khong');
    const cungChieu = theoTu.filter((x) => tenCua[x].some((t) => chua(t) && t.includes('khong') === coKhong));
    if (cungChieu.length === 1) return { ten: cungChieu[0] };
    return { loi: 'nhieu-ket-qua', cac: theoTu };
  }

  // Gõ tắt một phần mã ("phan-chia").
  const gan = cac.filter((x) => x.includes(khoa) || khoa.includes(x));
  if (gan.length === 1) return { ten: gan[0] };
  if (gan.length) return { loi: 'nhieu-ket-qua', cac: gan };
  // Gõ tên dạng trả lại mà quên chữ "trả lại" ("chậm lũ"): chỉ ra đúng tên phải gọi, không
  // tự chọn hộ — tên gọi thống nhất là thứ giữ cho cả lô không lẫn mẫu.
  if (!traLai) {
    const thu = chonBoMau(banDo, `trả lại ${nhap}`);
    if (thu.ten || thu.loi === 'nhieu-ket-qua') return { loi: 'thieu-tra-lai', cac: thu.ten ? [thu.ten] : thu.cac };
  }
  // Loại hồ sơ Chi nhánh đã biết nhưng chưa có mẫu ("đính chính", "thế chấp"): nói thẳng
  // là chưa có mẫu, đừng để người dùng tưởng gõ sai tên rồi đi thử mẫu khác.
  const chuaCo = Object.entries(banDo.ro_dung_bo_mau || {})
    .filter(([ro, r]) => r.bo_mau === 'CHUA_CO_MAU' && chua(tuCua(ro)));
  if (chuaCo.length) return { loi: 'chua-co-mau', ro: chuaCo.map(([ro, r]) => `${ro} — ${r.ghi_chu || ''}`), cac };
  return { loi: 'khong-thay', cac };
}

/** Danh sách biến mà một bộ mẫu thật sự cần, đọc thẳng từ các file .docx của nó.
 *  Đọc từ mẫu chứ không từ bảng tra: sửa mẫu xong là danh sách này đúng ngay, không có
 *  bảng nào đi lạc hậu phía sau. */
function bienCuaBoMau(banDo, tenBoMau) {
  const bien = new Set();
  const dieuKien = new Set();
  const thieu = [];
  for (const vb of banDo.bo_mau[tenBoMau].van_ban) {
    const f = path.join(GOC_SKILL, 'assets', vb.mau);
    if (!fs.existsSync(f)) { thieu.push(`${vb.ma} — chưa có mẫu tại assets/${vb.mau}`); continue; }
    const cacMuc = L.docZip(f);
    for (const ten of L.cacPhanCoChu(cacMuc)) {
      const chu = L.chuPhang(L.layNoiDung(cacMuc, ten));
      for (const o of chu.match(/\{\{[a-zA-Z0-9_.]+\}\}/g) || []) bien.add(o.slice(2, -2));
      for (const o of chu.match(/\[\[\?[a-zA-Z0-9_.]+\]\]/g) || []) dieuKien.add(o.slice(3, -2));
    }
  }
  return { bien: [...bien].sort(), dieuKien: [...dieuKien].sort(), thieu };
}

/* -------------------------------------------------------------- khung JSON ---- */

function sinhKhung(bien, nguon, cauHinh, dieuKien, lapLai, duong, ghepDuoc, tenBoMau, traLai) {
  const tang2 = new Set(Object.keys(nguon.tang_2_de_trong.bien));
  const gcnMoi = new Set((nguon.doc_tu_gcn_moi || {}).bien || []);
  const ghep = new Set(nguon.cau_ghep_tu_viet.bien);
  const mang = new Set(nguon.nhan_mang.bien);
  const coSan = new Set(Object.keys(cauHinh));
  const khongApDung = (nguon.co_the_khong_ap_dung || {}).bien || {};

  const nhom = { may: [], doc: [], gcnMoi: [], ghep: [], trong: [], cauHinh: [], khongApDung: [] };
  for (const b of bien) {
    // "<ô>_viet_hoa" là chính ô đó viết hoa chữ đầu (dòng Kính gửi) — dien_mau.js tự suy.
    if (b.endsWith('_viet_hoa') && bien.includes(b.slice(0, -'_viet_hoa'.length))) continue;
    if (coSan.has(b)) nhom.cauHinh.push(b);
    else if (ghepDuoc.has(b)) nhom.may.push(b);        // ghép từ du_kien — không điền tay
    else if (tang2.has(b)) nhom.trong.push(b);
    else if (gcnMoi.has(b)) nhom.gcnMoi.push(b);
    else if (ghep.has(b)) nhom.ghep.push(b);
    else nhom.doc.push(b);
    if (khongApDung[b] && !ghepDuoc.has(b)) nhom.khongApDung.push(b);
  }

  // Khung chỉ chứa phần Claude phải điền. Biến cấu hình bị bỏ ra ngoài để không ai mất
  // công nghĩ về chúng; biến tầng 2 vẫn để lại nhưng rỗng, để nhìn là biết chỗ nào sẽ
  // thành «CẦN ĐIỀN» chứ không phải quên mất. Ô mà script ghép được từ du_kien cũng bỏ
  // ra ngoài: có chỗ để viết tay là có người viết tay, và câu viết tay chính là thứ đã
  // dài dòng, lặp ý, bỏ trống cả khối (hồ sơ tách thửa tặng cho, 14/09/2026).
  // Thông báo trả lại: câu văn cố định cả trong mẫu, chỉ chừa ô cho dữ kiện — không có gì
  // để ghép, nên không có khối du_kien.
  const khung = traLai ? {
    _huong_dan: 'THÔNG BÁO TRẢ LẠI: câu văn đã cố định trong mẫu — chỉ điền DỮ KIỆN vào từng ô, chép đúng như giấy tờ (họ tên, số thửa, số GCN, ngày…), không viết câu. Mỗi ô nằm giữa câu nào: xem khung_mau.txt. Ô nào không đọc chắc thì để rỗng — script tự đánh dấu «CẦN ĐIỀN» đúng chỗ, đừng đoán. Các khoá trong _de_trong chỉ có trong hệ thống hoặc do cán bộ tự tra: để nguyên rỗng, TRỪ KHI người dùng đã gõ sẵn giá trị trong câu lệnh.',
    ma_ho_so: '',
    bo_mau: null,
  } : {
    _huong_dan: 'ĐIỀN KHỐI du_kien TRƯỚC: chỉ ghi dữ kiện đúng như giấy tờ, mỗi thứ một lần, không viết câu — script tự ghép mọi câu văn. Sau đó mới tới các khoá lẻ bên dưới (nếu có). Ô nào không đọc chắc thì để rỗng — script tự đánh dấu «CẦN ĐIỀN» đúng chỗ, đừng đoán. Ô lẻ đã xét mà hồ sơ này KHÔNG CÓ thì ghi false (không ngoặc kép) — cả đoạn tự biến mất. Các khoá trong _de_trong là dữ liệu chỉ có trong hệ thống: để nguyên rỗng, TRỪ KHI người dùng đã gõ sẵn giá trị trong câu lệnh (mã hồ sơ, ngày nhận, số điện thoại…) — khi đó ghi đúng giá trị họ gõ. Mã hồ sơ in trong bản scan là của lần biến động trước, không bao giờ lấy.',
    ma_ho_so: '',
    ten_nguoi_ho_so: '',
    bo_mau: null,
    du_kien: khungDuKien(tenBoMau),
  };
  for (const b of [...nhom.doc, ...nhom.ghep]) khung[b] = mang.has(b) ? [] : '';
  if (nhom.gcnMoi.length) {
    khung._doc_tu_gcn_moi = 'các khoá dưới là SỐ SERI của GCN mới — chỉ có khi bản scan có tờ GCN mới (đứng tên người nhận, số thửa mới); KHÔNG lấy số seri của GCN cũ. Thường là chưa có: để rỗng, chỉ đúng chỗ đó thành «CẦN ĐIỀN».';
    for (const b of nhom.gcnMoi) khung[b] = mang.has(b) ? [] : '';
  }
  if (nhom.trong.length) {
    khung._de_trong = 'các khoá dưới chỉ có trong hệ thống một cửa/VLIS/bảng giá/cơ sở dữ liệu — để nguyên rỗng, trừ khi người dùng đã gõ giá trị trong câu lệnh';
    for (const b of nhom.trong) khung[b] = '';
  }
  for (const d of dieuKien) {
    // Đoạn có điều kiện: rỗng thì cả đoạn biến mất. Đoạn ghép được từ du_kien (tài sản riêng,
    // lối đi chung) thì không mở ô viết tay — dữ kiện ghi ở du_kien.
    if (!(d in khung) && !ghepDuoc.has(d)) khung[d] = '';
  }

  // Mẫu lặp nhiều bản: dựng sẵn hai phần tử mẫu, vì các rổ dùng cơ chế này đều là hồ
  // sơ chia cho hai người. Thừa thì xoá bớt, thiếu thì chép thêm — dễ hơn là tự nhớ
  // hình dạng phần tử.
  for (const lp of lapLai) {
    // Mảng lặp (mỗi người nhận một Phiếu chuyển) ghép được từ du_kien thì cũng không dựng khung.
    if (ghepDuoc.has(lp.ten)) { nhom.may.push(lp.ten); continue; }
    khung[`_${lp.ten}`] = `mỗi phần tử sinh ra một bản ${lp.ma}. "hau_to" đi vào tên file. Các khoá khác ghi đè lên giá trị chung ở trên; khoá nào giống nhau giữa các bản thì bỏ đi, để ở trên là đủ.`;
    khung[lp.ten] = [0, 1].map(() =>
      Object.fromEntries((lp.bien || ['hau_to']).map((b) => [b, ''])));
  }

  fs.writeFileSync(duong, JSON.stringify(khung, null, 2), 'utf8');
  return nhom;
}

/** Ghi toàn bộ chữ cố định của các mẫu trong bộ, với {{ô}} tại đúng chỗ của nó. Để
 *  Claude biết một ô nằm giữa câu nào trước khi viết: phần lớn lỗi lặp chữ ("…cụ thể:
 *  thửa đất… được tách ra làm 03 thửa đất:" rồi đoạn sau lại đúng câu đó) là do viết
 *  một ô mà không thấy chữ ngay trước và ngay sau nó. Đoạn căn cứ pháp lý dài thì cắt
 *  ngắn — chỉ cần biết nó ở đó. */
function ghiKhungMau(ctx, duong) {
  const { banDo, tenBoMau } = ctx;
  const dong = [`Chữ cố định của bộ mẫu "${tenBoMau}" — {{ô}} là chỗ điền, [[?ô]] là đoạn có điều kiện`, ''];
  for (const vb of banDo.bo_mau[tenBoMau].van_ban) {
    const f = path.join(GOC_SKILL, 'assets', vb.mau);
    if (!fs.existsSync(f)) continue;
    dong.push(`===== ${vb.ma} — ${vb.ten}${vb.lap_lai ? `  (mỗi phần tử ${vb.lap_lai} một bản)` : ''} =====`);
    const xml = L.layNoiDung(L.docZip(f), 'word/document.xml');
    for (const p of xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) || []) {
      const t = L.chuPhang(p).trim();
      if (!t) continue;
      dong.push(/\{\{|\[\[/.test(t) || t.length <= 110 ? t : `${t.slice(0, 107)}…`);
    }
    dong.push('');
  }
  fs.writeFileSync(duong, dong.join('\n'), 'utf8');
}

/* ------------------------------------------------------------------- lọc ---- */

function locTrang(pdf, thuMucLv, ts) {
  const args = ['--pdf', pdf, '--ra', thuMucLv, '--mini-pdf'];
  if (ts.trang) args.push('--chi-trang', ts.trang);
  if (ts.dpi) args.push('--dpi', ts.dpi);
  execFileSync('node', [path.join(__dirname, 'loc_trang.js'), ...args], { encoding: 'utf8' });
}

/* ------------------------------------------------------------- một hồ sơ ---- */

function motHoSo(pdf, ctx) {
  const { ts, banDo, tenBoMau, nguon, cauHinh } = ctx;
  const ten = path.basename(pdf).replace(/\.pdf$/i, '');
  const tm = thuMucHoSo(ts.lv, ten);
  const fileDuLieu = path.join(tm, 'ho_so.json');
  const fileDaSoan = path.join(tm, 'da_soan.txt');
  console.log(`\n— ${ten}`);

  if (ts['lam-lai'] && fs.existsSync(tm)) fs.rmSync(tm, { recursive: true, force: true });

  /* Lượt 4: đã có dữ liệu → điền luôn, không đọc lại gì. */
  const duLieu = docJson(fileDuLieu);
  if (duLieu && Object.keys(duLieu).some((k) => !k.startsWith('_') && k !== 'bo_mau' && coGiaTri(duLieu[k]))) {
    // Hồ sơ cũ còn nằm trong thư mục nguồn: đã soạn và chưa sửa gì thì không đụng tới, để khỏi
    // ghi đè bản cán bộ đã điền tay. Đổi --can-bo là có việc mới.
    const doiCanBo = ts.canBoChon && ts.canBoChon !== duLieu.can_bo_hop_dong;
    if (!ts['soan-lai'] && !doiCanBo && fs.existsSync(fileDaSoan)
      && fs.statSync(fileDuLieu).mtimeMs <= fs.statSync(fileDaSoan).mtimeMs) {
      console.log('  Đã soạn từ trước — bỏ qua (soạn lại: thêm --soan-lai).');
      return { trangThai: 'bo-qua' };
    }
    duLieu.bo_mau = duLieu.bo_mau || tenBoMau;
    if (!duLieu.pdf_nguon) duLieu.pdf_nguon = path.resolve(pdf);
    // Cấu hình trộn vào SAU cùng nhưng không đè: giá trị viết thẳng trong ho_so.json
    // luôn thắng, vì đó là hồ sơ nói khác cấu hình chung.
    // Chỉ lấp ô CHƯA có gì. Không dùng `!duLieu[k]`: false (= đã xét, không áp dụng)
    // cũng là "falsy" và sẽ bị cấu hình chung ghi đè lên.
    for (const [k, v] of Object.entries(cauHinh)) {
      if (duLieu[k] === undefined || duLieu[k] === null || duLieu[k] === '') duLieu[k] = v;
    }
    // --can-bo là lệnh của chính lượt này: thắng cả giá trị lượt trước đã ghi vào ho_so.json.
    if (ts.canBoChon) duLieu.can_bo_hop_dong = ts.canBoChon;
    for (const k of Object.keys(duLieu)) if (k.startsWith('_')) delete duLieu[k];
    fs.writeFileSync(fileDuLieu, JSON.stringify(duLieu, null, 2), 'utf8');

    let kq;
    try {
      kq = execFileSync('node', [
        path.join(__dirname, 'tao_bo_van_ban.js'),
        '--du-lieu', fileDuLieu,
        '--goc-ra', ts['goc-ra'],
        '--goc-ra-may', ts['goc-ra-may'] || ts['goc-ra'],
      ], { encoding: 'utf8' });
    } catch (e) {
      console.log(`  ✗ ${String(e.stderr || e.message).split('\n').filter(Boolean)[0]}`);
      return { trangThai: 'loi' };
    }
    const soO = Number((kq.match(/tổng (\d+) ô «CẦN ĐIỀN»/) || [0, 0])[1]);
    // Lọc theo dấu hiệu chắc chắn có trong dòng, không theo hình dạng cột: tên file có
    // dấu cách ("BC 260519-0009.docx") nên mọi mẫu \S+ đều trượt.
    for (const d of kq.split('\n').filter((x) => x.includes('.docx') && x.includes('→'))) console.log(' ' + d);
    const cacO = (kq.match(/Các ô cần cán bộ tự điền: (.+)/) || [])[1];
    if (cacO) console.log(`  Ô «CẦN ĐIỀN» (${soO}): ${cacO}`);
    fs.writeFileSync(fileDaSoan, `${new Date().toISOString()}\n`, 'utf8');
    return { trangThai: 'xong', soO };
  }

  /* Lượt 1: chưa lọc thì lọc; đã lọc rồi thì in lại việc phải làm. */
  const fileLoc = path.join(tm, 'loc.json');
  if (!fs.existsSync(fileLoc)) {
    try { locTrang(pdf, ts.lv, ts); }
    catch (e) {
      console.log(`  ✗ lọc trang hỏng: ${String(e.stderr || e.message).split('\n').filter(Boolean)[0]}`);
      return { trangThai: 'loi' };
    }
  }
  // Tra lại thư mục sau khi lọc: loc_trang.js vừa tạo nó, và tên có thể ở dạng tổ hợp
  // dấu khác với chuỗi ta ghép ra lúc nãy.
  const tmThat = thuMucHoSo(ts.lv, ten);
  const loc = docJson(path.join(tmThat, 'loc.json')) || {};

  console.log(`  Lọc: ${loc.tong_trang || '?'} → ${(loc.giu || []).length} trang${loc.lan ? ` (${loc.lan})` : ''}`);
  for (const c of loc.canh_bao || []) console.log(`  ! ${c}`);

  if (loc.mini_pdf && fs.existsSync(loc.mini_pdf)) {
    const n = (loc.giu || []).length;
    // In đường dẫn tuyệt đối: dòng này để dán thẳng vào lệnh đọc, không phải để ngắm.
    console.log(`  ĐỌC 1 FILE: ${path.resolve(loc.mini_pdf)}${n > 10 ? `   (${n} trang — cần tham số pages, ví dụ "1-${Math.min(n, 20)}")` : ''}`);
  } else if (loc.lan === 'lop-chu') {
    console.log(`  ĐỌC bằng: pdftotext -layout -f <trang> -l <trang> "${pdf}" -`);
    console.log(`  Trang cần đọc: ${(loc.giu || []).join(', ')}`);
  } else {
    console.log('  ĐỌC các ảnh sau (không dựng được mini.pdf — thiếu pdfseparate/pdfunite):');
    for (const a of loc.anh || []) console.log(`    ${path.join(tmThat, a)}`);
  }

  const { bien, dieuKien, thieu } = ctx.bienBoMau;
  const lapLai = banDo.bo_mau[tenBoMau].van_ban
    .filter((v) => v.lap_lai)
    .map((v) => ({ ten: v.lap_lai, ma: v.ma, bien: v.lap_lai_bien }));
  const ghepDuoc = new Set(bienGhepDuoc(tenBoMau));
  const traLai = banDo.bo_mau[tenBoMau].nhom === 'tra-lai';
  const nhom = sinhKhung(bien, nguon, cauHinh, dieuKien, lapLai, path.join(tmThat, 'ho_so.json'), ghepDuoc, tenBoMau, traLai);
  console.log(`  RỒI ĐIỀN: ${path.resolve(tmThat, 'ho_so.json')}   (khung đã sinh sẵn, chỉ điền giá trị)`);
  if (traLai) {
    // Không có du_kien để dặn, nên dặn nghĩa từng ô: cùng một chữ "nguoi_de_nghi" mà viết hoa
    // hay thường, có "hộ" hay không là ra câu khác nhau.
    const moTa = (nguon.tra_lai_bien || {}).bien || {};
    console.log('    CHỈ ĐIỀN DỮ KIỆN — câu văn đã cố định trong mẫu. Nghĩa từng ô:');
    for (const b of [...nhom.doc, ...nhom.trong]) console.log(`      ${b}: ${moTa[b] || '(đọc chữ quanh ô trong khung_mau.txt)'}`);
  } else {
    console.log(`    KHỐI du_kien — CHỈ GHI DỮ KIỆN, không viết câu. Script tự ghép ${nhom.may.length} ô: ${nhom.may.join(', ')}`);
    console.log('      ↳ người (tên, ngày sinh, giấy tờ, địa chỉ) · GCN cũ · thửa gốc · bản vẽ · hợp đồng · từng thửa mới (ai đứng tên, theo hợp đồng nào)');
    console.log('      ↳ số seri GCN mới chỉ ghi khi hồ sơ CÓ tờ GCN mới — thường là chưa có: để rỗng, chỉ đúng chỗ seri thành «CẦN ĐIỀN»');
  }
  console.log(`    ô lẻ đọc từ hồ sơ (${nhom.doc.length}): ${nhom.doc.join(', ') || '—'}`);
  if (nhom.gcnMoi.length) {
    console.log(`    đọc từ TỜ GCN MỚI (${nhom.gcnMoi.length}): ${nhom.gcnMoi.join(', ')}`);
    console.log('      ↳ số seri lấy ở tờ GCN mới, KHÔNG lấy số tờ cũ — script tự chặn nếu trùng số cũ');
  }
  if (nhom.ghep.length) console.log(`    tự viết cả câu (${nhom.ghep.length}): ${nhom.ghep.join(', ')}`);
  if (nhom.trong.length) console.log(`    ĐỂ NGUYÊN RỖNG (${nhom.trong.length}): ${nhom.trong.join(', ')}`);
  if (nhom.cauHinh.length) console.log(`    đã có sẵn, không cần điền (${nhom.cauHinh.length}): ${nhom.cauHinh.join(', ')}`);
  if (nhom.khongApDung.length) {
    console.log(`    có thể KHÔNG ÁP DỤNG — hồ sơ không có thì ghi false: ${nhom.khongApDung.join(', ')}`);
  }
  if (dieuKien.length) console.log(`    đoạn có điều kiện — rỗng thì cả đoạn biến mất: ${dieuKien.join(', ')}`);

  // Công thức câu cho đúng những ô bộ mẫu này cần. In ở đây thay vì bắt đọc thêm file:
  // đây là lúc Claude sắp viết, và công thức là thứ quyết định câu văn gọn hay lan man.
  // Khuôn của ĐÚNG bộ mẫu này, theo thứ tự ưu tiên: khuôn viết tay cho mẫu này (khi Chi
  // nhánh muốn viết khác bản đã ký) → khuôn rút từ chính bản đã ký của mẫu này → công thức
  // chung. Một công thức chung cho mọi mẫu từng sai ở 5/7 bộ mẫu, vì mỗi mẫu viết một kiểu.
  const ct = ctx.congThuc;
  const khuonMau = (ctx.khuonCau || {})[ctx.tenBoMau] || {};
  const khuonCua = (b) => (ct[b] && ct[b].theo_bo_mau && ct[b].theo_bo_mau[ctx.tenBoMau])
    || khuonMau[b] || (ct[b] && ct[b].cong_thuc);
  // Chỉ in khuôn cho ô còn phải VIẾT TAY; ô ghép từ du_kien thì script đã viết đúng khuôn.
  const coKhuon = bien.filter((b) => !ghepDuoc.has(b) && khuonCua(b) && (ct[b] || khuonMau[b]) && !b.startsWith('ten_') && b !== 'gcn_moi_so');
  if (coKhuon.length) {
    console.log(`  KHUÔN CÂU CỦA MẪU "${ctx.tenBoMau}" (rút từ bản đã ký; <…> là chỗ thay, ¶ là sang phần tử mới)`);
    console.log(`    ${ct._nguyen_tac_chung}`);
    for (const b of coKhuon) {
      console.log(`    ${b}: ${khuonCua(b)}`);
      if (ct[b] && ct[b].luu_y) console.log(`      ↳ ${ct[b].luu_y}`);
    }
  }
  const fileKhung = path.join(tmThat, 'khung_mau.txt');
  ghiKhungMau(ctx, fileKhung);
  console.log(`  Chữ cố định quanh từng ô (đọc khi cần biết ô nằm giữa câu nào): ${path.resolve(fileKhung)}`);
  for (const lp of lapLai) {
    if (ghepDuoc.has(lp.ten)) {
      const cach = tenBoMau === 'tach-thua-phat-sinh-chu'
        ? 'mỗi thửa nhận theo hợp đồng một bản, người cùng nhận một thửa (vợ chồng) chung một bản'
        : 'mỗi người nhận thửa theo văn bản một bản';
      console.log(`    ${lp.ma}: ${cach} — script tự lập từ du_kien.thua_moi`);
      continue;
    }
    console.log(`    MẢNG "${lp.ten}" — mỗi phần tử sinh MỘT bản ${lp.ma} riêng: ${(lp.bien || []).join(', ')}`);
    console.log(`      khung dựng sẵn 2 phần tử; hồ sơ có mấy người thì để đúng bấy nhiêu.`);
  }
  for (const t of thieu) console.log(`    ! ${t}`);
  return { trangThai: 'cho-doc' };
}

/* -------------------------------------------------------------------- main ---- */

/** Chọn cán bộ hợp đồng theo câu lệnh ("Hải Yến", "thai"…): khớp đúng MỘT người trong danh
 *  sách cấu hình, không dấu cũng được. Tên ngoài danh sách thì từ chối — gõ nhầm một chữ mà
 *  in thẳng lên Báo cáo thì sai rất kín. */
function chonCanBo(ds, nhap) {
  const can = boDau(nhap);
  const khop = ds.filter((t) => boDau(t) === can || boDau(t).includes(can));
  return khop.length === 1 ? khop[0] : null;
}

function inLoiChonMau(chon, nhap, banDo) {
  if (chon.loi === 'khong-thay') {
    console.error(`Không có bộ mẫu nào khớp "${nhap}".`);
    // Một bộ mẫu nằm ở HAI chỗ: thư mục assets/mau/<bộ>/ và dòng khai báo trong
    // ban_do_ro_mau.json. Chép mỗi thư mục sang máy khác thì file có đủ mà script
    // vẫn không thấy — nói thẳng ra, đừng để người dùng tưởng là mất mẫu.
    const chuaKhai = fs.readdirSync(path.join(GOC_SKILL, 'assets/mau'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'chung' && !banDo.bo_mau[d.name])
      .map((d) => d.name);
    if (chuaKhai.length) {
      console.error(`\n! Có thư mục mẫu nhưng CHƯA KHAI trong assets/ban_do_ro_mau.json: ${chuaKhai.join(', ')}`);
      console.error('  Bản skill đang chạy không đầy đủ: có file mẫu mà thiếu dòng khai báo.');
      console.error('  Dùng skill trong tài khoản Claude (bản đóng gói bằng dong_goi.js luôn đủ cả hai), đừng chép lẻ thư mục mẫu.\n');
    }
  }
  if (chon.loi === 'chua-co-mau') {
    console.error(`"${nhap}" là loại hồ sơ CHƯA CÓ MẪU — dừng và báo người dùng, không lấy mẫu khác dùng tạm:`);
    for (const r of chon.ro) console.error(`  ${r}`);
    console.error('');
  }
  if (chon.loi === 'nhieu-ket-qua') console.error(`"${nhap}" khớp nhiều bộ mẫu, cần gõ rõ hơn.`);
  if (chon.loi === 'thieu-tra-lai') {
    console.error(`"${nhap}" chỉ khớp mẫu TRẢ LẠI hồ sơ — gọi đúng tên, có chữ "trả lại" ở đầu (vd. "trả lại ${nhap}").`);
    console.error('Đừng tự chọn hộ: hỏi lại người dùng nếu không chắc họ muốn thông báo trả lại.');
  }
  console.error('Các bộ mẫu hiện có:');
  for (const t of chon.cac) {
    const b = banDo.bo_mau[t];
    console.error(`  ${t.padEnd(26)} ${b.ten}  [${b.van_ban.map((v) => v.ma).join(', ')}]`);
  }
}

const saiNguon = (bo, nguon) => Boolean(nguon) && nguon.nhom === 'chuyen' && bo.nhom === 'tra-lai' && !bo.goi_khong_tra_lai;

/** --theo-thu-muc: mỗi thư mục con của --vao mang TÊN MẪU ("trả lại chậm lũ", "tách thửa
 *  tặng cho"), hồ sơ nào cần mẫu nào thì nằm trong thư mục đó. Dò hết tên thư mục trước khi
 *  làm gì: một tên khớp nhiều mẫu hay không khớp mẫu nào là dừng cả lô, vì soạn nửa lô
 *  rồi mới phát hiện xếp nhầm thì người dùng không biết hồ sơ nào đã ra bằng mẫu nào. */
function chiaTheoThuMuc(banDo, goc, gocRa, nguon) {
  const viec = [];
  const loi = [];
  if (path.resolve(gocRa).startsWith(path.resolve(goc) + path.sep)) {
    loi.push(`--goc-ra nằm bên trong --vao: thư mục kết quả sẽ bị coi là một thư mục mẫu. Chọn --goc-ra ở ngoài ${goc}.`);
  }
  for (const m of fs.readdirSync(goc, { withFileTypes: true })) {
    if (!m.isDirectory()) {
      if (/\.pdf$/i.test(m.name)) loi.push(`"${m.name}" nằm ngoài mọi thư mục mẫu — chuyển vào thư mục mang tên mẫu cần dùng.`);
      continue;
    }
    if (m.name.startsWith('_')) continue;            // _lam_viec, _so_ho_so…
    const c = chonBoMau(banDo, tenTheoNguon(m.name, nguon));
    if (c.ten && saiNguon(banDo.bo_mau[c.ten], nguon)) {
      loi.push(`thư mục "${m.name}" là mẫu trả lại — chuyển sang "hs trả lại".`);
      continue;
    }
    if (c.ten) { viec.push({ tenBoMau: c.ten, vao: path.join(goc, m.name), nhan: m.name }); continue; }
    const lyDo = {
      'nhieu-ket-qua': `khớp nhiều mẫu (${(c.cac || []).join(', ')}) — đổi tên rõ hơn`,
      'thieu-tra-lai': `là mẫu trả lại — đổi tên thư mục thành "trả lại ${m.name}"`,
      'chua-co-mau': 'loại hồ sơ chưa có mẫu',
    }[c.loi] || 'không khớp mẫu nào';
    loi.push(`thư mục "${m.name}" ${lyDo}`);
  }
  if (!viec.length && !loi.length) loi.push(`${goc} không có thư mục con nào mang tên mẫu.`);
  return { viec, loi };
}

function main() {
  const ts = docThamSo(process.argv);
  const banDo = JSON.parse(fs.readFileSync(path.join(GOC_SKILL, 'assets/ban_do_ro_mau.json'), 'utf8'));

  const nguonHs = ts.vao ? nguonHoSo(ts.vao) : null;
  // Trỏ thẳng vào "hs chuyển"/"hs trả lại" mà không nói mẫu: tên mẫu nằm ở các thư mục con.
  if (nguonHs && !ts['bo-mau'] && path.resolve(ts.vao) === nguonHs.thuMuc) ts['theo-thu-muc'] = true;

  if (!ts['theo-thu-muc']) {
    const nhap = tenTheoNguon(ts['bo-mau'], nguonHs);
    const chon = chonBoMau(banDo, nhap);
    if (chon.loi) { inLoiChonMau(chon, nhap, banDo); process.exit(2); }
    if (saiNguon(banDo.bo_mau[chon.ten], nguonHs)) {
      console.error(`"${nhap}" là mẫu trả lại mà hồ sơ đang ở "hs chuyển" — chuyển hồ sơ sang "hs trả lại" rồi chạy lại.`);
      process.exit(2);
    }
    ts.tenBoMau = chon.ten;
  }

  if (!ts.vao) {
    console.error('Cần --vao <file .pdf hoặc thư mục>.');
    process.exit(2);
  }
  // Hồ sơ nằm trong thư mục của phòng: kết quả về thư mục kết quả tương ứng cạnh nó.
  // Ngoài ra không có --goc-ra thì tự chọn theo môi trường. Trên claude.ai, file ghi vào thư mục
  // outputs mới hiện ra cho người dùng tải về; trên máy tính thì để cạnh chỗ đang làm.
  // Người dùng thường không biết — và không nên phải biết — đường dẫn nào là đúng.
  if (!ts['goc-ra'] && nguonHs) ts['goc-ra'] = path.join(nguonHs.goc, nguonHs.ketQua);
  if (!ts['goc-ra']) {
    ts['goc-ra'] = fs.existsSync('/mnt/user-data/outputs')
      ? '/mnt/user-data/outputs'
      : path.resolve('ket_qua_soan');
    console.log(`(không chỉ --goc-ra → ghi kết quả vào ${ts['goc-ra']})`);
  }

  let viec = [{ tenBoMau: ts.tenBoMau, vao: ts.vao }];
  if (ts['theo-thu-muc']) {
    const chia = chiaTheoThuMuc(banDo, ts.vao, ts['goc-ra'], nguonHs);
    if (chia.loi.length) {
      console.error('CHƯA CHẠY LÔ — sửa các chỗ sau rồi chạy lại (tên thư mục = tên mẫu, như --bo-mau):');
      for (const l of chia.loi) console.error(`  ✗ ${l}`);
      console.error('Xem tên gọi các mẫu: node scripts/lam_ngay.js --bo-mau ?');
      process.exit(2);
    }
    viec = chia.viec;
    console.log(`LÔ THEO THƯ MỤC — ${viec.length} nhóm: ${viec.map((v) => `"${v.nhan}" → ${v.tenBoMau}`).join(' · ')}`);
  }

  const nguon = JSON.parse(fs.readFileSync(path.join(GOC_SKILL, 'assets/nguon_bien.json'), 'utf8'));
  const fileCauHinh = ts['khong-cau-hinh'] ? {} : (docJson(path.join(GOC_SKILL, 'assets/cau_hinh_chi_nhanh.json')) || {});
  const cauHinh = { ...(fileCauHinh.gia_tri || {}) };
  const dsCanBo = fileCauHinh.can_bo_hop_dong_chon || [];
  if (ts['can-bo']) {
    const cb = chonCanBo(dsCanBo, ts['can-bo']);
    if (!cb) {
      console.error(`--can-bo "${ts['can-bo']}" không khớp đúng một cán bộ hợp đồng. Danh sách: ${dsCanBo.join(' | ') || '(trống)'}`);
      console.error('Thêm người mới thì sửa can_bo_hop_dong_chon trong assets/cau_hinh_chi_nhanh.json.');
      process.exit(2);
    }
    cauHinh.can_bo_hop_dong = cb;
    ts.canBoChon = cb;
  }
  ts.lv = ts.lv || path.join(ts['goc-ra'], '_lam_viec');
  fs.mkdirSync(ts.lv, { recursive: true });

  const pb = docJson(path.join(GOC_SKILL, 'assets/phien_ban.json'));
  console.log(`Phiên bản skill: ${pb ? pb.phien_ban : 'bản đang phát triển (chưa đóng gói)'}`);
  if (Object.keys(cauHinh).length) {
    // In ra mỗi lần, không giấu: một giá trị cấu hình sai sẽ sai ở mọi văn bản về sau,
    // và sai rất kín vì tên người ký đọc lên vẫn thuận.
    console.log(`Cấu hình Chi nhánh đang dùng: ${Object.entries(cauHinh).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
    console.log('  (sai thì sửa assets/cau_hinh_chi_nhanh.json rồi chạy lại)');
  }

  const congThuc = docJson(path.join(GOC_SKILL, 'assets/cong_thuc_cau.json')) || {};
  // Trong gói phát hành: khuôn đã rút sẵn ở assets/khuon_cau.json (bảng thay không vào gói
  // vì chứa dữ liệu thật). Trên bản gốc của người bảo trì: chưa có file đó thì rút ngay
  // từ bảng thay, để sửa mẫu xong là thấy khuôn mới liền.
  let khuonCau = docJson(path.join(GOC_SKILL, 'assets/khuon_cau.json'));
  if (!khuonCau) { try { khuonCau = require('./sinh_khuon_cau.js').khuonCau(); } catch { khuonCau = {}; } }

  const dem = { xong: 0, choDoc: 0, boQua: 0, loi: 0 };
  let tongO = 0;
  for (const v of viec) {
    const tenBoMau = v.tenBoMau;
    const bo = banDo.bo_mau[tenBoMau];
    const bienBoMau = bienCuaBoMau(banDo, tenBoMau);
    console.log(`\nLỐI TẮT — bộ mẫu "${tenBoMau}": ${bo.ten}${v.nhan ? `   (thư mục "${v.nhan}")` : ''}`);
    console.log(`Văn bản sẽ sinh: ${bo.van_ban.map((x) => `${x.ma} (→ ${x.gui})`).join(', ')}`);
    if (bo.canh_bao) console.log(`! ${bo.canh_bao}`);
    if (bienBoMau.bien.includes('can_bo_hop_dong') && !cauHinh.can_bo_hop_dong && dsCanBo.length) {
      console.log(`! Chưa chọn cán bộ hợp đồng — ô đó sẽ là «CẦN ĐIỀN». Chọn bằng --can-bo: ${dsCanBo.join(' | ')}`);
    }

    const dsPdf = fs.statSync(v.vao).isDirectory() ? timPdf(v.vao) : [v.vao];
    if (!dsPdf.length) { console.error(`Không thấy file PDF nào trong ${v.vao}`); dem.loi++; continue; }

    const ctx = { ts, banDo, tenBoMau, nguon, cauHinh, congThuc, khuonCau, bienBoMau };
    for (const pdf of dsPdf) {
      const r = motHoSo(pdf, ctx);
      if (r.trangThai === 'xong') { dem.xong++; tongO += r.soO || 0; }
      else if (r.trangThai === 'bo-qua') dem.boQua++;
      else if (r.trangThai === 'cho-doc') dem.choDoc++;
      else dem.loi++;
    }
  }

  console.log('');
  if (dem.choDoc) {
    console.log(`${dem.choDoc} hồ sơ đang chờ đọc. Đọc xong, điền khung, rồi chạy LẠI ĐÚNG LỆNH NÀY.`);
    console.log('Không cần đọc references/bien-so.md — danh sách biến ở trên đã rút thẳng từ mẫu.');
  }
  if (dem.xong) {
    console.log(`${dem.xong} hồ sơ đã ra văn bản tại ${path.resolve(ts['goc-ra'])}`);
    if (tongO) console.log(`CÒN ${tongO} Ô «CẦN ĐIỀN» — phải điền hết trước khi trình ký.`);
    else console.log('Không còn ô trống nào.');
  }
  if (dem.boQua) console.log(`${dem.boQua} hồ sơ đã soạn từ trước, bỏ qua.`);
  if (dem.loi) console.log(`${dem.loi} hồ sơ vướng, xem dòng ✗ ở trên.`);
}

module.exports = { chonBoMau, nguonHoSo, tenTheoNguon };
if (require.main === module) main();
