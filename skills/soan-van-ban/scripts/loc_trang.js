#!/usr/bin/env node
/**
 * loc_trang.js — Bước 1 của quy trình cuốn chiếu: cắt bỏ trang rác BẰNG CPU.
 *
 * Vì sao cần: một bộ hồ sơ scan 30-80 trang, nhưng chỉ 3-5 trang chứa dữ liệu để
 * soạn văn bản. Đọc cả bộ bằng thị giác tốn hàng chục nghìn token cho mỗi hồ sơ, mà
 * phần lớn số đó tiêu vào mặt sau tờ giấy trắng và các bản photo lặp lại. Script này
 * làm việc lọc đó bằng CPU, không tốn token nào.
 *
 * HAI LÀN, VÌ HỒ SƠ ĐẤT ĐAI CÓ HAI DẠNG:
 *
 *   Làn "lop-chu"  — PDF có lớp văn bản thật (bản in ra PDF, hoặc scan đã OCR sẵn).
 *                    Quét từ khoá mỏ neo trong assets/tu_khoa_moc.json là ra ngay
 *                    trang nào là Đơn đăng ký biến động, trang nào là hợp đồng công
 *                    chứng. Chốt được mỏ neo mà Claude không phải nhìn trang nào cả.
 *
 *   Làn "anh-scan" — PDF scan thuần ảnh. KHÔNG có chữ để quét. Đây là dạng phổ biến
 *                    ở Chi nhánh: đo thật trên ba hồ sơ mẫu, cả file 40 trang chỉ
 *                    rút ra được vài chục ký tự. Làn này CPU chỉ làm được việc loại
 *                    trang trắng và trang trùng, rồi dựng ảnh nhỏ cho các trang còn
 *                    lại để Claude liếc qua mà chọn mỏ neo. Rẻ hơn đọc cả bộ khoảng
 *                    một bậc, nhưng không phải không tốn gì — đừng hứa với người dùng
 *                    là 0 token cho hồ sơ scan.
 *
 * Dùng:
 *   node loc_trang.js --pdf "thừa kế, tặng cho.pdf" --ra lam_viec/
 *   node loc_trang.js --thu-muc "Đã phân loại/" --ra lam_viec/        (cả lô)
 *   node loc_trang.js --pdf ho_so.pdf --ra lv/ --mini-pdf             (kèm mini.pdf)
 *   node loc_trang.js --pdf ho_so.pdf --ra lv/ --trang 1,7,13         (ép thêm trang)
 *
 * Kết quả trong <--ra>/<tên hồ sơ>/:
 *   loc.json          trang nào giữ, trang nào bỏ, bỏ vì lý do gì
 *   trang-007.png     ảnh nhỏ của các trang còn lại (chỉ ở làn anh-scan)
 *   mini.pdf          bản rút gọn, khi có --mini-pdf và có pdfseparate/pdfunite
 *
 * Cần poppler (pdftotext, pdftoppm; thêm pdfseparate, pdfunite nếu muốn mini.pdf).
 * Không cần gói npm nào.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

/* Giấy trắng ở ảnh xám 20dpi nằm quanh 230-250, nét chữ xuống dưới 120. Lấy 190 làm
 * ranh giới thì vết ố và bóng mép giấy vẫn được coi là trắng. */
const NGUONG_TOI = 190;

function docThamSo(argv) {
  const ts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const ten = a.slice(2);
    if (ten === 'mini-pdf' || ten === 'giu-trung') ts[ten] = true;
    else ts[ten] = argv[++i];
  }
  return ts;
}

/** Bỏ dấu và viết hoa, để "Đơn đăng ký" khớp cả "DON DANG KY" lẫn "ĐƠN ĐĂNG KÝ". */
function boDau(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toUpperCase().replace(/\s+/g, ' ');
}

function coCongCu(ten) {
  try { execFileSync(ten, ['-v'], { stdio: 'ignore' }); return true; }
  catch (e) { return e.code !== 'ENOENT'; }
}

function chay(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'buffer', maxBuffer: 512 * 1024 * 1024 });
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

/* ------------------------------------------------------------------ đọc PGM ---- */

/** pdftoppm -gray xuất PGM nhị phân (P5): header chữ, rồi mảng byte thô một kênh.
 *  Định dạng thô nên đọc được bằng tay, khỏi cần thư viện ảnh nào. */
function docPGM(duongDan) {
  const b = fs.readFileSync(duongDan);
  let i = 0;
  const doc = () => {
    while (i < b.length) {
      if (b[i] === 0x23) { while (i < b.length && b[i] !== 0x0a) i++; }      // bỏ chú thích
      else if (b[i] <= 0x20) i++;                                            // bỏ khoảng trắng
      else break;
    }
    let s = '';
    while (i < b.length && b[i] > 0x20) s += String.fromCharCode(b[i++]);
    return s;
  };
  const magic = doc();
  if (magic !== 'P5') throw new Error(`${duongDan}: không phải PGM nhị phân (${magic})`);
  const rong = Number(doc()), cao = Number(doc()), max = Number(doc());
  i++;                                                                       // đúng 1 byte trắng
  if (!rong || !cao || max !== 255) throw new Error(`${duongDan}: header PGM lạ`);
  // File cụt thì subarray vẫn trả về mảng ngắn, và mọi phép đo sau đó ra NaN mà không
  // báo gì — trang hỏng sẽ lặng lẽ được coi là trang trắng rồi bị loại.
  if (b.length - i < rong * cao) throw new Error(`${duongDan}: PGM cụt, thiếu ${rong * cao - (b.length - i)} byte`);
  return { rong, cao, px: b.subarray(i, i + rong * cao) };
}

/** Tỉ lệ mực và vân tay 8x8, đều tính trên vùng đã cắt lề.
 *  Cắt lề vì mép bản scan hay có viền đen của nắp máy quét; để nguyên thì một trang
 *  trắng tinh vẫn bị tính là có mực và không bao giờ bị loại. */
function doTrang(anh, leCat) {
  const { rong, cao, px } = anh;
  const x0 = Math.floor(rong * leCat), x1 = Math.max(x0 + 1, rong - x0);
  const y0 = Math.floor(cao * leCat), y1 = Math.max(y0 + 1, cao - y0);
  const w = x1 - x0, h = y1 - y0;

  let toi = 0;
  const tong = new Float64Array(64), dem = new Float64Array(64);
  for (let y = y0; y < y1; y++) {
    const hang = y * rong;
    const oY = Math.min(7, Math.floor(((y - y0) * 8) / h)) * 8;
    for (let x = x0; x < x1; x++) {
      const v = px[hang + x];
      if (v < NGUONG_TOI) toi++;
      const o = oY + Math.min(7, Math.floor(((x - x0) * 8) / w));
      tong[o] += v; dem[o]++;
    }
  }
  const vanTay = new Array(64);
  for (let k = 0; k < 64; k++) vanTay[k] = dem[k] ? tong[k] / dem[k] : 255;
  return { tiLeMuc: toi / (w * h), vanTay, ngang: rong > cao };
}

/** Sai khác trung bình giữa hai vân tay, thang 0-255. Dưới ngưỡng là cùng một trang. */
function khacBiet(a, b) {
  let s = 0;
  for (let k = 0; k < 64; k++) s += Math.abs(a[k] - b[k]);
  return s / 64;
}

/* ------------------------------------------------------------- làn lớp chữ ---- */

function tachTrangChu(pdf) {
  try {
    // pdftotext đóng mỗi trang bằng \f, kể cả trang cuối — nên phần tử rỗng cuối cùng
    // là dấu kết thúc chứ không phải một trang thật.
    return chay('pdftotext', ['-layout', pdf, '-']).toString('utf8').split('\f').slice(0, -1);
  } catch { return null; }
}

function neoTheoTuKhoa(trangChu, cauHinh) {
  const moc = {};
  const boQua = new Set();
  const tuLoaiBo = (cauHinh.loai_bo && cauHinh.loai_bo.tu_khoa || []).map(boDau);

  trangChu.forEach((chu, idx) => {
    const so = idx + 1;
    const phang = boDau(chu);
    let daKhop = false;
    for (const m of cauHinh.moc) {
      if (m.tu_khoa.some((t) => phang.includes(boDau(t)))) {
        if (!moc[m.ma]) moc[m.ma] = [];
        moc[m.ma].push(so);
        daKhop = true;
      }
    }
    // Trang thủ tục chỉ bị loại khi nó KHÔNG đồng thời là một mốc. Phiếu tiếp nhận
    // đôi khi in chung tờ với đơn đăng ký biến động; loại nhầm là mất trang gốc.
    if (!daKhop && tuLoaiBo.some((t) => phang.includes(t))) boQua.add(so);
  });

  const giu = new Set();
  for (const m of cauHinh.moc) {
    for (const so of moc[m.ma] || []) {
      giu.add(so);
      for (const b of m.keo_them || []) if (so + b <= trangChu.length) giu.add(so + b);
    }
  }
  return { moc, giu: [...giu].sort((a, b) => a - b), boQua: [...boQua].sort((a, b) => a - b) };
}

/* ------------------------------------------------------------ làn ảnh scan ---- */

function locTheoAnh(pdf, nguong, thuMucTam) {
  fs.mkdirSync(thuMucTam, { recursive: true });
  const goc = path.join(thuMucTam, 'x');
  chay('pdftoppm', ['-gray', '-r', String(nguong.dpi_do_muc), '-aa', 'no', '-aaVector', 'no', pdf, goc]);

  const tep = fs.readdirSync(thuMucTam)
    .filter((f) => f.startsWith('x-') && f.endsWith('.pgm'))
    .map((f) => ({ f, so: Number(f.slice(2, -4)) }))
    .sort((a, b) => a.so - b.so);
  if (!tep.length) throw new Error('pdftoppm không dựng được trang nào — file hỏng hoặc có mật khẩu?');

  const trang = [];
  const daGiu = [];
  for (const t of tep) {
    const d = doTrang(docPGM(path.join(thuMucTam, t.f)), nguong.le_cat_bo_khi_do_muc);
    const ban = { so: t.so, ti_le_muc: Number(d.tiLeMuc.toFixed(5)), ngang: d.ngang, bo: null };

    if (d.tiLeMuc < nguong.ti_le_muc_trang_trang) ban.bo = 'trang_trang';
    else {
      // Chỉ bản sao XUẤT HIỆN SAU mới bị loại; bản đầu luôn được giữ. Hồ sơ hay kèm
      // nhiều bản photo cùng một tờ, giữ bản đầu là đủ mà không mất trang nào.
      const trung = daGiu.find((g) => khacBiet(g.vanTay, d.vanTay) < nguong.khac_biet_van_tay_coi_la_trung);
      if (trung) { ban.bo = 'trung_lap'; ban.giong_trang = trung.so; }
      else daGiu.push({ so: t.so, vanTay: d.vanTay });
    }
    trang.push(ban);
  }
  for (const t of tep) fs.unlinkSync(path.join(thuMucTam, t.f));
  return trang;
}

/* ------------------------------------------------------------------- xuất ---- */

function dungAnhNho(pdf, cacTrang, thuMucRa, dpi) {
  const ra = [];
  for (const so of cacTrang) {
    const goc = path.join(thuMucRa, `.tam-${so}`);
    chay('pdftoppm', ['-png', '-r', String(dpi), '-f', String(so), '-l', String(so), pdf, goc]);
    const sinh = fs.readdirSync(thuMucRa).filter((f) => f.startsWith(`.tam-${so}-`) && f.endsWith('.png'));
    if (!sinh.length) continue;
    const ten = `trang-${String(so).padStart(3, '0')}.png`;
    fs.renameSync(path.join(thuMucRa, sinh[0]), path.join(thuMucRa, ten));
    ra.push(ten);
  }
  return ra;
}

function dungMiniPdf(pdf, cacTrang, thuMucRa) {
  if (!coCongCu('pdfseparate') || !coCongCu('pdfunite')) return null;
  const tam = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-'));
  const manh = [];
  try {
    for (const so of cacTrang) {
      chay('pdfseparate', ['-f', String(so), '-l', String(so), pdf, path.join(tam, `t${so}-%d.pdf`)]);
      const f = fs.readdirSync(tam).find((x) => x.startsWith(`t${so}-`));
      if (f) manh.push(path.join(tam, f));
    }
    if (!manh.length) return null;
    const dich = path.join(thuMucRa, 'mini.pdf');
    chay('pdfunite', [...manh, dich]);
    return dich;
  } catch { return null; }
  finally { fs.rmSync(tam, { recursive: true, force: true }); }
}

/* -------------------------------------------------------------- một hồ sơ ---- */

/** 'don_dang_ky_bien_dong=3;van_ban_cong_chung=17,18' -> {ma: [trang]} */
function docMoc(bieuThuc) {
  const ra = {};
  for (const phan of String(bieuThuc || '').split(';')) {
    const [ma, ds] = phan.split('=');
    if (!ma || !ds) continue;
    const trang = ds.split(',').map((x) => Number(x.trim())).filter(Boolean);
    if (trang.length) ra[ma.trim()] = trang;
  }
  return ra;
}

function locMotHoSo(pdf, gocRa, cauHinh, ts) {
  const ten = path.basename(pdf).replace(/\.pdf$/i, '');
  const thuMucRa = path.join(gocRa, ten);
  fs.mkdirSync(thuMucRa, { recursive: true });

  // Skill phân loại đã đọc hồ sơ này rồi và ghi mốc trang vào nhật ký. Dò lại từ đầu
  // là trả tiền hai lần cho cùng một việc — chỉ dựng ảnh đúng các trang đó.
  const chiTrang = ts['chi-trang']
    ? String(ts['chi-trang']).split(',').map((x) => Number(x.trim())).filter(Boolean)
    : [];
  if (chiTrang.length) {
    const kq = {
      pdf: path.resolve(pdf), ho_so: ten, lan: 'anh-scan', tong_trang: chiTrang.length,
      giu: chiTrang, bo: {}, moc: docMoc(ts.moc), anh: [], canh_bao: [],
      nguon_moc: 'nhat-ky-phan-loai',
    };
    kq.anh = dungAnhNho(pdf, chiTrang, thuMucRa, Number(ts.dpi || 150));
    // Nhánh này thoát sớm nên phải tự dựng mini.pdf; quên là --chi-trang --mini-pdf
    // lặng lẽ không ra file nào, đúng lúc người dùng đã chỉ định rõ nhất.
    if (ts['mini-pdf']) {
      const mini = dungMiniPdf(pdf, chiTrang, thuMucRa);
      if (mini) kq.mini_pdf = mini;
      else kq.canh_bao.push('Không dựng được mini.pdf — thiếu pdfseparate/pdfunite.');
    }
    fs.writeFileSync(path.join(thuMucRa, 'loc.json'), JSON.stringify(kq, null, 2), 'utf8');
    return kq;
  }

  const nguong = cauHinh.nguong;
  const trangChu = tachTrangChu(pdf);
  const soTrangChu = trangChu ? trangChu.length : 0;
  const kyTuMoiTrang = soTrangChu
    ? trangChu.reduce((s, c) => s + c.replace(/\s/g, '').length, 0) / soTrangChu
    : 0;

  const kq = {
    pdf: path.resolve(pdf),
    ho_so: ten,
    tong_trang: soTrangChu,
    lan: null,
    ky_tu_moi_trang: Number(kyTuMoiTrang.toFixed(1)),
    giu: [],
    bo: {},
    moc: {},
    anh: [],
    canh_bao: [],
  };

  const epTrang = ts.trang
    ? ts.trang.split(',').map((x) => Number(x.trim())).filter(Boolean)
    : [];

  if (kyTuMoiTrang >= nguong.ky_tu_moi_trang_coi_la_co_lop_chu) {
    /* Làn lớp chữ — mỏ neo bằng từ khoá, Claude không phải nhìn trang nào. */
    kq.lan = 'lop-chu';
    const n = neoTheoTuKhoa(trangChu, cauHinh);
    kq.moc = n.moc;
    kq.giu = [...new Set([...n.giu, ...epTrang])].sort((a, b) => a - b);
    kq.bo = { theo_tu_khoa_thu_tuc: n.boQua };
    if (!kq.giu.length) {
      kq.canh_bao.push('Có lớp chữ nhưng không khớp mốc nào — bảng từ khoá có thể chưa phủ dạng hồ sơ này. Giữ tạm 6 trang đầu.');
      kq.giu = [1, 2, 3, 4, 5, 6].filter((x) => x <= soTrangChu);
    }
    if (!kq.moc.don_dang_ky_bien_dong) {
      kq.canh_bao.push('Không thấy Đơn đăng ký biến động — chưa có căn cứ chọn nhánh Trang 4 hay Cấp đổi.');
    }
  } else {
    /* Làn ảnh scan — CPU chỉ loại được trang trắng và trang trùng. */
    kq.lan = 'anh-scan';
    const tam = fs.mkdtempSync(path.join(os.tmpdir(), 'loctrang-'));
    let trang;
    try { trang = locTheoAnh(pdf, nguong, tam); }
    finally { fs.rmSync(tam, { recursive: true, force: true }); }

    kq.tong_trang = trang.length;
    const boTrang = trang.filter((t) => t.bo === 'trang_trang').map((t) => t.so);
    const boTrung = trang.filter((t) => t.bo === 'trung_lap').map((t) => t.so);
    const conLai = ts['giu-trung']
      ? trang.filter((t) => t.bo !== 'trang_trang').map((t) => t.so)
      : trang.filter((t) => !t.bo).map((t) => t.so);

    kq.bo = { trang_trang: boTrang, trung_lap: ts['giu-trung'] ? [] : boTrung };
    kq.giu = [...new Set([...conLai, ...epTrang])].sort((a, b) => a - b);
    // Giữ lại số đo của TỪNG trang, kể cả trang bị bỏ. Bỏ nhầm một trang thật là lỗi
    // im lặng — không có bảng này thì không ai biết đường mà chỉnh lại ngưỡng.
    kq.chi_tiet_trang = trang;

    if (kq.giu.length > nguong.toi_da_anh_nho) {
      kq.canh_bao.push(
        `Còn ${kq.giu.length} trang sau khi lọc, quá mức ${nguong.toi_da_anh_nho} — chỉ dựng ảnh cho ${nguong.toi_da_anh_nho} trang đầu. ` +
        'Xem thêm bằng --trang nếu chưa đủ căn cứ.');
    }
    kq.anh = dungAnhNho(pdf, kq.giu.slice(0, nguong.toi_da_anh_nho), thuMucRa, Number(ts.dpi || nguong.dpi_anh_nho));
  }

  if (ts['mini-pdf']) {
    const mini = dungMiniPdf(pdf, kq.giu, thuMucRa);
    if (mini) kq.mini_pdf = mini;
    else kq.canh_bao.push('Không dựng được mini.pdf — thiếu pdfseparate/pdfunite.');
  }

  fs.writeFileSync(path.join(thuMucRa, 'loc.json'), JSON.stringify(kq, null, 2), 'utf8');
  return kq;
}

/* -------------------------------------------------------------------- main ---- */

function main() {
  const ts = docThamSo(process.argv);
  if ((!ts.pdf && !ts['thu-muc']) || !ts.ra) {
    console.error('Cần --pdf <file> (hoặc --thu-muc <thư mục>) và --ra <thư mục>. Xem đầu file loc_trang.js.');
    process.exit(2);
  }
  for (const cc of ['pdftotext', 'pdftoppm']) {
    if (!coCongCu(cc)) { console.error(`Thiếu ${cc} (gói poppler-utils). Không lọc được.`); process.exit(2); }
  }

  const cauHinh = JSON.parse(fs.readFileSync(
    path.join(path.resolve(__dirname, '..'), 'assets/tu_khoa_moc.json'), 'utf8'));

  const dsPdf = ts.pdf ? [ts.pdf] : timPdf(ts['thu-muc']);

  if (!dsPdf.length) { console.error('Không thấy file PDF nào.'); process.exit(2); }
  fs.mkdirSync(ts.ra, { recursive: true });

  let tongGoc = 0, tongGiu = 0, soLoi = 0;
  for (const pdf of dsPdf) {
    let kq;
    try { kq = locMotHoSo(pdf, ts.ra, cauHinh, ts); }
    catch (e) {
      soLoi++;
      console.log(`  ✗ ${path.basename(pdf).padEnd(40)} ${String(e.message).split('\n')[0]}`);
      continue;
    }

    tongGoc += kq.tong_trang; tongGiu += kq.giu.length;
    const tiLe = kq.tong_trang ? Math.round((1 - kq.giu.length / kq.tong_trang) * 100) : 0;
    console.log(`  ✓ ${kq.ho_so.padEnd(40)} ${String(kq.lan).padEnd(9)} ${kq.tong_trang} → ${kq.giu.length} trang (bỏ ${tiLe}%)`);
    if (kq.lan === 'lop-chu') {
      const ten = Object.keys(kq.moc);
      console.log(`      mốc: ${ten.length ? ten.map((m) => `${m}@${kq.moc[m].join(',')}`).join('  ') : '(không thấy)'}`);
    }
    for (const c of kq.canh_bao) console.log(`      ! ${c}`);
  }

  console.log(`\n${dsPdf.length} hồ sơ${soLoi ? ` (${soLoi} lỗi)` : ''} — ${tongGoc} trang gốc còn ${tongGiu} trang cần đọc.`);
  console.log(`Kết quả: ${path.resolve(ts.ra)}  (mỗi hồ sơ một thư mục, xem loc.json)`);
}

if (require.main === module) main();
