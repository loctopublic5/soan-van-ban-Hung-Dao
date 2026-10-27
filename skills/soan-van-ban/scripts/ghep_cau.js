#!/usr/bin/env node
/**
 * ghep_cau.js — Ghép mọi câu của văn bản từ DỮ KIỆN, thay vì để Claude tự viết.
 *
 * VÌ SAO: một hồ sơ tách thửa có chừng mười câu dài ("1. Nguồn gốc…", "Đăng ký biến
 * động…", danh sách GCN cấp…) mà thật ra chỉ xoay quanh một nhúm dữ kiện: vài người,
 * một thửa gốc, vài thửa mới, một hai hợp đồng. Để Claude tự viết từng câu thì:
 *   - câu dài dòng, lặp ý, mỗi lần một kiểu — dù khuôn câu đã in sẵn ngay trước mặt;
 *   - khối nào dính một chi tiết chưa có (số seri GCN mới chưa in) là bỏ trống CẢ KHỐI,
 *     kéo theo họ tên, năm sinh, thửa, diện tích vốn có đủ trong hồ sơ;
 *   - cùng một con số viết ba kiểu ở ba chỗ (571,7 / 571.7 / 571,7 m²).
 * Cả ba đã xảy ra thật với một hồ sơ tách thửa tặng cho ba người (14/09/2026), trên bản skill có đủ
 * khuôn câu và luật năm sinh. Dặn thêm không chữa được; ghép bằng máy thì chữa được.
 *
 * Cách làm: ho_so.json có khối "du_kien" — mỗi dữ kiện ghi MỘT lần, không câu cú gì
 * (người, GCN cũ, thửa gốc, bản vẽ, hợp đồng, thửa mới). Script ghép ra các ô câu theo
 * lối văn của bản đã ký mà Chi nhánh chọn làm chuẩn (BC tách thửa phân chia tài sản chung, 08/2026 —
 * gọn, không lặp; dưới đây gọi là "bản chuẩn"). Thiếu dữ kiện nào thì chỉ đúng chỗ đó thành «CẦN ĐIỀN», phần còn lại vẫn
 * ra đủ. Số seri GCN mới là trường hợp thường gặp nhất: lúc soạn thì phôi chưa in.
 *
 * Câu ghép ra luôn ở dạng ĐẦY ĐỦ ("- Ngày …", "UBND xã Kiều Phú", "…, nội dung:");
 * dien_mau.js tự gọt phần trùng với chữ mẫu đặt sẵn quanh ô. Nhờ vậy một câu dùng được
 * cho mọi mẫu, dù mẫu này có sẵn "- " trước ô còn mẫu kia không.
 *
 * Giá trị Claude viết tay cho một ô ghép được sẽ bị THAY bằng câu ghép — muốn giữ thì
 * liệt kê ô đó trong "giu_viet_tay": ["ten_o", …].
 *
 * Dùng:
 *   node scripts/ghep_cau.js --du-lieu ho_so.json               xem trước mọi câu ghép
 *   node scripts/ghep_cau.js --du-lieu ho_so.json --bo-mau X    (khi ho_so.json chưa ghi bo_mau)
 *   node scripts/ghep_cau.js --khung                            in khung du_kien trống
 * tao_bo_van_ban.js tự gọi hàm ghepCau() trước khi điền mẫu.
 */
'use strict';
const fs = require('fs');
const { doiDonViM2 } = require('./docx_lib.js');

const TACH = ['tach-thua-phat-sinh-chu', 'tach-thua-phan-chia-chung'];
const CO_PC = ['giao-dich-trang-4', 'giao-dich-cap-doi', ...TACH];
// Giao dịch chuyển cả thửa: không có thửa mới, người đứng tên sau thủ tục là bên nhận.
const CHUYEN_CA_THUA = ['giao-dich-trang-4', 'giao-dich-cap-doi'];
// Hợp thửa có NHIỀU thửa gốc và nhiều GCN cũ ("thửa đất số 122, 254"; "AA …; AA …"), nên
// các ô suy từ một thửa gốc, một GCN cũ không dùng cho nó — để viết tay như trước.
const MOT_THUA_GOC = ['giao-dich-trang-4', 'giao-dich-cap-doi', 'cap-doi-gcn', 'tach-thua-khong-doi-chu', ...TACH];

/** Chỗ lối viết giữa các mẫu khác nhau mà gọt mép không tự lo được. */
const KIEU = {
  // Bản chuẩn (phân chia tài sản chung): câu xác nhận bản vẽ viết luôn “ thửa … được tách ra làm 0N thửa đất:" vì
  // mục 1 của mẫu không có ô cau_tach_thua riêng; ngoặc kép mở ở đó được đóng ở cuối câu
  // thu hồi. Giữ đúng như bản đã ký.
  'tach-thua-phan-chia-chung': { xacNhanKemTach: true, dongNgoacThuHoi: true },
  'tach-thua-khong-doi-chu': { gachThua: '- ' },
};

/* ------------------------------------------------------------ chuẩn hoá ---- */

const boDau = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const coChu = (v) => v !== undefined && v !== null && v !== false && String(v).trim() !== '';
const hoaDau = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "5/9/2026", "05-09-2026", "2026-09-05" → "05/09/2026" — bản đã ký luôn viết đủ hai số. */
function ngay(s) {
  const t = String(s || '').trim();
  let m = t.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (m) return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[3].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[1]}`;
  return t;
}

/** "571,7" / "571,7 m²" / "80" → "571.7" / "80.0" — Chi nhánh viết dấu chấm, một số lẻ. */
function dt(v) {
  let t = String(v ?? '').trim().replace(/\s*m(?:2|²)\.?$/i, '').replace(',', '.');
  if (/^\d+$/.test(t)) t += '.0';
  return t;
}

/** "AA09288765" → "AA 09288765". */
const seri = (s) => String(s || '').trim().replace(/^([A-Z]{2})\s*(\d{6,8})$/, '$1 $2');

/** "Đất ở tại nông thôn (ONT)" → "đất ở tại nông thôn" khi đứng giữa câu. */
function mucDichThuong(s) {
  const t = String(s || '').trim().replace(/\s*\([A-Z]{2,5}\)\s*$/, '').replace(/\.$/, '');
  return /^\p{Lu}\p{Ll}/u.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}

/** Thửa có nhiều loại đất: mảng [{loai, dien_tich}], hoặc chuỗi chép từ GCN
 *  "Đất ở: 511.0 m²; đất trồng cây lâu năm: 639.9 m²". */
const nhieuLoai = (md) => Array.isArray(md) || /:\s*[\d.,]+\s*m/.test(String(md || ''));
function chuoiNhieuLoai(md) {
  if (!Array.isArray(md)) return doiDonViM2(mucDichThuong(md));
  return md.map((x) => `${mucDichThuong(x.loai)}: ${dt(x.dien_tich)} m²`).join('; ');
}
/** Mục đích của một thửa khi đứng sau diện tích: "đất ở" hoặc "(đất ở: …; đất trồng cây lâu năm: …)". */
function mucDichThua(t) {
  return nhieuLoai(t.muc_dich) ? `(${chuoiNhieuLoai(t.muc_dich)})` : mucDichThuong(t.muc_dich);
}

/** "Thôn Cấn Thượng, xã Kiều Phú, thành phố Hà Nội" → "xã Kiều Phú, thành phố Hà Nội":
 *  trích yếu và câu mở đầu của bản đã ký chỉ ghi tới xã, dòng "Địa chỉ thửa đất" mới
 *  ghi đủ thôn. */
/** "Thành phố Hà Nội" / "TP Hà Nội" chép từ GCN → "thành phố Hà Nội" như văn bản đã ký. */
const chuanTP = (dc) => String(dc || '').trim()
  .replace(/(^|,\s*)Thành phố Hà Nội/gu, '$1thành phố Hà Nội')
  .replace(/\bTP\.?\s*Hà Nội/gu, 'thành phố Hà Nội');

function boThon(dc) {
  let t = chuanTP(dc);
  const RE = /^(?:thôn|xóm|tổ|đội|cụm|khu|ấp|làng|số nhà|số|ngõ|ngách|phố|đường)\b[^,]*,\s*/iu;
  while (RE.test(t)) t = t.replace(RE, '');
  return t;
}

/** "Cục cảnh sát quản lý hành chính về trật tự xã hội" → "Cục cảnh sát", như bản đã ký. */
function noiCapNgan(s) {
  const g = boDau(s);
  if (/cuc canh sat/.test(g) || /cuc cs/.test(g)) return 'Cục cảnh sát';
  if (/bo cong an/.test(g)) return 'Bộ công an';
  return String(s || '').trim();
}

function loaiGiayTo(p) {
  const g = boDau(p.giay_to);
  if (!g || /can cuoc cong dan|cccd/.test(g)) return 'CCCD';
  if (/can cuoc/.test(g)) return 'Căn cước';
  if (/cmnd|chung minh/.test(g)) return 'CMND';
  if (/ho chieu/.test(g)) return 'Hộ chiếu';
  return String(p.giay_to).trim();
}

/* ------------------------------------------------------------- ngữ cảnh ---- */

/**
 * Thửa mới chưa ghi "theo" (nhận theo văn bản nào) thì suy ra, vì thiếu nó là mất cả phiếu
 * chuyển lẫn câu đăng ký biến động. Hồ sơ phân chia tài sản chung (chạy thử trên hồ sơ thật
 * 15/09/2026): khung dặn "chủ cũ giữ lại thì để rỗng", mà ở đây người nhận thửa chính là
 * các chủ cũ — ghi đúng lời dặn là không ra phiếu chuyển nào. Suy theo thứ tự:
 *   1. một văn bản có đủ những người đứng tên thửa trong ben_nhan → thửa theo văn bản đó;
 *   2. phân chia tài sản chung chỉ có một văn bản → mọi thửa theo văn bản đó.
 * Tách thửa tặng cho: chủ cũ giữ phần còn lại không nằm trong ben_nhan nên vẫn không có "theo".
 */
function suyTheo(thuaMoi, hopDong, tenBoMau, giaoDich) {
  const ds = Object.entries(hopDong);
  const chiaChung = tenBoMau === 'tach-thua-phan-chia-chung' || /phan chia/.test(boDau(giaoDich));
  return thuaMoi.map((t) => {
    if (coChu(t.theo) || !ds.length) return t;
    const chu = [].concat(t.chu || []);
    const hop = chu.length && ds.find(([, h]) => chu.every((m) => [].concat(h.ben_nhan || []).includes(m)));
    if (hop) return { ...t, theo: hop[0] };
    if (chiaChung && ds.length === 1) return { ...t, theo: ds[0][0] };
    return t;
  });
}

/** Gom du_kien về một dạng: người và hợp đồng là bảng tra theo mã, thửa mới là mảng. */
function chuanDuKien(dk, tenBoMau) {
  const bang = (x) => {
    if (Array.isArray(x)) return Object.fromEntries(x.map((p, i) => [p.ma || `#${i + 1}`, p]));
    return Object.fromEntries(Object.entries(x || {}).filter(([k]) => !k.startsWith('_')));
  };
  const soCu = dk.gcn_cu && dk.gcn_cu.so;
  // Mục mẫu còn nguyên trong khung (hd1 rỗng) không phải là một hợp đồng.
  const hopDong = Object.fromEntries(Object.entries(bang(dk.hop_dong)).filter(([, h]) => h && (coChu(h.so) || coChu(h.ten))));
  return {
    ...dk,
    nguoi: bang(dk.nguoi),
    hop_dong: hopDong,
    thua_moi: suyTheo((dk.thua_moi || []).filter((t) => t && coChu(t.so)), hopDong, tenBoMau, dk.giao_dich),
    gcn_cu: { ...(dk.gcn_cu || {}), so: (Array.isArray(soCu) ? soCu : String(soCu || '').split(/[;,]/)).map(seri).filter(Boolean) },
    thua_cu: dk.thua_cu || {},
    ban_ve: dk.ban_ve || {},
  };
}

function taoNguCanh(dk, tenBoMau) {
  const thieu = [];
  const can = (v, moTa) => {
    if (coChu(v)) return String(v).trim();
    thieu.push(moTa);
    return `«CẦN ĐIỀN: ${moTa}»`;
  };
  const nguoi = (ma) => {
    const p = dk.nguoi[ma];
    if (!p) { thieu.push(`người "${ma}" chưa khai trong du_kien.nguoi`); return { ho_ten: `«CẦN ĐIỀN: người ${ma}»`, goi: '' }; }
    return p;
  };
  const ten = (ma) => {
    const p = nguoi(ma);
    return `${(p.goi || '').toLowerCase()} ${can(p.ho_ten, 'họ tên')}`.trim();
  };
  const noi = (ds) => (ds.length <= 1 ? ds.join('') : `${ds.slice(0, -1).join(', ')} và ${ds[ds.length - 1]}`);
  const dsTen = (ma) => noi([].concat(ma || []).map(ten));

  const namSinh = (p) => {
    if (coChu(p.nam_sinh)) return String(p.nam_sinh).trim();
    const m = String(p.ngay_sinh || '').match(/(\d{4})\s*$/);
    return m ? m[1] : can('', `năm sinh của ${p.ho_ten}`);
  };
  /** "sinh ngày 22/12/1986" khi giấy tờ có đủ ngày, "sinh năm 1986" khi chỉ có năm. */
  const sinhDayDu = (p) => (/^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}$/.test(String(p.ngay_sinh || '').trim())
    ? `sinh ngày ${ngay(p.ngay_sinh)}` : `sinh năm ${namSinh(p)}`);
  const giayTo = (p) => `${loaiGiayTo(p)} số ${can(p.so_giay_to, `số giấy tờ của ${p.ho_ten}`)} do ${can(noiCapNgan(p.noi_cap), `nơi cấp giấy tờ của ${p.ho_ten}`)} cấp ngày ${can(ngay(p.ngay_cap), `ngày cấp giấy tờ của ${p.ho_ten}`)}`;
  /** Câu mô tả người như bản đã ký: tên, năm sinh, giấy tờ, địa chỉ. */
  /** Nhiều người cùng nhận (vợ chồng): "ông A, sinh năm …, CCCD số … và vợ là bà B, sinh năm …,
   *  Căn cước số …, địa chỉ: …" — như phiếu chuyển đã ký; cùng địa chỉ thì ghi một lần ở cuối.
   *  Trước 15/09/2026 phiếu chuyển của mẫu trang 4, cấp đổi chỉ ghi người nhận đầu tiên. */
  const moTaNhieu = (dsMa) => {
    const ds = [].concat(dsMa || []);
    if (ds.length <= 1) return ds.length ? moTa(ds[0]) : '';
    const dc = ds.map((m) => String(nguoi(m).dia_chi || '').trim());
    const chungDc = dc.every((x) => x && boDau(x) === boDau(dc[0]));
    const phan = ds.map((m, i) => {
      const p = nguoi(m);
      const qh = i && coChu(p.quan_he) ? `${String(p.quan_he).trim().toLowerCase()} là ` : '';
      return `${qh}${ten(m)}, sinh năm ${namSinh(p)}, ${giayTo(p)}${chungDc ? '' : `, địa chỉ: ${can(p.dia_chi, `địa chỉ của ${p.ho_ten}`)}`}`;
    });
    return `${noi(phan)}${chungDc ? `, địa chỉ: ${dc[0]}` : ''}`;
  };
  function moTa(ma) {
    const p = nguoi(ma);
    return `${ten(ma)}, sinh năm ${namSinh(p)}, ${giayTo(p)}, địa chỉ: ${can(p.dia_chi, `địa chỉ của ${p.ho_ten}`)}`;
  };

  const gc = dk.gcn_cu;
  const tc = dk.thua_cu;
  const soGcnCu = (noiBang = ', ') => (gc.so.length ? gc.so.join(noiBang) : can('', 'số GCN cũ'));
  const soHienTai = tc.so_moi || tc.so;
  const toHienTai = tc.to_moi || tc.to;
  const chuCu = [].concat(gc.chu || []);
  const hd = (ma) => dk.hop_dong[ma];
  const giaoDich = String(dk.giao_dich || '').trim().toLowerCase();

  return {
    dk, tenBoMau, kieu: KIEU[tenBoMau] || {}, thieu, can, nguoi, ten, dsTen, noi, namSinh, sinhDayDu,
    giayTo, moTa, moTaNhieu, gc, tc, soGcnCu, soHienTai, toHienTai, chuCu, hd, giaoDich,
    vlap: gc.ghi_chu_vlap !== false,
    thuaMoi: dk.thua_moi,
    hopDong: Object.entries(dk.hop_dong).map(([ma, h]) => ({ ma, ...h })),
  };
}

/* ------------------------------------------------------------- công thức ---- */

/**
 * Mỗi công thức: [tên ô, các bộ mẫu áp dụng ('*' = mọi bộ), hàm (ngữ cảnh) → giá trị].
 * Hàm trả undefined khi không đủ dữ kiện để ghép — ô đó để lại cho giá trị viết tay (hoặc
 * «CẦN ĐIỀN»). Trả false = đã xét, hồ sơ này không có: cả đoạn biến mất.
 */
const CONG_THUC = [];
const R = (bien, apDung, fn) => CONG_THUC.push({ bien, apDung, fn });

/* ---- ô đơn suy từ MỘT thửa gốc, MỘT GCN cũ ---- */
const M = MOT_THUA_GOC;
R('gcn_cu_so', M, (c) => (c.gc.so.length ? c.gc.so.join(', ') : undefined));
R('gcn_cu_so_dau_cham_phay', M, (c) => (c.gc.so.length ? c.gc.so.join('; ') : undefined));
R('gcn_cu_co_quan_cap', M, (c) => c.gc.co_quan_cap || undefined);
R('gcn_cu_ngay_cap', M, (c) => (c.gc.ngay_cap ? ngay(c.gc.ngay_cap) : undefined));
R('thua_cu_so', M, (c) => c.tc.so || undefined);
R('thua_cu_to', M, (c) => c.tc.to || undefined);
// "Tờ bản đồ" ở trích yếu và trên phiếu chuyển là số trên GCN cũ — cả bản đã ký trang 4
// (tờ 30, dù bản đồ đã đổi sang 216) lẫn bản tách thửa chuyển nhượng (tờ 5, không phải 109).
R('to_ban_do_cu', M, (c) => c.tc.to || undefined);
// Mẫu tách thửa không đổi chủ: "- Diện tích thửa đất: {{ô}} ;" — đơn vị nằm trong ô.
R('thua_cu_dien_tich', M, (c) => (coChu(c.tc.dien_tich) ? `${dt(c.tc.dien_tich)} m²` : undefined));
// Số trên GCN cũ. Bản đã ký trang 4 và tách thửa: "tờ bản đồ 18"; bản cấp đổi: "tờ bản đồ số 30".
R('thua_cu_so_to', [...TACH, 'giao-dich-trang-4'], (c) => (c.tc.so ? `thửa đất số ${c.tc.so}, tờ bản đồ ${c.tc.to}` : undefined));
R('thua_cu_so_to', ['giao-dich-cap-doi'], (c) => (c.tc.so ? `thửa đất số ${c.tc.so}, tờ bản đồ số ${c.tc.to}` : undefined));
// Dòng "- Mục đích sử dụng:" chép như GCN; nhiều loại đất thì "Đất ở: 511.0 m²; đất trồng cây lâu năm: 639.9 m²".
R('muc_dich_su_dung', M, (c) => (Array.isArray(c.tc.muc_dich) ? hoaDau(chuoiNhieuLoai(c.tc.muc_dich)) : (c.tc.muc_dich ? doiDonViM2(c.tc.muc_dich) : undefined)));
R('thoi_han_su_dung', M, (c) => c.tc.thoi_han || undefined);
// Mẫu có một phiếu chuyển: ô này nằm trên phiếu, tức là hình thức của người NHẬN — ghép ở phần phiếu.
R('hinh_thuc_su_dung', ['cap-doi-gcn', 'tach-thua-khong-doi-chu', ...TACH], (c) => c.tc.hinh_thuc || undefined);
R('dia_chi_cu', M, (c) => (c.tc.dia_chi ? boThon(c.tc.dia_chi) : undefined));
R('dia_chi_cu_day_du', M, (c) => (c.tc.dia_chi ? chuanTP(c.tc.dia_chi) : undefined));
// "- Địa chỉ thửa đất: {{ô}}" trên GCN MỚI. Chỉ lấy khi địa chỉ trên GCN cũ đã mang tên xã
// hiện nay (GCN cấp sau sáp nhập); GCN còn địa danh cũ thì để «CẦN ĐIỀN» cho cán bộ tra —
// ghép thôn cũ với xã mới là đoán.
R('dia_chi_moi', ['giao-dich-cap-doi', 'cap-doi-gcn', 'hop-thua'], (c) => {
  const dc = String((c.tenBoMau === 'hop-thua' && (c.dk.thua_goc || [])[0] && c.dk.thua_goc[0].dia_chi) || c.tc.dia_chi || '').trim();
  const xa = String(c.tc.xa_hien_nay || '').replace(/^(xã|phường|thị trấn)\s+/iu, '').trim();
  if (!dc || !xa || !boDau(dc).includes(boDau(xa)) || /huyen/.test(boDau(dc))) return undefined;
  return chuanTP(dc).replace(/\.$/, '');
});

/* ---- ô dùng được cho mọi mẫu ---- */
R('ubnd_xa_nhan', '*', (c) => {
  const xa = c.tc.xa_hien_nay || (String(c.tc.dia_chi || '').match(/(?:xã|phường|thị trấn)\s[^,]+/iu) || [])[0];
  return xa ? `UBND ${xa.trim()}` : undefined;
});
R('loai_giao_dich', '*', (c) => c.giaoDich || undefined);

/** Người đứng tên hồ sơ = người ký Đơn đăng ký biến động. Khung bắt ghi thẳng; chưa ghi
 *  thì suy: tách thửa → những người đứng tên các thửa mới (bán hết thì chủ cũ không còn
 *  trong đó — bản đã ký chuyển nhượng chỉ ghi tên hai người nhận),
 *  mẫu khác → chủ cũ và người nhận. */
const deNghi = (c) => {
  if ([].concat(c.dk.nguoi_de_nghi || []).length) return [].concat(c.dk.nguoi_de_nghi);
  if (TACH.includes(c.tenBoMau) && c.thuaMoi.length) return [...new Set(c.thuaMoi.flatMap((t) => [].concat(t.chu || [])))];
  return [...new Set([...c.chuCu, ...c.hopDong.flatMap((h) => h.ben_nhan || [])])];
};
R('ten_nguoi_ho_so', '*', (c) => {
  const ds = deNghi(c).map((m) => (c.dk.nguoi[m] || {}).ho_ten).filter(Boolean);
  return ds.length ? ds.join(', ') : undefined;
});

/* ---- câu về người ---- */
R('ben_de_nghi_mo_ta', TACH, (c) => (deNghi(c).length ? c.dsTen(deNghi(c)) : undefined));
// Trang 4: đứng sau "Ngày …," nên viết hoa như bản đã ký; cấp đổi: giữa câu "của ông … tại".
R('ben_dang_ky_mo_ta', ['giao-dich-trang-4'], (c) => (c.chuCu.length ? hoaDau(c.dsTen(c.chuCu)) : undefined));
R('ben_dang_ky_mo_ta', ['cap-doi-gcn'], (c) => (c.chuCu.length ? c.dsTen(c.chuCu) : undefined));
R('ben_nhan_mo_ta_ngan', '*', (c) => {
  const ma = c.thuaMoi.length === 1 ? c.thuaMoi[0].chu : (c.hopDong[0] && c.hopDong[0].ben_nhan);
  return ma && [].concat(ma).length ? c.dsTen(ma) : undefined;
});
R('chu_su_dung_mo_ta_ngan', '*', (c) => {
  const ma = c.thuaMoi.length && c.thuaMoi[0].chu ? c.thuaMoi[0].chu : c.chuCu;
  return [].concat(ma || []).length ? c.dsTen(ma) : undefined;
});

/* ---- mục 1: nguồn gốc, bản vẽ, tách thửa ---- */
R('cau_nguon_goc_su_dung', [...TACH, 'tach-thua-khong-doi-chu'], (c) => {
  if (!c.chuCu.length) return undefined;
  // Giấy mẫu cũ thì bản đã ký gọi đúng tên in trên tờ: "Giấy chứng nhận quyền sử dụng đất".
  const loai = c.gc.ten_loai || 'Giấy chứng nhận';
  // Tách thửa (phân chia chung, phát sinh chủ) nối tiếp ", nội dung:"; tách không đổi chủ kết câu bằng dấu chấm.
  const duoi = c.tenBoMau === 'tach-thua-khong-doi-chu' ? '.' : ', nội dung:';
  return `${hoaDau(c.dsTen(c.chuCu))} là người sử dụng đất theo ${loai} số ${c.soGcnCu()} do ${c.can(c.gc.co_quan_cap, 'cơ quan cấp GCN cũ')} cấp ngày ${c.can(ngay(c.gc.ngay_cap), 'ngày cấp GCN cũ')}${duoi}`;
});
/** Thửa sau cùng của hồ sơ không tách, không hợp (giao dịch cấp đổi, cấp đổi do đo đạc lại):
 *  thửa ghi ở thua_moi nếu có, không thì chính thửa gốc theo số mới của bản đồ. */
const thuaSau = (c) => c.thuaMoi[0]
  || (c.tc.so ? { so: c.soHienTai, to: c.toHienTai, dien_tich: c.tc.dien_tich, muc_dich: c.tc.muc_dich } : undefined);
// Bản đã ký cấp đổi: "Thửa đất số: 603; tờ bản đồ số: 155, diện tích 80.0 m²" — thửa theo số mới.
R('thua_moi_mo_ta', ['giao-dich-cap-doi'], (c) => {
  const t = thuaSau(c);
  return t ? `Thửa đất số: ${t.so}; tờ bản đồ số: ${t.to || c.toHienTai}, diện tích ${dt(t.dien_tich)} m²` : undefined;
});
// "…Quyết định số 640/QĐ-STNMT-CCQLĐĐ ngày 25/3/2019: {{ô}};" — số thửa, số tờ theo bản đồ Vlap.
R('thua_moi_so_to', ['giao-dich-cap-doi'], (c) => {
  const t = thuaSau(c);
  return t ? `Thửa đất số ${t.so}, tờ bản đồ số ${t.to || c.toHienTai}` : undefined;
});
// Bản đã ký: "Ông … là người sử dụng đất theo Giấy chứng nhận số … cấp ngày …. Thửa đất số 468, tờ bản đồ số 30, diện tích 80.0 m² đất ở."
R('cau_nguon_goc_su_dung', ['giao-dich-cap-doi'], (c) => {
  if (!c.chuCu.length || !c.tc.so) return undefined;
  return `${hoaDau(c.dsTen(c.chuCu))} là người sử dụng đất theo ${c.gc.ten_loai || 'Giấy chứng nhận'} số ${c.soGcnCu()} do ${c.can(c.gc.co_quan_cap, 'cơ quan cấp GCN cũ')} cấp ngày ${c.can(ngay(c.gc.ngay_cap), 'ngày cấp GCN cũ')}. Thửa đất số ${c.tc.so}, tờ bản đồ số ${c.tc.to}, diện tích ${dt(c.tc.dien_tich)} m² ${mucDichThua(c.tc)}.`;
});
// "- Các nội dung thỏa thuận khác: {{ô}}" — bản đã ký ghi "Không" khi hợp đồng không có thỏa thuận riêng.
R('noi_dung_thoa_thuan_khac', ['giao-dich-cap-doi'], (c) => {
  if (!c.hopDong.length) return undefined;
  const k = c.hopDong.map((h) => String(h.thoa_thuan_khac || '').trim()).filter(Boolean);
  return k.length ? k.join('; ') : 'Không';
});

/* ---- Cấp đổi GCN do đo đạc lại ---- */
const CD = ['cap-doi-gcn'];
/** "Hộ ông Nguyễn Văn A và bà Trần Thị B" khi GCN cũ cấp cho hộ gia đình. */
const chuCuDayDu = (c) => (c.gc.cap_cho_ho === true ? `Hộ ${c.dsTen(c.chuCu)}` : hoaDau(c.dsTen(c.chuCu)));
R('cau_nguon_goc_su_dung', CD, (c) => {
  if (!c.chuCu.length || !c.tc.so) return undefined;
  return `${chuCuDayDu(c)} là người sử dụng đất theo ${c.gc.ten_loai || 'Giấy chứng nhận'} số ${c.soGcnCu()} do ${c.can(c.gc.co_quan_cap, 'cơ quan cấp GCN cũ')} cấp ngày ${c.can(ngay(c.gc.ngay_cap), 'ngày cấp GCN cũ')}. Thửa đất số ${c.tc.so}, tờ bản đồ số ${c.tc.to}, diện tích ${dt(c.tc.dien_tich)} m², mục đích sử dụng: ${nhieuLoai(c.tc.muc_dich) ? chuoiNhieuLoai(c.tc.muc_dich) : mucDichThuong(c.tc.muc_dich)}.`;
});
R('thua_cu_mo_ta', CD, (c) => (c.tc.so ? `thửa đất số ${c.tc.so}, tờ bản đồ số ${c.tc.to}, diện tích ${dt(c.tc.dien_tich)} m²` : undefined));
R('thua_moi_mo_ta', CD, (c) => {
  const t = thuaSau(c);
  return t ? `thửa đất số ${t.so}, tờ bản đồ số ${t.to || c.toHienTai}, diện tích ${dt(t.dien_tich)} m²` : undefined;
});
R('thua_moi_so_to', CD, (c) => { const t = thuaSau(c); return t ? `Thửa đất số: ${t.so}, tờ bản đồ số: ${t.to || c.toHienTai}` : undefined; });
R('don_vi_do_dac', CD, (c) => c.dk.ban_ve.don_vi_do || undefined);
R('ngay_trich_do', CD, (c) => (coChu(c.dk.ban_ve.ngay_lap) ? ngay(c.dk.ban_ve.ngay_lap) : undefined));
// "Diện tích giảm 6.3 m² so với bản đồ Vlap là do …". Bằng nhau thì không có câu này.
R('cau_giai_thich_chenh_lech', CD, (c) => {
  const bv = c.dk.ban_ve;
  const t = thuaSau(c);
  if (!t || !coChu(bv.dien_tich_vlap) || !coChu(t.dien_tich)) return undefined;
  const lech = Math.round((parseFloat(dt(t.dien_tich)) - parseFloat(dt(bv.dien_tich_vlap))) * 10) / 10;
  if (!lech) return false;
  return `Diện tích ${lech < 0 ? 'giảm' : 'tăng'} ${Math.abs(lech).toFixed(1)} m² so với bản đồ Vlap là do ${c.can(String(bv.ly_do_chenh_lech || '').replace(/\.$/, ''), 'lý do chênh lệch diện tích')}.`;
});
// "…quy định: “mục đích đất ở” ký hiệu chữ “T” thì hồ sơ đủ điều kiện…" — ký hiệu in trên GCN cũ.
R('cau_ky_hieu_muc_dich', CD, (c) => (coChu(c.tc.ky_hieu_cu) && c.tc.muc_dich
  ? `“mục đích ${nhieuLoai(c.tc.muc_dich) ? chuoiNhieuLoai(c.tc.muc_dich) : mucDichThuong(c.tc.muc_dich)}” ký hiệu chữ “${String(c.tc.ky_hieu_cu).trim()}”` : undefined));
// "Ông A, bà B, ông C" — những người ký đơn đề nghị cấp đổi; bản đã ký ngăn bằng dấu phẩy.
R('cau_nguoi_de_nghi', CD, (c) => {
  const ds = [].concat(c.dk.nguoi_de_nghi || []).length ? [].concat(c.dk.nguoi_de_nghi) : c.chuCu;
  return ds.length ? hoaDau(ds.map(c.ten).join(', ')) : undefined;
});
// "(là đại diện cho các thành viên có chung quyền sử dụng đất của hộ gia đình gồm: ông A, CCCD số …; bà B, Căn cước số … và …)".
R('cau_thanh_vien_ho', CD, (c) => {
  const ds = [].concat(c.dk.thanh_vien_ho || []);
  if (!ds.length) return c.gc.cap_cho_ho === true ? undefined : false;
  const mo = ds.map((m) => { const p = c.nguoi(m); return `${c.ten(m)}, ${loaiGiayTo(p)} số ${c.can(p.so_giay_to, `số giấy tờ của ${p.ho_ten}`)}`; });
  const noiDs = mo.length <= 1 ? mo.join('') : `${mo.slice(0, -1).join('; ')} và ${mo[mo.length - 1]}`;
  return `(là đại diện cho các thành viên có chung quyền sử dụng đất của hộ gia đình gồm: ${noiDs})`;
});

/* ---- Ngày lập mảnh trích đo, số vào sổ GCN cũ ---- */
// "…do Chi nhánh … lập ngày {{ô}} cụ thể:"
R('ngay_lap_trich_do', ['tach-thua-khong-doi-chu', 'hop-thua'], (c) => (coChu(c.dk.ban_ve.ngay_lap) ? ngay(c.dk.ban_ve.ngay_lap) : undefined));
R('gcn_cu_so_vao_so', ['tach-thua-khong-doi-chu'], (c) => (coChu(c.gc.so_vao_so) ? String(c.gc.so_vao_so).trim() : undefined));

R('thua_cu_mo_ta', TACH, (c) => (c.tc.so ? `Thửa đất số: ${c.tc.so}; tờ bản đồ số: ${c.tc.to}, diện tích ${dt(c.tc.dien_tich)} m²` : undefined));
R('thua_cu_mo_ta', ['giao-dich-trang-4'], (c) => (c.tc.so ? `thửa đất số ${c.tc.so}, tờ bản đồ ${c.tc.to}, diện tích ${dt(c.tc.dien_tich)} m²` : undefined));

const soThuaMoi = (c) => String(c.thuaMoi.length).padStart(2, '0');
R('cau_xac_nhan_ban_ve', TACH, (c) => {
  const bv = c.dk.ban_ve;
  if (!coChu(bv.ngay_xac_nhan)) return undefined;
  const nguoiDeNghi = [].concat(bv.de_nghi || c.chuCu);
  let s = `- Ngày ${ngay(bv.ngay_xac_nhan)}, ${c.can(bv.co_quan, 'cơ quan xác nhận bản vẽ')} xác nhận bản vẽ tách thửa đất, hợp thửa đất theo đề nghị của ${c.dsTen(nguoiDeNghi)} là đủ điều kiện, cụ thể:`;
  if (c.kieu.xacNhanKemTach && c.thuaMoi.length) s += ` “ thửa đất ${c.soHienTai}, tờ bản đồ ${c.toHienTai} được tách ra làm ${soThuaMoi(c)} thửa đất:`;
  return s;
});
R('cau_thay_doi_ban_do', M, (c) => {
  const { so, to, so_moi: soMoi, to_moi: toMoi } = c.tc;
  if (!so || !to) return undefined;
  // Cấp đổi do đo đạc lại thì số thửa đổi vì cả hai lý do; bản đã ký ghi đủ cả hai.
  const lyDo = c.tenBoMau === 'cap-doi-gcn' ? 'do thay đổi bản đồ địa chính và đo đạc lại' : 'do thay đổi bản đồ địa chính';
  if (soMoi && soMoi !== so) return `Thửa đất số ${so}, tờ ${to} được thay đổi thành thửa đất số ${soMoi}, tờ ${toMoi || to} ${lyDo}.`;
  if (toMoi && toMoi !== to) return `Tờ bản đồ số ${to} được thay đổi thành tờ số ${toMoi} ${lyDo}.`;
  // Khung dặn: so_moi/to_moi chỉ ghi khi bản đồ đổi số. Đã có số thửa, số tờ mà hai ô đó
  // rỗng tức là không đổi → false, cả đoạn biến mất (không để «CẦN ĐIỀN» vô nghĩa).
  return false;
});
R('cau_tach_thua', TACH, (c) => (c.thuaMoi.length && c.tc.so
  ? `Thửa đất số ${c.soHienTai}, tờ bản đồ số ${c.toHienTai}, diện tích ${dt(c.tc.dien_tich)} m² ${mucDichThua(c.tc)} được tách thành ${soThuaMoi(c)} thửa đất:`
  : undefined));
R('cau_thua_cu_tach_thanh', ['tach-thua-khong-doi-chu'], (c) => (c.thuaMoi.length && c.tc.so
  ? `Thửa đất số ${c.soHienTai}, tờ bản đồ số ${c.toHienTai}, diện tích ${dt(c.tc.dien_tich)} m² ${mucDichThua(c.tc)} được tách thành ${soThuaMoi(c)} thửa:`
  : undefined));

const dongThua = (c, t, gach) => `${gach}Thửa đất số ${t.so}, diện tích ${dt(t.dien_tich)} m² ${mucDichThua(t)}${t.ghi_chu ? ` ${t.ghi_chu}` : ''}.`;
const dsThua = (c) => (c.thuaMoi.length ? c.thuaMoi.map((t) => dongThua(c, t, c.kieu.gachThua || '+ ')) : undefined);
R('danh_sach_thua_sau_tach', TACH, dsThua);
R('cau_cac_thua_sau_tach', [...TACH, 'tach-thua-khong-doi-chu'], dsThua);
// Thửa không cấp GCN (lối đi chung) được ghi riêng một dòng trong phần ghi chú; không có thì
// cả đoạn biến mất.
R('cau_ghi_chu_loi_di_chung', ['tach-thua-khong-doi-chu'], (c) => {
  if (!c.thuaMoi.length) return undefined;
  const ds = c.thuaMoi.filter((t) => t.cap_gcn === false);
  return ds.length ? ds.map((t) => dongThua(c, t, '+ ')) : false;
});
R('cau_cac_thua_cap_gcn', ['tach-thua-khong-doi-chu'], (c) => {
  const ds = c.thuaMoi.filter((t) => t.cap_gcn !== false);
  return ds.length ? ds.map((t) => dongThua(c, t, c.kieu.gachThua || '+ ')) : undefined;
});

/* ---- văn bản căn cứ và nội dung biến động ---- */
const tenViec = (g) => ({ 'tặng cho': 'tặng cho', 'chuyển nhượng': 'chuyển nhượng', 'phân chia tài sản chung': 'phân chia', 'phân chia': 'phân chia', 'thừa kế': 'thừa kế' }[g] || g);
const thuaCuaHopDong = (c, h) => c.thuaMoi.filter((t) => t.theo === h.ma);
// Tên VPCC chép kèm chữ "VPCC" (dòng tài sản riêng trên GCN viết "do VPCC …") thì bỏ, khỏi in "VPCC VPCC".
const tenVpcc = (v) => String(v || '').trim().replace(/^(?:VPCC|Văn phòng công chứng)\s+/iu, '');
const moTaHopDong = (c, h) => `${c.can(h.ten, 'tên hợp đồng')} số ${c.can(h.so, 'số công chứng')} do VPCC ${c.can(tenVpcc(h.vpcc), 'tên văn phòng công chứng')} công chứng ngày ${c.can(ngay(h.ngay_cong_chung), 'ngày công chứng')}`;

/** Việc mà một văn bản thực hiện. Hồ sơ thừa kế rồi tặng cho có hai văn bản, mỗi văn bản
 *  một việc; hồ sơ một văn bản thì lấy theo giao_dich. */
function viecCua(c, h) {
  if (c.hopDong.length > 1) {
    const g = boDau(h.ten);
    if (/tang cho/.test(g)) return 'tặng cho';
    if (/chuyen nhuong/.test(g)) return 'chuyển nhượng';
    if (/di san|thua ke/.test(g)) return 'thừa kế';
    if (/tai san chung/.test(g)) return 'phân chia';
  }
  return tenViec(c.giaoDich);
}
R('cau_lap_van_ban_can_cu', TACH, (c) => {
  if (!c.hopDong.length) return undefined;
  return c.hopDong.map((h) => {
    const nhan = thuaCuaHopDong(c, h).map((t) => `${c.dsTen(t.chu)} thửa đất số ${t.so}, diện tích ${dt(t.dien_tich)} m² ${mucDichThua(t)}`);
    const cho = nhan.length ? c.noi(nhan) : c.dsTen(h.ben_nhan);
    // "Ông" viết hoa sau "Ngày …," — cả hai bản đã ký đều viết vậy, giữ đúng lối Chi nhánh.
    return `- Ngày ${ngay(h.ngay_lap || h.ngay_cong_chung)}, ${hoaDau(c.dsTen(h.ben_chuyen || c.chuCu))} đã lập ${moTaHopDong(c, h)} để thực hiện việc ${viecCua(c, h)} quyền sử dụng đất cho ${cho}.`;
  });
});
// Giao dịch cấp đổi: chuyển cả thửa nên không nhắc lại thửa — câu nguồn gốc ngay trên đã nêu
// (bản đã ký lặp lại nguyên câu "Thửa đất số 468, tờ bản đồ số 30, diện tích 80.0 m² đất ở.").
R('cau_lap_van_ban_can_cu', ['giao-dich-cap-doi'], (c) => {
  if (!c.hopDong.length) return undefined;
  return c.hopDong.map((h) => `- Ngày ${ngay(h.ngay_lap || h.ngay_cong_chung)}, ${hoaDau(c.dsTen(h.ben_chuyen || c.chuCu))} đã lập ${moTaHopDong(c, h)} để thực hiện việc ${viecCua(c, h)} quyền sử dụng đất cho ${c.dsTen(h.ben_nhan)}.`);
});
R('cau_noi_dung_bien_dong', TACH, (c) => {
  const ds = c.thuaMoi.filter((t) => t.theo && c.hd(t.theo));
  if (!ds.length) return undefined;
  return ds.map((t) => `Thửa đất số ${t.so}, diện tích ${dt(t.dien_tich)} m² ${mucDichThua(t)} thuộc quyền sử dụng của ${c.moTaNhieu(t.chu)} theo ${moTaHopDong(c, { ma: t.theo, ...c.hd(t.theo) })}.`);
});
R('cau_noi_dung_bien_dong', ['giao-dich-trang-4', 'giao-dich-cap-doi'], (c) => {
  if (!c.hopDong.length) return undefined;
  // Bản đã ký: "Tặng cho ông …", "Chuyển nhượng cho bà …" — việc đã kết bằng "cho" thì không
  // thêm "cho" nữa (trước 15/09/2026 ra "Tặng cho cho ông …" ở mọi hồ sơ tặng cho).
  return c.hopDong.map((h) => {
    const viec = hoaDau(viecCua(c, h));
    return `${viec}${/\bcho$/u.test(viec) ? '' : ' cho'} ${c.moTaNhieu(h.ben_nhan)} theo ${moTaHopDong(c, h)}.`;
  });
});
R('cau_dien_tich_con_lai', TACH, (c) => {
  if (!c.thuaMoi.length) return undefined;
  const conLai = c.thuaMoi.filter((t) => !t.theo);
  if (!conLai.length) return false;
  return conLai.map((t) => `Diện tích còn lại là thửa đất số ${t.so}, diện tích ${dt(t.dien_tich)} m² ${mucDichThua(t)}.`);
});
R('van_ban_can_cu_mo_ta', ['giao-dich-trang-4'], (c) => (c.hopDong[0] ? moTaHopDong(c, c.hopDong[0]) : undefined));
R('van_ban_can_cu_ngay', ['giao-dich-trang-4'], (c) => (c.hopDong[0] ? ngay(c.hopDong[0].ngay_lap || c.hopDong[0].ngay_cong_chung) : undefined));
// Bản đã ký: "để thực hiện việc chuyển nhượng cho ông …" nhưng "để thực hiện việc tặng cho QSD
// đất cho ông …" — việc kết bằng "cho" thì chèn "QSD đất", tránh "tặng cho cho".
R('cau_muc_dich_giao_dich', ['giao-dich-trang-4'], (c) => {
  if (!c.hopDong[0]) return undefined;
  const g = c.giaoDich;
  return `để thực hiện việc ${g}${/\bcho$/u.test(g) ? ' QSD đất' : ''} cho ${c.dsTen(c.hopDong[0].ben_nhan)}`;
});
R('cau_ket_luan_dieu_kien', ['giao-dich-trang-4'], (c) => (c.giaoDich ? `do nhận ${c.giaoDich} là đủ điều kiện` : undefined));
R('cau_ket_luan_dieu_kien', ['giao-dich-cap-doi', 'tach-thua-phat-sinh-chu'], (c) => (c.giaoDich ? `nhận ${c.giaoDich} là đủ điều kiện giải quyết` : undefined));

/* ---- thu hồi, cấp GCN mới ---- */
const seriMoi = (c, t) => (coChu(t.seri_gcn) ? seri(t.seri_gcn) : c.can('', 'seri GCN'));
R('cau_thu_hoi_cap_moi', TACH, (c) => {
  if (!c.thuaMoi.length) return undefined;
  const cap = c.thuaMoi.filter((t) => t.cap_gcn !== false).map((t) => `${seriMoi(c, t)} cho ${c.dsTen(t.chu)}`);
  return `Thu hồi Giấy chứng nhận này, cấp giấy chứng nhận số ${cap.join('; ')} theo quy định${c.kieu.dongNgoacThuHoi ? '”' : ''}.`;
});

/** Các dòng ghi chú in trên GCN mới của thửa t — suy ra được từ GCN cũ, không cần tờ GCN mới.
 *  Dòng tài sản riêng chỉ in trên GCN của đúng người có tài sản riêng. */
function ghiChuTach(c, t) {
  const dong = [];
  if (c.vlap) dong.push('Ghi chú: + Số tờ bản đồ, số thửa đất được xác định theo bản đồ Vlap');
  dong.push(`${c.vlap ? '' : 'Ghi chú: '}+ Thửa đất này được tách ra từ thửa đất số ${c.soHienTai}, tờ bản đồ số ${c.toHienTai} tại Giấy chứng nhận số ${c.soGcnCu()} do ${c.can(c.gc.co_quan_cap, 'cơ quan cấp GCN cũ')} cấp ngày ${c.can(ngay(c.gc.ngay_cap), 'ngày cấp GCN cũ')}.`);
  if (c.tc.xa_cu) dong.push(`+ Thửa đất thuộc ${c.tc.xa_cu} (cũ).`);
  for (const cau of cauTaiSanRieng(c, t.chu)) dong.push(`+ ${cau}`);
  return dong;
}
R('cau_danh_sach_gcn_cap_chi_tiet', TACH, (c) => {
  const ds = c.thuaMoi.filter((t) => t.cap_gcn !== false);
  if (!ds.length) return undefined;
  return ds.flatMap((t, i) => [
    `2.${i + 1} ${hoaDau(c.dsTen(t.chu))} số seri GCN ${seriMoi(c, t)} nội dung:`,
    `+ Thửa đất số ${t.so}, diện tích ${dt(t.dien_tich)} m² ${mucDichThua(t)}.`,
    ...ghiChuTach(c, t),
  ]);
});
/* Thông báo gửi UBND xã: xã cập nhật hồ sơ địa chính theo danh sách này nên mỗi người
 * được cấp phải kèm ngày tháng năm sinh (yêu cầu của Chi nhánh, 14/09/2026). */
R('cau_danh_sach_gcn_cap', TACH, (c) => {
  const ds = c.thuaMoi.filter((t) => t.cap_gcn !== false);
  if (!ds.length) return undefined;
  return ds.flatMap((t, i) => [
    `${i + 1}. ${hoaDau(c.noi([].concat(t.chu).map((m) => `${c.ten(m)}, ${c.sinhDayDu(c.nguoi(m))}`)))}, số seri GCN ${seriMoi(c, t)} nội dung:`,
    `+ Thửa đất số ${t.so}, diện tích ${dt(t.dien_tich)} m² ${mucDichThua(t)}.`,
    ...ghiChuTach(c, t),
  ]);
});
R('gcn_moi_so', '*', (c) => {
  if (coChu(c.dk.gcn_moi_so)) return seri(c.dk.gcn_moi_so);
  const co = c.thuaMoi.filter((t) => coChu(t.seri_gcn));
  return co.length === 1 && c.thuaMoi.length === 1 ? seri(co[0].seri_gcn) : undefined;
});
R('cau_seri_gcn_moi', ['tach-thua-khong-doi-chu'], (c) => {
  const ds = c.thuaMoi.filter((t) => t.cap_gcn !== false);
  if (!ds.length || !ds.every((t) => coChu(t.seri_gcn))) return undefined;
  return ds.length === 1 ? `số seri ${seri(ds[0].seri_gcn)}` : `từ số seri ${seri(ds[0].seri_gcn)} đến số seri ${seri(ds[ds.length - 1].seri_gcn)}`;
});
R('cau_ghi_chu_thua_thuoc', '*', (c) => {
  if (!c.tc.xa_cu) return undefined;
  // Mẫu cấp đổi do đo đạc lại ghi kèm số thửa, số tờ cũ; các mẫu khác chỉ ghi xã cũ.
  if (c.tenBoMau === 'cap-doi-gcn' && (c.tc.so_moi || c.tc.to_moi)) return `+ Bản đồ cũ: Thửa ${c.tc.so}, tờ ${c.tc.to} thuộc ${c.tc.xa_cu} (cũ).`;
  return `+ Thửa đất thuộc ${c.tc.xa_cu} (cũ).`;
});
R('cau_ghi_chu_cap_doi_tu', ['giao-dich-cap-doi', 'cap-doi-gcn'], (c) => (c.gc.so.length && c.gc.co_quan_cap
  ? `+ Giấy chứng nhận này được cấp đổi từ Giấy chứng nhận số ${c.soGcnCu()} do ${c.gc.co_quan_cap} cấp ngày ${ngay(c.gc.ngay_cap)}.`
  : undefined));

/* ---- Tài sản riêng: "Là tài sản riêng của ông … theo Văn bản cam đoan tài sản riêng số …" ----
 * Có khi in ngay dưới tên chủ trên GCN, có khi là một văn bản riêng trong bộ hồ sơ; GCN mới
 * của chính người đó mang lại dòng này. Chi nhánh ghi nó ở CUỐI phần Ghi chú của mục cấp GCN
 * trong Báo cáo và Thông báo (bộ tách thửa không đổi chủ do cán bộ hoàn thiện, 17/09/2026).
 * Mẫu trang 4 không cấp GCN mới: ghi ngay sau nội dung biến động, không có "+" (bản đã ký). */

/** Những người đứng tên GCN sau thủ tục: bên nhận của văn bản sau cùng khi chuyển cả thửa,
 *  người đứng tên các thửa mới khi tách/hợp/cấp đổi; không rõ thì chủ GCN cũ. */
function nguoiSauThuTuc(c) {
  if (CHUYEN_CA_THUA.includes(c.tenBoMau)) {
    const nhan = c.hopDong.filter((h) => [].concat(h.ben_nhan || []).length);
    if (nhan.length) return [].concat(nhan[nhan.length - 1].ben_nhan);
  }
  const chu = [...new Set(c.thuaMoi.filter((t) => t.cap_gcn !== false).flatMap((t) => [].concat(t.chu || [])))];
  return chu.length ? chu : c.chuCu;
}

/** Câu tài sản riêng của những văn bản nói về ít nhất một người trong dsMa. Văn bản chưa ghi
 *  "chu": dòng in trên GCN cũ nói về chủ GCN cũ; hồ sơ chuyển cả thửa thì về người nhận (bản
 *  trang 4 đã ký — trước 17/09/2026 mặc định nhầm là bên chuyển). Không rõ ai thì vẫn in, tên
 *  để «CẦN ĐIỀN». */
function cauTaiSanRieng(c, dsMa) {
  const co = new Set([].concat(dsMa || []));
  return [].concat(c.dk.tai_san_rieng || [])
    .filter((v) => v && (coChu(v.so) || coChu(v.ten)))
    .map((v) => {
      const ghi = [].concat(v.chu || []).filter(coChu);
      const macDinh = CHUYEN_CA_THUA.includes(c.tenBoMau) || !c.chuCu.length ? nguoiSauThuTuc(c) : c.chuCu;
      return { v, chu: ghi.length ? ghi : macDinh };
    })
    .filter((x) => !x.chu.length || x.chu.some((m) => co.has(m)))
    .map((x) => `Là tài sản riêng của ${x.chu.length ? c.dsTen(x.chu) : c.can('', 'người có tài sản riêng')} theo ${moTaHopDong(c, { ...x.v, ten: x.v.ten || 'Văn bản xác định tài sản riêng' })}.`);
}
// Người đứng tên GCN không có văn bản nào → false: đoạn có điều kiện tự biến mất.
R('cau_ghi_chu_tai_san_rieng', ['tach-thua-khong-doi-chu', 'hop-thua', 'giao-dich-cap-doi', 'cap-doi-gcn'], (c) => {
  const ds = cauTaiSanRieng(c, nguoiSauThuTuc(c));
  return ds.length ? ds.map((x) => `+ ${x}`) : false;
});
// Trang 4: sau nội dung biến động. Thông báo cấp đổi GCN (không có phần Ghi chú): sau câu cấp đổi.
R('cau_tai_san_rieng', ['giao-dich-trang-4', 'cap-doi-gcn'], (c) => {
  const ds = cauTaiSanRieng(c, nguoiSauThuTuc(c));
  return ds.length ? ds : false;
});

/* ---- Hợp thửa: nhiều thửa gốc, mỗi thửa một GCN (du_kien.thua_goc) ---- */
const HOP = ['hop-thua'];
const thuaGoc = (c) => (c.dk.thua_goc || []).filter((g) => g && coChu(g.so));
// Trích yếu và câu "Hợp thửa đất …" xếp thửa tăng dần; ghi chú và thu hồi đi theo thứ tự GCN — như bản đã ký.
const thuaGocTang = (c) => [...thuaGoc(c)].sort((x, y) => (parseInt(x.so, 10) || 0) - (parseInt(y.so, 10) || 0));
const gcnGoc = (c, g) => `${seri(g.gcn_so)} do ${c.can(g.gcn_co_quan_cap, 'cơ quan cấp GCN cũ')} cấp ngày ${c.can(ngay(g.gcn_ngay_cap), 'ngày cấp GCN cũ')}`;
R('gcn_cu_so', HOP, (c) => (thuaGoc(c).length ? thuaGoc(c).map((g) => seri(g.gcn_so)).join('; ') : undefined));
R('thua_cu_so_to', HOP, (c) => {
  const ds = thuaGocTang(c);
  if (!ds.length) return undefined;
  const cungTo = ds.every((g) => g.to === ds[0].to);
  return cungTo ? `thửa đất số ${ds.map((g) => g.so).join(', ')}, tờ bản đồ ${ds[0].to}` : c.noi(ds.map((g) => `thửa đất số ${g.so}, tờ bản đồ ${g.to}`));
});
R('dia_chi_cu', HOP, (c) => { const g = thuaGoc(c)[0]; return g && g.dia_chi ? boThon(g.dia_chi) : (c.tc.dia_chi ? boThon(c.tc.dia_chi) : undefined); });
R('cau_nguon_goc_cac_thua', HOP, (c) => {
  const ds = thuaGoc(c);
  if (!ds.length) return undefined;
  const xa = c.tc.xa_hien_nay;
  return ds.flatMap((g) => {
    const dc = g.dia_chi || c.tc.dia_chi || '';
    const nay = xa && dc && !boDau(dc).includes(boDau(xa)) ? ` (nay là ${xa}, thành phố Hà Nội)` : '';
    return [
      `* ${g.gcn_ten_loai || 'Giấy chứng nhận quyền sử dụng đất'} số ${gcnGoc(c, g)}.`,
      `- Địa chỉ: Thửa đất số ${g.so}, tờ bản đồ số ${g.to}, diện tích ${dt(g.dien_tich)} m², địa chỉ thửa đất: ${c.can(dc, 'địa chỉ thửa gốc')}${nay}.`,
      `- Mục đích sử dụng: ${nhieuLoai(g.muc_dich) ? chuoiNhieuLoai(g.muc_dich) : mucDichThuong(g.muc_dich)}`,
      `- Thời hạn sử dụng: ${c.can(g.thoi_han, 'thời hạn sử dụng thửa gốc')}`,
    ];
  });
});
// "Hợp thửa đất {{ô}} thành …": câu ghép viết đủ "thửa đất số …", phần "thửa đất " trùng chữ mẫu được gọt.
R('cau_cac_thua_dem_hop', HOP, (c) => (thuaGoc(c).length
  ? c.noi(thuaGocTang(c).map((g) => `thửa đất số ${g.so}, tờ bản đồ ${g.to}, diện tích ${dt(g.dien_tich)} m² ${mucDichThua(g)}`)) : undefined));
R('cau_thua_sau_hop', HOP, (c) => { const t = c.thuaMoi[0]; return t ? `thửa đất số ${t.so}, tờ bản đồ số ${t.to || (thuaGoc(c)[0] || {}).to}, diện tích ${dt(t.dien_tich)} m² ${mucDichThua(t)}` : undefined; });
R('thua_moi_so_to', HOP, (c) => { const t = c.thuaMoi[0]; return t ? `Thửa đất số ${t.so}, tờ bản đồ số ${t.to || (thuaGoc(c)[0] || {}).to}` : undefined; });
R('thua_moi_mo_ta', HOP, (c) => { const t = c.thuaMoi[0]; return t ? `Thửa đất: ${t.so}; tờ bản đồ số: ${t.to || (thuaGoc(c)[0] || {}).to}` : undefined; });
R('thua_moi_dien_tich', HOP, (c) => { const t = c.thuaMoi[0]; return t && coChu(t.dien_tich) ? `${dt(t.dien_tich)} m²` : undefined; });
R('muc_dich_su_dung', HOP, (c) => { const t = c.thuaMoi[0]; return t && t.muc_dich ? (nhieuLoai(t.muc_dich) ? chuoiNhieuLoai(t.muc_dich) : doiDonViM2(t.muc_dich)) : undefined; });
R('thoi_han_su_dung', HOP, (c) => { const t = c.thuaMoi[0]; return t && t.thoi_han ? t.thoi_han : undefined; });
R('hinh_thuc_su_dung', HOP, (c) => { const t = c.thuaMoi[0]; return t ? t.hinh_thuc || ([].concat(t.chu || []).length > 1 ? 'Sử dụng chung' : 'Sử dụng riêng') : undefined; });
R('cau_ghi_chu_hop_tu', HOP, (c) => (thuaGoc(c).length
  ? `+ Thửa đất này được hợp từ ${thuaGoc(c).map((g) => `thửa đất số ${g.so}, tờ số ${g.to} tại Giấy chứng nhận số ${gcnGoc(c, g)}`).join(' và ')}` : undefined));
R('cau_gcn_cu_thu_hoi', HOP, (c) => (thuaGoc(c).length ? thuaGoc(c).map((g) => gcnGoc(c, g)).join(' và ') : undefined));
R('dien_tich_thua', ['cap-doi-gcn'], (c) => { const t = c.thuaMoi[0]; return t && coChu(t.dien_tich) ? dt(t.dien_tich) : undefined; });

/* ---- Vlap: ghi chú trên GCN cũ nói số tờ, số thửa xác định theo Vlap thì chính là chúng ---- */
const vlap = (c) => (c.vlap && c.gc.ghi_chu_vlap === true && c.tc.so ? `Thửa đất số ${c.soHienTai}, tờ bản đồ số ${c.toHienTai};` : undefined);
R('thua_vlap_so_to', TACH, vlap);
R('thua_vlap_mo_ta', TACH, vlap);

/* ---- Phiếu chuyển: tách thửa tặng cho/chuyển nhượng mỗi thửa nhận một phiếu, phân chia chung mỗi người một phiếu ---- */

/** Mục 3.1.6 luôn ghi diện tích từng loại đất (yêu cầu Chi nhánh 15/09/2026, theo bộ văn bản
 *  được nghiệm thu 95%): "đất ở tại nông thôn: 100.0 m²; đất trồng cây lâu năm: 668.7 m²";
 *  một loại đất thì "đất ở tại nông thôn: 80.0 m²" — bản ký cũ chỉ ghi "đất ở", nay ghi đủ. */
function mucDichPhieu(c, t) {
  if (nhieuLoai(t.muc_dich)) return chuoiNhieuLoai(t.muc_dich);
  const md = mucDichThuong(t.muc_dich);
  return md ? `${md}: ${c.can(dt(t.dien_tich), 'diện tích thửa')} m²` : undefined;
}

/** Mục VI — giấy tờ kèm theo, ghi như phiếu đã ký: đủ tên các văn bản mà người này nhận đất
 *  theo đó, rồi "giấy tờ miễn giảm" nếu được miễn, rồi "các loại tờ khai", ngăn bằng "; ".
 *    tặng cho          → Hợp đồng tặng cho quyền sử dụng đất; giấy tờ miễn giảm; các loại tờ khai.
 *    thừa kế, tặng cho → Văn bản phân chia di sản …; hợp đồng tặng cho …; giấy tờ miễn giảm; các loại tờ khai.
 *    chuyển nhượng     → Hợp đồng chuyển nhượng quyền sử dụng đất; các loại tờ khai. */
function giayToKemTheo(dsVanBan, mienGiam) {
  const ten = [...new Set(dsVanBan.map((h) => String(h.ten || '').trim()).filter(Boolean))];
  const muc = [...ten, ...(mienGiam ? ['giấy tờ miễn giảm'] : []), 'các loại tờ khai'];
  return `${muc.map((x, i) => (i ? x.charAt(0).toLowerCase() + x.slice(1) : hoaDau(x))).join('; ')}.`;
}

/** Tặng cho, thừa kế, phân chia không có giá: ghi 0 như phiếu đã ký. Chuyển nhượng phải có giá
 *  của hợp đồng — không có thì để «CẦN ĐIỀN». */
const KHONG_GIA = /tang cho|thua ke|phan chia/;

/** Một phiếu chuyển. dsMa = những người đứng tên phiếu (thường một; vợ chồng cùng nhận thì
 *  hai); dsVanBan = các văn bản mà họ nhận đất theo đó. */
function phieuChuyen(c, t, dsMa, dsVanBan) {
  const chu = [].concat(t.chu || dsMa);
  const pc = {
    // Tên file "PC <tên>.docx": phiếu chung của nhiều người mang đủ tên, ngăn bằng dấu phẩy như
    // tên thư mục hồ sơ — chỉ ghi người đầu thì nhìn thư mục tưởng thiếu phiếu của người sau.
    hau_to: [].concat(dsMa).map((m) => c.nguoi(m).ho_ten).filter(Boolean).join(', '),
    ben_nhan_mo_ta_day_du: hoaDau(c.moTaNhieu(dsMa)),
    // Bản đã ký ghi số hiệu tạm trên bản vẽ kèm số thửa mới: "197-1 (thửa mới 454)".
    thua_cu_so: coChu(t.so_tam) && String(t.so_tam).trim() !== String(t.so).trim() ? `${t.so_tam} (thửa mới ${t.so})` : t.so,
    dien_tich_thua: dt(t.dien_tich),
    dien_tich_su_dung_rieng: dt(t.dien_tich),
    dien_tich_su_dung_chung: coChu(t.dien_tich_chung) ? dt(t.dien_tich_chung) : '0',
    muc_dich_su_dung_pc: mucDichPhieu(c, t),
    // Hình thức của THỬA MỚI mà người này nhận, không phải của thửa gốc.
    hinh_thuc_su_dung: t.hinh_thuc || (chu.length > 1 ? 'Sử dụng chung' : 'Sử dụng riêng'),
    so_dien_thoai: [].concat(dsMa).map((m) => String(c.nguoi(m).dien_thoai || '').trim()).find(Boolean) || '',
  };
  if (dsVanBan.length) {
    const gia = dsVanBan.find((h) => coChu(h.gia_tri));
    if (gia) pc.gia_tri_theo_hop_dong = String(gia.gia_tri).trim();
    else if (KHONG_GIA.test(boDau(c.giaoDich))) pc.gia_tri_theo_hop_dong = '0';
    // Miễn giảm nằm ở văn bản tặng cho, không nhất thiết là văn bản đầu (thừa kế rồi tặng cho).
    const mien = dsVanBan.find((h) => coChu(h.mien_giam));
    pc.doi_tuong_mien_giam = mien ? String(mien.mien_giam).trim() : false;
    pc.giay_to_kem_theo = giayToKemTheo(dsVanBan, !!mien);
  }
  return pc;
}
/** Các văn bản mà người "ma" (một mã hoặc mảng mã) nhận thửa t theo: văn bản ghi ở "theo", cộng
 *  mọi văn bản khác có người đó trong ben_nhan (thừa kế rồi tặng cho: văn bản phân chia di sản +
 *  hợp đồng tặng cho). Giữ thứ tự khai trong du_kien — thường là thứ tự thời gian, văn bản di
 *  sản đứng trước. */
const vanBanCuaNguoi = (c, t, ma) => {
  const ds = [].concat(ma);
  return c.hopDong.filter((h) => h.ma === t.theo || [].concat(h.ben_nhan || []).some((m) => ds.includes(m)));
};
R('cac_ben_nhan', TACH, (c) => {
  const ds = [];
  for (const t of c.thuaMoi) {
    // Người không nhận gì qua hợp đồng (chủ cũ giữ phần còn lại) thì không có nghĩa vụ
    // thuế từ giao dịch này — không lập phiếu. Phân chia tài sản chung thì ai cũng nhận.
    if (!t.theo || !c.hd(t.theo)) continue;
    const chu = [].concat(t.chu || []);
    if (c.tenBoMau === 'tach-thua-phat-sinh-chu') {
      // Những người CÙNG NHẬN một thửa theo cùng hợp đồng (vợ chồng, nhiều người đồng nhận)
      // kê khai lệ phí trước bạ, thuế TNCN chung một tờ khai, mỗi người một dòng tỷ lệ — nên
      // chung MỘT phiếu (hồ sơ chuyển nhượng cho vợ chồng, 09/2026; trước đó mỗi người một
      // phiếu). Hai người mua hai thửa thì vẫn hai phiếu, như PC 550/551 đã ký.
      if (chu.length) ds.push(phieuChuyen(c, t, chu, vanBanCuaNguoi(c, t, chu)));
    } else {
      // Phân chia tài sản chung: mỗi đồng sở hữu nhận phần tách bạch của mình, dù chung một văn
      // bản — mỗi người một phiếu như cũ (Chi nhánh yêu cầu giữ, 09/2026).
      for (const ma of chu) ds.push(phieuChuyen(c, t, ma, vanBanCuaNguoi(c, t, ma)));
    }
  }
  return ds.length ? ds : undefined;
});
/* Mẫu có MỘT phiếu chuyển: các ô của phiếu nằm thẳng ở ngoài. Mọi văn bản của hồ sơ đều
 * dẫn tới lần nhận này (thừa kế rồi tặng cho), nên mục VI kể đủ; vợ chồng cùng nhận thì mục
 * 2.1 ghi cả hai, như phiếu đã ký. */
const phieuDon = (c) => {
  const nhan = c.hopDong.filter((h) => [].concat(h.ben_nhan || []).length);
  const h = nhan[nhan.length - 1];                       // văn bản sau cùng: người thật sự nhận đất
  if (!h) return null;
  const t = c.thuaMoi.find((x) => x.theo === h.ma) || { so: c.tc.so, dien_tich: c.tc.dien_tich, muc_dich: c.tc.muc_dich };
  return phieuChuyen(c, t, [].concat(h.ben_nhan), c.hopDong);
};
for (const k of ['ben_nhan_mo_ta_day_du', 'dien_tich_thua', 'dien_tich_su_dung_rieng', 'dien_tich_su_dung_chung',
  'muc_dich_su_dung_pc', 'hinh_thuc_su_dung', 'gia_tri_theo_hop_dong', 'doi_tuong_mien_giam', 'giay_to_kem_theo', 'so_dien_thoai']) {
  R(k, ['giao-dich-trang-4', 'giao-dich-cap-doi'], (c) => { const pc = phieuDon(c); return pc && pc[k] !== '' ? pc[k] : undefined; });
}
R('dia_chi_thua_cu_va_moi', CO_PC, (c) => {
  if (!c.tc.dia_chi) return undefined;
  const xa = c.tc.xa_hien_nay;
  // Địa chỉ cũ: không có tên xã hiện nay, hoặc còn "huyện" — cấp huyện đã bỏ từ 07/2025, xã
  // mới có khi trùng tên một xã cũ ("xã Phú Cát, huyện Quốc Oai, tỉnh Hà Tây").
  const doi = xa && (!boDau(c.tc.dia_chi).includes(boDau(xa)) || /\bhuyen\b/.test(boDau(c.tc.dia_chi)));
  return `${chuanTP(c.tc.dia_chi).replace(/\.$/, '')}${doi ? ` (nay là ${xa}, thành phố Hà Nội)` : ''}.`;
});
R('giay_to_qsd_mo_ta', CO_PC, (c) => (c.gc.so.length ? `Giấy chứng nhận số ${c.soGcnCu()} do ${c.can(c.gc.co_quan_cap, 'cơ quan cấp GCN cũ')} cấp ngày ${c.can(ngay(c.gc.ngay_cap), 'ngày cấp GCN cũ')}.` : undefined));
// Bản đã ký: "Nhận chuyển nhượng quyền sử dụng đất" / "Nhận phân chia QSD đất.".
R('nguon_goc_su_dung_dat', CO_PC, (c) => (c.giaoDich ? `Nhận ${tenViec(c.giaoDich)} quyền sử dụng đất` : undefined));
R('loai_thu_tuc_thue', CO_PC, (c) => (c.giaoDich ? `Nhận ${tenViec(c.giaoDich)} QSD đất` : undefined));

/* ------------------------------------------------------------------ ghép ---- */

/** Các ô của một Phiếu chuyển mà phieuChuyen() lập cho từng người nhận. */
const KHOA_PC = ['hau_to', 'ben_nhan_mo_ta_day_du', 'thua_cu_so', 'dien_tich_thua', 'dien_tich_su_dung_rieng',
  'dien_tich_su_dung_chung', 'muc_dich_su_dung_pc', 'hinh_thuc_su_dung', 'so_dien_thoai',
  'gia_tri_theo_hop_dong', 'doi_tuong_mien_giam', 'giay_to_kem_theo'];

/** Danh sách ô mà bộ mẫu này ghép được — để lam_ngay.js bỏ chúng khỏi khung điền tay.
 *  Mẫu lập nhiều Phiếu chuyển (cac_ben_nhan) thì các ô của phiếu cũng là ô ghép. */
function bienGhepDuoc(tenBoMau) {
  const ds = new Set(CONG_THUC.filter((r) => r.apDung === '*' || r.apDung.includes(tenBoMau)).map((r) => r.bien));
  if (ds.has('cac_ben_nhan')) for (const k of KHOA_PC) ds.add(k);
  return [...ds];
}

/**
 * Ghép mọi ô ghép được cho một hồ sơ. Trả { giaTri, thieu }:
 *   giaTri — { tên ô: chuỗi | mảng | false }, chỉ những ô đủ dữ kiện;
 *   thieu  — mô tả từng chỗ đã đánh «CẦN ĐIỀN» ngay trong câu (vd. seri GCN chưa in).
 */
function ghepCau(hoSo, tenBoMau) {
  if (!hoSo || !hoSo.du_kien) return { giaTri: {}, thieu: [] };
  const c = taoNguCanh(chuanDuKien(hoSo.du_kien, tenBoMau), tenBoMau);
  const giaTri = {};
  for (const r of CONG_THUC) {
    if (r.apDung !== '*' && !r.apDung.includes(tenBoMau)) continue;
    if (r.bien in giaTri) continue;                 // công thức riêng của mẫu đứng trước
    const v = r.fn(c);
    if (v !== undefined) giaTri[r.bien] = v;
  }
  return { giaTri, thieu: [...new Set(c.thieu)] };
}

/**
 * Trộn câu ghép vào hồ sơ. Câu ghép THẮNG giá trị viết tay, trừ các ô liệt kê trong
 * giu_viet_tay — lý do nằm ở đầu file: chữ viết tay chính là thứ đã hỏng.
 * Trả { hoSo (bản mới), daThay: [ô có chữ viết tay bị thay], daGhep: [ô đã ghép] }.
 */
function tronVaoHoSo(hoSo, tenBoMau) {
  const { giaTri, thieu } = ghepCau(hoSo, tenBoMau);
  const giu = new Set([].concat(hoSo.giu_viet_tay || []));
  const moi = { ...hoSo };
  const daThay = [];
  const daGhep = [];
  for (const [k, v] of Object.entries(giaTri)) {
    if (giu.has(k)) continue;
    const cu = hoSo[k];
    const coCu = Array.isArray(cu) ? cu.length > 0 : coChu(cu);
    // Tên người hồ sơ đặt tên thư mục kết quả — đã có thì giữ, để lượt chạy lại không
    // sinh ra một thư mục mới tên khác bên cạnh thư mục cũ.
    if (k === 'ten_nguoi_ho_so' && coCu) continue;
    // "Không áp dụng" suy từ chỗ du_kien KHÔNG nhắc tới (không có văn bản tài sản riêng, không
    // có thành viên hộ) thì không được xoá một câu đã viết sẵn: im lặng của du_kien chưa phải
    // bằng chứng. Chỉ câu ghép thật mới thay chữ viết tay.
    if (v === false && coCu) continue;
    if (coCu && JSON.stringify(cu) !== JSON.stringify(v)) daThay.push(k);
    moi[k] = v;
    daGhep.push(k);
  }
  return { hoSo: moi, daThay, daGhep, thieu };
}

/** Khung du_kien trống cho Claude điền — in bởi lam_ngay.js ở lượt 1. Có tên bộ mẫu thì
 *  khung chỉ gồm những mục mẫu đó dùng, kèm lời dặn đúng trường hợp của mẫu: khung chung cho
 *  mọi mẫu từng dặn "chủ cũ giữ lại thì để rỗng" cho cả hồ sơ phân chia tài sản chung, nơi
 *  người nhận thửa lại chính là chủ cũ. Không có tên bộ mẫu (--khung) thì in đủ mọi mục. */
function khungDuKien(tenBoMau) {
  const k = khungDayDu();
  if (!tenBoMau) return k;
  const co = (ds) => ds.includes(tenBoMau);
  const TACH_HOP = [...TACH, 'tach-thua-khong-doi-chu', 'hop-thua'];
  if (!co(CO_PC)) { delete k.hop_dong; delete k._hop_dong; delete k.giao_dich; delete k._giao_dich; }
  if (!co(['hop-thua'])) { delete k.thua_goc; delete k._thua_goc; }
  if (!co(['cap-doi-gcn'])) {
    delete k.thanh_vien_ho; delete k._thanh_vien_ho;
    delete k.gcn_cu.cap_cho_ho; delete k.thua_cu.ky_hieu_cu;
    for (const x of ['don_vi_do', 'dien_tich_vlap', 'ly_do_chenh_lech']) delete k.ban_ve[x];
  }
  if (!co(['tach-thua-khong-doi-chu'])) delete k.gcn_cu.so_vao_so;
  if (!co(['tach-thua-khong-doi-chu', 'hop-thua', 'cap-doi-gcn'])) delete k.ban_ve.ngay_lap;
  if (!co(TACH)) { delete k.ban_ve.ngay_xac_nhan; delete k.ban_ve.co_quan; }
  if (!Object.keys(k.ban_ve).length) { delete k.ban_ve; delete k._ban_ve; }
  // Giao dịch trang 4 / cấp đổi chuyển cả thửa: không có thửa mới, thửa ghi ở thua_cu.
  if (!co([...TACH_HOP, 'cap-doi-gcn'])) { delete k.thua_moi; delete k._thua_moi; }
  // Giao dịch cấp đổi cấp GCN mới mà không có thua_moi để ghi seri: chỗ ghi riêng.
  if (co(['giao-dich-cap-doi'])) {
    k.gcn_moi_so = '';
    k._gcn_moi_so = 'số seri trên TỜ GCN MỚI nếu hồ sơ đã có tờ đó — thường là CHƯA có, để rỗng; không bao giờ lấy số GCN cũ.';
  }
  const dan = {
    'tach-thua-phan-chia-chung': 'PHÂN CHIA TÀI SẢN CHUNG: văn bản thỏa thuận phân chia ghi vào hop_dong; mọi thửa sau tách đều "theo" văn bản đó, kể cả thửa về tay chính các chủ cũ — mỗi người một phiếu chuyển.',
    'tach-thua-phat-sinh-chu': 'TÁCH THỬA TẶNG CHO/CHUYỂN NHƯỢNG: thửa của người nhận "theo" hợp đồng của người đó; phần chủ cũ giữ lại thì "theo" để rỗng. Nhiều người CÙNG NHẬN một thửa (vợ chồng, người đồng nhận): ghi cả hai mã vào "chu" của CHÍNH thửa đó, không tách thành hai thửa — script lập chung một phiếu chuyển như tờ khai chung của họ; vợ/chồng thì người sau ghi "quan_he".',
    'tach-thua-khong-doi-chu': 'TÁCH THỬA KHÔNG ĐỔI CHỦ: mọi thửa mới chu = chủ cũ, không có "theo". Thửa làm lối đi chung ghi "cap_gcn": false và "ghi_chu": "sử dụng làm lối đi chung của các thửa …".',
    'hop-thua': 'HỢP THỬA: mỗi thửa gốc một phần tử trong thua_goc (mỗi thửa một GCN); thua_moi là MỘT thửa sau hợp (so, to, dien_tich, muc_dich, thoi_han).',
    'cap-doi-gcn': 'CẤP ĐỔI DO ĐO ĐẠC LẠI: thua_cu = thửa theo GCN cũ; thua_moi là MỘT thửa theo mảnh trích đo (so, to, dien_tich mới, muc_dich), chu = người đứng tên GCN mới.',
    'giao-dich-trang-4': 'TRANG 4: chuyển cả thửa — thửa ghi ở thua_cu, không có thua_moi. Bản đồ đã đổi số thì ghi so_moi/to_moi. Vợ chồng cùng nhận: cả hai trong ben_nhan, người sau ghi "quan_he": "vợ" (hoặc "chồng").',
    'giao-dich-cap-doi': 'GIAO DỊCH CẤP ĐỔI: chuyển cả thửa — thửa ghi ở thua_cu, không có thua_moi; số thửa, số tờ theo bản đồ mới (Vlap) ghi so_moi/to_moi. Vợ chồng cùng nhận: cả hai trong ben_nhan, người sau ghi "quan_he": "vợ" (hoặc "chồng").',
  }[tenBoMau];
  if (dan) k._rieng_mau_nay = dan;
  return k;
}

function khungDayDu() {
  return {
    _huong_dan: 'CHỈ GHI DỮ KIỆN, KHÔNG VIẾT CÂU — script tự ghép mọi câu theo lối văn của Chi nhánh. Mỗi dữ kiện ghi đúng như giấy tờ, một lần. Người và hợp đồng đặt mã ngắn tuỳ ý (vd. "son", "hd1") rồi dùng mã đó ở chỗ khác. Chưa biết thì để rỗng — chỉ đúng chỗ đó thành «CẦN ĐIỀN», phần còn lại vẫn ra đủ.',
    giao_dich: '',
    _giao_dich: 'tặng cho | chuyển nhượng | phân chia tài sản chung | thừa kế | thừa kế, tặng cho (bản scan có cả văn bản di sản lẫn hợp đồng tặng cho) — rỗng nếu thủ tục không có giao dịch',
    nguoi: {
      nguoi_1: { goi: '', ho_ten: '', ngay_sinh: '', giay_to: '', so_giay_to: '', noi_cap: '', ngay_cap: '', dia_chi: '', dien_thoai: '' },
    },
    _nguoi: 'mọi người được nêu: chủ GCN cũ, người nhận. goi = ông | bà. ngay_sinh ghi đủ ngày nếu giấy tờ có. giay_to = CCCD | Căn cước | CMND, noi_cap chép nguyên văn ở mặt sau giấy tờ (script tự rút gọn "Cục Cảnh sát quản lý hành chính về trật tự xã hội" → "Cục cảnh sát"). dia_chi = nơi thường trú ghi trên hợp đồng. quan_he = "vợ" | "chồng" khi người này cùng nhận với người đứng trước.',
    nguoi_de_nghi: [],
    _nguoi_de_nghi: 'mã những người đứng tên hồ sơ (chủ cũ + người nhận). KHÔNG ghi người được uỷ quyền nộp hộ.',
    gcn_cu: { so: '', co_quan_cap: '', ngay_cap: '', chu: [], ghi_chu_vlap: null, so_vao_so: '', cap_cho_ho: null },
    _gcn_cu: 'số seri GCN đang có (nhiều tờ thì mảng — đồng sở hữu thường mỗi người một tờ). chu = mã người đứng tên. ghi_chu_vlap = true nếu phần Ghi chú của GCN có dòng "Số tờ bản đồ, số thửa đất được xác định theo bản đồ Vlap", không có thì false. so_vao_so = "Số vào sổ cấp GCN" in ở cuối trang ghi chú (vd. "CH 02623"). cap_cho_ho = true nếu GCN cấp cho "Hộ ông/bà …". Dưới tên chủ có dòng "+ Là tài sản riêng của …" thì ghi vào tai_san_rieng.',
    thua_cu: { so: '', to: '', dien_tich: '', muc_dich: '', thoi_han: '', hinh_thuc: '', dia_chi: '', xa_hien_nay: '', xa_cu: '', so_moi: '', to_moi: '', ky_hieu_cu: '' },
    _thua_cu: 'như trên GCN cũ. muc_dich ghi bằng chữ ("Đất ở tại nông thôn"; GCN cũ in ký hiệu "T" thì ghi "Đất ở" và ky_hieu_cu = "T"); nhiều loại đất thì "Đất ở: 511.0 m²; đất trồng cây lâu năm: 639.9 m²". dia_chi chép nguyên văn. xa_hien_nay = xã/phường hiện nay (nơi nhận Thông báo), vd. "xã Kiều Phú". xa_cu = xã cũ trước sáp nhập kèm huyện, lấy ở Ghi chú của GCN ("…thuộc xã Cấn Hữu, huyện Quốc Oai, thành phố Hà Nội (cũ)" hoặc "Địa chỉ thửa đất cũ: xã Cộng Hòa, huyện Quốc Oai, TP Hà Nội") → "xã Cấn Hữu, huyện Quốc Oai, thành phố Hà Nội". so_moi/to_moi chỉ khi bản đồ đổi số.',
    ban_ve: { ngay_xac_nhan: '', co_quan: '', ngay_lap: '', don_vi_do: '', dien_tich_vlap: '', ly_do_chenh_lech: '' },
    _ban_ve: 'bản vẽ tách thửa/hợp thửa: ngay_xac_nhan, co_quan = ngày và cơ quan xác nhận bản vẽ. ngay_lap = ngày lập mảnh trích đo (chỉnh lý) địa chính. Cấp đổi do đo đạc lại: don_vi_do = đơn vị đo vẽ trích đo; dien_tich_vlap = diện tích thửa theo bản đồ Vlap nếu hồ sơ ghi; ly_do_chenh_lech = lý do diện tích đo lại khác bản đồ Vlap, chép theo đơn/biên bản.',
    thanh_vien_ho: [],
    _thanh_vien_ho: 'CHỈ CẤP ĐỔI GCN hộ gia đình: mã các thành viên có chung quyền sử dụng đất (khai trong nguoi, có số giấy tờ). Không phải hộ thì để [].',
    tai_san_rieng: { ten: '', so: '', vpcc: '', ngay_cong_chung: '', chu: [] },
    _tai_san_rieng: 'CHỈ khi đất là tài sản riêng của một người: GCN cũ có dòng "+ Là tài sản riêng của ông … theo Văn bản cam đoan tài sản riêng số … do VPCC … công chứng ngày …" (in ngay dưới tên chủ, không nằm trong mục Ghi chú), hoặc bộ hồ sơ kèm văn bản cam đoan/cam kết/xác định tài sản riêng. ten = tên văn bản đúng như giấy tờ ghi; vpcc = tên văn phòng, bỏ chữ "VPCC"; chu = mã người có tài sản riêng (người đứng tên trong câu "Là tài sản riêng của …") — có thể là chủ cũ hoặc người nhận. Hai văn bản thì ghi mảng. Script tự thêm dòng đó vào cuối Ghi chú mục cấp GCN của Báo cáo và Thông báo, trên GCN của đúng người đó. Không có thì để rỗng.',
    hop_dong: {
      hd1: { ten: '', so: '', vpcc: '', ngay_cong_chung: '', ngay_lap: '', ben_chuyen: [], ben_nhan: [], gia_tri: '', mien_giam: '' },
    },
    _hop_dong: 'mọi văn bản làm căn cứ chuyển quyền, mỗi văn bản một mục, theo thứ tự thời gian: hợp đồng tặng cho/chuyển nhượng, văn bản thỏa thuận phân chia tài sản chung, văn bản phân chia/khai nhận di sản. ten = tên văn bản đúng như tiêu đề ("Hợp đồng tặng cho quyền sử dụng đất"). so = "33566/2026/CCGD". vpcc = tên văn phòng công chứng, bỏ chữ "Văn phòng công chứng". ben_chuyen/ben_nhan = mã người (phân chia tài sản chung: cả hai bên đều là ben_chuyen và ben_nhan). gia_tri = giá ghi trong hợp đồng (tặng cho, thừa kế, phân chia: 0). mien_giam = quan hệ được miễn thuế ghi trên tờ khai ("bố tặng cho con"); không có thì để rỗng.',
    thua_goc: [],
    _thua_goc: 'CHỈ HỢP THỬA (nhiều thửa gốc, mỗi thửa một GCN): mỗi thửa gốc một phần tử {so, to, dien_tich, muc_dich, thoi_han, dia_chi, gcn_so, gcn_co_quan_cap, gcn_ngay_cap}. Hồ sơ khác để [] và ghi thửa gốc ở thua_cu.',
    thua_moi: [
      { so: '', dien_tich: '', muc_dich: '', chu: [], theo: '', seri_gcn: '' },
    ],
    _thua_moi: 'mỗi thửa sau tách/hợp một phần tử, theo thứ tự số thửa. so = số thửa như trên bản vẽ (vd. "19-1"); bản vẽ/trích đo có thêm số chính thức thì ghi "so": số chính thức, "so_tam": số trên bản vẽ. muc_dich: một loại đất thì ghi tên loại như GCN ("Đất ở tại nông thôn"); nhiều loại thì mảng [{"loai": "Đất ở tại nông thôn", "dien_tich": "100"}, …]. chu = mã người đứng tên thửa đó. theo = mã văn bản (trong hop_dong) mà người đó nhận thửa. Tách thửa tặng cho/chuyển nhượng: phần chủ cũ giữ lại thì theo để rỗng. PHÂN CHIA TÀI SẢN CHUNG: mọi thửa đều theo văn bản phân chia, kể cả thửa về tay chính các chủ cũ — mỗi người một phiếu chuyển. seri_gcn = số seri trên TỜ GCN MỚI nếu hồ sơ đã có tờ đó — thường là CHƯA có, để rỗng; không bao giờ lấy số GCN cũ. Thửa không cấp GCN (lối đi chung) thêm "cap_gcn": false.',
  };
}

module.exports = { ghepCau, tronVaoHoSo, bienGhepDuoc, khungDuKien, ngay, dt, seri };

/* -------------------------------------------------------------------- CLI ---- */

if (require.main === module) {
  const ts = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--khung') ts.khung = true;
    else if (a.startsWith('--')) ts[a.slice(2)] = process.argv[++i];
  }
  if (ts.khung) { console.log(JSON.stringify({ du_kien: khungDuKien() }, null, 2)); process.exit(0); }
  if (!ts['du-lieu']) { console.error('Cần --du-lieu ho_so.json (hoặc --khung). Xem đầu file ghep_cau.js.'); process.exit(2); }
  const hoSo = JSON.parse(fs.readFileSync(ts['du-lieu'], 'utf8'));
  const bo = ts['bo-mau'] || hoSo.bo_mau;
  if (!bo) { console.error('ho_so.json chưa ghi bo_mau — thêm --bo-mau.'); process.exit(2); }
  const { giaTri, thieu } = ghepCau(hoSo, bo);
  console.log(`Bộ mẫu "${bo}" — ghép được ${Object.keys(giaTri).length} ô:\n`);
  for (const [k, v] of Object.entries(giaTri)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
      console.log(`[${k}] ${v.length} phần tử`);
      for (const x of v) console.log(`   ${JSON.stringify(x)}`);
    } else if (Array.isArray(v)) {
      console.log(`[${k}]`);
      for (const x of v) console.log(`   ¶ ${x}`);
    } else console.log(`[${k}] ${v}`);
  }
  if (thieu.length) console.log(`\nCòn thiếu (đã để «CẦN ĐIỀN» đúng chỗ): ${thieu.join('; ')}`);
}
