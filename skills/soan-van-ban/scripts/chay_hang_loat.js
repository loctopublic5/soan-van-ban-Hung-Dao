#!/usr/bin/env node
/**
 * chay_hang_loat.js — Nối bước 1 (phân loại) với bước 2 (soạn văn bản).
 *
 * Đây là chỗ hai skill gặp nhau. Skill phân loại đã trả lời câu "hồ sơ này thuộc rổ
 * nào" và ghi vào nhật ký; skill này đọc chính nhật ký đó, tra ra bộ mẫu tương ứng của
 * từng rổ, rồi soạn văn bản cho cả loạt. Không phải nhập lại rổ bằng tay, và không có
 * cơ hội hai bước hiểu khác nhau về cùng một hồ sơ.
 *
 * Dùng:
 *   node chay_hang_loat.js --nhat-ky log/_nhat_ky_phan_loai.json \
 *     --thu-muc-du-lieu du_lieu/ --goc-ra out/ \
 *     --goc-ra-may "C:\\Users\\Admin\\Desktop\\tEST\\Ket qua" \
 *     --goc-da-phan-loai "C:\\Users\\Admin\\Desktop\\tEST\\Đã phân loại"
 *
 * Mỗi hồ sơ cần một file dữ liệu <tên pdf không đuôi>.json trong --thu-muc-du-lieu.
 * File đó do Claude lập sau khi đọc bản scan (xem SKILL.md mục 2).
 *
 * KẾT QUẢ CHIA LÀM HAI ĐỐNG — đây là điểm chính của lệnh này. Chạy xong, thư mục
 * "Đã phân loại" trống, và người dùng nhìn thấy ngay hai đống rạch ròi:
 *
 *   _CAN_XOA\            bản scan của các hồ sơ ĐÃ soạn xong văn bản
 *   _CHUA_XU_LY_DUOC\    bản scan của các hồ sơ chưa soạn được, kèm tiền tố tên rổ
 *
 * Kèm theo là don_dep_sau_soan.ps1 + CHAY_DON_DEP_SAU_SOAN.bat để bấm chạy: script
 * dồn file vào hai đống trên, in danh sách, rồi hỏi có xoá đống _CAN_XOA không.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { sinhLenhDonDep } = require('./don_dep_lib.js');

function docThamSo(argv) {
  const ts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) ts[a.slice(2)] = argv[++i];
  }
  return ts;
}

function maNgan(ma) {
  const m = String(ma || '').match(/(\d{6}-\d{4})\s*$/);
  return m ? m[1] : String(ma || '').trim();
}
function tenAnToan(s) {
  return String(s || '').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
}
function laDongPhanLoai(d) {
  return d && typeof d === 'object' && d.ho_so && !d.su_kien;
}

function main() {
  const ts = docThamSo(process.argv);
  for (const bb of ['nhat-ky', 'thu-muc-du-lieu', 'goc-ra']) {
    if (!ts[bb]) { console.error(`Thiếu --${bb}. Xem hướng dẫn ở đầu file.`); process.exit(2); }
  }

  const gocSkill = path.resolve(__dirname, '..');
  const banDo = JSON.parse(fs.readFileSync(path.join(gocSkill, 'assets/ban_do_ro_mau.json'), 'utf8'));
  const nhatKy = JSON.parse(fs.readFileSync(ts['nhat-ky'], 'utf8'));
  const hienHanh = nhatKy.filter((d) => laDongPhanLoai(d) && d.trang_thai === 'active');

  const gocRaMay = ts['goc-ra-may'] || ts['goc-ra'];
  const gocDaPhanLoai = (ts['goc-da-phan-loai'] || '').replace(/\\+$/, '');

  fs.mkdirSync(ts['goc-ra'], { recursive: true });

  const xong = [];
  const ton = [];

  console.log(`Nhật ký: ${hienHanh.length} hồ sơ đang hiện hành\n`);

  for (const d of hienHanh) {
    const ro = d.ro_du_lieu;
    const khai = banDo.ro_dung_bo_mau[ro];
    const tenGoc = d.ho_so.replace(/\.pdf$/i, '');
    const fileDuLieu = path.join(ts['thu-muc-du-lieu'], `${tenGoc}.json`);

    const bo = (ly_do) => { ton.push({ ...d, ly_do }); console.log(`  ✗ ${d.ho_so.padEnd(38)} ${ly_do}`); };

    if (!khai) { bo(`rổ "${ro}" chưa khai trong ban_do_ro_mau.json`); continue; }
    if (khai.bo_mau === 'CHUA_CO_MAU') { bo(`rổ "${ro}" chưa có mẫu`); continue; }
    if (!fs.existsSync(fileDuLieu)) { bo(`thiếu file dữ liệu ${tenGoc}.json`); continue; }

    const duLieu = JSON.parse(fs.readFileSync(fileDuLieu, 'utf8'));
    // Rổ do skill phân loại quyết định — file dữ liệu không được nói khác.
    if (duLieu.ro_du_lieu && duLieu.ro_du_lieu !== ro) {
      bo(`file dữ liệu ghi rổ "${duLieu.ro_du_lieu}" khác nhật ký "${ro}"`); continue;
    }
    duLieu.ro_du_lieu = ro;
    if (String(khai.bo_mau).startsWith('CAN_HOI') && !duLieu.bo_mau) {
      bo(`rổ "${ro}" cần chọn nhánh — ghi "bo_mau" vào ${tenGoc}.json rồi chạy lại`); continue;
    }
    if (!duLieu.pdf_nguon) duLieu.pdf_nguon = d.duong_dan_dich;

    const tam = path.join(ts['goc-ra'], `.${tenGoc}.tam.json`);
    fs.writeFileSync(tam, JSON.stringify(duLieu, null, 2), 'utf8');

    let ketQua;
    try {
      ketQua = execFileSync('node', [
        path.join(__dirname, 'tao_bo_van_ban.js'),
        '--du-lieu', tam,
        '--goc-ra', ts['goc-ra'],
        '--goc-ra-may', gocRaMay,
        '--lenh-don', path.join(ts['goc-ra'], '.chuyen_ban_scan.tam'),
      ], { encoding: 'utf8' });
    } catch (e) {
      fs.unlinkSync(tam);
      bo(`lỗi khi sinh văn bản: ${String(e.stderr || e.message).split('\n')[0]}`);
      continue;
    }
    fs.unlinkSync(tam);

    if (/CHƯA SINH ĐƯỢC/.test(ketQua)) {
      const thieu = ketQua.split('CHƯA SINH ĐƯỢC:')[1].split('\n').filter((x) => x.trim().startsWith('-'));
      bo(`thiếu mẫu: ${thieu.map((x) => x.trim().replace(/^- /, '')).join('; ')}`);
      continue;
    }

    const soO = Number((ketQua.match(/tổng (\d+) ô «CẦN ĐIỀN»/) || [0, 0])[1]);
    const ma = maNgan(duLieu.ma_ho_so);
    // Tên thư mục do tao_bo_van_ban.js đặt (tên chủ + loại biến động) — đọc lại dòng nó in.
    const daIn = (ketQua.match(/^Thư mục:\s+(.+)$/m) || [])[1];
    const thuMuc = daIn ? path.basename(daIn.trim()) : tenAnToan(`${ma} ${duLieu.ten_nguoi_ho_so || ''}`);
    xong.push({ ...d, ma, thuMuc, soO, duLieu });
    console.log(`  ✓ ${d.ho_so.padEnd(38)} → ${thuMuc}${soO ? `   (${soO} ô cần điền)` : ''}`);
  }

  /* ---------------------------------------------- sinh script dọn cho người dùng ---- */

  const psPath = sinhLenhDonDep(ts['goc-ra'], gocDaPhanLoai, xong, ton);
  if (psPath) console.log(`\nĐã sinh: don_dep_sau_soan.ps1 + CHAY_DON_DEP_SAU_SOAN.bat`);

  /* ------------------------------------------------------------------ báo cáo ---- */

  const bc = [];
  bc.push('# Kết quả soạn văn bản hàng loạt', '');
  bc.push(`- Nhật ký: \`${ts['nhat-ky']}\``);
  bc.push(`- Hồ sơ hiện hành: ${hienHanh.length} — soạn xong ${xong.length}, còn tồn ${ton.length}`, '');
  bc.push('## Đã soạn xong', '');
  if (xong.length) {
    bc.push('| Hồ sơ | Rổ | Thư mục kết quả | Ô cần điền |', '|---|---|---|---|');
    for (const x of xong) bc.push(`| ${x.ho_so} | ${x.ro_du_lieu} | ${x.thuMuc} | ${x.soO || ''} |`);
  } else bc.push('_Không có._');
  bc.push('', '## Chưa soạn được', '');
  if (ton.length) {
    bc.push('| Hồ sơ | Rổ | Vướng ở đâu |', '|---|---|---|');
    for (const t of ton) bc.push(`| ${t.ho_so} | ${t.ro_du_lieu} | ${t.ly_do} |`);
  } else bc.push('_Không có._');

  const bcPath = path.join(ts['goc-ra'], 'ket_qua_hang_loat.md');
  fs.writeFileSync(bcPath, bc.join('\n') + '\n', 'utf8');

  console.log(`\n${xong.length} xong / ${ton.length} tồn — báo cáo: ${bcPath}`);
}

if (require.main === module) main();
