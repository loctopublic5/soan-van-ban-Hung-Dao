#!/usr/bin/env node
/**
 * so_ho_so.js — SỔ HỒ SƠ: tự ghi lại mỗi lượt sinh văn bản, và in thống kê khi được hỏi.
 *
 * VÌ SAO: sau vài tuần chạy, câu hỏi "đã soạn được bao nhiêu bộ, bao nhiêu bộ hỏng, hồ sơ
 * nào phải chạy đi chạy lại, rổ nào nhiều việc nhất" không trả lời được bằng cách nhìn thư
 * mục kết quả: một hồ sơ thử năm lần vẫn chỉ để lại MỘT thư mục, còn lần hỏng thì không để
 * lại gì. Phải ghi ngay lúc chạy thì mới có số thật.
 *
 * GHI TỰ ĐỘNG, KHÔNG TỐN TOKEN. tao_bo_van_ban.js gọi ghiSo() sau mỗi lượt — mọi đường
 * chạy (lối tắt lam_ngay.js, vòng cuốn chiếu, chạy hàng loạt) đều đi qua đó. Claude không
 * phải nhớ gì, không phải đọc sổ; sổ chỉ được đọc khi người dùng hỏi thống kê.
 * Ghi sổ hỏng thì im lặng bỏ qua: không bao giờ để việc ghi sổ làm hỏng việc sinh văn bản.
 *
 * SỔ NẰM Ở ĐÂU: <thư mục kết quả>/_so_ho_so/nhat_ky-<tên máy>-<năm>.jsonl
 *   - Đi theo thư mục kết quả nên không phải khai báo gì, và nhìn thấy được.
 *   - KHÔNG nằm trong thư mục skill: trên máy cán bộ đó là bản đồng bộ chỉ đọc, tải bản mới
 *     là mất sổ.
 *   - Mỗi máy một file riêng (tên máy nằm trong tên file) nên hai máy cùng ghi vào một thư
 *     mục đồng bộ (OneDrive, ổ mạng) cũng không đè nhau, không đẻ ra "bản sao xung đột".
 *   - Gộp số liệu nhiều máy: chép các file nhat_ky-*.jsonl về cùng một thư mục, hoặc truyền
 *     nhiều --so. Dòng trùng bị bỏ theo "id" nên chép chồng bao nhiêu lần cũng không nhân đôi.
 *   - Mỗi lượt một dòng JSON, chỉ thêm không sửa: hỏng một dòng không mất cả sổ.
 *
 * Dùng:
 *   node so_ho_so.js                            thống kê sổ của thư mục kết quả dùng gần đây
 *   node so_ho_so.js --so "C:\...\Ket qua"      chỉ định thư mục kết quả (hoặc thư mục sổ)
 *   node so_ho_so.js --so A --so B              gộp nhiều nơi
 *   node so_ho_so.js --thang 2026-09            chỉ tháng đó
 *   node so_ho_so.js --lap                      hồ sơ phải chạy lại, kèm số lượt
 *   node so_ho_so.js --chi-tiet                 liệt kê từng hồ sơ
 *   node so_ho_so.js --json                     số liệu thô
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const TEN_THU_MUC_SO = '_so_ho_so';
/** Danh sách thư mục kết quả đã dùng, để lệnh thống kê chạy được mà không cần gõ đường dẫn.
 *  Chỉ chứa đường dẫn, không chứa dữ liệu hồ sơ. */
const FILE_NHO = path.join(os.homedir() || '.', '.so-ho-so-dat-dai.txt');

const boDau = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

function tenMay() {
  return (os.hostname() || 'may').split('.')[0].replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 30) || 'may';
}
const bam = (x) => crypto.createHash('sha1').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex').slice(0, 10);

const thuMucSo = (gocRa) => path.join(gocRa, TEN_THU_MUC_SO);
const fileSo = (gocRa, luc) => path.join(thuMucSo(gocRa), `nhat_ky-${tenMay()}-${luc.getFullYear()}.jsonl`);

/**
 * Khoá nhận dạng một hồ sơ, để biết hai lượt chạy có phải cùng một hồ sơ không. Mã hồ sơ là
 * chắc nhất, nhưng phần lớn hồ sơ lúc soạn chưa có mã (mã nằm ở hệ thống một cửa) — khi đó
 * nhận dạng bằng tên người cộng GCN cũ và thửa gốc, thứ không đổi giữa các lần chạy lại.
 */
function khoaHoSo(duLieu) {
  const ma = String(duLieu.ma_ho_so || '').match(/(\d{6}-\d{4})\s*$/);
  if (ma) return ma[1];
  const dk = duLieu.du_kien || {};
  const gc = [].concat((dk.gcn_cu || {}).so || []).join('+');
  const tc = dk.thua_cu || {};
  const phan = [boDau(duLieu.ten_nguoi_ho_so), boDau(gc), tc.so, tc.to].filter((x) => x !== undefined && x !== '');
  return phan.length ? phan.join('|') : 'khong-ro';
}

/** Ghi một lượt chạy vào sổ. Trả về { file, moi } — "moi" = lần đầu lập sổ ở thư mục này, để
 *  bên gọi in đường dẫn đúng một lần rồi thôi — hoặc null nếu không ghi được. */
function ghiSo(gocRa, ban) {
  try {
    if (!gocRa) return null;
    const luc = new Date();
    const dong = {
      // id để gộp sổ nhiều máy mà không đếm hai lần cùng một lượt.
      id: bam(`${tenMay()}|${luc.toISOString()}|${ban.khoa || ''}|${ban.thu_muc || ''}`),
      luc: luc.toISOString(),
      may: tenMay(),
      ...ban,
    };
    const f = fileSo(gocRa, luc);
    const moi = !fs.existsSync(f);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify(dong) + '\n', 'utf8');
    nhoDuongDan(gocRa);
    return { file: f, moi };
  } catch {
    return null;                       // sổ hỏng không được kéo theo việc sinh văn bản
  }
}

function nhoDuongDan(gocRa) {
  try {
    const day = path.resolve(gocRa);
    // Thư mục tạm (chạy thử, kiểm hồi quy) vẫn có sổ của nó, nhưng không được chiếm chỗ "thư
    // mục dùng gần đây" — nếu không, lệnh thống kê không tham số sẽ báo số liệu của bản chạy thử.
    const tam = path.resolve(os.tmpdir());
    if (boDau(day).startsWith(boDau(tam)) || /[\\/](temp|tmp)[\\/]/i.test(day)) return;
    const cu = docDuongDanNho();
    const moi = [day, ...cu.filter((x) => x !== day)].slice(0, 5);
    fs.writeFileSync(FILE_NHO, moi.join('\n') + '\n', 'utf8');
  } catch { /* không nhớ được thì lần sau gõ --so */ }
}
function docDuongDanNho() {
  try {
    return fs.readFileSync(FILE_NHO, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean);
  } catch { return []; }
}

/** Đọc mọi file sổ trong các thư mục đã cho (thư mục kết quả hoặc thẳng thư mục sổ). */
function docSo(cacGoc) {
  const files = [];
  for (const g of cacGoc) {
    for (const tm of [thuMucSo(g), g]) {
      if (!fs.existsSync(tm) || !fs.statSync(tm).isDirectory()) continue;
      for (const f of fs.readdirSync(tm)) {
        if (/^nhat_ky.*\.jsonl$/i.test(f)) files.push(path.join(tm, f));
      }
      break;
    }
  }
  const dong = [];
  const daCo = new Set();
  for (const f of [...new Set(files)]) {
    let noi;
    try { noi = fs.readFileSync(f, 'utf8'); } catch { continue; }
    for (const l of noi.split('\n')) {
      const s = l.trim();
      if (!s) continue;
      let d;
      try { d = JSON.parse(s); } catch { continue; }   // dòng hỏng: bỏ đúng dòng đó
      if (!d || !d.id || daCo.has(d.id)) continue;
      daCo.add(d.id);
      dong.push(d);
    }
  }
  dong.sort((a, b) => String(a.luc).localeCompare(String(b.luc)));
  return { dong, files: [...new Set(files)] };
}

/** Gom các lượt chạy về từng hồ sơ. Một hồ sơ chạy năm lần vẫn là MỘT hồ sơ; trạng thái tính
 *  theo lượt cuối, vì lượt sau là lượt sửa lỗi của lượt trước. */
function gomHoSo(dong) {
  const hs = new Map();
  for (const d of dong) {
    const k = d.khoa || d.ma_ho_so || boDau(d.ten) || d.id;
    if (!hs.has(k)) hs.set(k, { khoa: k, luot: [] });
    hs.get(k).luot.push(d);
  }
  for (const m of hs.values()) {
    m.cuoi = m.luot[m.luot.length - 1];
    m.ten = m.luot.map((x) => x.ten).filter(Boolean).pop() || m.khoa;
    m.ma = m.luot.map((x) => x.ma_ho_so).filter(Boolean).pop() || '';
    const van = new Set();
    m.lapYHet = 0;
    for (const x of m.luot) {
      if (x.van_tay && van.has(x.van_tay)) m.lapYHet++;
      if (x.van_tay) van.add(x.van_tay);
    }
    m.lapSua = Math.max(0, m.luot.length - 1 - m.lapYHet);
  }
  return [...hs.values()];
}

function loc(dong, ts) {
  const trong = (d) => {
    const ngay = String(d.luc || '').slice(0, 10);
    if (ts.thang && !String(d.luc || '').startsWith(ts.thang)) return false;
    if (ts.tu && ngay < ts.tu) return false;
    if (ts.den && ngay > ts.den) return false;
    if (ts.may && boDau(d.may) !== boDau(ts.may)) return false;
    return true;
  };
  return dong.filter(trong);
}

function bang(hang) {
  if (!hang.length) return [];
  const rong = hang[0].map((_, i) => Math.max(...hang.map((h) => [...String(h[i] ?? '')].length)));
  return hang.map((h) => h.map((o, i) => {
    const s = String(o ?? '');
    return i === h.length - 1 ? s : s + ' '.repeat(rong[i] - [...s].length);
  }).join('  ').trimEnd());
}

function inThongKe(ds, ts, nguon) {
  const soLuot = ds.reduce((s, m) => s + m.luot.length, 0);
  const xong = ds.filter((m) => m.cuoi.trang_thai === 'xong');
  const hong = ds.filter((m) => m.cuoi.trang_thai !== 'xong');
  const lapYHet = ds.reduce((s, m) => s + m.lapYHet, 0);
  const lapSua = ds.reduce((s, m) => s + m.lapSua, 0);
  const conO = xong.filter((m) => (m.cuoi.so_o || 0) > 0);
  const ngay = ds.map((m) => String(m.cuoi.luc).slice(0, 10)).sort();

  const may = [...new Set(ds.flatMap((m) => m.luot.map((x) => x.may)).filter(Boolean))];
  console.log(`SỔ HỒ SƠ — ${nguon.files.length} file sổ${nguon.thuMuc.length ? `: ${nguon.thuMuc.join(' · ')}` : ''}`);
  if (may.length > 1) console.log(`Máy đã ghi: ${may.join(', ')}`);
  if (ngay.length) console.log(`Từ ${ngay[0]} đến ${ngay[ngay.length - 1]}`);
  console.log('');
  console.log(`  Hồ sơ đã soạn:   ${String(ds.length).padStart(4)}   (xong ${xong.length} · hỏng ${hong.length})`);
  console.log(`  Lượt chạy:       ${String(soLuot).padStart(4)}   (chạy lại ${lapYHet + lapSua}: ${lapYHet} y hệt, ${lapSua} sau khi sửa dữ liệu)`);
  console.log(`  Còn ô CẦN ĐIỀN:  ${String(conO.length).padStart(4)} hồ sơ, tổng ${conO.reduce((s, m) => s + (m.cuoi.so_o || 0), 0)} ô`);

  const theo = (lay) => {
    const m = new Map();
    for (const h of ds) {
      const k = lay(h) || '(không ghi)';
      if (!m.has(k)) m.set(k, { k, hs: 0, hong: 0 });
      const x = m.get(k);
      x.hs++;
      if (h.cuoi.trang_thai !== 'xong') x.hong++;
    }
    return [...m.values()].sort((a, b) => b.hs - a.hs);
  };

  // Hồ sơ đi bằng lối tắt không có rổ (người dùng chỉ định thẳng bộ mẫu) — nói rõ vậy, đừng
  // để thành "không ghi" khiến người đọc tưởng sổ sót dữ liệu.
  console.log('\nTheo rổ:');
  console.log(bang(theo((h) => h.cuoi.ro || '(chỉ định thẳng bộ mẫu)').map((x) => [`  ${x.k}`, `${x.hs} hồ sơ`, x.hong ? `(${x.hong} hỏng)` : ''])).join('\n'));
  console.log('\nTheo bộ mẫu:');
  console.log(bang(theo((h) => h.cuoi.bo_mau).map((x) => [`  ${x.k}`, `${x.hs} hồ sơ`, x.hong ? `(${x.hong} hỏng)` : ''])).join('\n'));

  const thang = theo((h) => String(h.cuoi.luc).slice(0, 7)).sort((a, b) => a.k.localeCompare(b.k));
  console.log(`\nTheo tháng: ${thang.map((x) => `${x.k}: ${x.hs}`).join(' · ')}`);

  const nhieuLuot = ds.filter((m) => m.luot.length > 1).sort((a, b) => b.luot.length - a.luot.length);
  if (nhieuLuot.length) {
    console.log(`\nChạy lại nhiều nhất (${nhieuLuot.length} hồ sơ phải chạy lại):`);
    for (const m of nhieuLuot.slice(0, ts.lap ? nhieuLuot.length : 5)) {
      console.log(`  ${m.ma || '—'} ${m.ten} — ${m.luot.length} lượt, tức ${m.luot.length - 1} lần chạy lại (${m.lapYHet} y hệt, ${m.lapSua} sau khi sửa dữ liệu)`);
    }
    if (!ts.lap && nhieuLuot.length > 5) console.log(`  … còn ${nhieuLuot.length - 5} hồ sơ nữa — xem hết bằng --lap`);
  }

  if (hong.length) {
    console.log(`\nHỎNG (${hong.length}) — chưa ra đủ bộ văn bản:`);
    for (const m of hong) console.log(`  ${m.ma || '—'} ${m.ten} [${m.cuoi.bo_mau || m.cuoi.ro || ''}] — ${m.cuoi.ly_do || (m.cuoi.thieu || []).join('; ') || 'không ghi lý do'}`);
  }

  if (ts['chi-tiet']) {
    console.log('\nTừng hồ sơ:');
    const hang = [['  Hồ sơ', 'Rổ / bộ mẫu', 'Lượt', 'Ô cần điền', 'Trạng thái', 'Lần cuối']];
    for (const m of ds.sort((a, b) => String(a.cuoi.luc).localeCompare(String(b.cuoi.luc)))) {
      hang.push([`  ${m.ma ? m.ma + ' ' : ''}${m.ten}`, m.cuoi.ro || m.cuoi.bo_mau || '', String(m.luot.length),
        String(m.cuoi.so_o ?? ''), m.cuoi.trang_thai === 'xong' ? 'xong' : 'HỎNG', String(m.cuoi.luc).slice(0, 16).replace('T', ' ')]);
    }
    console.log(bang(hang).join('\n'));
  }

  if (conO.length && !ts['chi-tiet']) {
    console.log('\nHồ sơ còn ô phải điền trước khi trình ký:');
    for (const m of conO.slice(0, 10)) {
      console.log(`  ${m.ma || '—'} ${m.ten} — ${m.cuoi.so_o} ô: ${(m.cuoi.cac_o || []).join(', ')}`);
    }
    if (conO.length > 10) console.log(`  … còn ${conO.length - 10} hồ sơ nữa — xem hết bằng --chi-tiet`);
  }
}

function docThamSo(argv) {
  const ts = { so: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const ten = a.slice(2);
    if (ten === 'so') ts.so.push(argv[++i]);
    else if (['lap', 'chi-tiet', 'json'].includes(ten)) ts[ten] = true;
    else ts[ten] = argv[++i];
  }
  return ts;
}

function main() {
  const ts = docThamSo(process.argv);
  const goc = ts.so.length ? ts.so : (process.env.SO_HO_SO ? [process.env.SO_HO_SO] : docDuongDanNho());
  if (!goc.length) {
    console.error('Chưa biết thư mục kết quả nào có sổ. Chạy lại kèm: --so "C:\\...\\Ket qua"');
    process.exit(2);
  }
  const nguon = docSo(goc.map((g) => path.resolve(g)));
  if (!nguon.files.length) {
    console.error(`Không thấy file sổ (nhat_ky-*.jsonl) trong: ${goc.join(' · ')}`);
    console.error('Sổ được tạo từ lượt sinh văn bản đầu tiên sau khi cập nhật skill — chưa chạy lượt nào thì chưa có.');
    process.exit(2);
  }
  const dong = loc(nguon.dong, ts);
  const ds = gomHoSo(dong);
  if (ts.json) {
    console.log(JSON.stringify({ so_ho_so: ds.length, so_luot: dong.length, ho_so: ds.map((m) => ({ ...m, luot: m.luot.length })) }, null, 2));
    return;
  }
  if (!ds.length) { console.log('Sổ có file nhưng không có lượt nào khớp bộ lọc.'); return; }
  inThongKe(ds, ts, { files: nguon.files, thuMuc: [...new Set(nguon.files.map((f) => path.dirname(f)))] });
}

module.exports = { ghiSo, khoaHoSo, docSo, gomHoSo, bam, thuMucSo, TEN_THU_MUC_SO };

if (require.main === module) main();
