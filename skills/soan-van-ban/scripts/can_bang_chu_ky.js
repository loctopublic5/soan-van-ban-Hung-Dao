#!/usr/bin/env node
/**
 * can_bang_chu_ky.js — Cân lại khối chữ ký ở cuối văn bản.
 *
 * Vấn đề trong mẫu gốc: bảng chữ ký chỉ có một hàng hai cột. Cột trái chứa khối
 * "Nơi nhận" rồi mới tới "CÁN BỘ HỢP ĐỒNG", trong khi cột phải bắt đầu ngay bằng
 * "CÁN BỘ THỤ LÝ". Hệ quả là hai chức danh lệch nhau đúng bằng chiều cao khối
 * "Nơi nhận" — nhìn như hai người ký ở hai thời điểm khác nhau, và chỗ trống để ký
 * bên phải bị hụt so với bên trái.
 *
 * Cách sửa: chèn thêm mấy đoạn trống vào đầu cột thiếu, cho hai chức danh nằm cùng
 * một dòng. Không đụng vào cấu trúc bảng — đổi bảng một hàng thành hai hàng sẽ kéo
 * theo đường viền, độ rộng cột và khoảng cách trên dưới, rủi ro hơn nhiều so với cái
 * lợi thu được.
 *
 * Dùng:
 *   node can_bang_chu_ky.js --file mau.docx                 (sửa tại chỗ)
 *   node can_bang_chu_ky.js --file mau.docx --ra moi.docx
 *   node can_bang_chu_ky.js --file mau.docx --xem           (chỉ báo cáo, không sửa)
 */
'use strict';
const L = require('./docx_lib.js');

// Chức danh người ký luôn viết HOA toàn bộ và đứng riêng một dòng. Không dùng cờ /i:
// khối "Nơi nhận" ngay bên trên thường có dòng "- Giám đốc; (để b/c)" viết thường, so
// không phân biệt hoa thường sẽ nhận nhầm dòng đó là chức danh và đếm hụt số dòng cần
// chèn. Loại thêm dòng bắt đầu bằng gạch đầu dòng cho chắc.
const CHUC_DANH = /CÁN BỘ|CHUYÊN VIÊN|LÃNH ĐẠO|GIÁM ĐỐC|PHÓ GIÁM ĐỐC|NGƯỜI LẬP|TM\./;
const laDongChucDanh = (chu) => {
  const t = String(chu || '').trim();
  return !/^[-–•]/.test(t) && CHUC_DANH.test(t);
};

function docThamSo(argv) {
  const ts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const ten = a.slice(2);
      if (ten === 'xem') ts.xem = true;
      else ts[ten] = argv[++i];
    }
  }
  return ts;
}

function chuCuaDoan(doanXml) {
  return (doanXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [])
    .map((t) => L.boDauXML(t.replace(/<[^>]+>/g, ''))).join('').trim();
}

/** Cắt một ô bảng thành danh sách đoạn, giữ nguyên chuỗi XML của từng đoạn. */
function cacDoanTrongO(oXml) {
  const ds = [];
  const re = /<w:p(?:\s[^>]*)?(?:\/>|>[\s\S]*?<\/w:p>)/g;
  let m;
  while ((m = re.exec(oXml)) !== null) ds.push({ xml: m[0], viTri: m.index, dai: m[0].length, chu: chuCuaDoan(m[0]) });
  return ds;
}

function main() {
  const ts = docThamSo(process.argv);
  if (!ts.file) { console.error('Thiếu --file'); process.exit(2); }

  const cacMuc = L.docZip(ts.file);
  let xml = L.giuKhoangTrang(L.layNoiDung(cacMuc, 'word/document.xml'));

  // Bảng cuối cùng của văn bản là bảng chữ ký.
  const bang = [...xml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)];
  if (!bang.length) { console.error('Không tìm thấy bảng nào.'); process.exit(1); }
  const bangCuoi = bang[bang.length - 1];
  const bangXml = bangCuoi[0];

  const o = [...bangXml.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)];
  const thongTin = o.map((mo) => {
    const doan = cacDoanTrongO(mo[0]);
    const iChucDanh = doan.findIndex((d) => laDongChucDanh(d.chu));
    return { moXml: mo[0], viTriO: mo.index, doan, iChucDanh };
  }).filter((x) => x.iChucDanh >= 0);

  if (thongTin.length < 2) {
    console.log('Bảng chữ ký có ít hơn hai khối chức danh — không cần cân.');
    return;
  }

  console.log(`Bảng chữ ký có ${thongTin.length} khối chức danh:`);
  for (const t of thongTin) {
    console.log(`  "${t.doan[t.iChucDanh].chu}" bắt đầu ở đoạn thứ ${t.iChucDanh + 1} của ô`);
  }

  const sauNhat = Math.max(...thongTin.map((t) => t.iChucDanh));
  const canChen = thongTin.filter((t) => t.iChucDanh < sauNhat);
  if (!canChen.length) { console.log('\nHai khối đã ngang hàng, không phải sửa.'); return; }

  for (const t of canChen) {
    console.log(`\nKhối "${t.doan[t.iChucDanh].chu}" thiếu ${sauNhat - t.iChucDanh} dòng so với khối thấp nhất.`);
  }
  if (ts.xem) { console.log('\n(--xem: chỉ báo cáo, không sửa)'); return; }

  // Chèn từ ô ở sau ra trước để vị trí các ô phía trước không bị xê dịch.
  let bangMoi = bangXml;
  for (const t of [...canChen].sort((a, b) => b.viTriO - a.viTriO)) {
    const soChen = sauNhat - t.iChucDanh;
    // Nhân bản một đoạn trống sẵn có trong chính ô đó để giữ đúng kiểu chữ, giãn dòng.
    const doanTrong = t.doan.find((d) => !d.chu && /<w:p\s|<w:p>/.test(d.xml)) || t.doan[t.iChucDanh];
    const mauTrong = doanTrong.xml.replace(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g, '<w:t xml:space="preserve"></w:t>');
    const chen = mauTrong.repeat(soChen);

    const dauDoan = t.doan[0].viTri;
    const oMoi = t.moXml.slice(0, dauDoan) + chen + t.moXml.slice(dauDoan);
    bangMoi = bangMoi.slice(0, t.viTriO) + oMoi + bangMoi.slice(t.viTriO + t.moXml.length);
  }

  xml = xml.slice(0, bangCuoi.index) + bangMoi + xml.slice(bangCuoi.index + bangXml.length);

  const raFile = ts.ra || ts.file;
  L.ghiZip(raFile, cacMuc, { 'word/document.xml': xml });
  console.log(`\nĐã cân lại khối chữ ký: ${raFile}`);
}

if (require.main === module) main();
