#!/usr/bin/env node
/**
 * soan_cctt.js — Soạn văn bản trả lời phiếu đề nghị cung cấp thông tin (CCTT), gộp hoặc riêng.
 *
 * Phiếu CCTT là công văn một hai trang, Claude đọc thẳng file PDF rồi ghi dữ kiện vào phieu.json;
 * không cần lọc trang như lam_ngay.js. Script lo phần không được sai: chia nhóm, đếm, ghép câu,
 * chặn mẫu không đúng trường hợp.
 *
 * Dùng:
 *   node soan_cctt.js --vao "<...>\hs cctt"                       liệt kê phiếu chưa soạn
 *   node soan_cctt.js --vao "<...>\hs cctt" --mau "không có scan" --du-lieu phieu.json
 *     --rieng      mỗi phiếu một văn bản (mặc định: gộp các phiếu cùng cơ quan gửi)
 *     --soan-lai   soạn lại phiếu đã soạn, ghi đè văn bản cũ
 *     --goc-ra     thư mục kết quả (mặc định: "kết quả cctt" cạnh thư mục nguồn)
 *
 * Một phiếu trong phieu.json (mảng "phieu"): file, so_van_ban, ngay_van_ban, co_quan, so_gcn,
 * co_quan_cap, ngay_cap, nguoi_duoc_cap, dia_chi, so_thua, so_to, dien_tich, dia_chi_nay.
 * Thêm "nhom" để tự chia: các phiếu cùng giá trị nhom vào một văn bản.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const GOC = path.resolve(__dirname, '..');
// Thêm mẫu mới: thêm một dòng ở đây. truocThanhLap: mẫu chỉ đúng với GCN cấp trước ngày thành lập.
const MAU = {
  'không có scan': { file: 'cctt-khong-co-scan/Tra-loi.docx', truocThanhLap: true },
};
const CAN_CO = ['so_van_ban', 'ngay_van_ban', 'co_quan', 'so_gcn', 'co_quan_cap', 'ngay_cap', 'nguoi_duoc_cap'];

const chuanHoa = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const o = (phieu, k) => (String(phieu[k] || '').trim() || `«CẦN ĐIỀN: ${k}»`);

/** "31/3/2015" → số so sánh được; đọc không ra thì null. */
function soNgay(s) {
  const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]) : null;
}

/** Một dòng danh sách. Phiếu không nêu thửa thì bỏ cả vế thửa: văn bản vẫn đúng, không thành ô trống. */
function dongHoSo(p) {
  const thua = [
    p.so_thua && `thửa đất số ${p.so_thua}`,
    p.so_to && `tờ bản đồ số ${p.so_to}`,
    p.dien_tich && `diện tích ${p.dien_tich}\u00a0m²`,
  ].filter(Boolean).join(', ');
  return `- Giấy chứng nhận quyền sử dụng đất số ${o(p, 'so_gcn')}, do ${o(p, 'co_quan_cap')} cấp ngày ${o(p, 'ngay_cap')}`
    + ` cho ${o(p, 'nguoi_duoc_cap')}${p.dia_chi ? `, ${p.dia_chi}` : ''}${thua ? ` đối với ${thua}` : ''}`
    + `${p.dia_chi_nay ? ` (${p.dia_chi_nay})` : ''};`;
}

/** "các Văn bản số: 1/A, 2/B ngày 03/11/2026"; khác ngày thì mỗi số một ngày. */
function cacVanBan(ds) {
  if (ds.length === 1) return `Văn bản số ${o(ds[0], 'so_van_ban')} ngày ${o(ds[0], 'ngay_van_ban')}`;
  const cungNgay = new Set(ds.map((p) => p.ngay_van_ban)).size === 1;
  const so = ds.map((p) => (cungNgay ? o(p, 'so_van_ban') : `${o(p, 'so_van_ban')} ngày ${o(p, 'ngay_van_ban')}`));
  return `các Văn bản số: ${so.join(', ')}${cungNgay ? ` ngày ${o(ds[0], 'ngay_van_ban')}` : ''}`;
}

/** Mỗi nhóm một văn bản. Một văn bản chỉ có một dòng Kính gửi nên không gộp được hai cơ quan. */
function chiaNhom(dsPhieu, rieng) {
  const nhom = new Map();
  dsPhieu.forEach((p, i) => {
    const khoa = rieng ? i : (p.nhom || chuanHoa(p.co_quan));
    nhom.set(khoa, [...(nhom.get(khoa) || []), p]);
  });
  return [...nhom.values()];
}

/** Những lý do không được soạn: lệch cơ quan trong nhóm, GCN không thuộc trường hợp của mẫu. */
function loiNhom(ds, mau, ngayThanhLap) {
  const loi = [];
  if (new Set(ds.map((p) => chuanHoa(p.co_quan))).size > 1) {
    loi.push(`không gộp được phiếu của nhiều cơ quan vào một văn bản: ${ds.map((p) => p.so_van_ban).join(', ')}`);
  }
  for (const p of ds) {
    const n = soNgay(p.ngay_cap);
    if (mau.truocThanhLap && n && n >= soNgay(ngayThanhLap)) {
      loi.push(`phiếu ${p.so_van_ban}: GCN ${p.so_gcn} cấp ngày ${p.ngay_cap}, không trước ${ngayThanhLap} nên mẫu này không đúng`);
    }
  }
  return loi;
}

function duLieuVanBan(ds, cauHinh) {
  return {
    ...cauHinh,
    ten_chi_nhanh_in_hoa: cauHinh.ten_chi_nhanh.toUpperCase(),
    nam_van_ban: String(new Date().getFullYear()),
    co_quan: o(ds[0], 'co_quan'),
    cac_van_ban: cacVanBan(ds),
    so_ho_so: String(ds.length).padStart(2, '0'),
    cac_ho_so: ds.map(dongHoSo),
  };
}

/** "26 hộ ông Nguyễn Văn A - không có scan"; gộp thì "25, 26 UBND xã X - không có scan". */
function tenFile(ds, tenMau) {
  const so = ds.map((p) => String(p.so_van_ban).split('/')[0]).join(', ');
  const ai = ds.length === 1 ? ds[0].nguoi_duoc_cap : String(ds[0].co_quan).split(/\s[-–]\s/).pop();
  return `${so} ${ai} - ${tenMau}.docx`.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ');
}

function main() {
  const ts = { rieng: process.argv.includes('--rieng'), soanLai: process.argv.includes('--soan-lai') };
  for (const k of ['vao', 'mau', 'du-lieu', 'goc-ra']) {
    const i = process.argv.indexOf(`--${k}`);
    if (i > 0) ts[k] = process.argv[i + 1];
  }
  if (!ts.vao) { console.error('Thiếu --vao. Xem đầu file soan_cctt.js.'); process.exit(2); }
  const vao = path.resolve(ts.vao);
  const gocRa = path.resolve(ts['goc-ra'] || path.join(path.dirname(vao), 'kết quả cctt'));
  const fileDaSoan = path.join(gocRa, '_da_soan.json');
  const daSoan = fs.existsSync(fileDaSoan) ? JSON.parse(fs.readFileSync(fileDaSoan, 'utf8')) : {};

  if (!ts['du-lieu']) {
    const moi = fs.readdirSync(vao).filter((f) => /\.pdf$/i.test(f) && (ts.soanLai || !daSoan[f]));
    console.log(`${moi.length} phiếu chưa soạn trong ${vao}:`);
    for (const f of moi) console.log(`  ${f}`);
    return;
  }

  const tenMau = Object.keys(MAU).find((k) => chuanHoa(k) === chuanHoa(ts.mau));
  if (!tenMau) {
    console.error(`Không có mẫu "${ts.mau || ''}". Các mẫu: ${Object.keys(MAU).join(' · ')}`);
    process.exit(2);
  }
  const mau = MAU[tenMau];
  const cauHinh = JSON.parse(fs.readFileSync(path.join(GOC, 'assets/cau_hinh_chi_nhanh.json'), 'utf8')).gia_tri;
  const tatCa = JSON.parse(fs.readFileSync(ts['du-lieu'], 'utf8')).phieu;
  const dsPhieu = tatCa.filter((p) => ts.soanLai || !daSoan[p.file]);
  for (const p of tatCa) if (!dsPhieu.includes(p)) console.log(`Bỏ qua ${p.file}: đã soạn trong "${daSoan[p.file]}" (soạn lại: thêm --soan-lai).`);

  const nhom = chiaNhom(dsPhieu, ts.rieng);
  // Soát cả lô trước khi ghi: dừng giữa chừng thì một nửa đã ra, một nửa chưa.
  const loi = nhom.flatMap((ds) => loiNhom(ds, mau, cauHinh.ngay_thanh_lap_chi_nhanh));
  if (loi.length) {
    console.error('KHÔNG SOẠN — sửa các chỗ sau rồi chạy lại:');
    for (const l of loi) console.error(`  ✗ ${l}`);
    process.exit(1);
  }

  const lamViec = path.join(gocRa, '_lam_viec');
  fs.mkdirSync(lamViec, { recursive: true });
  for (const ds of nhom) {
    const ra = path.join(gocRa, tenFile(ds, tenMau));
    const fileDuLieu = path.join(lamViec, `${path.basename(ra, '.docx')}.json`);
    fs.writeFileSync(fileDuLieu, JSON.stringify(duLieuVanBan(ds, cauHinh), null, 2), 'utf8');
    execFileSync(process.execPath, [path.join(__dirname, 'dien_mau.js'), '--mau', path.join(GOC, 'assets/mau', mau.file),
      '--du-lieu', fileDuLieu, '--ra', ra, '--nghiem-ngat'], { stdio: 'pipe' });
    for (const p of ds) daSoan[p.file] = path.basename(ra);
    const thieu = ds.flatMap((p) => CAN_CO.filter((k) => !p[k]).map((k) => `${p.so_van_ban}: ${k}`));
    console.log(`${ra}\n  ${ds.length} phiếu: ${ds.map((p) => p.so_van_ban).join(', ')}${thieu.length ? `\n  CÒN Ô «CẦN ĐIỀN»: ${thieu.join('; ')}` : ''}`);
  }
  fs.writeFileSync(fileDaSoan, JSON.stringify(daSoan, null, 2), 'utf8');
  console.log(`Người ký: ${cauHinh.ten_nguoi_ky}. Số, ngày văn bản để trống.`);
}

if (require.main === module) main();
module.exports = { dongHoSo, cacVanBan, chiaNhom, loiNhom, tenFile, MAU };
