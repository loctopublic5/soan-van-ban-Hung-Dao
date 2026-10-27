#!/usr/bin/env node
/**
 * thong_ke_mau.js — Thống kê rổ nào đã có mẫu, rổ nào còn thiếu, thiếu văn bản nào.
 *
 * Dùng trước mỗi lô để biết lô này chạy được tới đâu, và khi cần hỏi người dùng bổ sung
 * mẫu thì hỏi đúng thứ còn thiếu chứ không hỏi chung chung.
 *
 *   node thong_ke_mau.js
 *   node thong_ke_mau.js --nhat-ky <...>/_nhat_ky_phan_loai.json   (kèm số hồ sơ đang chờ)
 */
'use strict';
const fs = require('fs');
const path = require('path');

function docThamSo(argv) {
  const ts = {};
  for (let i = 2; i < argv.length; i++) if (argv[i].startsWith('--')) ts[argv[i].slice(2)] = argv[++i];
  return ts;
}

function main() {
  const ts = docThamSo(process.argv);
  const goc = path.resolve(__dirname, '..');
  const banDo = JSON.parse(fs.readFileSync(path.join(goc, 'assets/ban_do_ro_mau.json'), 'utf8'));

  let demHoSo = {};
  if (ts['nhat-ky']) {
    const nk = JSON.parse(fs.readFileSync(ts['nhat-ky'], 'utf8'));
    for (const d of nk) {
      if (d && d.ho_so && !d.su_kien && d.trang_thai === 'active') {
        demHoSo[d.ro_du_lieu] = (demHoSo[d.ro_du_lieu] || 0) + 1;
      }
    }
  }

  const dong = [];
  const thieu = [];
  let sanSang = 0, choMau = 0, chuaCoNguon = 0;

  for (const [ro, khai] of Object.entries(banDo.ro_dung_bo_mau)) {
    const cho = demHoSo[ro] || 0;
    if (khai.bo_mau === 'CHUA_CO_MAU') {
      dong.push({ ro, cho, tinhTrang: 'CHƯA CÓ MẪU GỐC', chiTiet: 'người dùng sẽ gửi bổ sung' });
      chuaCoNguon++; continue;
    }
    if (String(khai.bo_mau).startsWith('CAN_HOI')) {
      dong.push({ ro, cho, tinhTrang: 'CẦN CHỌN NHÁNH', chiTiet: 'trang 4 hay cấp đổi — đọc trong hồ sơ' });
      continue;
    }
    const bo = banDo.bo_mau[khai.bo_mau];
    if (!bo) { dong.push({ ro, cho, tinhTrang: 'LỖI CẤU HÌNH', chiTiet: `không có bộ mẫu "${khai.bo_mau}"` }); continue; }

    const co = [], khong = [];
    for (const vb of bo.van_ban) {
      (fs.existsSync(path.join(goc, 'assets', vb.mau)) ? co : khong).push(vb.ma);
    }
    if (!khong.length) {
      dong.push({ ro, cho, tinhTrang: 'SẴN SÀNG', chiTiet: `${khai.bo_mau}: ${co.join(' + ')}` });
      sanSang++;
    } else {
      dong.push({ ro, cho, tinhTrang: 'THIẾU MẪU', chiTiet: `${khai.bo_mau}: có ${co.join('+') || '—'}, thiếu ${khong.join('+')}` });
      choMau++;
      for (const vb of bo.van_ban) {
        if (!fs.existsSync(path.join(goc, 'assets', vb.mau))) {
          thieu.push({ boMau: khai.bo_mau, ma: vb.ma, ten: vb.ten, nguonGoc: bo.nguon_goc, duongDan: vb.mau });
        }
      }
    }
  }

  const w = Math.max(...dong.map((d) => d.ro.length));
  let pb = null;
  try { pb = JSON.parse(fs.readFileSync(path.join(goc, 'assets/phien_ban.json'), 'utf8')); } catch { /* bản phát triển */ }
  console.log(`\nRỔ DỮ LIỆU → TÌNH TRẠNG MẪU   (phiên bản skill: ${pb ? pb.phien_ban : 'bản đang phát triển, chưa đóng gói'})\n`);
  console.log(`${'Rổ'.padEnd(w)}  ${'Chờ'.padStart(3)}  ${'Tình trạng'.padEnd(16)}  Chi tiết`);
  console.log('─'.repeat(w + 60));
  for (const d of dong) {
    console.log(`${d.ro.padEnd(w)}  ${String(d.cho || '').padStart(3)}  ${d.tinhTrang.padEnd(16)}  ${d.chiTiet}`);
  }

  // Gộp theo file mẫu: một file có thể phục vụ nhiều rổ, hỏi một lần là đủ.
  const theoFile = new Map();
  for (const t of thieu) if (!theoFile.has(t.duongDan)) theoFile.set(t.duongDan, t);

  console.log(`\nTổng: ${sanSang} rổ sẵn sàng | ${choMau} rổ chờ dựng mẫu | ${chuaCoNguon} rổ chưa có mẫu gốc\n`);

  // Chiều ngược lại: file mẫu có trên đĩa mà không ai khai. Gặp khi chép mỗi thư mục
  // mẫu sang máy khác mà quên chép ban_do_ro_mau.json — mẫu nằm đó mà mọi lệnh đều báo
  // "không có", người dùng thì chắc chắn là đã chép rồi. Nói rõ ra thay vì im lặng.
  const daKhai = new Set(Object.keys(banDo.bo_mau));
  const thua = fs.readdirSync(path.join(goc, 'assets/mau'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'chung' && !daKhai.has(d.name))
    .map((d) => d.name);
  if (thua.length) {
    console.log(`CÓ THƯ MỤC MẪU NHƯNG CHƯA KHAI trong assets/ban_do_ro_mau.json: ${thua.join(', ')}`);
    console.log('  → Bản skill không đầy đủ: có file mẫu mà thiếu dòng khai. Dùng bản đóng gói trong tài khoản Claude, đừng chép lẻ thư mục mẫu.\n');
  }
  if (theoFile.size) {
    console.log(`CÒN PHẢI DỰNG ${theoFile.size} FILE MẪU:\n`);
    const theoBo = {};
    for (const t of theoFile.values()) (theoBo[t.boMau] = theoBo[t.boMau] || []).push(t);
    for (const [bo, ds] of Object.entries(theoBo)) {
      console.log(`  ${bo}   (nguồn: ${ds[0].nguonGoc})`);
      for (const t of ds) console.log(`    - ${t.ma.padEnd(6)} ${t.ten}`);
      console.log('');
    }
  }
}

if (require.main === module) main();
