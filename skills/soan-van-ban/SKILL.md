---
name: soan-van-ban
description: "Soạn bộ văn bản trình ký BC-TB-PC cho hồ sơ đăng ký biến động đất đai — báo cáo thẩm tra gửi Phó Giám đốc, thông báo gửi UBND xã, phiếu chuyển thuế — bằng cách điền dữ liệu đọc từ hồ sơ vào mẫu .docx của Chi nhánh, giữ nguyên thể thức. Dùng khi người dùng nhắc đến soạn/lập/viết báo cáo, tờ trình, thông báo cập nhật, phiếu chuyển cho hồ sơ đất đai, hoặc sau khi đã phân loại hồ sơ bằng skill phan-loai-ho-so-dat-dai. KHÔNG dùng cho thông báo TRẢ LẠI hồ sơ (chưa đủ điều kiện giải quyết) — việc đó là của skill soan-tra-lai; văn bản trả lời phiếu cung cấp thông tin (CCTT) là của skill soan-tra-loi-cctt."
---

# Soạn văn bản trình ký cho hồ sơ đất đai

## Vai trò

Vào vai viên chức thụ lý hồ sơ tại Chi nhánh Văn phòng Đăng ký Đất đai: đọc hồ sơ, thẩm
tra, rồi soạn văn bản trình Lãnh đạo ký. Văn bản làm ra không phải để thông báo mà để
**chuyển trách nhiệm pháp lý một cách có kiểm chứng** — viên chức chịu trách nhiệm phần
thẩm tra, lãnh đạo chịu trách nhiệm phần quyết định ký. Vì vậy mọi dữ kiện phải dẫn được
về câu chữ trong hồ sơ, và chỗ nào chưa kiểm chứng được thì để trống lộ liễu chứ không
viết cho tròn câu.

Skill này nối tiếp `phan-loai-ho-so-dat-dai`: rổ dữ liệu của hồ sơ quyết định bộ mẫu.

**Người ký, cán bộ theo cấu hình của phòng** (`assets/cau_hinh_chi_nhanh.json`). Plugin `vpdk`
là phôi dùng cho nhiều phòng, tổ. Mọi văn bản do **KT. Giám đốc — Phó Giám đốc** ký
(`ten_nguoi_ky`), Báo cáo "Kính gửi: Phó Giám đốc …". Cán bộ thụ lý cố định trong cấu hình;
**cán bộ hợp đồng chọn theo lượt** từ danh sách `can_bo_hop_dong_chon` — người dùng nói "cán bộ
<tên>" thì thêm `--can-bo "<tên họ gõ>"` vào lệnh `lam_ngay.js`. Không nói thì ô đó ra
«CẦN ĐIỀN»: hỏi một câu nếu chưa bàn giao, đừng tự chọn người.

**Thư mục của phòng.** Hồ sơ nguồn nằm ở hai thư mục cạnh nhau: `hs chuyển` (BC-TB-PC, skill
này) và `hs trả lại` (skill `soan-tra-lai`). Hồ sơ nằm trong đó thì **không truyền `--goc-ra`**:
script tự trả về `kết quả chuyển` / `kết quả trả lại` cạnh nó, mỗi hồ sơ một thư mục. Hồ sơ đã
soạn ở lần trước được bỏ qua; người dùng muốn soạn lại thì thêm `--soan-lai` (ghi đè văn bản cũ,
hỏi trước nếu họ có thể đã sửa tay file kết quả).

```bash
node scripts/lam_ngay.js --vao "<...>\hs chuyển" --can-bo "<tên>"   # thư mục con mang tên mẫu
node scripts/lam_ngay.js --vao "<...>\hs chuyển\A.pdf" --bo-mau "<tên mẫu>"
```

`hs chuyển` không nhận mẫu trả lại (trừ `mất giấy chứng nhận`): script dừng và bảo chuyển hồ sơ sang `hs trả lại`.

**Thư mục hồ sơ tự đặt theo tên chủ và loại biến động**: `<mã ngắn> <tên chủ> - <loại biến
động>` (chưa có mã thì bỏ mã), ví dụ `Nguyễn Văn A - Tách thửa tặng cho`. Người dùng dặn "lưu
theo tên chủ và tên biến động" thì đó chính là cách script đã làm — không tự tạo thêm tầng thư mục.

**Hai danh mục, một kho mẫu.** Plugin này còn skill `soan-tra-lai` (thông báo trả lại hồ sơ).
Mẫu trả lại nằm chung kho nhưng **chỉ được chọn khi tên gọi có chữ "trả lại"** — gõ "cấp
đổi" không bao giờ ra nhầm "trả lại cấp đổi". Người dùng muốn trả lại hồ sơ thì làm theo
SKILL.md của `soan-tra-lai` (thư mục `../soan-tra-lai/` cạnh skill này).

**Lô nhiều hồ sơ, mỗi hồ sơ một mẫu**: xếp mỗi hồ sơ vào thư mục con mang **tên mẫu** trong
`hs chuyển` rồi chạy lệnh trên. Thư mục lô nằm ngoài quy hoạch thì dùng
`node scripts/lam_ngay.js --vao "<thư mục lô>" --theo-thu-muc --goc-ra "<kết quả>"` (được lẫn
BC-TB-PC với trả lại). Script dò hết tên thư mục trước; tên nào không khớp
đúng một mẫu thì dừng cả lô và in lý do. Người dùng kể danh sách trong câu lệnh ("file A tách
thửa tặng cho, file B trang 4") thì chạy mỗi nhóm một lệnh `--bo-mau`.

## Tài nguyên

**Mọi thứ nằm ngay trong skill này** — script, 30 mẫu `.docx` (17 BC-TB-PC + 10 trả lại + 3 mất GCN), tài liệu, cấu hình. Mọi
đường dẫn trong file này (`scripts/…`, `assets/…`, `references/…`) tính từ **thư mục của
chính skill này**, tức thư mục chứa file SKILL.md đang đọc. Chạy lệnh từ đó:
`node <thư mục skill>/scripts/lam_ngay.js …`. Script tự định vị mẫu theo vị trí của nó
nên chạy từ đâu cũng được.

**Không đi tìm thư mục skill trên máy người dùng, không hỏi người dùng mẫu để đâu.** Bản
cũ của skill bắt đi tìm một thư mục trên ổ `C:\` — máy nào khác tên người dùng là báo
"không có mẫu". Mẫu luôn đi kèm skill. **Đừng tự dựng lại mẫu** — mẫu phải là văn bản
Chi nhánh đã ký.

**Kết luận "chưa có mẫu" bằng lệnh, không bằng mắt.** Chạy `node scripts/thong_ke_mau.js`
— nó đối chiếu khai báo với file thật và in số phiên bản skill. Đọc `ban_do_ro_mau.json`
bằng mắt thì dễ tin nhầm một ghi chú đã cũ.

**File vào, file ra.** Bản scan là file người dùng gửi kèm trong cuộc trò chuyện, hoặc
đường dẫn họ đưa. Hồ sơ ngoài hai thư mục của phòng mà không chỉ `--goc-ra` thì `lam_ngay.js`
tự chọn: trên claude.ai ghi vào thư mục outputs để người dùng tải về; trên máy tính thì ghi vào `ket_qua_soan/` cạnh chỗ
đang làm. Xong thì đưa file cho người dùng và nói rõ tên từng file. Script dọn bản scan
(`don_dep_sau_soan.ps1`) chỉ có nghĩa khi làm thẳng trên máy Windows của người dùng.

**Môi trường.** Script chạy bằng Node, không cần gói npm nào; bước lọc trang cần thêm
`pdftoppm`/`pdftotext` (poppler). Trong khung chat claude.ai hai thứ này có sẵn. Gặp lỗi
`node: not found` nghĩa là đang chạy trên một máy tính chưa cài Node: bảo người dùng mở
skill trong khung chat claude.ai — không phải cài gì — hoặc cài Node LTS.

**Mẫu mới, sửa mẫu là việc của người bảo trì trên bản gốc.** Làm trong một phiên chat thì
mẫu mới chỉ sống trong phiên đó, không đến tay ai khác. Sửa xong ở bản gốc, người bảo trì
chạy `node scripts/dong_goi.js` rồi tải file .zip lên — mọi người tự nhận bản mới.

## Đọc gì khi nào

| Đọc khi | File |
|---|---|
| **Luôn, đầu phiên** — rổ nào dùng bộ mẫu nào, hồ sơ nào cần phiếu chuyển thuế | `assets/ban_do_ro_mau.json` |
| Người dùng chỉ luôn file/thư mục **và** chỉ định bộ mẫu | `references/loi-tat-chi-dinh-mau.md` |
| Chạy lô 9-15 hồ sơ; cần hiểu vòng lặp, sổ tiến độ, cách giữ ngữ cảnh phẳng | `references/quy-trinh-cuon-chieu.md` |
| Kết quả lọc trang trông sai; cần chỉnh ngưỡng hoặc mở rộng trang | `references/loc-trang-truoc.md` |
| Cần biết một ô trống lấy dữ liệu từ đâu; phân biệt ba tầng nguồn | `references/bien-so.md` |
| Hồ sơ vướng, rổ cha, chưa có mẫu, mẫu mâu thuẫn hồ sơ; **và trước mọi lần bàn giao** | `references/bay-loi-va-ngoai-le.md` |
| Bổ sung mẫu cho rổ chưa có, hoặc Chi nhánh đổi thể thức | `references/lam-mau-moi.md` |

Lệnh: `lam_ngay.js` lối tắt khi đã chỉ định sẵn mẫu · `loc_trang.js` lọc trang ·
`chay_cuon_chieu.js` điều phối vòng lặp · `ghep_cau.js` ghép câu từ dữ kiện (`--khung`
in khung trống, `--du-lieu ho_so.json` xem trước câu ghép) ·
`tao_bo_van_ban.js` sinh trọn bộ cho một hồ sơ · `xem_mau.js` đọc `.docx` và liệt kê ô
trống · `kiem_tra_mau.js` soi mẫu còn sót dữ liệu hồ sơ mẫu · `tao_mau.js` biến văn bản
đã ký thành mẫu · `can_bang_chu_ky.js` cân khối chữ ký · `thong_ke_mau.js` rổ nào còn
thiếu mẫu · `chay_hang_loat.js` sinh văn bản cả lô khi đã có sẵn đủ file JSON ·
`so_ho_so.js` sổ hồ sơ: thống kê đã soạn bao nhiêu bộ, hỏng bao nhiêu, hồ sơ nào chạy lại.

**Thống kê.** Người dùng hỏi "đã soạn bao nhiêu hồ sơ", "hồ sơ nào hỏng", "rổ nào nhiều
việc", "hồ sơ nào chạy đi chạy lại" thì chạy:

```bash
node scripts/so_ho_so.js --so "C:\...\Ket qua"
```

Sổ do `tao_bo_van_ban.js` tự ghi mỗi lượt sinh văn bản, nằm ở `<thư mục kết quả>/_so_ho_so/`
(chuyển và trả lại mỗi bên một sổ, muốn gộp thì truyền hai `--so`)
— không phải nhớ gì, không phải ghi chép gì thêm. Bỏ `--so` thì script dùng thư mục kết
quả đã chạy gần đây nhất. Thêm `--lap` xem đủ danh sách hồ sơ chạy lại, `--chi-tiet` xem
từng hồ sơ, `--thang 2026-09` xem một tháng. Gộp số liệu nhiều máy: chép các file
`nhat_ky-*.jsonl` về cùng một thư mục, hoặc truyền nhiều `--so`.

## Quy trình

**Chọn đường trước khi làm gì khác.** Người dùng vừa chỉ đường dẫn hồ sơ **vừa** chỉ định
bộ mẫu ("soạn file này bằng mẫu tách thửa", "thư mục D:\lô này dùng mẫu trang 4") thì đi
lối tắt — họ đã tự trả lời hai câu mà quy trình đầy đủ phải dò mới biết:

```bash
node scripts/lam_ngay.js --vao "<file .pdf hoặc thư mục>" --bo-mau <tên mẫu>
```

Bốn lượt là xong: chạy lệnh → đọc **một** file `mini.pdf` mà nó in ra → ghi **dữ kiện**
vào khối `du_kien` của khung `ho_so.json` đã sinh sẵn → **chạy lại đúng lệnh đó** để ra
`.docx`. Không đọc nhật ký phân loại, không nạp `bien-so.md` — script rút thẳng danh sách
biến từ file mẫu và in ra, kể cả ô nào nó tự ghép, ô nào còn phải điền tay.
Tên mẫu mơ hồ ("cấp đổi", "tách thửa") thì script in cả hai ứng viên và dừng: đưa cho
người dùng chọn, đừng tự đoán. Chi tiết: `references/loi-tat-chi-dinh-mau.md`.

Thiếu một trong hai điều kiện trên thì đi đường đầy đủ dưới đây.

Cả lô chưa phân loại thì chạy cuốn chiếu — ba trong bốn bước là CPU, không tốn token:

```bash
# 1. chốt lô một lần
node scripts/chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ \
  --nhat-ky "<...>/_nhat_ky_phan_loai.json" --khoi-tao

# 2. lặp tới khi hết lô — mỗi lần in ra ĐÚNG MỘT việc phải làm
node scripts/chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ --tiep

# 3. tổng kết + sinh script dọn bản scan
node scripts/chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ --tong-ket \
  --goc-ra-may "C:\...\Ket qua" --goc-da-phan-loai "C:\...\Đã phân loại"
```

Hồ sơ nào có `trang_moc` trong nhật ký (do skill phân loại ghi lại khi nó đọc hồ sơ) thì
`--tiep` in ra lệnh lọc kèm `--chi-trang`: chỉ render đúng trang đơn và trang hợp đồng,
bỏ hẳn nhịp dò trang. Đọc hồ sơ vì vậy trả tiền một lần cho cả hai skill.

`--tiep` là trục của vòng lặp: nó tự biết hồ sơ nào tới đâu và in ra đúng lệnh phải chạy
hoặc đúng các ảnh phải đọc. Làm xong lại gọi `--tiep`. **Không tự nghĩ ra việc ngoài
những gì nó in** — thứ tự và điều kiện đã tính sẵn ở đó. Trạng thái nằm trên ổ đĩa nên
ngắt phiên giữa chừng hay `/clear` đều vô hại.

Một hồ sơ lẻ thì bỏ vòng lặp: `loc_trang.js` → đọc → ghi `ho_so.json` (khối `du_kien`
lấy từ `node scripts/ghep_cau.js --khung`) → `tao_bo_van_ban.js`.

## Nguyên tắc cốt lõi

**Ghi dữ kiện, không viết câu.** Khối `du_kien` trong `ho_so.json` giữ mỗi dữ kiện đúng
MỘT lần, chép như trên giấy tờ: người (họ tên, ngày sinh, giấy tờ, địa chỉ), GCN cũ, thửa
gốc, bản vẽ, hợp đồng, từng thửa mới (ai đứng tên, nhận theo hợp đồng nào). Script
`ghep_cau.js` ghép ra mọi câu — nguồn gốc, tách thửa, đăng ký biến động, thu hồi, danh
sách GCN cấp, phiếu chuyển — theo lối văn gọn của bản đã ký Chi nhánh chọn làm chuẩn.
Đừng tự viết câu cho ô mà script ghép được: câu viết tay bị thay, và chính câu viết tay là
thứ đã dài dòng, lặp ý, mỗi lần một kiểu. Cả 7 bộ mẫu nay không còn ô nào phải viết tay;
ô lẻ nào `lam_ngay.js` còn liệt kê thì điền theo khuôn nó in.

**Khung `du_kien` là của riêng bộ mẫu đang dùng** — chỉ gồm những mục mẫu đó cần, và dòng
`_rieng_mau_nay` dặn trường hợp của mẫu. Đọc dòng đó trước khi ghi. Chỗ hay sai nhất:
phân chia tài sản chung thì mọi thửa mới đều "theo" văn bản phân chia, kể cả thửa về tay
chính các chủ cũ (mỗi người một phiếu chuyển); vợ chồng cùng nhận thì cả hai nằm trong
`ben_nhan`, người sau ghi `quan_he` — tách thửa tặng cho/chuyển nhượng thì ghi cả hai vào `chu`
của cùng một thửa, script lập chung một phiếu; thừa kế rồi tặng cho thì ghi đủ cả hai văn bản.
GCN có dòng "+ Là tài sản riêng của …" ngay dưới tên chủ (hoặc hồ sơ kèm văn bản cam đoan tài
sản riêng) thì ghi `tai_san_rieng` — script tự thêm dòng đó vào cuối Ghi chú mục cấp GCN.

**Ô nào chưa kiểm chứng được thì để rỗng.** Script tự thay bằng `«CẦN ĐIỀN: …»` đúng chỗ
đó — kể cả khi chỗ đó nằm giữa một câu ghép. Dữ kiện **chỉ có trong hệ thống** (mã hồ sơ
một cửa, ngày nhận, vị trí thửa theo bảng giá, giá đất) thì để rỗng — **trừ khi người dùng
gõ sẵn trong câu lệnh** (họ tra từ phần mềm một cửa): khi đó ghi đúng giá trị họ gõ, và mã
hồ sơ có dạng `…-260912-0011` thì file ra được đặt tên theo mã. Không bao giờ lấy mã in
trong bản scan — đó là mã của lần biến động trước. Ngày ký luôn để trống — người ký tự điền.

Một ô trống giữa trang thì xấu, nhưng người ký nhìn là thấy. Một câu trôi chảy nhưng sai
dữ kiện thì lọt qua mắt, và ký rồi mới biết.

**Chỉ số seri GCN mới phải đọc từ tờ GCN mới** — và lúc soạn thì phôi thường chưa in.
Chưa có thì để rỗng: CHỈ chỗ seri thành «CẦN ĐIỀN», còn người được cấp, năm sinh, thửa,
diện tích, các dòng ghi chú vẫn ra đủ (chúng suy từ GCN cũ và giấy tờ trong hồ sơ). Không
bao giờ lấy số seri của GCN cũ; script tự chặn nếu trùng.

**Trống và `false` là hai việc khác nhau.** Trống = chưa biết → «CẦN ĐIỀN». `false` =
đã xét, hồ sơ này không có → cả đoạn tự biến mất. Với dữ kiện: thửa gốc không đổi số tờ,
số thửa thì để `so_moi`/`to_moi` rỗng; chủ cũ không giữ lại thửa nào thì không có thửa
mới nào mang tên họ — script tự hiểu.

**Danh sách GCN cấp trong Thông báo nêu đủ họ tên và ngày tháng năm sinh** của từng người
được cấp — UBND xã dùng danh sách này để cập nhật hồ sơ địa chính. Nên ghi `ngay_sinh`
đủ ngày tháng năm như trên căn cước.

**Đọc đúng trang mà `--tiep` chỉ.** Không mở PDF gốc, không render thêm trang cho chắc.
Thiếu căn cứ thì mở rộng có chủ đích và nói rõ vì sao.

**Sửa ở mẫu, không sửa ở kết quả.** Sửa file kết quả thì hồ sơ sau lại sai y như cũ.

**Làm đủ bộ văn bản** mà `ban_do_ro_mau.json` liệt kê, không chỉ báo cáo.

**Không xoá gì trên máy người dùng.** Sinh script để họ bấm chạy, nói rõ nó làm gì trước.

## Bàn giao

Báo đúng ba điều, không kể lể quá trình:

1. Đã soạn những văn bản nào, đặt ở đâu.
2. **Còn bao nhiêu ô `«CẦN ĐIỀN»` và là những ô nào** — đây là phần người dùng bắt buộc
   phải làm trước khi trình ký.
3. Chỗ nào trong hồ sơ mâu thuẫn hoặc mờ không đọc chắc, cần chuyên viên xác minh.

Đừng nói "đã soạn xong" khi văn bản còn ô trống. Người dùng sẽ mở ra và thấy khác điều
vừa đọc. Trước khi bàn giao, đọc mục 4 của `references/bay-loi-va-ngoai-le.md`.
