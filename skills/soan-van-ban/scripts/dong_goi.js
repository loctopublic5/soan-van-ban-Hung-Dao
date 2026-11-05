#!/usr/bin/env node
/**
 * dong_goi.js — Đóng gói skill thành một file .zip để tải lên tài khoản Claude.
 *
 * VÌ SAO ĐÂY LÀ ĐƯỜNG PHÁT HÀNH DUY NHẤT: skill tải lên tài khoản Claude mang theo được
 * cả script lẫn mẫu .docx, được đồng bộ xuống mọi thiết bị của người tải lên, và chia sẻ
 * được cho đồng nghiệp hoặc cả tổ chức — người được chia sẻ tự nhận bản mới ở lần dùng
 * kế tiếp. Không ai phải git pull, không ai phải chép thư mục, không ai phải cài gì nếu
 * dùng trong khung chat claude.ai (ở đó có sẵn Node và poppler).
 *
 * Chính vì một lần tải lên là đến tay tất cả mọi người, file .zip phải qua kiểm tra trước
 * khi ra đời. Ngày 11/09/2026, một mẫu hỏng cấu trúc đã được tải lên tài khoản và mọi
 * người dùng đều nhận văn bản Word không mở được. Script này chặn đúng loại lỗi đó.
 *
 * Dùng (trên bản gốc của người bảo trì):
 *   node scripts/dong_goi.js
 *   node scripts/dong_goi.js --ra "D:\phat hanh"
 *
 * KIỂM TRƯỚC KHI ĐÓNG — hỏng một mục là không ra file .zip:
 *   1. cú pháp mọi script
 *   2. mọi file JSON đọc được
 *   3. mọi mẫu sạch: đúng cấu trúc XML, không sót dữ kiện hồ sơ gốc (kiem_tra_mau.js)
 *   4. mọi file mà ban_do_ro_mau.json khai đều có mặt
 *   5. không có số căn cước thật lọt vào gói
 *   6. khuôn câu rút từ bảng thay (assets/khuon_cau.json, sinh lúc đóng gói) không còn họ
 *      tên, địa chỉ nơi ở hay số giấy tờ — soát bằng bộ kiểm độc lập với bộ xoá
 *   7. không file nào (script, tài liệu, cấu hình) nhắc tới họ tên người trong hồ sơ đã ký
 *
 * CHỈ ĐÓNG NHỮNG GÌ CẦN LÚC CHẠY. Bảng thay (bang_thay_*.json) và bản đã ký gốc
 * (assets/nguon_da_ky/) chỉ cần lúc LÀM MẪU, mà lại chứa nguyên họ tên, số căn cước, địa
 * chỉ của người dân trong hồ sơ gốc. Đóng vào gói là phát tán dữ liệu đó tới mọi người
 * được chia sẻ skill. Chúng ở lại trong bản gốc của người bảo trì. Thư mục .git cũng vậy:
 * nó mang theo lịch sử commit và email của người commit.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const L = require('./docx_lib.js');
const { khuonCau, conDuLieuCaNhan, conDuKienCu, hoTenTrongBanDaKy } = require('./sinh_khuon_cau.js');

const GOC = path.resolve(__dirname, '..');
// Skill này nằm trong một plugin (<plugin>/skills/<skill>/) thì đóng cả plugin: mọi skill
// anh em (soan-tra-lai) dùng chung script và mẫu của skill này qua đường dẫn ../soan-van-ban/.
const PLUGIN = path.resolve(GOC, '../..');
const CO_PLUGIN = fs.existsSync(path.join(PLUGIN, '.claude-plugin/plugin.json'));

function docThamSo(argv) {
  const ts = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) ts[argv[i].slice(2)] = argv[++i];
  }
  return ts;
}

/** Tên skill lấy từ SKILL.md: thư mục gốc trong .zip phải trùng đúng tên này, lệch là
 *  claude.ai từ chối nhận ("Skill folder name doesn't match the skill name"). */
function tenSkill(thuMuc = GOC) {
  const s = fs.readFileSync(path.join(thuMuc, 'SKILL.md'), 'utf8');
  const m = s.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const ten = m && (m[1].match(/^name:\s*(.+)$/m) || [])[1];
  if (!ten) throw new Error('SKILL.md thiếu dòng "name:" trong phần đầu ---');
  return ten.trim();
}

/** Danh sách file đưa vào gói, dạng đường dẫn tương đối kiểu "scripts/lam_ngay.js". */
function danhSachDongGoi() {
  const LAY = [
    (p) => p === 'SKILL.md',
    (p) => /^scripts\/[^/]+\.js$/.test(p),
    (p) => /^references\/[^/]+\.md$/.test(p),
    (p) => /^assets\/[^/]+\.json$/.test(p),
    (p) => /^assets\/mau\/.+\.docx$/.test(p),
  ];
  const ra = [];
  const duyet = (tuongDoi) => {
    for (const m of fs.readdirSync(path.join(GOC, tuongDoi), { withFileTypes: true })) {
      const p = tuongDoi ? `${tuongDoi}/${m.name}` : m.name;
      if (m.isDirectory()) { if (!['.git', 'dist', 'node_modules'].includes(m.name)) duyet(p); }
      else if (LAY.some((f) => f(p)) && p !== 'assets/khuon_cau.json') ra.push(p);
    }
  };
  duyet('');
  return ra.sort();
}

/** Các skill khác trong cùng plugin: chỉ SKILL.md và tài liệu .md của chúng — script, mẫu
 *  nằm ở skill này. */
function skillAnhEm() {
  if (!CO_PLUGIN) return [];
  return fs.readdirSync(path.join(PLUGIN, 'skills'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && path.join(PLUGIN, 'skills', d.name) !== GOC)
    .map((d) => {
      const thuMuc = path.join(PLUGIN, 'skills', d.name);
      const file = fs.readdirSync(thuMuc).filter((f) => f.endsWith('.md')).sort();
      return { thuMuc: d.name, ten: tenSkill(thuMuc), file, duong: thuMuc };
    });
}

/* ------------------------------------------------------------------- kiểm ---- */

function kiem(dsFile) {
  const loi = [];

  for (const f of dsFile.filter((x) => x.endsWith('.js'))) {
    try { execFileSync(process.execPath, ['--check', path.join(GOC, f)], { stdio: 'pipe' }); }
    catch (e) { loi.push(`cú pháp ${f}: ${String(e.stderr).split('\n').find((d) => d.trim()) || e.message}`); }
  }

  for (const f of dsFile.filter((x) => x.endsWith('.json'))) {
    try { JSON.parse(fs.readFileSync(path.join(GOC, f), 'utf8')); }
    catch (e) { loi.push(`JSON ${f}: ${e.message}`); }
  }

  try {
    execFileSync(process.execPath, [path.join(__dirname, 'kiem_tra_mau.js'), '--tat-ca'], { stdio: 'pipe' });
  } catch (e) {
    const tong = String(e.stdout || '').split('\n').find((d) => d.startsWith('Tổng:')) || 'có lỗi';
    loi.push(`mẫu chưa sạch — ${tong}. Chạy node scripts/kiem_tra_mau.js --tat-ca để xem.`);
  }

  const banDo = JSON.parse(fs.readFileSync(path.join(GOC, 'assets/ban_do_ro_mau.json'), 'utf8'));
  for (const [ten, bo] of Object.entries(banDo.bo_mau)) {
    for (const vb of bo.van_ban) {
      if (!dsFile.includes(`assets/${vb.mau}`)) loi.push(`bộ mẫu ${ten} khai ${vb.mau} nhưng không có file`);
    }
  }

  // Mọi tên gọi khai trong ban_do phải về đúng bộ mẫu của nó (hoặc là tên cố ý mơ hồ có bộ
  // đó trong danh sách hỏi lại). Một tên gọi trả lại mà khớp sang bộ BC-TB-PC — hay ngược lại
  // — là cả lô ra nhầm loại văn bản.
  const { chonBoMau } = require('./lam_ngay.js');
  for (const [ten, bo] of Object.entries(banDo.bo_mau)) {
    for (const g of bo.ten_goi_khac || []) {
      const c = chonBoMau(banDo, g);
      if (c.ten !== ten && !(c.loi === 'nhieu-ket-qua' && c.cac.includes(ten))) loi.push(`tên gọi "${g}" của ${ten} lại chọn ra ${c.ten || c.loi}`);
    }
  }

  // Hai thư mục nguồn của phòng: đổi tên là kết quả về sai chỗ hoặc mẫu trả lại lọt vào hs chuyển.
  const { nguonHoSo, tenTheoNguon } = require('./lam_ngay.js');
  const nguonThu = (p) => (nguonHoSo(p) || {}).ketQua;
  if (nguonThu('D:/x/HS Chuyển/lô/a.pdf') !== 'kết quả chuyển' || nguonThu('D:/x/hs trả lại') !== 'kết quả trả lại'
    || nguonThu('D:/x/hs chuyển.pdf') || tenTheoNguon('vi phạm', nguonHoSo('D:/hs trả lại')) !== 'trả lại vi phạm'
    || tenTheoNguon('trang 4', nguonHoSo('D:/hs chuyển')) !== 'trang 4') {
    loi.push('nguonHoSo/tenTheoNguon không còn nhận đúng "hs chuyển", "hs trả lại"');
  }

  // Trả lời CCTT: sai đếm, sai gộp hay lọt GCN không đúng trường hợp là văn bản ký ra vẫn đọc xuôi.
  const { dongHoSo, cacVanBan, chiaNhom, loiNhom, MAU } = require('./soan_cctt.js');
  const phieu = (so, xa, ngay, them) => ({ so_van_ban: so, ngay_van_ban: ngay, co_quan: `Phòng A - UBND xã ${xa}`, so_gcn: 'S 1',
    co_quan_cap: 'UBND huyện X', ngay_cap: '01/02/2004', nguoi_duoc_cap: 'ông A', ...them });
  const p1 = phieu('1/A', 'B', '02/11/2026'), p2 = phieu('2/C', 'B', '02/11/2026', { co_quan: 'phòng a – UBND xã B' });
  const p3 = phieu('3/A', 'D', '03/11/2026');
  const moc = '31/3/2015';
  if (chiaNhom([p1, p2, p3]).length !== 2 || chiaNhom([p1, p2, p3], true).length !== 3
    || chiaNhom([{ ...p1, nhom: 'x' }, { ...p2, nhom: 'y' }]).length !== 2
    || cacVanBan([p1, p2]) !== 'các Văn bản số: 1/A, 2/C ngày 02/11/2026'
    || cacVanBan([p1, p3]) !== 'các Văn bản số: 1/A ngày 02/11/2026, 3/A ngày 03/11/2026'
    || cacVanBan([p1]) !== 'Văn bản số 1/A ngày 02/11/2026'
    || /thửa/.test(dongHoSo(p1)) || !/thửa đất số 5, tờ bản đồ số 6/.test(dongHoSo({ ...p1, so_thua: '5', so_to: '6' }))
    || !/«CẦN ĐIỀN: so_gcn»/.test(dongHoSo({ ...p1, so_gcn: '' }))
    || loiNhom([p1, p2], MAU['không có scan'], moc).length
    || !loiNhom([p1, p3], MAU['không có scan'], moc).length
    || !loiNhom([{ ...p1, ngay_cap: '31/03/2015' }], MAU['không có scan'], moc).length) {
    loi.push('soan_cctt.js không còn gộp, ghép câu hoặc chặn mẫu đúng');
  }

  for (const sk of skillAnhEm()) {
    if (sk.ten !== sk.thuMuc) loi.push(`skills/${sk.thuMuc}/SKILL.md mang name "${sk.ten}" — phải trùng tên thư mục`);
  }

  for (const f of dsFile.filter((x) => /\.(md|json|js)$/.test(x))) {
    const m = fs.readFileSync(path.join(GOC, f), 'utf8').match(/\b0\d{11}\b/);
    if (m) loi.push(`${f} chứa một dãy trông như số căn cước (${m[0].slice(0, 4)}********) — gỡ ra trước khi phát hành`);
  }

  // Họ tên người dân trong các bản đã ký không được có mặt ở BẤT KỲ file nào vào gói —
  // mã nguồn và tài liệu cũng vậy, không riêng khuôn câu. Tên thật từng lọt vào chú thích
  // và ví dụ (15/09/2026) mà ba cửa kiểm trên đều không thấy, vì chúng không tìm tên.
  const tenThat = [...hoTenTrongBanDaKy()];
  const canSoatTen = [
    ...dsFile.filter((x) => /\.(md|json|js)$/.test(x)).map((f) => [f, path.join(GOC, f)]),
    ...skillAnhEm().flatMap((sk) => sk.file.map((f) => [`skills/${sk.thuMuc}/${f}`, path.join(sk.duong, f)])),
  ];
  for (const [f, duong] of canSoatTen) {
    const chu = fs.readFileSync(duong, 'utf8').normalize('NFC');
    const gap = tenThat.filter((t) => chu.includes(t.normalize('NFC')));
    if (gap.length) loi.push(`${f} nhắc tới người trong hồ sơ đã ký: ${gap.slice(0, 3).join(', ')}${gap.length > 3 ? '…' : ''} — thay bằng tên giả (Nguyễn Văn A)`);
  }

  // Khuôn câu rút từ bảng thay (có dữ liệu thật) — soát độc lập xem đã xoá hết họ tên,
  // địa chỉ, số giấy tờ chưa. Sót một cái là không đóng gói: gói đến tay mọi người dùng.
  for (const l of conDuLieuCaNhan(khuonCau())) loi.push(`khuôn câu ${l}`);
  // Số thửa, tên xã… của hồ sơ gốc không chỉ ra được ai nên chỉ cảnh báo, không chặn.
  for (const l of conDuKienCu(khuonCau())) console.log(`  Cảnh báo: khuôn còn dữ kiện hồ sơ gốc — ${l}`);

  // ghiZip không bật cờ UTF-8 cho tên file trong .zip, nên tên phải là ASCII — nếu không
  // thì giải nén trên Linux (máy chủ claude.ai) ra tên méo.
  for (const f of dsFile) if (/[^\x20-\x7e]/.test(f)) loi.push(`tên file có dấu: ${f}`);

  return loi;
}

/* -------------------------------------------------------------- phiên bản ---- */

function phienBan() {
  const hom = new Date();
  const ngay = `${hom.getFullYear()}.${String(hom.getMonth() + 1).padStart(2, '0')}.${String(hom.getDate()).padStart(2, '0')}`;
  let commit = null;
  let chuaCommit = false;
  try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: GOC, encoding: 'utf8' }).trim();
    chuaCommit = execFileSync('git', ['status', '--porcelain'], { cwd: GOC, encoding: 'utf8' }).trim() !== '';
  } catch { /* không có git — vẫn đóng được, chỉ mất dấu vết */ }
  return {
    phien_ban: `${ngay}${commit ? `-${commit}` : ''}${chuaCommit ? '-chua-commit' : ''}`,
    dong_goi_luc: hom.toISOString(),
    commit,
    co_thay_doi_chua_commit: chuaCommit,
    _ghi_chu: 'Sinh tự động bởi scripts/dong_goi.js. Khi người dùng báo lỗi, hỏi số phiên bản này trước — nó chỉ đúng bản mà họ đang chạy.',
  };
}

/* ---------------------------------------------------------------- đóng zip ---- */

function ngayGioDOS(d) {
  return {
    thoiGian: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    ngay: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function mucZip(ten, noiDung, luc) {
  const { thoiGian, ngay } = ngayGioDOS(luc);
  return { ten, cach: 8, thoiGian, ngay, crc: L.tinhCRC(noiDung), coGoc: noiDung.length,
    duLieuNen: zlib.deflateRawSync(noiDung, { level: 9 }) };
}

function main() {
  const ts = docThamSo(process.argv);
  const ten = tenSkill();
  const dsFile = danhSachDongGoi();

  console.log(`Skill: ${ten} — ${dsFile.length} file cần đóng gói\n`);
  console.log('Kiểm trước khi đóng…');
  const loi = kiem(dsFile);
  if (loi.length) {
    console.error(`\nKHÔNG ĐÓNG GÓI — ${loi.length} lỗi. Bản này mà tải lên là đến tay mọi người dùng:\n`);
    for (const l of loi) console.error(`  ✗ ${l}`);
    process.exit(1);
  }
  console.log('  ✓ cú pháp script · JSON · mẫu sạch · đủ file khai báo · không có số căn cước · khuôn câu đã xoá dữ liệu cá nhân · không file nào nhắc tên người trong hồ sơ\n');

  const pb = phienBan();
  const luc = new Date();
  // Nội dung một skill: file trên đĩa + hai file sinh lúc đóng (khuôn câu, phiên bản).
  const noiDungSkill = (dau) => [
    ...dsFile.map((f) => mucZip(`${dau}/${f}`, fs.readFileSync(path.join(GOC, f)), luc)),
    mucZip(`${dau}/assets/khuon_cau.json`, Buffer.from(JSON.stringify(khuonCau(), null, 2), 'utf8'), luc),
    mucZip(`${dau}/assets/phien_ban.json`, Buffer.from(JSON.stringify(pb, null, 2), 'utf8'), luc),
  ];

  const thuMucRa = path.resolve(ts.ra || path.join(CO_PLUGIN ? PLUGIN : GOC, 'dist'));
  fs.mkdirSync(thuMucRa, { recursive: true });

  /** Ghi rồi đọc ngược: đếm đủ mục và SKILL.md nằm đúng chỗ — claude.ai tìm nó ở
   *  <tên skill>/SKILL.md, lệch một tầng thư mục là tải lên bị từ chối. */
  const ghi = (fileRa, cacMuc, phaiCo) => {
    fs.mkdirSync(path.dirname(fileRa), { recursive: true });
    L.ghiZip(fileRa, cacMuc, {});
    const docLai = L.docZip(fileRa);
    if (docLai.length !== cacMuc.length || phaiCo.some((p) => !docLai.some((m) => m.ten === p))) {
      console.error(`File ${fileRa} ghi ra không đọc lại được đúng — đừng tải lên.`);
      process.exit(1);
    }
    console.log(`Đã đóng gói: ${fileRa}  (${(fs.statSync(fileRa).size / 1024).toFixed(0)} KB, ${docLai.length} file)`);
  };

  if (CO_PLUGIN) {
    // Plugin: .claude-plugin/plugin.json ở gốc, mỗi skill một thư mục skills/<tên>/.
    const tenPlugin = JSON.parse(fs.readFileSync(path.join(PLUGIN, '.claude-plugin/plugin.json'), 'utf8')).name;
    const anhEm = skillAnhEm();
    const cacMuc = [
      mucZip('.claude-plugin/plugin.json', fs.readFileSync(path.join(PLUGIN, '.claude-plugin/plugin.json')), luc),
      ...noiDungSkill(`skills/${ten}`),
      ...anhEm.flatMap((sk) => sk.file.map((f) => mucZip(`skills/${sk.ten}/${f}`, fs.readFileSync(path.join(sk.duong, f)), luc))),
    ];
    ghi(path.join(thuMucRa, `${tenPlugin}.zip`), cacMuc,
      ['.claude-plugin/plugin.json', `skills/${ten}/SKILL.md`, ...anhEm.map((sk) => `skills/${sk.ten}/SKILL.md`)]);
    console.log(`  plugin "${tenPlugin}": ${[ten, ...anhEm.map((sk) => sk.ten)].join(' + ')}`);
  }
  // Skill lẻ: dự phòng khi tài khoản chưa tải được plugin — riêng skill này vẫn soạn đủ cả
  // BC-TB-PC lẫn trả lại (gọi "trả lại …"), chỉ thiếu lối gọi /soan-tra-lai.
  ghi(path.join(thuMucRa, CO_PLUGIN ? 'skill-le' : '', `${ten}.zip`), noiDungSkill(ten), [`${ten}/SKILL.md`]);

  console.log(`Phiên bản:   ${pb.phien_ban}`);
  if (pb.co_thay_doi_chua_commit) {
    console.log('\n! Thư mục còn thay đổi chưa commit — bản này không ứng với commit nào, khó truy lại khi có lỗi.');
    console.log('  Nên commit trước rồi đóng gói lại.');
  }
  if (CO_PLUGIN) {
    console.log('\nTải file plugin .zip lên mục Plugins của Claude (Customize → Plugins → tải lên); lần sau tải bản mới đè đúng plugin đó.');
    console.log('Tài khoản chưa có mục tải plugin thì dùng skill-le/*.zip ở mục Skills như trước:');
  } else {
    console.log('\nTải lên bản mới vào ĐÚNG skill đang có (giữ nguyên tên, đừng xoá rồi thêm lại):');
  }
  console.log('  skill của riêng bạn / chia sẻ đích danh → https://claude.ai/customize/skills');
  console.log('  skill cấp cho cả tổ chức               → https://claude.ai/admin-settings/skills');
  console.log(`Rồi mở một cuộc trò chuyện mới, nhờ Claude chạy thong_ke_mau.js: phải thấy phiên bản ${pb.phien_ban}.`);
  console.log('Đồng nghiệp tự nhận bản mới ở lần dùng kế tiếp — không ai phải tải gì về.');
}

if (require.main === module) main();
