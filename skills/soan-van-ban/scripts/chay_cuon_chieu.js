#!/usr/bin/env node
/**
 * chay_cuon_chieu.js — Người điều phối vòng lặp cuốn chiếu.
 *
 * VẤN ĐỀ NÓ GIẢI: soạn 9-15 hồ sơ trong một phiên. Nếu đọc hết cả lô rồi mới soạn thì
 * ngữ cảnh phình theo số hồ sơ, hồ sơ thứ mười hai được đọc bằng một bộ nhớ đã đầy
 * mảnh vụn của mười một hồ sơ trước — và đó chính là lúc số thửa của hồ sơ này lẫn
 * sang văn bản của hồ sơ kia. Vòng lặp cuốn chiếu giữ ngữ cảnh phẳng: mỗi lượt chỉ có
 * đúng một hồ sơ trong đầu, xong thì quên hẳn rồi mới sang hồ sơ sau.
 *
 * TRẠNG THÁI NẰM TRÊN Ổ ĐĨA, KHÔNG NẰM TRONG NGỮ CẢNH. Mỗi lần chạy, script đọc lại
 * thư mục làm việc để suy ra hồ sơ nào đã tới đâu. Nhờ vậy ngắt phiên giữa chừng,
 * /clear, hay nén ngữ cảnh đều vô hại: chạy lại --tiep là biết đi tiếp từ đâu. Đây là
 * điều kiện để bước "xoá ngữ cảnh" sau mỗi hồ sơ trở nên an toàn — không có nó thì
 * xoá ngữ cảnh đồng nghĩa với mất dấu công việc.
 *
 * BỐN TRẠNG THÁI, SUY TỪ FILE CÓ MẶT TRONG <thư mục làm việc>/<tên hồ sơ>/:
 *   (không có gì)   → LỌC    chạy loc_trang.js               [CPU, 0 token]
 *   loc.json        → ĐỌC    Claude đọc ảnh, ghi ho_so.json  [phần duy nhất tốn token]
 *   ho_so.json      → ĐIỀN   chạy tao_bo_van_ban.js          [CPU, 0 token]
 *   da_dien.json    → XONG
 *   ton.json        → TỒN    có vướng mắc đã ghi rõ lý do
 *
 * Dùng:
 *   node chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ \
 *     --nhat-ky "<...>/_nhat_ky_phan_loai.json" --khoi-tao
 *
 *   node chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ --tiep
 *   node chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ --dien "tặng cho T4"
 *   node chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ --ton "cấp đổi" --ly-do "thiếu trích đo"
 *   node chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ --tong-ket \
 *     --goc-ra-may "C:\\...\\Ket qua" --goc-da-phan-loai "C:\\...\\Đã phân loại"
 *
 * Không có cờ nào thì in bảng tiến độ.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { sinhLenhDonDep } = require('./don_dep_lib.js');

const GOC_SKILL = path.resolve(__dirname, '..');

function docThamSo(argv) {
  const ts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const ten = a.slice(2);
    if (ten === 'tiep' || ten === 'khoi-tao' || ten === 'tong-ket') ts[ten] = true;
    else ts[ten] = argv[++i];
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
function docJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function laDongPhanLoai(d) {
  return d && typeof d === 'object' && d.ho_so && !d.su_kien;
}

/** Thư mục làm việc của một hồ sơ.
 *
 *  Không ghép chuỗi thẳng: tên hồ sơ trong lo.json đến từ nhật ký phân loại, còn thư mục
 *  do loc_trang.js tạo từ tên file thật trên đĩa. Cùng một tên tiếng Việt có thể tồn tại
 *  ở hai dạng tổ hợp dấu (NFC/NFD) tuỳ hệ điều hành và tuỳ công cụ đã chạm vào nó, nên
 *  so khớp thô sẽ không thấy thư mục đã có và hồ sơ đứng mãi ở trạng thái LOC. Chuẩn hoá
 *  về NFC rồi mới so. */
function thuMucHoSo(gocLamViec, ten) {
  const thang = path.join(gocLamViec, ten);
  if (fs.existsSync(thang)) return thang;
  const can = ten.normalize('NFC');
  try {
    for (const m of fs.readdirSync(gocLamViec, { withFileTypes: true })) {
      if (m.isDirectory() && m.name.normalize('NFC') === can) return path.join(gocLamViec, m.name);
    }
  } catch { /* thư mục làm việc chưa tồn tại — trả về đường dẫn để bên gọi tự tạo */ }
  return thang;
}

/** Duyệt cây thư mục tìm file .pdf. Tự viết thay vì dùng readdirSync({recursive:true})
 *  vì tuỳ chọn đó chỉ có từ Node 20, mà cả bộ script này chỉ yêu cầu Node 18. */
function timPdf(goc) {
  const ra = [];
  for (const m of fs.readdirSync(goc, { withFileTypes: true })) {
    const p = path.join(goc, m.name);
    if (m.isDirectory()) ra.push(...timPdf(p));
    else if (/\.pdf$/i.test(m.name)) ra.push(p);
  }
  return ra;
}

/* --------------------------------------------------------- danh sách hồ sơ ---- */

/** Danh sách hồ sơ của lô được chốt MỘT LẦN vào lo.json lúc --khoi-tao, rồi các lượt
 *  sau đọc lại từ đó. Nếu mỗi lượt đều đọc lại nhật ký phân loại thì một thay đổi
 *  giữa chừng ở bước 1 sẽ lặng lẽ đổi thứ tự hồ sơ đang chạy dở. */
function khoiTao(ts) {
  let ds;
  if (ts['nhat-ky']) {
    const nhatKy = docJson(ts['nhat-ky']);
    if (!Array.isArray(nhatKy)) { console.error(`Không đọc được nhật ký: ${ts['nhat-ky']}`); process.exit(2); }
    ds = nhatKy.filter((d) => laDongPhanLoai(d) && d.trang_thai === 'active').map((d) => ({
      ten: d.ho_so.replace(/\.pdf$/i, ''),
      pdf: d.duong_dan_dich,
      ro: d.ro_du_lieu,
      // Mốc trang do skill phân loại ghi lại. Có nó thì bước lọc không phải dò lại
      // cả bộ hồ sơ, và Claude không phải liếc lại đống ảnh nhỏ để tìm đơn với hợp đồng.
      trang_moc: d.trang_moc || null,
      lop_chu: d.lop_chu === true,
    }));
  } else if (ts['thu-muc-ho-so']) {
    ds = timPdf(ts['thu-muc-ho-so']).map((p) => ({
      ten: path.basename(p).replace(/\.pdf$/i, ''),
      pdf: p,
      ro: null,
    }));
  } else {
    console.error('Cần --nhat-ky <file> hoặc --thu-muc-ho-so <thư mục> khi --khoi-tao.');
    process.exit(2);
  }

  if (!ds.length) { console.error('Lô rỗng — không có hồ sơ nào đang hiện hành.'); process.exit(2); }
  fs.mkdirSync(ts['thu-muc-lam-viec'], { recursive: true });
  fs.writeFileSync(path.join(ts['thu-muc-lam-viec'], 'lo.json'),
    JSON.stringify({ tao_luc: new Date().toISOString(), nhat_ky: ts['nhat-ky'] || null, ho_so: ds }, null, 2), 'utf8');
  console.log(`Đã chốt lô ${ds.length} hồ sơ vào ${path.join(ts['thu-muc-lam-viec'], 'lo.json')}`);
  return ds;
}

function docLo(ts) {
  const lo = docJson(path.join(ts['thu-muc-lam-viec'], 'lo.json'));
  if (!lo) {
    console.error(`Chưa chốt lô. Chạy --khoi-tao kèm --nhat-ky hoặc --thu-muc-ho-so trước.`);
    process.exit(2);
  }
  return lo.ho_so;
}

/* ------------------------------------------------------------- trạng thái ---- */

function trangThai(ts, hs) {
  const tm = thuMucHoSo(ts['thu-muc-lam-viec'], hs.ten);
  const co = (f) => fs.existsSync(path.join(tm, f));
  if (co('ton.json')) return 'TON';
  if (co('da_dien.json')) return 'XONG';
  if (co('ho_so.json')) return 'DIEN';
  if (co('loc.json')) return 'DOC';
  return 'LOC';
}

/** Rổ nào chưa soạn được thì phát hiện NGAY, trước khi tốn token đọc hồ sơ. */
function vuongMacRo(banDo, ro) {
  if (!ro) return null;
  const khai = banDo.ro_dung_bo_mau[ro];
  if (!khai) return `rổ "${ro}" chưa khai trong ban_do_ro_mau.json`;
  if (khai.bo_mau === 'CHUA_CO_MAU') return `rổ "${ro}" chưa có mẫu — ${khai.ghi_chu || 'cần bổ sung mẫu trước'}`;
  return null;
}

/* ------------------------------------------------------------------ --tiep ---- */

function inViecTiepTheo(ts, ds, banDo) {
  const tinh = ds.map((hs) => ({ hs, tt: trangThai(ts, hs) }));
  const xong = tinh.filter((x) => x.tt === 'XONG').length;
  const ton = tinh.filter((x) => x.tt === 'TON').length;
  const ke = tinh.find((x) => x.tt !== 'XONG' && x.tt !== 'TON');

  if (!ke) {
    console.log(`HẾT LÔ — ${xong} xong / ${ton} tồn / ${ds.length} tổng.`);
    console.log('Chạy --tong-ket để ra báo cáo và script dọn bản scan.');
    return;
  }

  const { hs, tt } = ke;
  const tm = thuMucHoSo(ts['thu-muc-lam-viec'], hs.ten);
  const stt = tinh.indexOf(ke) + 1;
  console.log(`HỒ SƠ ${stt}/${ds.length} — ${hs.ten}`);
  if (hs.ro) console.log(`Rổ:   ${hs.ro}`);

  // Vướng ở tầng rổ thì biết chắc từ trước, không cần đọc hồ sơ mới kết luận được. Tự
  // xếp sang đống tồn luôn, vì nếu chỉ in ra lời nhắc thì --tiep sẽ trả về mãi hồ sơ
  // này và cả lô đứng lại ở đây.
  const vuong = vuongMacRo(banDo, hs.ro);
  if (vuong) {
    fs.mkdirSync(tm, { recursive: true });
    fs.writeFileSync(path.join(tm, 'ton.json'),
      JSON.stringify({ ly_do: vuong, tu_dong: true, luc: new Date().toISOString() }, null, 2), 'utf8');
    console.log(`\nTỒN (tự xếp) — ${vuong}`);
    console.log('Không tốn token đọc hồ sơ này. Chạy lại --tiep để sang hồ sơ sau.');
    console.log('Bổ sung mẫu xong thì chạy --dien cho hồ sơ này để thử lại.');
    return;
  }

  if (tt === 'LOC') {
    console.log('\nVIỆC: LỌC TRANG — chạy đúng lệnh này, KHÔNG mở file PDF:');
    const moc = hs.trang_moc && Object.keys(hs.trang_moc).length ? hs.trang_moc : null;
    if (moc) {
      const trang = [...new Set(Object.values(moc).flat())].sort((a, b) => a - b);
      const chuoiMoc = Object.entries(moc).map(([k, v]) => `${k}=${v.join(',')}`).join(';');
      console.log(`  node scripts/loc_trang.js --pdf "${hs.pdf}" --ra "${ts['thu-muc-lam-viec']}" \\`);
      console.log(`    --chi-trang ${trang.join(',')} --moc "${chuoiMoc}"`);
      console.log('\nMốc lấy từ nhật ký phân loại — bước 1 đã đọc hồ sơ này rồi, không dò lại.');
    } else {
      console.log(`  node scripts/loc_trang.js --pdf "${hs.pdf}" --ra "${ts['thu-muc-lam-viec']}"`);
    }
    console.log('\nXong thì chạy lại --tiep.');
    return;
  }

  if (tt === 'DOC') {
    const loc = docJson(path.join(tm, 'loc.json')) || {};
    console.log(`\nVIỆC: ĐỌC — ${loc.tong_trang || '?'} trang gốc đã lọc còn ${(loc.giu || []).length}.`);
    if (loc.lan === 'lop-chu') {
      console.log('Hồ sơ có lớp văn bản. Đọc bằng lệnh sau, đừng render ảnh:');
      console.log(`  pdftotext -layout -f <trang> -l <trang> "${hs.pdf}" -`);
      console.log(`Mốc đã tìm được: ${Object.entries(loc.moc || {}).map(([k, v]) => `${k}@${v.join(',')}`).join('  ') || '(không có)'}`);
      console.log(`Trang cần đọc:   ${(loc.giu || []).join(', ')}`);
    } else {
      console.log('Hồ sơ là scan ảnh. Đọc ĐÚNG các ảnh sau, không mở PDF gốc:');
      for (const a of loc.anh || []) console.log(`  ${path.join(tm, a)}`);
      if ((loc.anh || []).length < (loc.giu || []).length) {
        console.log(`  (còn ${loc.giu.length - loc.anh.length} trang chưa dựng ảnh — dùng loc_trang.js --trang nếu cần)`);
      }
    }
    for (const c of loc.canh_bao || []) console.log(`  ! ${c}`);
    console.log(`\nRồi ghi ${path.join(tm, 'ho_so.json')}: khối du_kien — CHỈ DỮ KIỆN, script tự ghép câu`);
    console.log('  (khung trống: node scripts/ghep_cau.js --khung; ô lẻ còn lại theo references/bien-so.md)');
    console.log(`Bắt buộc có: ma_ho_so, ten_nguoi_ho_so, ro_du_lieu${hs.ro ? ` (= "${hs.ro}")` : ''}`);
    const khai = hs.ro && banDo.ro_dung_bo_mau[hs.ro];
    if (khai && String(khai.bo_mau).startsWith('CAN_HOI')) {
      console.log(`Rổ này là rổ cha — PHẢI ghi thêm "bo_mau". ${khai.ghi_chu || ''}`);
      console.log(`Chọn trong: ${Object.keys(banDo.bo_mau).join(', ')}`);
    }
    console.log('Ô nào không đọc chắc thì BỎ HẲN khỏi JSON, đừng đoán — script sẽ đánh dấu «CẦN ĐIỀN».');
    console.log('\nXong thì chạy lại --tiep. Không giữ lại nội dung hồ sơ này trong đầu.');
    return;
  }

  if (tt === 'DIEN') {
    console.log('\nVIỆC: ĐIỀN — chạy đúng lệnh này, KHÔNG đọc lại hồ sơ:');
    console.log(`  node scripts/chay_cuon_chieu.js --thu-muc-lam-viec "${ts['thu-muc-lam-viec']}" --goc-ra "${ts['goc-ra']}" \\`);
    console.log(`    ${ts['goc-ra-may'] ? `--goc-ra-may "${ts['goc-ra-may']}" ` : ''}--dien "${hs.ten}"`);
  }
}

/* ------------------------------------------------------------------ --dien ---- */

function dien(ts, ds) {
  const hs = ds.find((x) => x.ten === ts.dien);
  if (!hs) { console.error(`Không có hồ sơ "${ts.dien}" trong lô.`); process.exit(2); }
  const tm = thuMucHoSo(ts['thu-muc-lam-viec'], hs.ten);
  const fileDuLieu = path.join(tm, 'ho_so.json');
  const duLieu = docJson(fileDuLieu);
  if (!duLieu) { console.error(`Chưa có hoặc hỏng: ${fileDuLieu}`); process.exit(2); }

  // Gọi --dien thẳng vào một hồ sơ đang nằm đống tồn nghĩa là "đã gỡ vướng, thử lại".
  // Không bỏ dấu tồn ở đây thì hồ sơ nằm lại đó vĩnh viễn dù đã sửa xong nguyên nhân.
  const fileTon = path.join(tm, 'ton.json');
  if (fs.existsSync(fileTon)) {
    fs.unlinkSync(fileTon);
    console.log(`Bỏ dấu tồn của "${hs.ten}" để thử lại.`);
  }

  // Rổ do skill phân loại quyết định — file dữ liệu không được nói khác.
  if (hs.ro && duLieu.ro_du_lieu && duLieu.ro_du_lieu !== hs.ro) {
    console.error(`ho_so.json ghi rổ "${duLieu.ro_du_lieu}" khác nhật ký "${hs.ro}". Sửa cho khớp rồi chạy lại.`);
    process.exit(2);
  }
  if (hs.ro) duLieu.ro_du_lieu = hs.ro;
  if (!duLieu.pdf_nguon) duLieu.pdf_nguon = hs.pdf;
  fs.writeFileSync(fileDuLieu, JSON.stringify(duLieu, null, 2), 'utf8');

  let ketQua;
  try {
    ketQua = execFileSync('node', [
      path.join(__dirname, 'tao_bo_van_ban.js'),
      '--du-lieu', fileDuLieu,
      '--goc-ra', ts['goc-ra'],
      '--goc-ra-may', ts['goc-ra-may'] || ts['goc-ra'],
      '--lenh-don', path.join(ts['goc-ra'], '.chuyen_ban_scan.tam'),
    ], { encoding: 'utf8' });
  } catch (e) {
    const ly = String(e.stderr || e.message).split('\n').filter(Boolean)[0] || 'lỗi không rõ';
    fs.writeFileSync(path.join(tm, 'ton.json'), JSON.stringify({ ly_do: ly, luc: new Date().toISOString() }, null, 2), 'utf8');
    console.log(`TỒN — ${hs.ten}: ${ly}`);
    console.log('Đã ghi ton.json. Chạy --tiep để sang hồ sơ sau.');
    return;
  }

  console.log(ketQua.trimEnd());

  if (/CHƯA SINH ĐƯỢC/.test(ketQua)) {
    const thieu = ketQua.split('CHƯA SINH ĐƯỢC:')[1].split('\n')
      .filter((x) => x.trim().startsWith('-')).map((x) => x.trim().replace(/^- /, ''));
    fs.writeFileSync(path.join(tm, 'ton.json'),
      JSON.stringify({ ly_do: `thiếu mẫu: ${thieu.join('; ')}`, luc: new Date().toISOString() }, null, 2), 'utf8');
    console.log(`\nTỒN — thiếu mẫu. Đã ghi ton.json.`);
    return;
  }

  const soO = Number((ketQua.match(/tổng (\d+) ô «CẦN ĐIỀN»/) || [0, 0])[1]);
  const ma = maNgan(duLieu.ma_ho_so);
  const coMa = /^\d{6}-\d{4}$/.test(ma);
  const tenNguoi = tenAnToan(duLieu.ten_nguoi_ho_so || '');
  fs.writeFileSync(path.join(tm, 'da_dien.json'), JSON.stringify({
    thu_muc_ket_qua: coMa ? tenAnToan(`${ma} ${tenNguoi}`) : tenNguoi,
    so_o_can_dien: soO,
    pdf_nguon: duLieu.pdf_nguon,
    luc: new Date().toISOString(),
  }, null, 2), 'utf8');

  console.log(`\nXONG — ${hs.ten}${soO ? ` (${soO} ô «CẦN ĐIỀN»)` : ''}.`);
  console.log('Quên nội dung hồ sơ này đi rồi chạy --tiep để sang hồ sơ sau.');
}

/* --------------------------------------------------------- bảng và tổng kết ---- */

function inBang(ts, ds, banDo) {
  const dem = { LOC: 0, DOC: 0, DIEN: 0, XONG: 0, TON: 0 };
  console.log(`Lô ${ds.length} hồ sơ — thư mục làm việc: ${path.resolve(ts['thu-muc-lam-viec'])}\n`);
  for (const hs of ds) {
    const tt = trangThai(ts, hs);
    dem[tt]++;
    let ghi = '';
    if (tt === 'TON') ghi = (docJson(path.join(thuMucHoSo(ts['thu-muc-lam-viec'], hs.ten), 'ton.json')) || {}).ly_do || '';
    else if (tt === 'XONG') {
      const d = docJson(path.join(thuMucHoSo(ts['thu-muc-lam-viec'], hs.ten), 'da_dien.json')) || {};
      ghi = `→ ${d.thu_muc_ket_qua}${d.so_o_can_dien ? `   (${d.so_o_can_dien} ô cần điền)` : ''}`;
    } else {
      ghi = vuongMacRo(banDo, hs.ro) || '';
    }
    console.log(`  ${tt.padEnd(5)} ${hs.ten.padEnd(40)} ${ghi}`);
  }
  console.log(`\n${dem.XONG} xong · ${dem.TON} tồn · ${dem.LOC + dem.DOC + dem.DIEN} chưa làm`);
  if (dem.LOC + dem.DOC + dem.DIEN) console.log('Chạy --tiep để làm hồ sơ kế tiếp.');
}

function tongKet(ts, ds) {
  const xong = [], ton = [];
  for (const hs of ds) {
    const tm = thuMucHoSo(ts['thu-muc-lam-viec'], hs.ten);
    const dd = docJson(path.join(tm, 'da_dien.json'));
    const tn = docJson(path.join(tm, 'ton.json'));
    if (dd) xong.push({ ...hs, ...dd, duong_dan_dich: dd.pdf_nguon || hs.pdf });
    else ton.push({ ...hs, ly_do: (tn && tn.ly_do) || `dừng ở bước ${trangThai(ts, hs)}`, duong_dan_dich: hs.pdf });
  }

  const bc = ['# Kết quả soạn văn bản (cuốn chiếu)', ''];
  bc.push(`- Lô: ${ds.length} hồ sơ — soạn xong ${xong.length}, còn tồn ${ton.length}`);
  const tongO = xong.reduce((s, x) => s + (x.so_o_can_dien || 0), 0);
  bc.push(`- Tổng ô «CẦN ĐIỀN» còn lại: **${tongO}** — phải điền hết trước khi trình ký`, '');
  bc.push('## Đã soạn xong', '');
  if (xong.length) {
    bc.push('| Hồ sơ | Rổ | Thư mục kết quả | Ô cần điền |', '|---|---|---|---|');
    for (const x of xong) bc.push(`| ${x.ten} | ${x.ro || ''} | ${x.thu_muc_ket_qua} | ${x.so_o_can_dien || ''} |`);
  } else bc.push('_Không có._');
  bc.push('', '## Chưa soạn được', '');
  if (ton.length) {
    bc.push('| Hồ sơ | Rổ | Vướng ở đâu |', '|---|---|---|');
    for (const t of ton) bc.push(`| ${t.ten} | ${t.ro || ''} | ${t.ly_do} |`);
  } else bc.push('_Không có._');

  fs.mkdirSync(ts['goc-ra'], { recursive: true });
  const bcPath = path.join(ts['goc-ra'], 'ket_qua_cuon_chieu.md');
  fs.writeFileSync(bcPath, bc.join('\n') + '\n', 'utf8');

  const ps = sinhLenhDonDep(ts['goc-ra'], ts['goc-da-phan-loai'], xong, ton);
  console.log(`${xong.length} xong / ${ton.length} tồn — báo cáo: ${bcPath}`);
  if (tongO) console.log(`CÒN ${tongO} Ô «CẦN ĐIỀN» trong các văn bản đã sinh. Chưa trình ký được.`);
  if (ps) console.log(`Script dọn bản scan: ${ps} (kèm CHAY_DON_DEP_SAU_SOAN.bat)`);
  else console.log('Không sinh script dọn — thiếu --goc-da-phan-loai.');
}

/* -------------------------------------------------------------------- main ---- */

function main() {
  const ts = docThamSo(process.argv);
  if (!ts['thu-muc-lam-viec'] || !ts['goc-ra']) {
    console.error('Cần --thu-muc-lam-viec và --goc-ra. Xem hướng dẫn ở đầu file.');
    process.exit(2);
  }
  const banDo = JSON.parse(fs.readFileSync(path.join(GOC_SKILL, 'assets/ban_do_ro_mau.json'), 'utf8'));

  const ds = ts['khoi-tao'] ? khoiTao(ts) : docLo(ts);

  if (ts.ton) {
    const tm = thuMucHoSo(ts['thu-muc-lam-viec'], ts.ton);
    fs.mkdirSync(tm, { recursive: true });
    fs.writeFileSync(path.join(tm, 'ton.json'),
      JSON.stringify({ ly_do: ts['ly-do'] || 'không ghi lý do', luc: new Date().toISOString() }, null, 2), 'utf8');
    console.log(`Đã xếp "${ts.ton}" vào đống tồn: ${ts['ly-do'] || '(không ghi lý do)'}`);
    return;
  }
  if (ts.dien) return dien(ts, ds);
  if (ts['tong-ket']) return tongKet(ts, ds);
  if (ts.tiep || ts['khoi-tao']) return inViecTiepTheo(ts, ds, banDo);
  return inBang(ts, ds, banDo);
}

if (require.main === module) main();
