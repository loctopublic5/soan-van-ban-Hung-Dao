# Quy trình cuốn chiếu cho lô 9-15 hồ sơ

Đọc khi người dùng đưa cả một lô hồ sơ. Làm lẻ một hồ sơ thì không cần vòng lặp này —
xem mục cuối.

## Vì sao không đọc hết lô rồi mới soạn

Hai lý do, và lý do thứ hai mới là lý do thật.

**Tốn.** Một bộ hồ sơ scan 30-80 trang, đọc hết bằng thị giác tốn 60-120 nghìn token.
Nhân với 12 hồ sơ là vượt xa một cửa sổ ngữ cảnh, nên phiên làm việc sẽ bị nén giữa
chừng — và bản nén giữ lại phần tóm tắt chứ không giữ số thửa.

**Lẫn.** Khi mười một hồ sơ cùng nằm trong đầu, hồ sơ thứ mười hai được đọc bằng một bộ
nhớ đã đầy số hiệu của mười một hồ sơ trước. Số thửa của hồ sơ này chạy sang văn bản của
hồ sơ kia là lỗi rất khó thấy: câu văn vẫn trôi chảy, con số vẫn đúng định dạng, chỉ là
của người khác. Vòng lặp cuốn chiếu giữ cho mỗi lượt chỉ có đúng một hồ sơ trong đầu.

## Bốn bước

Ba trong bốn bước chạy bằng CPU và không tốn token nào. Chỉ bước 2 cần Claude.

### Bước 1 — Lọc trang bằng CPU

```bash
node scripts/loc_trang.js --pdf "<đường dẫn bản scan>" --ra "<thư mục làm việc>"
```

Cắt trang trắng, trang trùng, và (khi PDF có lớp chữ) chốt luôn trang mỏ neo bằng từ
khoá. Kết quả là `loc.json` cùng vài ảnh nhỏ. Chi tiết và giới hạn: xem
[`loc-trang-truoc.md`](loc-trang-truoc.md) — đọc trước khi tin vào kết quả lọc.

### Bước 2 — Đọc đúng một hồ sơ

Đây là bước duy nhất tốn token, nên nó là chỗ đáng kỷ luật nhất:

- Đọc **đúng các ảnh mà `--tiep` liệt kê**. Không mở PDF gốc. Không render thêm trang
  "cho chắc". Thiếu căn cứ thì mở rộng có chủ đích bằng `loc_trang.js --trang 12,13`,
  và nói rõ vì sao cần thêm.
- Ghi ra `ho_so.json` **tinh gọn**: chỉ các biến, không lời chào, không diễn giải, không
  chép lại nguyên văn hồ sơ. Chuẩn biến: [`bien-so.md`](bien-so.md).
- Ô nào không đọc chắc thì **bỏ hẳn khỏi JSON**. Script sẽ tự đánh dấu `«CẦN ĐIỀN: ...»`.
  Đoán một giá trị trông hợp lý là cách hỏng hồ sơ êm ái nhất.

### Bước 3 — Điền mẫu bằng CPU

```bash
node scripts/chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ --dien "<tên hồ sơ>"
```

Gọi vào `tao_bo_van_ban.js` → `dien_mau.js`, xử lý XML của `.docx`, thay biến, lọc đoạn
điều kiện không áp dụng, đánh dấu ô thiếu, xuất trọn bộ văn bản đúng quy chuẩn đặt tên.
Không tốn token. Đừng gọi `dien_mau.js` từng file bằng tay — làm thế thì mất phần tra bộ
mẫu và đặt tên thư mục, và dễ thiếu văn bản trong bộ.

### Bước 4 — Quên hồ sơ vừa xong

Claude **không tự xoá được ngữ cảnh của mình**. Không có lệnh nào làm việc đó. Cái làm
được là ba việc sau, xếp theo mức triệt để tăng dần:

1. **Không nhắc lại.** Sau khi `da_dien.json` xuất hiện, đừng tóm tắt lại nội dung hồ sơ,
   đừng trích dẫn `ho_so.json`, đừng liệt kê các biến đã điền. Báo một dòng rồi đi tiếp.
   Nội dung cũ vẫn nằm trong cửa sổ ngữ cảnh, nhưng không bị nhân lên.
2. **Đọc trong ngữ cảnh riêng.** Giao bước 2 của mỗi hồ sơ cho một phiên con: phiên con
   đọc ảnh, ghi `ho_so.json`, trả về đúng một dòng. Ảnh trang và suy luận trung gian nằm
   lại trong phiên con, phiên chính chỉ nhận một dòng. Đây là cách duy nhất giữ ngữ cảnh
   phiên chính thật sự phẳng ở lô lớn. Đổi lại, phiên con không thấy các hồ sơ trước —
   với công việc này thì đó là ưu điểm.
3. **`/clear` giữa các hồ sơ.** Sạch tuyệt đối. An toàn vì toàn bộ tiến độ nằm trên ổ
   đĩa: chạy lại `--tiep` là biết đi tiếp từ đâu. Người dùng phải tự gõ lệnh này.

Đừng nói với người dùng là "đã xoá ngữ cảnh" khi thực chất chỉ là không nhắc lại.

## Sổ tiến độ nằm trên ổ đĩa

`chay_cuon_chieu.js` không giữ trạng thái trong đầu. Mỗi lần chạy, nó đọc lại thư mục
làm việc và suy ra hồ sơ nào đã tới đâu, dựa trên file nào có mặt:

| File trong `<lv>/<tên hồ sơ>/` | Trạng thái | Việc tiếp theo |
|---|---|---|
| *(chưa có gì)* | `LOC` | chạy `loc_trang.js` |
| `loc.json` | `DOC` | Claude đọc ảnh, ghi `ho_so.json` — khối `du_kien` chỉ gồm dữ kiện, câu do script ghép (`bien-so.md` mục 0) |
| `ho_so.json` | `DIEN` | chạy `--dien` |
| `da_dien.json` | `XONG` | — |
| `ton.json` | `TON` | có vướng mắc, đã ghi lý do |

Vì trạng thái suy từ ổ đĩa nên ngắt phiên giữa chừng, `/clear`, hay nén ngữ cảnh đều vô
hại. Đó chính là thứ làm cho bước 4 an toàn.

Danh sách hồ sơ của lô được chốt một lần vào `lo.json` lúc `--khoi-tao`. Không đọc lại
nhật ký phân loại ở mỗi lượt: nếu bước phân loại thay đổi giữa chừng, thứ tự hồ sơ đang
chạy dở sẽ lặng lẽ đổi theo.

## Chạy cả lô

```bash
# một lần, đầu lô
node scripts/chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ \
  --nhat-ky "<...>/_nhat_ky_phan_loai.json" --khoi-tao

# lặp lại tới khi hết lô — mỗi lần in ra ĐÚNG MỘT việc
node scripts/chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ --tiep

# một lần, cuối lô
node scripts/chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ --tong-ket \
  --goc-ra-may "C:\...\Ket qua" --goc-da-phan-loai "C:\...\Đã phân loại"
```

`--tiep` là trục của vòng lặp: nó in ra một việc duy nhất kèm đúng lệnh phải chạy hoặc
đúng các ảnh phải đọc. Cứ làm xong lại gọi `--tiep`. Không tự nghĩ ra việc ngoài những gì
nó in — thứ tự và điều kiện đã tính sẵn ở đó.

Chạy không cờ nào thì in bảng tiến độ của cả lô. Dùng khi người dùng hỏi "đến đâu rồi".

Hồ sơ vướng thì xếp sang đống tồn kèm lý do, rồi chạy tiếp:

```bash
node scripts/chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ \
  --ton "<tên hồ sơ>" --ly-do "thiếu trích đo thửa đất"
```

Một hồ sơ vướng không được làm đứng cả lô.

Vướng ở **tầng rổ** (rổ chưa có mẫu, rổ chưa khai trong `ban_do_ro_mau.json`) thì `--tiep`
tự xếp sang đống tồn ngay, trước bước đọc — không tốn token nào cho hồ sơ sẽ không soạn
được. Gỡ vướng xong (bổ sung mẫu, khai rổ) thì gọi thẳng `--dien` cho hồ sơ đó: một lệnh
`--dien` chỉ đích danh được hiểu là "đã gỡ vướng, thử lại", nên nó tự bỏ dấu tồn.

## Ngân sách token, để biết khi nào có gì đó sai

Ước lượng cho một hồ sơ scan cỡ trung bình (35 trang):

| | Đọc thẳng cả bộ | Cuốn chiếu |
|---|---|---|
| Bước 1 lọc trang | — | 0 |
| Bước 2 đọc | 60-120k | 6-15k |
| Bước 3 điền mẫu | 0 | 0 |
| Ngữ cảnh phiên chính sau 12 hồ sơ | tràn | gần như phẳng |

Nếu một hồ sơ tiêu quá khoảng 20k token ở bước 2, dừng lại xem vì sao: thường là do lọc
trang không ăn (xem `loc-trang-truoc.md` mục "Khi lọc không ăn") hoặc do đang mở PDF gốc
thay vì đọc ảnh đã lọc.

## Làm lẻ một hồ sơ

Không cần vòng lặp. Lọc trang, đọc, rồi gọi thẳng:

```bash
node scripts/loc_trang.js --pdf "ho_so.pdf" --ra lv/
node scripts/tao_bo_van_ban.js --du-lieu lv/ho_so/ho_so.json \
  --goc-ra out/ --goc-ra-may "C:\...\Ket qua"
```

`chay_hang_loat.js` vẫn dùng được khi đã có sẵn đủ file JSON cho cả lô và chỉ cần sinh
văn bản một lượt — nó không có bước lọc trang và không cuốn chiếu.
