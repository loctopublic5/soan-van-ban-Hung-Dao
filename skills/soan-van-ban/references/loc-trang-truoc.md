# Lọc trang trước khi đọc

Đọc trước khi tin vào kết quả của `loc_trang.js`, và khi lọc ra ít trang hơn hoặc nhiều
trang hơn mức hợp lý.

## Điều phải biết trước tiên

**Hồ sơ scan ở Chi nhánh không có lớp văn bản.** Đo trên ba bản scan thật:

| Hồ sơ | Dung lượng | Ký tự rút được bằng `pdftotext` |
|---|---|---|
| chuyển nhượng cấp đổi | 8,9 MB | 28 |
| cấp đổi | 7,4 MB | 33 |
| thừa kế, tặng cho | 27,7 MB | 94 |

Vài chục ký tự cho cả file 40 trang, tức là **không có gì để quét**. Cho nên ý tưởng "CPU
quét từ khoá mỏ neo, không tốn token" chỉ chạy được với hồ sơ đã có sẵn lớp chữ. Với bản
scan thuần ảnh, CPU chỉ làm được việc loại trang trắng và trang trùng; việc nhận ra
"trang này là Đơn đăng ký biến động" vẫn cần nhìn.

Đừng hứa với người dùng là bước lọc tốn 0 token cho mọi hồ sơ. Nói đúng: **0 token cho
hồ sơ có lớp chữ, và rẻ hơn khoảng một bậc cho hồ sơ scan.**

## Hai làn

`loc_trang.js` tự chọn làn theo số ký tự trung bình mỗi trang (ngưỡng trong
`assets/tu_khoa_moc.json`, mặc định 40).

### Làn `lop-chu` — mỏ neo bằng từ khoá, 0 token

PDF in ra từ phần mềm, hoặc bản scan đã OCR sẵn. Script quét bảng từ khoá trong
`assets/tu_khoa_moc.json`, chốt luôn trang nào là đơn đăng ký biến động, trang nào là hợp
đồng công chứng, trang nào là trang 4 GCN. Claude không phải nhìn trang nào để chọn mỏ
neo — chỉ đọc thẳng nội dung các trang đã chốt, và đọc bằng `pdftotext -f -l` chứ không
render ảnh.

So khớp thực hiện sau khi bỏ dấu và viết hoa, nên viết từ khoá có dấu hay không đều được.

Trang thủ tục (phiếu tiếp nhận, giấy biên nhận) chỉ bị loại khi nó **không đồng thời** là
một mốc — phiếu tiếp nhận đôi khi in chung tờ với đơn đăng ký biến động, loại thẳng là
mất trang gốc.

### Làn `anh-scan` — lọc rác rồi nhìn ảnh nhỏ

CPU dựng mỗi trang thành ảnh xám 20dpi rồi đo hai thứ:

- **Tỉ lệ mực** — phần điểm ảnh tối hơn ngưỡng, tính trên vùng đã cắt 6% lề. Cắt lề vì
  mép bản scan hay có viền đen của nắp máy quét; để nguyên thì một trang trắng tinh vẫn
  bị tính là có mực và không bao giờ bị loại.
- **Vân tay 8×8** — trung bình độ sáng của 64 ô. Hai trang có vân tay gần nhau là cùng
  một tờ được scan hai lần. **Chỉ bản xuất hiện sau mới bị loại**, bản đầu luôn giữ.

Số trang còn lại được dựng thành ảnh nhỏ 45dpi để Claude liếc qua mà chọn mỏ neo. Đây là
chỗ "quét từ khoá" thật sự xảy ra — bằng mắt, ở độ phân giải vừa đủ đọc tiêu đề in đậm.

## Mọi ngưỡng đều nghiêng về phía GIỮ

Giữ nhầm một trang rác tốn thêm một ảnh nhỏ. Bỏ nhầm một trang thật thì văn bản được soạn
bằng dữ liệu thiếu, và không ai biết là đã thiếu. Hai giá đó không cùng hạng.

Vì vậy:

- Ngưỡng trang trắng để thấp (`0.008`). Trang chỉ có một chữ ký hoặc một con dấu vẫn phải
  được giữ.
- Số đo của **từng trang, kể cả trang bị bỏ**, được ghi vào `chi_tiet_trang` trong
  `loc.json`. Nghi lọc sai thì mở file đó ra xem tỉ lệ mực thật là bao nhiêu, đừng đoán.
- Chỉnh ngưỡng thì sửa trong `assets/tu_khoa_moc.json`, đừng sửa trong `loc_trang.js`.

## Khi lọc không ăn

**Còn quá nhiều trang (trên 30).** Bản scan bẩn, hoặc nền giấy ngả vàng làm mọi trang đều
vượt ngưỡng mực. Script chỉ dựng ảnh cho 30 trang đầu và ghi cảnh báo. Cách xử lý: xem
`chi_tiet_trang` để tìm ngưỡng phù hợp cho lô đó, hoặc đọc theo cụm bằng `--trang`.

**Còn quá ít trang (dưới 3).** Gần như chắc chắn lọc sai — không bộ hồ sơ nào chỉ có hai
trang có nội dung. Chạy lại với `--giu-trung` để bỏ phần loại trùng, rồi xem
`chi_tiet_trang`.

**Làn `lop-chu` mà không khớp mốc nào.** Bảng từ khoá chưa phủ dạng hồ sơ này. Script giữ
tạm 6 trang đầu và ghi cảnh báo. Bổ sung từ khoá vào `assets/tu_khoa_moc.json` — đó là
việc làm một lần cho mọi hồ sơ về sau.

**Không thấy Đơn đăng ký biến động.** Script cảnh báo riêng, vì đây là trang trả lời câu
"ghi trang 4 hay cấp GCN mới". Thiếu nó thì chưa chọn được nhánh cho rổ cha — xem
[`bay-loi-va-ngoai-le.md`](bay-loi-va-ngoai-le.md).

## Công cụ cần có

`pdftotext` và `pdftoppm` (gói `poppler-utils`). Thêm `pdfseparate` và `pdfunite` nếu
muốn `--mini-pdf`. Không cần gói npm nào.

Cả hai script chạy trong workspace của phiên làm việc, không phải trên máy Chi nhánh —
máy người dùng chỉ nhận kết quả và chạy script PowerShell dọn dẹp.

## Tham số hay dùng

```bash
# một hồ sơ
node scripts/loc_trang.js --pdf "thừa kế, tặng cho.pdf" --ra lv/

# cả thư mục, quét cả thư mục con
node scripts/loc_trang.js --thu-muc "Đã phân loại/" --ra lv/

# ép thêm trang khi đọc thấy thiếu căn cứ
node scripts/loc_trang.js --pdf ho_so.pdf --ra lv/ --trang 12,13,27

# giữ cả trang trùng, khi nghi lọc quá tay
node scripts/loc_trang.js --pdf ho_so.pdf --ra lv/ --giu-trung

# ảnh nét hơn cho bản scan mờ (mặc định 45)
node scripts/loc_trang.js --pdf ho_so.pdf --ra lv/ --dpi 80

# kèm bản PDF rút gọn để gửi lại người dùng
node scripts/loc_trang.js --pdf ho_so.pdf --ra lv/ --mini-pdf
```

## Đọc `loc.json`

```jsonc
{
  "lan": "anh-scan",           // hoặc "lop-chu"
  "tong_trang": 38,
  "ky_tu_moi_trang": 2.4,      // dưới 40 nên vào làn ảnh
  "giu": [1, 2, 3, 7, 12],
  "bo": { "trang_trang": [4, 5, 6], "trung_lap": [8, 9] },
  "moc": {},                   // chỉ có ở làn lop-chu
  "anh": ["trang-001.png", "trang-002.png"],
  "chi_tiet_trang": [ { "so": 1, "ti_le_muc": 0.071, "ngang": false, "bo": null } ],
  "canh_bao": []
}
```

`canh_bao` là phần phải đọc. Nó nói thẳng chỗ script không chắc, và đó là chỗ hay sai.
