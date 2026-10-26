/**
 * docx_lib.js — Đọc/ghi file .docx bằng Node thuần, không cần cài gói ngoài.
 *
 * Vì sao viết tay thay vì dùng docxtemplater/adm-zip: máy chạy skill có thể không ra
 * được internet để `npm install`, và một script chỉ dùng `zlib` + `fs` (đều có sẵn
 * trong Node) thì cài Node xong là chạy được ngay trên bất kỳ máy nào của Chi nhánh.
 * Đổi lại phải tự đọc cấu trúc ZIP, nhưng phần đó ổn định đã mấy chục năm.
 *
 * File .docx thực chất là một file ZIP chứa word/document.xml cùng các phần khác
 * (style, header, quan hệ...). Ta chỉ động vào phần văn bản; mọi phần còn lại được
 * chép nguyên si BYTE-BY-BYTE — nhờ vậy font chữ, canh lề, khung dấu, bảng biểu của
 * mẫu gốc giữ nguyên tuyệt đối. Với văn bản hành chính, giữ đúng thể thức quan trọng
 * ngang với đúng nội dung.
 */
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

/* ---------------------------------------------------------------- ĐỌC ZIP ---- */

function docTimSoCuoi(buf, chuKy) {
  for (let i = buf.length - 4; i >= 0; i--) {
    if (buf.readUInt32LE(i) === chuKy) return i;
  }
  return -1;
}

/**
 * Đọc file .docx, trả về danh sách mục trong ZIP kèm dữ liệu nén nguyên bản.
 * Giữ lại dữ liệu nén (chứ không giải nén hết) để lúc ghi ra chỉ phải đụng vào
 * đúng phần mình sửa.
 */
function docZip(duongDan) {
  const buf = fs.readFileSync(duongDan);
  const viTriEOCD = docTimSoCuoi(buf, 0x06054b50);
  if (viTriEOCD < 0) throw new Error(`Không phải file ZIP/DOCX hợp lệ: ${duongDan}`);

  const soMuc = buf.readUInt16LE(viTriEOCD + 10);
  let con = buf.readUInt32LE(viTriEOCD + 16);
  const cacMuc = [];

  for (let i = 0; i < soMuc; i++) {
    if (buf.readUInt32LE(con) !== 0x02014b50) throw new Error('Hỏng bảng thư mục ZIP');
    const cach = buf.readUInt16LE(con + 10);
    const thoiGian = buf.readUInt16LE(con + 12);
    const ngay = buf.readUInt16LE(con + 14);
    const crc = buf.readUInt32LE(con + 16);
    const coNen = buf.readUInt32LE(con + 20);
    const coGoc = buf.readUInt32LE(con + 24);
    const daiTen = buf.readUInt16LE(con + 28);
    const daiPhu = buf.readUInt16LE(con + 30);
    const daiChuThich = buf.readUInt16LE(con + 32);
    const viTriCucBo = buf.readUInt32LE(con + 42);
    const ten = buf.toString('utf8', con + 46, con + 46 + daiTen);

    // Nhảy qua local header để tới đúng chỗ dữ liệu.
    const daiTenCB = buf.readUInt16LE(viTriCucBo + 26);
    const daiPhuCB = buf.readUInt16LE(viTriCucBo + 28);
    const batDau = viTriCucBo + 30 + daiTenCB + daiPhuCB;

    cacMuc.push({
      ten, cach, thoiGian, ngay, crc, coGoc,
      duLieuNen: buf.subarray(batDau, batDau + coNen),
    });
    con += 46 + daiTen + daiPhu + daiChuThich;
  }
  return cacMuc;
}

/** Lấy nội dung văn bản của một mục (giải nén nếu cần). */
function layNoiDung(cacMuc, ten) {
  const m = cacMuc.find((x) => x.ten === ten);
  if (!m) return null;
  const raw = m.cach === 0 ? m.duLieuNen : zlib.inflateRawSync(m.duLieuNen);
  return raw.toString('utf8');
}

/* ---------------------------------------------------------------- GHI ZIP ---- */

const BANG_CRC = (() => {
  const b = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    b[n] = c;
  }
  return b;
})();

function tinhCRC(buf) {
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ BANG_CRC[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

/**
 * Kiểm XML có đúng cấu trúc không: mọi thẻ mở đều được đóng đúng thứ tự, và mọi dấu &
 * đều là một thực thể hợp lệ. Trả về null nếu ổn, hoặc một câu mô tả chỗ hỏng.
 *
 * Vì sao phải có: mọi bước khác trong bộ script này đọc .docx bằng cách nhặt chữ trong
 * <w:t> bằng regex — cách đó KHÔNG thấy được cấu trúc. Một file có thẻ <w:tbl> bị cắt
 * ngang vẫn đọc ra chữ đầy đủ, vẫn qua mọi phép soát, rồi đến tay người dùng thì Word
 * báo "The document may be corrupt". Đã xảy ra thật với mẫu BC tách thửa phân chia
 * tài sản chung: cắt bỏ phần Thông báo thừa ở giữa một bảng, để lại bảng không đóng.
 */
function kiemTraXML(xml) {
  const sach = xml
    .replace(/<\?[\s\S]*?\?>/g, (s) => ' '.repeat(s.length))
    .replace(/<!--[\s\S]*?-->/g, (s) => ' '.repeat(s.length))
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, (s) => ' '.repeat(s.length));
  const ngu = (i) => JSON.stringify(sach.slice(Math.max(0, i - 60), i + 40));

  const RE_THE = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  const ngan = [];
  let m;
  let viTri = 0;
  while ((m = RE_THE.exec(sach)) !== null) {
    const lac = sach.indexOf('<', viTri);
    if (lac >= 0 && lac < m.index) return `dấu "<" không thuộc thẻ nào, gần ${ngu(lac)}`;
    viTri = RE_THE.lastIndex;
    const [, dong, ten, , tuDong] = m;
    if (tuDong) continue;
    if (!dong) { ngan.push({ ten, i: m.index }); continue; }
    const mo = ngan.pop();
    if (!mo || mo.ten !== ten) {
      return `</${ten}> đóng nhầm ${mo ? `<${mo.ten}>` : 'khi không còn thẻ nào mở'}, gần ${ngu(m.index)}`;
    }
  }
  if (sach.indexOf('<', viTri) >= 0) return `dấu "<" không thuộc thẻ nào, gần ${ngu(sach.indexOf('<', viTri))}`;
  if (ngan.length) {
    const cuoi = ngan[ngan.length - 1];
    return `còn ${ngan.length} thẻ chưa đóng (${ngan.slice(-4).map((x) => `<${x.ten}>`).join(' ')}), thẻ cuối mở gần ${ngu(cuoi.i)}`;
  }
  const va = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.exec(sach);
  if (va) return `dấu "&" chưa thoát, gần ${ngu(va.index)}`;
  // XML 1.0 cấm ký tự điều khiển (trừ tab, xuống dòng). Hay lọt vào qua chữ chép từ
  // pdftotext, vốn dùng \f để ngắt trang — Word gặp là báo tài liệu hỏng.
  const dk = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.exec(sach);
  if (dk) return `ký tự điều khiển 0x${dk[0].charCodeAt(0).toString(16).padStart(2, '0')} không hợp lệ trong XML, gần ${ngu(dk.index)}`;
  return null;
}

/**
 * Ghi lại file .docx. `thayThe` là { 'word/document.xml': '<chuỗi XML mới>' }.
 * Mục không nằm trong `thayThe` được chép nguyên khối nén cũ, không giải nén lại —
 * vừa nhanh vừa không có cơ hội làm hỏng phần mình không định sửa.
 */
function ghiZip(duongDanRa, cacMuc, thayThe = {}) {
  // Chặn ở đây vì mọi script đều ghi .docx qua hàm này. Kiểm trước khi ghi một byte
  // nào, nên đã hỏng thì không có file nào ra đĩa — thà báo lỗi còn hơn giao cho người
  // dùng một văn bản Word không mở được, mà họ chỉ phát hiện lúc sắp trình ký.
  for (const [ten, xml] of Object.entries(thayThe)) {
    if (!/\.(xml|rels)$/i.test(ten)) continue;
    const loi = kiemTraXML(xml);
    if (loi) throw new Error(`${ten} hỏng cấu trúc XML — ${loi}. Không ghi ${path.basename(duongDanRa)}.`);
  }

  const khuc = [];
  const thuMuc = [];
  let con = 0;

  for (const m of cacMuc) {
    let cach = m.cach;
    let duLieu = m.duLieuNen;
    let crc = m.crc;
    let coGoc = m.coGoc;

    if (Object.prototype.hasOwnProperty.call(thayThe, m.ten)) {
      const moi = Buffer.from(thayThe[m.ten], 'utf8');
      crc = tinhCRC(moi);
      coGoc = moi.length;
      duLieu = zlib.deflateRawSync(moi, { level: 9 });
      cach = 8;
    }

    const ten = Buffer.from(m.ten, 'utf8');
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);            // cần phiên bản 2.0
    lh.writeUInt16LE(0, 6);             // cờ
    lh.writeUInt16LE(cach, 8);
    lh.writeUInt16LE(m.thoiGian, 10);
    lh.writeUInt16LE(m.ngay, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(duLieu.length, 18);
    lh.writeUInt32LE(coGoc, 22);
    lh.writeUInt16LE(ten.length, 26);
    lh.writeUInt16LE(0, 28);

    khuc.push(lh, ten, duLieu);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(cach, 10);
    ch.writeUInt16LE(m.thoiGian, 12);
    ch.writeUInt16LE(m.ngay, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(duLieu.length, 20);
    ch.writeUInt32LE(coGoc, 24);
    ch.writeUInt16LE(ten.length, 28);
    ch.writeUInt32LE(con, 42);
    thuMuc.push(ch, ten);

    con += lh.length + ten.length + duLieu.length;
  }

  const batDauTM = con;
  let daiTM = 0;
  for (const b of thuMuc) daiTM += b.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(cacMuc.length, 8);
  eocd.writeUInt16LE(cacMuc.length, 10);
  eocd.writeUInt32LE(daiTM, 12);
  eocd.writeUInt32LE(batDauTM, 16);

  fs.writeFileSync(duongDanRa, Buffer.concat([...khuc, ...thuMuc, eocd]));
}

/* ------------------------------------------------------ XỬ LÝ VĂN BẢN XML ---- */

const RE_NUT_CHU = /(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g;

/** Danh sách các nút chữ trong document.xml, kèm vị trí để ghi ngược lại được. */
function layCacNutChu(xml) {
  const ds = [];
  let m;
  RE_NUT_CHU.lastIndex = 0;
  while ((m = RE_NUT_CHU.exec(xml)) !== null) {
    ds.push({ moDau: m.index, batDauChu: m.index + m[1].length, ketThucChu: m.index + m[1].length + m[2].length, chu: m[2] });
  }
  return ds;
}

function boDauXML(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
function themDauXML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Toàn bộ chữ trong tài liệu, nối liền — dùng để tìm chuỗi bị cắt ngang nhiều nút. */
function chuPhang(xml) {
  return layCacNutChu(xml).map((n) => boDauXML(n.chu)).join('');
}

/**
 * Thay một chuỗi bằng chuỗi khác, kể cả khi Word đã cắt nó ra nhiều nút <w:t>.
 * Word hay cắt vụn một câu thành nhiều đoạn chỉ vì người soạn từng bôi đen sửa
 * chính tả ở giữa — nên tìm-thay ngây thơ trên XML sẽ trượt. Cách làm ở đây: dựng
 * chuỗi phẳng, tìm trên đó, rồi dồn toàn bộ phần thay thế vào nút đầu tiên và xoá
 * chữ ở các nút còn lại trong vùng khớp.
 *
 * `toiDa` giới hạn số lần thay (mặc định: mọi chỗ) — dùng khi mỗi chỗ cần một giá trị
 * riêng, vd. gọt mép ô theo chữ đứng quanh từng chỗ.
 *
 * Trả về { xml, soLanThay }.
 */
function thayChuoi(xml, tim, thay, toiDa = Infinity) {
  if (!tim) return { xml, soLanThay: 0 };
  let soLanThay = 0;
  // Lượt tìm sau bắt đầu SAU đoạn vừa thay, không tìm lại từ đầu. Nếu chuỗi thay chứa
  // chính chuỗi tìm (vd. thay "V. Đối tượng miễn giảm:" bằng "V. Đối tượng miễn giảm:
  // {{doi_tuong_mien_giam}}"), tìm lại từ đầu sẽ gặp đúng thứ vừa chèn, thay tiếp, và
  // lặp tới giới hạn 200 vòng — mẫu ra 200 ô trống nối đuôi nhau. Đã xảy ra thật.
  let tuViTri = 0;

  for (let vongLap = 0; vongLap < 200 && soLanThay < toiDa; vongLap++) {
    const nut = layCacNutChu(xml);
    const doan = nut.map((n) => boDauXML(n.chu));
    const phang = doan.join('');

    // So khớp trên bản NFD của cả hai vế. Chữ Việt trong các file Word thực tế trộn
    // lẫn hai cách mã hoá: "để" có thể là một ký tự dựng sẵn, cũng có thể là "đ" cộng
    // dấu rời — nhìn giống hệt nhau trên màn hình nhưng khác nhau từng byte. Tìm bằng
    // so byte thô sẽ trượt đúng những câu dài nhất, tức là những câu quan trọng nhất.
    // Dựng thêm bảng ánh xạ vị-trí-NFD → vị-trí-gốc để thay đúng chỗ.
    // Chuẩn hoá theo CỤM (một chữ cái gốc cộng các dấu đi kèm) chứ không theo từng ký
    // tự. Lý do: NFD có bước sắp xếp lại dấu theo thứ tự chuẩn — "ườ" phải là u + dấu
    // móc + dấu huyền, nhưng file Word thật lại lưu ngược thành u + huyền + móc. Chuẩn
    // hoá từng ký tự không sửa được thứ tự đó nên chuỗi tìm trượt, mà lại trượt đúng
    // những câu dài nhất. Dấu chỉ đổi chỗ được trong phạm vi một cụm, nên chuẩn hoá
    // theo cụm cho kết quả y hệt chuẩn hoá cả chuỗi, lại vẫn giữ được bảng ánh xạ.
    let phangNFD = '';
    const anhXa = [];
    for (let i = 0; i < phang.length; ) {
      let j = i + 1;
      while (j < phang.length && /\p{M}/u.test(phang[j])) j++;
      const nfd = phang.slice(i, j).normalize('NFD');
      for (let k = 0; k < nfd.length; k++) anhXa.push(k === 0 ? i : j);
      phangNFD += nfd;
      i = j;
    }
    anhXa.push(phang.length);

    const timNFD = tim.normalize('NFD');
    let batDauNFD = 0;
    while (batDauNFD < anhXa.length - 1 && anhXa[batDauNFD] < tuViTri) batDauNFD++;
    const viTriNFD = phangNFD.indexOf(timNFD, batDauNFD);
    if (viTriNFD < 0) break;
    const viTri = anhXa[viTriNFD];
    const ket = anhXa[viTriNFD + timNFD.length];

    // Xác định nút nào chứa đầu và cuối vùng khớp.
    const moc = [];
    let t = 0;
    for (const d of doan) { moc.push(t); t += d.length; }

    let iDau = 0;
    while (iDau + 1 < moc.length && moc[iDau + 1] <= viTri) iDau++;
    let iCuoi = iDau;
    while (iCuoi + 1 < moc.length && moc[iCuoi + 1] < ket) iCuoi++;

    const truoc = doan[iDau].slice(0, viTri - moc[iDau]);
    const sau = doan[iCuoi].slice(ket - moc[iCuoi]);

    // Ghi từ cuối lên đầu để vị trí các nút phía trước không bị xê dịch.
    let moi = xml;
    for (let i = iCuoi; i >= iDau; i--) {
      let chuMoi;
      if (i === iDau && i === iCuoi) chuMoi = truoc + thay + sau;
      else if (i === iDau) chuMoi = truoc + thay;
      else if (i === iCuoi) chuMoi = sau;
      else chuMoi = '';
      moi = moi.slice(0, nut[i].batDauChu) + themDauXML(chuMoi) + moi.slice(nut[i].ketThucChu);
    }
    xml = moi;
    soLanThay++;
    tuViTri = viTri + thay.length;
  }
  return { xml, soLanThay };
}

/** Bảo đảm <w:t> giữ khoảng trắng đầu/cuối (Word mặc định cắt bỏ nếu thiếu xml:space). */
function giuKhoangTrang(xml) {
  return xml.replace(/<w:t>/g, '<w:t xml:space="preserve">');
}

/**
 * Xử lý đoạn có điều kiện: đoạn nào chứa dấu [[?ten_bien]] sẽ bị XOÁ HẲN nếu biến đó
 * rỗng, còn nếu có giá trị thì chỉ gỡ dấu đi và giữ nguyên đoạn.
 *
 * Cần cơ chế này vì không phải khác biệt nào giữa hai hồ sơ cũng là thay chữ. Ví dụ
 * thật: báo cáo chuyển nhượng có câu "Là tài sản riêng của ông X theo Văn bản xác
 * định tài sản riêng số ..." — hồ sơ tặng cho cho hai vợ chồng thì cả câu đó không
 * tồn tại. Nếu chỉ biết thay chuỗi, ta sẽ để lại một câu sai hoàn toàn về pháp lý.
 *
 * `coGiaTri(ten)` trả về true/false cho từng tên biến.
 */
/**
 * Tách một đoạn Word thành nhiều đoạn tại mỗi dấu `dau` nằm trong chữ của nó.
 *
 * Vì sao không dùng ngắt dòng mềm <w:br/> như trước: đoạn văn bản hành chính căn đều hai
 * bên, mà Word căn đều CẢ dòng kết thúc bằng ngắt dòng mềm — dòng ngắn bị kéo giãn đầy
 * lề, chữ cách nhau cả gang tay ("thuộc    quyền    sử    dụng    của    ông"). Dòng
 * thứ hai trở đi lại mất luôn thụt đầu dòng. Bản đã ký thì mỗi "+ Thửa đất số…" là một
 * đoạn riêng, nên ở đây cũng tách thành đoạn riêng, mang nguyên định dạng đoạn (căn lề,
 * thụt dòng, giãn dòng) và định dạng chữ của chỗ đặt ô trống.
 *
 * Đoạn nào mang dấu ngắt vùng (sectPr) thì giữ cách cũ: tách đoạn đó sẽ nhân đôi ngắt vùng.
 */
function tachDoanTheoDau(xml, dau, dauDuPhong) {
  if (!xml.includes(dau)) return xml;
  const RE_DOAN = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  return xml.replace(RE_DOAN, (doan) => {
    if (!doan.includes(dau)) return doan;
    const mo = doan.match(/^<w:p(?:\s[^>]*)?>/)[0];
    // paraId phải là duy nhất trong văn bản; chép nguyên thì các đoạn mới trùng mã với
    // đoạn gốc. Bỏ đi để Word tự đánh lại.
    const moMoi = mo.replace(/\s+w14:(?:paraId|textId)="[^"]*"/g, '');
    const mPPr = doan.slice(mo.length).match(/^\s*(<w:pPr>[\s\S]*?<\/w:pPr>|<w:pPr\/>)/);
    const pPr = mPPr ? mPPr[1] : '';
    if (/<w:sectPr/.test(pPr)) return doan.split(dau).join(dauDuPhong);
    return doan.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, (run) => {
      if (!run.includes(dau)) return run;
      const moR = run.match(/^<w:r(?:\s[^>]*)?>/)[0];
      const mRPr = run.slice(moR.length).match(/^\s*(<w:rPr>[\s\S]*?<\/w:rPr>)/);
      const rPr = mRPr ? mRPr[1] : '';
      return run.split(dau).join(`</w:t></w:r></w:p>${moMoi}${pPr}${moR}${rPr}<w:t xml:space="preserve">`);
    });
  });
}

/**
 * Bỏ những đoạn mà mọi ô trống trong đó đều được đánh dấu "không áp dụng" (giá trị
 * false trong ho_so.json) và ngoài ô trống ra không còn chữ nào — chỉ còn gạch đầu dòng,
 * dấu chấm phẩy… Đoạn còn chữ thật thì giữ, chỉ ô trống bị xoá sau đó.
 *
 * Khác hẳn để trống: để trống nghĩa là CHƯA BIẾT, phải hiện «CẦN ĐIỀN» cho người ký thấy;
 * false nghĩa là ĐÃ XÉT và hồ sơ này không có (không đổi bản đồ, bán hết không còn diện
 * tích). Không có cách nói "không áp dụng" thì mọi ô như vậy đều thành «CẦN ĐIỀN» và cán
 * bộ phải tự xoá tay từng dòng — còn nếu cho ô rỗng tự biến mất thì một ô bị quên cũng
 * lặng lẽ biến mất theo.
 *
 * Đoạn là đoạn duy nhất trong một ô bảng thì thay bằng đoạn rỗng: ô bảng không có đoạn
 * nào là Word báo văn bản hỏng.
 */
function boDoanKhongApDung(xml, laKhongApDung) {
  const RE_DOAN = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  let soBo = 0;
  const ra = xml.replace(RE_DOAN, (doan, viTri, toan) => {
    const chu = (doan.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [])
      .map((t) => boDauXML(t.replace(/<[^>]+>/g, ''))).join('');
    const bien = [...chu.matchAll(/\{\{([a-zA-Z0-9_.]+)\}\}/g)].map((m) => m[1]);
    if (!bien.length || !bien.every(laKhongApDung)) return doan;
    if (/[\p{L}\p{N}]/u.test(chu.replace(/\{\{[a-zA-Z0-9_.]+\}\}/g, ''))) return doan;
    soBo++;
    const truoc = toan.slice(0, viTri).trimEnd();
    const sau = toan.slice(viTri + doan.length).trimStart();
    const duyNhatTrongO = /(<w:tc>|<\/w:tcPr>)$/.test(truoc) && sau.startsWith('</w:tc>');
    return duyNhatTrongO ? '<w:p/>' : '';
  });
  return { xml: ra, soBo };
}

function xuLyDoanDieuKien(xml, coGiaTri) {
  const RE_DOAN = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  return xml.replace(RE_DOAN, (doan) => {
    const chu = (doan.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [])
      .map((t) => boDauXML(t.replace(/<[^>]+>/g, ''))).join('');
    const m = chu.match(/\[\[\?([a-zA-Z0-9_.]+)\]\]/);
    if (!m) return doan;
    if (!coGiaTri(m[1])) return '';           // biến rỗng → bỏ cả đoạn
    return doan;                               // giữ đoạn; dấu được gỡ ở bước thay chuỗi
  });
}

/** Các phần có chữ cần xử lý: thân bài, đầu trang, chân trang. */
function cacPhanCoChu(cacMuc) {
  return cacMuc
    .map((m) => m.ten)
    .filter((t) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(t));
}

/**
 * Đơn vị diện tích viết "m²" chứ không "m2" (yêu cầu Chi nhánh 16/09/2026: văn bản sinh ra
 * ghi "m2", cán bộ phải sửa tay từng chỗ). Chỉ đổi "m2" đứng riêng — không dính chữ cái hay
 * số phía sau ("m2a" giữ nguyên) — và nằm gọn trong MỘT nút chữ. Kiểu bản ký gõ "m" rồi đặt
 * số "2" ở chỉ số trên là hai nút riêng, Word đã hiện thành m², nên không đụng tới.
 */
const RE_M2 = /(^|[^\p{L}_])m2(?![\p{L}\p{N}_])/gu;
function doiDonViM2(chu) {
  return String(chu ?? '').replace(RE_M2, '$1m²');
}
/** Như doiDonViM2 nhưng trên XML của một phần văn bản: chỉ sửa chữ trong các nút <w:t>. */
function doiDonViM2Xml(xml) {
  let so = 0;
  const ra = xml.replace(/(<w:t(?:[ ][^>]*)?>)([^<]*)(<[/]w:t>)/g, (m, mo, chu, dong) => {
    const moi = doiDonViM2(chu);
    if (moi !== chu) so += (chu.match(RE_M2) || []).length;
    return mo + moi + dong;
  });
  return { xml: ra, so };
}

/**
 * Chèn một đoạn mới ngay sau đoạn ĐẦU TIÊN có chữ chứa `moc`, mang đúng định dạng đoạn đó:
 * giữ nguyên <w:pPr> (lề, thụt dòng, giãn dòng) và định dạng chữ của nút chữ đầu tiên, chữ
 * thì thay bằng `noiDung`. Dùng khi mẫu cần một dòng mà bản đã ký gốc không có — dòng ghi
 * chú "+ Là tài sản riêng của …" (17/09/2026): thay chuỗi không tạo được đoạn mới.
 * Văn bản đã có `noiDung` thì không chèn nữa (daCo), nên chạy lại bao nhiêu lần cũng vậy.
 * Trả { xml, so, daCo }.
 */
function themDoanSau(xml, moc, noiDung) {
  if (chuPhang(xml).includes(noiDung)) return { xml, so: 0, daCo: true };
  const RE_DOAN = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  let so = 0;
  const ra = xml.replace(RE_DOAN, (doan) => {
    if (so || !chuPhang(doan).includes(moc)) return doan;
    // paraId phải duy nhất trong văn bản — bỏ đi để Word tự đánh.
    const mo = doan.match(/^<w:p(?:\s[^>]*)?>/)[0];
    const moMoi = mo.replace(/\s+w14:(?:paraId|textId)="[^"]*"/g, '');
    const mPPr = doan.slice(mo.length).match(/^\s*(<w:pPr>[\s\S]*?<\/w:pPr>|<w:pPr\/>)/);
    const pPr = mPPr ? mPPr[1] : '';
    const run = (doan.match(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g) || []).find((r) => /<w:t[\s>]/.test(r)) || '';
    const rPr = (run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
    so++;
    return `${doan}${moMoi}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${themDauXML(noiDung)}</w:t></w:r></w:p>`;
  });
  return { xml: ra, so, daCo: false };
}

module.exports = {
  docZip, layNoiDung, ghiZip, xuLyDoanDieuKien,
  layCacNutChu, chuPhang, thayChuoi, giuKhoangTrang, cacPhanCoChu,
  boDauXML, themDauXML, kiemTraXML, tinhCRC, tachDoanTheoDau, boDoanKhongApDung,
  doiDonViM2, doiDonViM2Xml, themDoanSau,
};
