# Bẫy lỗi và cách xử lý ngoại lệ

Đọc khi gặp hồ sơ không đi thẳng được qua quy trình, và **luôn đọc mục 4 trước khi bàn
giao**.

## 1. Ba tình huống không được tự quyết

### `CAN_HOI_NHANH` — rổ cha, chưa đủ căn cứ chọn nhánh

Gặp ở các rổ `Chuyển nhượng quyền sử dụng đất`, `Tặng cho quyền sử dụng đất`,
`Tách thửa đất`, `Thừa kế`.

Thừa kế và tặng cho dùng chung mẫu nên không cần tách rổ; việc phải làm chỉ là xác định
hồ sơ **ghi biến động lên trang 4 GCN cũ** hay **cấp GCN mới**, rồi lấy `giao-dich-trang-4`
hoặc `giao-dich-cap-doi`.

**Đọc trong hồ sơ trước.** Đơn đăng ký biến động có ô "có/không có nhu cầu cấp GCN mới",
trả lời thẳng câu này. Chỉ hỏi người dùng khi hồ sơ thiếu đơn. Đoán bừa làm cán bộ chuẩn
bị nhầm quy trình, và sai này chỉ lộ ra ở khâu trả kết quả.

Chọn xong thì ghi `"bo_mau"` vào `ho_so.json`; không có nó thì script dừng hồ sơ đó lại.

Với `Tách thửa đất`, câu phải trả lời là có phát sinh chủ sử dụng mới hay không.

### `CHUA_CO_MAU` — chưa có mẫu cho rổ này

Hiện là `Đính chính`, `Thế chấp / Giải chấp`, `Biến động thông tin cá nhân`.

Nói rõ với người dùng và đề nghị họ cung cấp một văn bản đã ký để làm mẫu (xem
[`lam-mau-moi.md`](lam-mau-moi.md)). **Không lấy mẫu của rổ khác dùng tạm** — thể thức
gần giống nhau nên bản sinh ra trông vẫn xuôi, và đó chính là lý do nó lọt qua được đến
bàn ký.

`chay_cuon_chieu.js --tiep` phát hiện tình huống này **trước** bước đọc, nên không tốn
token nào cho hồ sơ sẽ không soạn được.

### Hồ sơ chưa đủ điều kiện giải quyết

Bộ mẫu hiện có chỉ phục vụ kết luận "đủ điều kiện". Gặp hồ sơ phải trả lại hoặc yêu cầu
bổ sung thì dừng, xếp sang đống tồn kèm lý do, báo người dùng tự xử lý.

## 2. Hồ sơ vừa thừa kế vừa tặng cho

Hay gặp: các đồng thừa kế nhận di sản rồi tặng lại phần của mình cho một người.

Khi bản scan có **cả hai** yếu tố, viết ghép bằng dấu phẩy:

- *"Hợp đồng **thừa kế, tặng cho** quyền sử dụng đất số…"*
- *"để thực hiện việc **thừa kế, tặng cho** quyền sử dụng đất cho…"*
- *"do nhận **thừa kế, tặng cho** là đủ điều kiện"*

Chỉ ghép khi hồ sơ thật sự có cả hai. Chỉ có văn bản phân chia di sản thì viết "thừa kế";
chỉ có hợp đồng tặng cho thì viết "tặng cho". Ghép bừa làm sai bản chất giao dịch, và đó
là thứ cán bộ thuế đọc để tính nghĩa vụ tài chính.

Các biến chịu ảnh hưởng được liệt kê ở `quy_tac_thua_ke_tang_cho.ap_dung_cho_bien` trong
`assets/ban_do_ro_mau.json`.

## 3. Quy chuẩn đặt tên và đủ bộ văn bản

Đã cài sẵn trong script, ghi ở đây để đối chiếu khi nghi sai — **không tự đổi**:

- Mã ngắn = đuôi mã hồ sơ: `H26.103.25.19-260519-0009` → `260519-0009`
- Thư mục: `260519-0009 Nguyễn Văn A` — mỗi hồ sơ một thư mục, đủ bộ văn bản
- File: `BC 260519-0009.docx`, `TB 260519-0009.docx`, `PC 260519-0009.docx`
- Không có mã hồ sơ thì dùng riêng tên người. **Không bịa mã.** Mã hồ sơ do hệ thống một
  cửa cấp, không có trong bản scan; một mã trông như thật sẽ được chép sang mọi bước sau.

Làm cho **đủ bộ** văn bản mà `ban_do_ro_mau.json` liệt kê, không chỉ báo cáo. Một hồ sơ
chuyển nhượng thiếu phiếu chuyển thuế là hồ sơ tắc ở bước sau, và người dùng chỉ phát
hiện khi cơ quan thuế hỏi.

Phiếu chuyển thuế chỉ lập khi hồ sơ làm **phát sinh nghĩa vụ tài chính**, tức có chuyển
quyền sang người khác. Cấp đổi thuần, tách thửa không đổi chủ và hợp thửa cùng chủ không
có phiếu chuyển. Quy tắc này suy ra từ chính bộ mẫu của Chi nhánh và đã ghi trong
`quy_tac_phieu_chuyen`.

## 4. Kiểm tra trước khi giao

Mở lại file vừa sinh và đọc bằng `xem_mau.js`. Đừng tin vào việc script chạy không báo
lỗi — script chỉ biết nó đã thay đủ biến, không biết giá trị có đúng người không.

**Còn tên của hồ sơ mẫu.** Đây là rủi ro lớn nhất của cách làm mẫu từ văn bản thật: một
dữ kiện bị bỏ sót lúc tạo mẫu sẽ nằm chết trong mẫu và in ra ở **mọi** hồ sơ về sau. Hồ
sơ ông A mang số Giấy chứng nhận của ông B là loại sai không ai nhìn ra khi đọc lướt.

```bash
node scripts/kiem_tra_mau.js --tat-ca
```

Bắt được thì **sửa ở mẫu**, không sửa file kết quả — sửa kết quả thì hồ sơ sau lại sai y
như cũ.

**Câu lủng củng do ghép biến.** Đọc lại các câu chứa biến `cau_*`.

**Đoạn không áp dụng còn nằm lại.** Ví dụ câu "Là tài sản riêng của ông X…" trong hồ sơ
tặng cho cho hai vợ chồng.

## 5. Khi mẫu và hồ sơ mâu thuẫn

Bộ mẫu hiện dùng là văn bản thật đã ký, nên có mang theo lỗi sao chép từ hồ sơ trước. Đã
gặp: trích yếu báo cáo chuyển nhượng ghi "nhận tặng cho"; một tờ trình cấp đổi nêu tên
bốn người thuộc hồ sơ khác; một báo cáo tặng cho ghi bên tặng cho chính là bên nhận;
trích yếu báo cáo tách thửa mà câu mở đầu lại ghi "hợp thửa"; Thông báo kính gửi một xã
nhưng thân bài ghi tên xã khác; số hiệu văn bản pháp luật thiếu năm.

Phát hiện thêm lỗi kiểu này thì **sửa ở mẫu** rồi ghi vào [`bien-so.md`](bien-so.md) mục 6.
Cách sửa: trong bảng thay, cho giá trị thay bắt đầu bằng dấu `=`, nghĩa là thay bằng **chữ
cố định** chứ không phải ô trống:

```json
{ "Thông tư số 10/2014/TT-BTNMT": "=Thông tư số 10/2024/TT-BTNMT" }
```

Chỉ dùng dấu `=` cho lỗi chính tả, lỗi lặp chữ, lỗi số hiệu văn bản pháp luật — những thứ
sai giống nhau ở mọi hồ sơ. Chỗ nào là **nội dung nghiệp vụ** (bên tặng cho ghi nhầm
thành bên nhận, số tờ bản đồ mâu thuẫn giữa hai văn bản) thì khai thành biến rồi báo
người dùng quyết. Đừng tự sửa nghiệp vụ.

Ngược lại, khi văn bản sinh ra khác bản cán bộ từng soạn, đừng mặc định là mình sai. Đã
có trường hợp bản sinh ra đúng hơn bản thật. Nêu chỗ khác biệt cho người dùng quyết.

## 6. Rút hồ sơ khỏi hàng đợi

Xong một lô thì bản scan phải rời `Đã phân loại\` — nếu không, lần chạy sau soạn lại
chính những hồ sơ đó. `--tong-ket` sinh sẵn `don_dep_sau_soan.ps1` kèm
`CHAY_DON_DEP_SAU_SOAN.bat`; ghi cả hai lên máy người dùng rồi báo họ bấm chạy.

Script chia bản scan thành **hai đống rạch ròi**:

- `_CAN_XOA\` — hồ sơ đã soạn xong đủ bộ văn bản
- `_CHUA_XU_LY_DUOC\` — hồ sơ chưa soạn được, tên file giữ tiền tố `[tên rổ]` để biết nó
  từ rổ nào ra mà trả về khi đã bổ sung mẫu

Hỏi hai lần: lần một để dồn file, lần hai (phải gõ đúng chữ `XOA`) để xoá đống `_CAN_XOA`.
Xoá bằng cách chuyển vào Thùng rác chứ không xoá thẳng — hồ sơ đất đai xoá nhầm thì không
dựng lại được, mà người dùng vẫn đạt được điều họ muốn là thư mục sạch. Ai muốn xoá vĩnh
viễn thì dọn Thùng rác, đó là một hành động có ý thức.

**Đừng bao giờ đưa một hồ sơ chưa soạn đủ bộ vào `_CAN_XOA`.** Thà để nó ở đống tồn còn
hơn xoá mất bản scan của một hồ sơ chưa có văn bản nào.

Phiên làm việc không tự xoá hay di chuyển file trên máy người dùng. Sinh script để người
dùng bấm chạy, và nói rõ script sẽ làm gì trước khi họ bấm.
