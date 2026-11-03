#!/usr/bin/env node
/**
 * tao_bo_van_ban.js — Sinh trọn bộ văn bản cho MỘT hồ sơ, đặt tên và xếp thư mục
 * theo đúng quy chuẩn của Chi nhánh.
 *
 * Dùng:
 *   node tao_bo_van_ban.js --du-lieu ho_so.json --goc-ra "D:\\ket qua"
 *   node tao_bo_van_ban.js --du-lieu ho_so.json --goc-ra out \\
 *     --goc-ra-may "C:\\Users\\Admin\\Desktop\\tEST\\Ket qua" --lenh-don don.ps1
 *
 * ho_so.json phải có tối thiểu:
 *   ma_ho_so         "H26.103.25.19-260519-0009"
 *   ro_du_lieu       "Chuyển nhượng - Trang 4"      (rổ từ skill phân loại)
 *   ten_nguoi_ho_so  "Nguyễn Văn A"              (người đề nghị giải quyết)
 *   pdf_nguon        đường dẫn bản scan trên máy người dùng (để sinh lệnh dọn)
 * cộng với các biến mà mẫu cần (xem references/bien-so.md).
 *
 * QUY CHUẨN ĐẶT TÊN
 *   Mã ngắn = phần đuôi của mã hồ sơ: "H26.103.25.19-260519-0009" → "260519-0009".
 *   Thư mục kết quả:  "<mã ngắn> <tên chủ> - <loại biến động>"
 *                     vd: 260519-0009 Nguyễn Văn A - Tách thửa tặng cho
 *   Tên file:         "<mã văn bản> <mã ngắn>.docx"      vd: BC 260519-0009.docx
 *   KHÔNG có mã hồ sơ: bỏ mã — "Nguyễn Văn A - Trả lại vi phạm\TB-TL Nguyễn Văn A.docx".
 *   chay_cuon_chieu.js, chay_hang_loat.js đọc lại tên thư mục từ dòng "Thư mục:" in ra ở đây.
 *   Mã hồ sơ do hệ thống một cửa cấp, không có trong bản scan; bịa một mã trông như thật
 *   thì nguy hiểm hơn là không có mã, vì nó sẽ được chép sang mọi bước sau.
 * Mã văn bản (BC, TB, PC, TBS, BC-TD) lấy từ assets/ban_do_ro_mau.json, nên thêm loại
 * văn bản mới chỉ cần sửa file cấu hình đó.
 *
 * VỀ BẢN SCAN GỐC
 * Script KHÔNG xoá gì. Nó sinh thêm lệnh PowerShell để *chuyển* bản scan vào chính thư
 * mục kết quả của hồ sơ đó. Thư mục "Đã phân loại" vì thế vơi dần đúng như một hàng
 * đợi, mà bản gốc vẫn nằm cạnh các văn bản sinh ra từ nó — sau này tra ngược còn thấy
 * căn cứ. Xoá hẳn một bản scan hồ sơ đất đai là việc không có đường lùi, nên để người
 * dùng tự quyết sau khi đã kiểm tra kết quả.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./docx_lib.js');
const { tronVaoHoSo } = require('./ghep_cau.js');
const { ghiSo, khoaHoSo, bam } = require('./so_ho_so.js');

/** Số chỗ «CẦN ĐIỀN» còn trong một file đã sinh — đếm thẳng trong file, nên tính cả chỗ
 *  thiếu nằm GIỮA một câu ghép (vd. seri GCN chưa in), không chỉ các ô bỏ trống. */
function demCanDien(file) {
  try {
    const cacMuc = L.docZip(file);
    return L.cacPhanCoChu(cacMuc).reduce((s, ten) => s + (L.chuPhang(L.layNoiDung(cacMuc, ten)).match(/«CẦN ĐIỀN/g) || []).length, 0);
  } catch { return 0; }
}

function docThamSo(argv) {
  const ts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) ts[a.slice(2)] = argv[++i];
  }
  return ts;
}

/** "H26.103.25.19-260519-0009" → "260519-0009". Giữ nguyên nếu không khớp dạng. */
function maNgan(ma) {
  const m = String(ma || '').match(/(\d{6}-\d{4})\s*$/);
  return m ? m[1] : String(ma || '').trim();
}

/** Lấy tên file cuối đường dẫn Windows. Không dùng path.basename: script chạy trên
 *  Linux thì nó không coi dấu \\ là dấu phân cách, trả về nguyên cả đường dẫn. */
function tenCuoi(p) {
  return String(p || '').replace(/\//g, '\\').replace(/\\+$/, '').split('\\').pop();
}

/** Loại biến động cho tên thư mục: "Tách thửa tặng cho", "Tặng cho trang 4", "Trả lại vi phạm".
 *  Bộ mẫu dùng chung cho nhiều giao dịch khai "ten_thu_muc" có chỗ {giao_dich|mặc định}; bộ
 *  khác lấy tên gọi đầu tiên của nó — chính là tên cán bộ gõ khi gọi mẫu. */
function tenBienDong(boMau, giaoDich) {
  const mau = boMau.ten_thu_muc || (boMau.ten_goi_khac || [])[0] || '';
  const s = mau.replace(/\{giao_dich\|?([^}]*)\}/, (_, macDinh) => String(giaoDich || '').trim() || macDinh).trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Tên chủ cho tên thư mục: bỏ danh xưng và người ủy quyền — "hộ ông Nguyễn Văn A (UQ: …)" →
 *  "Nguyễn Văn A". Thông báo trả lại chỉ có nguoi_de_nghi viết như giữa câu. */
function tenChu(s) {
  return String(s || '').replace(/\(UQ:[^)]*\)/gi, '').replace(/^\s*(hộ\s+)?(ông|bà)\s+/i, '').trim();
}

/** Bỏ ký tự Windows không cho phép trong tên file/thư mục. */
function tenAnToan(s) {
  return String(s || '').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
}

/* --------------------------------------------------- kiểm số Giấy chứng nhận ---- */

const RE_SERI = /\b[A-Z]{2}\s?\d{6,8}\b/g;
const chuanSeri = (s) => s.replace(/\s+/g, '').replace(/^([A-Z]{2})/, '$1 ');
const seriTrong = (v) => ((Array.isArray(v) ? v.join(' ') : String(v || '')).match(RE_SERI) || []).map(chuanSeri);

/**
 * Chặn loại sai nguy hiểm nhất khi đọc thông tin GCN mới từ bản scan: lấy nhầm số của GCN
 * CŨ (tờ sắp bị thu hồi) làm số GCN MỚI. Hai tờ nằm cạnh nhau trong cùng bộ hồ sơ, cùng
 * thửa, cùng chủ, chỉ khác số seri — đọc lướt là lẫn. Sai kiểu này thì văn bản vẫn trôi
 * chảy, người ký không có cách nào nhận ra, và cơ quan cấp phôi mới là nơi phát hiện.
 *
 * GCN mới LUÔN mang số seri khác GCN bị thu hồi — đó là bất biến, không có ngoại lệ — nên
 * trùng một lần là chặn, không cảnh báo cho qua. Chỉ xét số đứng ở vị trí "số mới" theo
 * công thức câu của Chi nhánh: sau "cấp giấy chứng nhận", sau "Số" đầu mục, sau "seri GCN".
 * Số cũ vẫn được phép xuất hiện ở chỗ khác (vd. "tách ra từ … tại GCN số AA …").
 */
function kiemSoGCN(d) {
  const cu = new Set([...seriTrong(d.gcn_cu_so), ...seriTrong(d.gcn_cu_so_dau_cham_phay)]);
  if (!cu.size) return null;

  const moi = [];
  for (const k of ['gcn_moi_so', 'cau_seri_gcn_moi']) for (const s of seriTrong(d[k])) moi.push({ s, o: k });

  const thuHoi = String(d.cau_thu_hoi_cap_moi || '');
  const iCap = thuHoi.search(/cấp\s+(?:giấy\s+chứng\s+nhận|GCN)/i);
  const soCap = iCap >= 0 ? seriTrong(thuHoi.slice(iCap)) : [];
  for (const s of soCap) moi.push({ s, o: 'cau_thu_hoi_cap_moi' });

  for (const k of ['cau_danh_sach_gcn_cap', 'cau_danh_sach_gcn_cap_chi_tiet']) {
    const s = Array.isArray(d[k]) ? d[k].join('\n') : String(d[k] || '');
    for (const m of s.matchAll(/(?:\bSố|seri(?:\s+GCN)?)\s+([A-Z]{2}\s?\d{6,8})/g)) moi.push({ s: chuanSeri(m[1]), o: k });
  }

  const trung = [...new Set(moi.filter((x) => cu.has(x.s)).map((x) => `${x.s} ở ${x.o}`))];
  if (trung.length) {
    return `số GCN MỚI trùng số GCN CŨ (${trung.join('; ')}). GCN mới luôn mang số seri khác tờ bị thu hồi — `
      + 'gần như chắc chắn đã đọc nhầm GCN cũ. Đọc lại tờ GCN mới trong bản scan; không có thì để trống ô đó.';
  }
  const lap = soCap.filter((s, i) => soCap.indexOf(s) !== i);
  if (lap.length) return `câu thu hồi ghi cùng một số GCN mới cho hai người (${[...new Set(lap)].join(', ')}) — mỗi người nhận một tờ riêng.`;
  return null;
}

/** Phiên bản skill (gói mới ghi vào assets/phien_ban.json) — để sổ biết lượt nào chạy bằng bản nào. */
function phienBan() {
  try {
    return JSON.parse(fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'assets/phien_ban.json'), 'utf8')).phien_ban || '';
  } catch { return ''; }
}

/**
 * Ghi một lượt vào SỔ HỒ SƠ (<goc-ra>/_so_ho_so). Gom về một chỗ để mọi lối ra — sinh xong,
 * thiếu văn bản, bị chặn vì số GCN, rổ chưa có mẫu — đều để lại đúng một dòng cùng dạng. Nhờ
 * vậy "đã soạn bao nhiêu bộ, hỏng bao nhiêu, hồ sơ nào chạy đi chạy lại" trả lời được bằng
 * số thật chứ không phải đếm thư mục. Sổ hỏng thì im lặng bỏ qua — xem so_ho_so.js.
 */
function vaoSo(ts, duLieu, them) {
  const kq = ghiSo(ts['goc-ra'], {
    ma_ho_so: String(duLieu.ma_ho_so || ''),
    ten: String(duLieu.ten_nguoi_ho_so || ''),
    khoa: khoaHoSo(duLieu),
    // Vân tay của dữ kiện: lượt sau trùng vân tay là chạy lại y hệt (thử lại), khác vân tay
    // là đã sửa dữ liệu rồi chạy lại.
    van_tay: bam(JSON.stringify(duLieu.du_kien || duLieu)),
    phien_ban: phienBan(),
    ...them,
  });
  if (kq && kq.moi) console.log(`\nSổ hồ sơ: ${kq.file}  (xem thống kê: node scripts/so_ho_so.js)`);
}

function main() {
  const ts = docThamSo(process.argv);
  if (!ts['du-lieu'] || !ts['goc-ra']) {
    console.error('Cần --du-lieu và --goc-ra. Xem hướng dẫn ở đầu file.');
    process.exit(2);
  }

  const gocSkill = path.resolve(__dirname, '..');
  const banDo = JSON.parse(fs.readFileSync(path.join(gocSkill, 'assets/ban_do_ro_mau.json'), 'utf8'));
  let duLieu = JSON.parse(fs.readFileSync(ts['du-lieu'], 'utf8'));

  // Bộ mẫu đến từ một trong hai đường: suy ra từ rổ của skill phân loại, hoặc do người
  // dùng chỉ định thẳng ("soạn file này bằng mẫu tách thửa"). Có "bo_mau" rồi thì không
  // đòi rổ nữa — bắt khai lại rổ chỉ để suy ra đúng thứ đã biết là thêm một chỗ để hai
  // bên nói khác nhau.
  const ro = duLieu.ro_du_lieu;
  if (!ro && !duLieu.bo_mau) {
    console.error('ho_so.json thiếu cả "ro_du_lieu" lẫn "bo_mau" — không biết dùng mẫu nào.');
    process.exit(2);
  }

  let khai = null;
  if (ro) {
    khai = banDo.ro_dung_bo_mau[ro];
    if (!khai) {
      console.error(`Rổ "${ro}" chưa khai trong ban_do_ro_mau.json.`);
      vaoSo(ts, duLieu, { ro, trang_thai: 'hong', ly_do: `rổ "${ro}" chưa khai trong ban_do_ro_mau.json` });
      process.exit(2);
    }
    // Rổ chưa có mẫu / chưa chọn được nhánh vẫn đi tiếp được NẾU người dùng đã chỉ định
    // thẳng bộ mẫu — chính là câu trả lời mà hai nhánh này đang chờ.
    if (!duLieu.bo_mau && khai.bo_mau === 'CHUA_CO_MAU') {
      console.error(`Rổ "${ro}" chưa có mẫu. ${khai.ghi_chu || 'Cần bổ sung mẫu trước.'}`);
      vaoSo(ts, duLieu, { ro, trang_thai: 'hong', ly_do: `rổ "${ro}" chưa có mẫu` });
      process.exit(3);
    }
    if (!duLieu.bo_mau && String(khai.bo_mau).startsWith('CAN_HOI')) {
      console.error(`Rổ "${ro}" chưa đủ căn cứ chọn bộ mẫu. ${khai.ghi_chu || ''}`);
      console.error('Hỏi người dùng rồi ghi thẳng "bo_mau" vào ho_so.json để chạy lại.');
      vaoSo(ts, duLieu, { ro, trang_thai: 'hong', ly_do: `rổ "${ro}" chưa chọn được bộ mẫu` });
      process.exit(3);
    }
  }

  const tenBoMau = duLieu.bo_mau || khai.bo_mau;
  const boMau = banDo.bo_mau[tenBoMau];
  if (!boMau) { console.error(`Không có bộ mẫu "${tenBoMau}".`); process.exit(2); }

  // Có khối du_kien thì mọi câu được GHÉP từ dữ kiện (ghep_cau.js), không lấy câu viết
  // tay — lý do nằm ở đầu ghep_cau.js. Ghép trước bước kiểm số GCN để kiểm đúng thứ sẽ in.
  let ghep = null;
  if (duLieu.du_kien) {
    ghep = tronVaoHoSo(duLieu, tenBoMau);
    duLieu = ghep.hoSo;
  }

  const loiGCN = kiemSoGCN(duLieu);
  if (loiGCN) {
    console.error(`LỖI DỮ LIỆU: ${loiGCN}`);
    console.error('Không sinh văn bản nào cho hồ sơ này — sửa ho_so.json rồi chạy lại.');
    vaoSo(ts, duLieu, { ro, bo_mau: tenBoMau, trang_thai: 'hong', ly_do: `chặn số GCN: ${loiGCN.slice(0, 120)}` });
    process.exit(3);
  }

  // Mã hồ sơ nằm ở hệ thống một cửa, không có trong bản scan. Khi chưa có mã, đặt tên
  // theo tên người trên hồ sơ thay vì bịa ra một mã — một mã sai còn tệ hơn không mã,
  // vì nó trông như thật và sẽ được chép sang các bước sau.
  const ma = maNgan(duLieu.ma_ho_so);
  const coMa = /^\d{6}-\d{4}$/.test(ma);
  // Thông báo trả lại không có du_kien để ghép ten_nguoi_ho_so — dùng người đề nghị.
  const tenNguoi = tenAnToan(tenChu(duLieu.ten_nguoi_ho_so || duLieu.nguoi_de_nghi || ''));
  if (!coMa && !tenNguoi) {
    console.error('Không có cả mã hồ sơ lẫn tên người — không đặt tên file được.');
    process.exit(2);
  }
  // Thư mục theo tên chủ và loại biến động (tổ Hưng Đạo, 03/11/2026): nhìn thư mục kết quả là
  // biết hồ sơ của ai, soạn theo mẫu nào — "Nguyễn Văn A - Tách thửa tặng cho". Có mã thì mã
  // đứng đầu, để hai hồ sơ cùng chủ cùng loại không đè lên nhau và thư mục xếp theo ngày nhận.
  const bienDong = tenAnToan(tenBienDong(boMau, duLieu.loai_giao_dich || (khai && khai.loai_giao_dich)));
  const chuVaBienDong = [tenNguoi, bienDong].filter(Boolean).join(' - ');
  const tenThuMuc = coMa ? tenAnToan(`${ma} ${chuVaBienDong}`) : chuVaBienDong;
  const dauTenFile = coMa ? ma : tenNguoi;
  const thuMucRa = path.join(ts['goc-ra'], tenThuMuc);
  fs.mkdirSync(thuMucRa, { recursive: true });
  // Khi soạn hộ một máy Windows, file được ghi tạm ở đây rồi mới chuyển sang máy đó,
  // nên lệnh PowerShell phải trỏ vào đường dẫn BÊN MÁY NGƯỜI DÙNG, không phải chỗ này.
  const thuMucRaMay = ts['goc-ra-may']
    ? `${String(ts['goc-ra-may']).replace(/\\+$/, '')}\\${tenThuMuc}`
    : thuMucRa;

  console.log(`Hồ sơ:    ${duLieu.ma_ho_so}`);
  console.log(`Rổ:       ${ro || '(người dùng chỉ định thẳng bộ mẫu)'}  →  bộ mẫu "${tenBoMau}" (${boMau.van_ban.length} văn bản)`);
  console.log(`Thư mục:  ${thuMucRa}`);
  if (ghep) {
    console.log(`Ghép câu: ${ghep.daGhep.length} ô từ du_kien`);
    if (ghep.daThay.length) console.log(`          thay câu viết tay bằng câu ghép: ${ghep.daThay.join(', ')}  (muốn giữ: ghi vào "giu_viet_tay")`);
    if (ghep.thieu.length) console.log(`          thiếu dữ kiện, đã để «CẦN ĐIỀN» đúng chỗ: ${ghep.thieu.join('; ')}`);
  }
  console.log('');

  const daLam = [];
  const thieuMau = [];
  let tongThieuO = 0;

  const tamCanXoa = [];
  // dien_mau.js đọc dữ liệu từ file: ghi bản đã trộn câu ghép ra một file tạm.
  let fileChung = ts['du-lieu'];
  if (ghep) {
    fileChung = path.join(thuMucRa, '.ho_so.ghep.tam.json');
    fs.writeFileSync(fileChung, JSON.stringify(duLieu, null, 2), 'utf8');
    tamCanXoa.push(fileChung);
  }
  for (const vb of boMau.van_ban) {
    const duongDanMau = path.join(gocSkill, 'assets', vb.mau);
    if (!fs.existsSync(duongDanMau)) {
      thieuMau.push(`${vb.ma} — chưa có mẫu tại assets/${vb.mau}`);
      continue;
    }

    // MỘT MẪU, NHIỀU BẢN. Có hồ sơ cần cùng một mẫu in ra nhiều lần với dữ liệu khác
    // nhau: tách thửa phân chia tài sản chung cho hai người thì mỗi người một Phiếu
    // chuyển thuế riêng, vì mỗi người nộp thuế trên đúng thửa của mình. Khai "lap_lai"
    // trỏ vào một mảng trong ho_so.json, mỗi phần tử thành một văn bản.
    let cacBan = [null];
    if (vb.lap_lai) {
      const ds = duLieu[vb.lap_lai];
      if (!Array.isArray(ds) || !ds.length) {
        // Không lặng lẽ sinh một bản: thiếu một Phiếu chuyển là hồ sơ tắc ở cơ quan
        // thuế, mà nhìn thư mục kết quả vẫn thấy "có PC rồi".
        thieuMau.push(`${vb.ma} — cần mảng "${vb.lap_lai}" trong ho_so.json (mỗi phần tử một bản)`);
        continue;
      }
      cacBan = ds;
    }

    cacBan.forEach((phan, i) => {
      // Dữ liệu của phần tử ghi đè lên dữ liệu chung; phần còn lại dùng chung.
      let fileDuLieu = fileChung;
      let tenFile = `${vb.ma} ${dauTenFile}.docx`;
      if (phan) {
        const { hau_to, ...rieng } = phan;
        fileDuLieu = path.join(thuMucRa, `.${vb.ma}-${i + 1}.tam.json`);
        fs.writeFileSync(fileDuLieu, JSON.stringify({ ...duLieu, ...rieng }, null, 2), 'utf8');
        tamCanXoa.push(fileDuLieu);

        // Bản lặp đặt tên theo NGƯỜI, không theo mã hồ sơ: câu đầu tiên người dùng hỏi
        // khi nhìn hai Phiếu chuyển trong cùng một thư mục là "phiếu này của ai". Mã
        // ngắn đã nằm ở tên thư mục cha nên nhắc lại trong tên file chỉ làm dài thêm.
        tenFile = `${vb.ma} ${tenAnToan(hau_to) || i + 1}.docx`;
      }

      let ketQua;
      try {
        ketQua = execFileSync('node', [
          path.join(__dirname, 'dien_mau.js'),
          '--mau', duongDanMau,
          '--du-lieu', fileDuLieu,
          '--ra', path.join(thuMucRa, tenFile),
        ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) {
        // Một văn bản hỏng thì báo đúng văn bản đó rồi làm tiếp các văn bản khác. Đưa
        // vào "CHƯA SINH ĐƯỢC" để bên gọi xếp cả hồ sơ sang đống tồn: thiếu một văn bản
        // trong bộ là hồ sơ chưa xong, dù các văn bản còn lại có ra đủ.
        // Nhặt dòng "LỖI:" do dien_mau.js tự in; không có thì lấy dòng "Error:" của Node.
        // Không nhặt theo từ khoá chung chung: stack trace của Node có kèm dòng mã nguồn,
        // mà dòng mã đó cũng chứa chữ "hỏng" và "Error".
        const dong = String(e.stderr || e.message).split('\n');
        const ly = dong.find((d) => /^LỖI:/.test(d)) || dong.find((d) => /^\w*Error:/.test(d)) || dong[0];
        thieuMau.push(`${tenFile} — ${ly.replace(/^(LỖI|\w*Error):\s*/, '').trim()}`);
        return;
      }

      const soThieu = demCanDien(path.join(thuMucRa, tenFile));
      tongThieuO += soThieu;
      daLam.push({ ma: vb.ma, ten: vb.ten, gui: vb.gui, file: tenFile, thieu: soThieu, chiTiet: ketQua });
      console.log(`  ${vb.ma.padEnd(6)} ${tenFile.padEnd(30)} → ${vb.gui}${soThieu ? `   (${soThieu} ô cần điền)` : ''}`);
    });
  }
  for (const f of tamCanXoa) { try { fs.unlinkSync(f); } catch { /* đã dọn */ } }

  if (thieuMau.length) {
    console.log('\nCHƯA SINH ĐƯỢC:');
    for (const t of thieuMau) console.log(`  - ${t}`);
  }

  // Lệnh chuyển bản scan gốc vào thư mục kết quả — không xoá.
  if (duLieu.pdf_nguon) {
    const dong = [
      `New-Item -ItemType Directory -Force -Path "${thuMucRaMay}" | Out-Null`,
      `if (Test-Path -LiteralPath "${duLieu.pdf_nguon}") {`,
      `  Move-Item -LiteralPath "${duLieu.pdf_nguon}" -Destination "${thuMucRaMay}" -Force`,
      `  Write-Host "  da chuyen ban scan: ${tenCuoi(duLieu.pdf_nguon)}"`,
      `} else { Write-Host "  KHONG THAY ban scan: ${tenCuoi(duLieu.pdf_nguon)}" -ForegroundColor Yellow }`,
      '',
    ].join('\r\n');
    const dich = ts['lenh-don'] || path.join(ts['goc-ra'], 'chuyen_ban_scan.ps1');
    fs.appendFileSync(dich, dong, 'utf8');
    console.log(`\nĐã thêm lệnh chuyển bản scan vào: ${dich}`);
  }

  console.log(`\n${daLam.length} văn bản, tổng ${tongThieuO} ô «CẦN ĐIỀN».`);
  const cacO = new Set();
  for (const d of daLam) {
    for (const dong of d.chiTiet.split('\n')) {
      const m = dong.match(/^\s+- ([a-zA-Z0-9_.]+)\s*$/);
      if (m) cacO.add(m[1]);
    }
  }
  for (const t of (ghep && ghep.thieu) || []) cacO.add(t);
  if (tongThieuO) console.log('Các ô cần cán bộ tự điền: ' + [...cacO].sort().join(', '));

  vaoSo(ts, duLieu, {
    ro: ro || '',
    bo_mau: tenBoMau,
    // Thiếu một văn bản trong bộ là hồ sơ chưa dùng được, dù các văn bản khác đã ra.
    trang_thai: thieuMau.length ? 'hong' : 'xong',
    so_van_ban: daLam.length,
    can_du: boMau.van_ban.length,
    thieu: thieuMau.slice(0, 5),
    so_o: tongThieuO,
    cac_o: [...cacO].sort().slice(0, 15),
    thu_muc: tenThuMuc,
  });
}

if (require.main === module) main();
