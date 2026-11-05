# Plugin `vpdk`

Phôi soạn văn bản hồ sơ đất đai, dùng lại cho nhiều phòng, tổ. Bản đang cấu hình cho **tổ Hưng
Đạo** — Chi nhánh VPĐKĐĐ Quốc Oai, tách từ skill `soan-van-ban-ho-so-dat-dai` (repo
skill-soan-bao-cao) ngày 26/10/2026. Đặt tại `C:\Users\Admin\Desktop\Claude\soan-van-ban-hung-dao\`.

**Dùng cho phòng khác:** sửa `skills\soan-van-ban\assets\cau_hinh_chi_nhanh.json` rồi đóng gói:
`tieu_de_chi_nhanh` (tiêu đề góc trái), `ky_hieu_chi_nhanh` (`/TB-…`, `/CV-…`), `ten_chi_nhanh` (tên
trong câu văn, địa danh ngày tháng), người ký, cán bộ, cơ quan thuế. `kiem_tra_mau.js` báo lỗi nếu
tên đơn vị đang cấu hình còn sót thành chữ cứng trong mẫu.

Chữ riêng còn nằm trong mẫu, phòng khác địa bàn phải đọc lại và sửa mẫu: dòng `VĂN PHÒNG ĐĂNG KÝ
ĐẤT ĐAI HÀ NỘI`, `Hà Nội, ngày…`; căn cứ quy hoạch huyện Quốc Oai trong `trả lại chậm lũ`; "Chi
nhánh số 7 - Điểm tiếp nhận huyện Quốc Oai" trong `trả lại GCN cấp sai`; "chi nhánh số 7" trong
các thông báo trả lại; các quyết định của UBND thành phố Hà Nội. Mẫu CCTT lấy ngày, quyết định
thành lập từ `ngay_thanh_lap_chi_nhanh`, `quyet_dinh_thanh_lap_chi_nhanh`; ngày này cũng là mốc
script chặn mẫu `không có scan`, phòng khác phải sửa cho đúng.

**Thư mục của phòng** (`lam_ngay.js` nhận theo tên thư mục, không cần `--goc-ra`):

```
<thư mục hồ sơ>\
├── hs chuyển\                       ← nguồn BC-TB-PC; thư mục con mang tên mẫu
├── hs trả lại\                      ← nguồn trả lại; thư mục con mang tên dạng
├── hs cctt\                         ← phiếu cung cấp thông tin (soan_cctt.js)
├── kết quả chuyển\<tên chủ> - <mẫu>\  ← mỗi hồ sơ một thư mục; cạnh đó _lam_viec\, _so_ho_so\
├── kết quả trả lại\<tên chủ> - <mẫu>\
└── kết quả cctt\<số phiếu> <xã hoặc tên chủ> - <mẫu>.docx
```

Hồ sơ đã soạn được bỏ qua ở các lần sau (`--soan-lai` để soạn lại).

Một plugin, ba skill:

| Skill | Gọi | Làm gì |
|---|---|---|
| `soan-van-ban` | `/soan-van-ban`, "soạn báo cáo / thông báo / phiếu chuyển…" | bộ BC-TB-PC trình ký (7 bộ mẫu) |
| `soan-tra-lai` | `/soan-tra-lai`, "trả lại hồ sơ…" | thông báo trả lại hồ sơ (10 dạng), tên gọi luôn "trả lại <dạng>" |
| `soan-tra-loi-cctt` | `/soan-tra-loi-cctt`, "trả lời CCTT…" | văn bản trả lời phiếu đề nghị cung cấp thông tin, gộp hoặc riêng |

`soan-tra-lai` và `soan-tra-loi-cctt` chỉ có SKILL.md; script, mẫu, cấu hình nằm chung trong
`skills\soan-van-ban\`. Mẫu CCTT ở `assets\mau\cctt-*\`, không qua `ban_do_ro_mau.json`: thêm mẫu
thì thêm một dòng vào `MAU` trong `scripts\soan_cctt.js` và một dòng vào bảng của SKILL.md.
Mẫu trả lại là các bộ mẫu `"nhom": "tra-lai"` trong `ban_do_ro_mau.json`, thư mục
`assets\mau\tra-lai-*\`, bản gốc ở `assets\nguon_da_ky\tra-lai-*\`.

Khác bản Quốc Oai gốc (27/10/2026): mọi văn bản do **KT. Giám đốc — Phó Giám đốc Tạ Khắc
Minh** ký (biến `ten_nguoi_ky`, Báo cáo "Kính gửi: Phó Giám đốc …"); cán bộ thụ lý Nguyễn
Quốc Đạt; cán bộ hợp đồng chọn theo lệnh `--can-bo` (Nguyễn Thị Hải Yến / Ngô Quang Thái);
tiêu đề đời mới `CHI NHÁNH VPĐKĐĐ QUỐC OAI` · `/TB-CNQO`. Lô nhiều mẫu:
`lam_ngay.js --vao <lô> --theo-thu-muc` (mỗi thư mục con mang tên mẫu).

Lệnh trong README này chạy từ `skills\soan-van-ban\`. Phát hành: `PHAT_HANH.bat` ở gốc →
`dist\vpdk.zip` (plugin) và `dist\skill-le\soan-van-ban.zip` (dự phòng).

`SKILL.md` chỉ giữ khung điều phối. Nghiệp vụ chi tiết nằm trong `references\`, và chỉ
được đọc khi thật sự cần — nhờ vậy mỗi lần gọi skill không phải nạp cả cuốn tài liệu.

```
vpdk\
├── .claude-plugin\plugin.json     ← khai báo plugin
├── PHAT_HANH.bat                  ← kiểm + đóng gói plugin
├── README.md                      ← file này
├── skills\soan-tra-lai\SKILL.md   ← skill trả lại hồ sơ (dùng chung mọi thứ bên dưới)
└── skills\soan-van-ban\           ← skill BC-TB-PC + toàn bộ script, mẫu, cấu hình:
├── SKILL.md                       ← khung điều phối; bản chuẩn nằm trong tài khoản Claude
├── HUONG_DAN_CAN_BO.html          ← cẩm nang cho cán bộ: câu lệnh, tên mẫu, chạy hàng loạt
├── HUONG_DAN_CAN_BO.docx          ← bản in của cẩm nang — sinh bằng: node xuat_huong_dan.js
├── xuat_huong_dan.js              ← xuất cẩm nang .html → .docx qua Word (không vào gói skill)
├── scripts\
│   ├── docx_lib.js                ← đọc/ghi .docx thuần Node, không cần npm
│   ├── xem_mau.js                 ← đọc nội dung, liệt kê ô trống, tìm chuỗi
│   ├── tao_mau.js                 ← biến văn bản đã ký thành mẫu có ô trống
│   ├── dien_mau.js                ← điền dữ liệu vào mẫu → văn bản hoàn chỉnh
│   ├── tao_bo_van_ban.js          ← sinh trọn bộ văn bản cho MỘT hồ sơ
│   ├── lam_ngay.js                ← LỐI TẮT: đã chỉ định sẵn file + mẫu, đi thẳng ra .docx
│   ├── loc_trang.js               ← BƯỚC 1: cắt trang rác bằng CPU trước khi đọc
│   ├── chay_cuon_chieu.js         ← lệnh chính: vòng lặp cuốn chiếu, sổ tiến độ trên đĩa
│   ├── chay_hang_loat.js          ← sinh văn bản cả lô khi đã có sẵn đủ file JSON
│   ├── don_dep_lib.js             ← sinh script dọn bản scan, dùng chung hai lệnh trên
│   ├── can_bang_chu_ky.js         ← cân khối chữ ký khi hai chức danh lệch dòng
│   ├── kiem_tra_mau.js            ← soi mẫu còn sót dữ kiện của hồ sơ mẫu không
│   ├── ghep_cau.js                ← ghép mọi câu văn từ khối du_kien (Claude chỉ ghi dữ kiện)
│   ├── sinh_khuon_cau.js          ← rút khuôn câu từng mẫu từ bảng thay, xoá dữ liệu cá nhân
│   ├── dong_goi.js                ← kiểm toàn bộ rồi đóng .zip để tải lên tài khoản
│   └── thong_ke_mau.js            ← rổ nào đã có mẫu, rổ nào còn thiếu
├── references\
│   ├── loi-tat-chi-dinh-mau.md    ← khi người dùng tự chỉ file và mẫu: 4 lượt là xong
│   ├── quy-trinh-cuon-chieu.md    ← vòng lặp cho lô 9-15 hồ sơ, cách giữ ngữ cảnh phẳng
│   ├── loc-trang-truoc.md         ← bước lọc trang: hai làn, ngưỡng, khi lọc không ăn
│   ├── bien-so.md                 ← từ điển biến, ba tầng nguồn dữ liệu, bẫy đã gặp
│   ├── bay-loi-va-ngoai-le.md     ← rổ cha, chưa có mẫu, mẫu mâu thuẫn, soát trước khi giao
│   └── lam-mau-moi.md             ← quy trình làm mẫu cho rổ chưa có
└── assets\
    ├── ban_do_ro_mau.json         ← rổ nào dùng bộ mẫu nào
    ├── tu_khoa_moc.json           ← từ khoá mỏ neo + ngưỡng lọc trang
    ├── nguon_bien.json            ← biến nào thuộc tầng nào (bản máy đọc của bien-so.md)
    ├── cau_hinh_chi_nhanh.json    ← người ký, cán bộ (danh sách cán bộ hợp đồng), cơ quan thuế — SỬA KHI ĐỔI
    ├── cong_thuc_cau.json         ← lưu ý chung cho ô tự viết câu + khuôn viết tay
    └── mau\                       ← 7 bộ BC-TB-PC (17 file) + 10 dạng trả lại (tra-lai-*\)
        ├── chung\                 ← PC phiếu chuyển thuế, dùng chung nhiều rổ
        ├── giao-dich-trang-4\     ← chuyển nhượng / tặng cho / thừa kế, ghi trang 4
        ├── giao-dich-cap-doi\     ← ba loại trên nhưng cấp GCN mới
        ├── cap-doi-gcn\           ← cấp đổi do đo đạc lại
        ├── tach-thua-khong-doi-chu\
        ├── tach-thua-phat-sinh-chu\   ← tách thửa kèm tặng cho hoặc chuyển nhượng
        ├── tach-thua-phan-chia-chung\ ← tách thửa chia tài sản chung, mỗi người một PC
        └── hop-thua\
```

Mỗi thư mục mẫu chứa file `.docx` (mẫu có ô trống) và `bang_thay_*.json` (bảng dùng để
sinh ra mẫu đó từ văn bản đã ký). Giữ bảng thay lại — khi Chi nhánh đổi thể thức, chỉ
cần chạy lại lệnh cũ trên văn bản mới.

**Câu văn do máy ghép, không do Claude viết** (từ 15/09/2026). Claude chỉ ghi khối
`du_kien` trong `ho_so.json` — người, GCN cũ, thửa gốc, bản vẽ, hợp đồng, thửa mới — rồi
`ghep_cau.js` ghép ra các ô câu theo lối văn bản đã ký. Mỗi công thức ghép là một dòng
`R('ten_o', [bộ mẫu], hàm)` trong file đó; thêm mẫu mới thì thêm công thức cho các ô của nó.
Kiểm một công thức bằng cách ghép từ dữ kiện của chính hồ sơ đã ký rồi so với bản ký — cả
7 bộ mẫu đã qua bước này. Xem thử: `node scripts/ghep_cau.js --du-lieu ho_so.json`.
Từ 15/09/2026 cả 7 bộ mẫu không còn ô nào viết tay, và khung `du_kien` sinh theo từng bộ
mẫu (`khungDuKien(tenBoMau)`): chỉ gồm những mục mẫu đó dùng, kèm lời dặn riêng. Thêm mẫu
mới thì thêm công thức cho các ô của nó **và** lời dặn trong `khungDuKien`.

Tên gọi quen của từng bộ mẫu ("tặng cho trang 4", "tách thửa không phát sinh chủ"…) nằm ở
`ten_goi_khac` trong `assets/ban_do_ro_mau.json`; tên rổ phân loại tự được nhận. Đổi hay thêm
tên gọi thì sửa bảng tên mẫu trong `HUONG_DAN_CAN_BO.html` rồi chạy `node xuat_huong_dan.js`.

Bảng thay còn là nguồn của **khuôn câu** cho những ô còn viết tay: `sinh_khuon_cau.js` lấy
câu gốc trong bản đã ký của từng mẫu, xoá họ tên, số giấy tờ, ngày tháng, địa chỉ, rồi
`lam_ngay.js` in khuôn đó. Sửa bảng thay là khuôn tự đổi theo. Xem thử:
`node scripts/sinh_khuon_cau.js` (in khuôn mọi mẫu + kết quả soát dữ liệu cá nhân).

## Yêu cầu

Node (bản 18 trở lên) cho mọi script. Thêm `poppler-utils` (`pdftotext`, `pdftoppm`;
`pdfseparate` + `pdfunite` nếu muốn `--mini-pdf`) cho bước lọc trang.

Không cài gói npm nào — registry npm ở nhiều nơi bị chặn, nên thư viện .docx được viết
tay bằng `zlib` và `fs` có sẵn trong Node.

Kiểm tra: `node --version` và `pdftoppm -v`

## Phát hành cho mọi người dùng

Thư mục này là **bản gốc của người bảo trì**. Người dùng không cần nó, không cần git,
không cần chép gì: họ dùng skill trong tài khoản Claude, và skill đó mang theo sẵn toàn
bộ script lẫn mẫu.

Mỗi lần sửa xong:

```bash
git commit -am "..."            # để phiên bản ứng với một commit, dễ truy khi có lỗi
node scripts/dong_goi.js        # kiểm toàn bộ rồi đóng dist/vpdk.zip (plugin) + dist/skill-le/soan-van-ban.zip
```

Hoặc bấm đúp `PHAT_HANH.bat` — nó đóng gói, rồi mở sẵn thư mục `dist` và trang Skills.

Rồi tải file .zip lên **vào đúng skill đang có**, giữ nguyên tên:

- skill của riêng bạn, hoặc chia sẻ đích danh: [claude.ai/customize/skills](https://claude.ai/customize/skills)
- skill cấp cho cả tổ chức: [claude.ai/admin-settings/skills](https://claude.ai/admin-settings/skills)

Cuối cùng mở một cuộc trò chuyện mới, nhờ Claude chạy `thong_ke_mau.js`: số phiên bản in
ra phải trùng số mà `dong_goi.js` vừa in. Trùng là bản mới đã lên.

Thế là xong:

- Mọi thiết bị đăng nhập tài khoản đó nhận bản mới — web, ứng dụng máy tính, cả tab Code.
- Đồng nghiệp tự nhận bản mới ở lần dùng kế tiếp, không làm gì cả. Cách đưa skill tới họ
  (chỉ gói Team/Enterprise): chủ tổ chức cấp cho toàn bộ thành viên — tự bật sẵn; hoặc
  chia sẻ đích danh bằng ⋯ → Share — người nhận bật một lần trong mục *Shared with you*.

**Ba điều không làm:**

- **Không xoá skill rồi thêm lại** để "thay bản". Tài liệu không nói việc chia sẻ còn giữ
  không khi xoá; skill thêm lại nhiều khả năng là một skill khác, mọi người mất quyền dùng.
- **Không gửi file .zip cho đồng nghiệp tự tải lên.** Bản họ tự tải là bản riêng của họ,
  không bao giờ nhận cập nhật của bạn — đúng cái vòng "có bản mới lại phải tải về".
- **Không đổi `name:` trong SKILL.md.** Đổi tên là thành một skill khác.

`dong_goi.js` **từ chối đóng gói** khi có một script lỗi cú pháp, một mẫu hỏng cấu trúc
hoặc còn sót dữ kiện hồ sơ gốc, một file khai báo mà không có, hay một số căn cước lọt
vào gói. Một lần tải lên là đến tay tất cả mọi người, nên chặn ở đây rẻ hơn nhiều so với
để cán bộ phát hiện lúc sắp trình ký.

Gói **không** chứa `bang_thay_*.json`, `assets/nguon_da_ky/` và `.git/`: chúng chỉ cần
lúc làm mẫu, mà lại mang họ tên, số căn cước, địa chỉ của người dân trong hồ sơ gốc cùng
email người commit. Chúng ở lại đây.

Mỗi gói mang một số phiên bản (`assets/phien_ban.json`), in ra ở đầu `lam_ngay.js` và
`thong_ke_mau.js`. Người dùng báo lỗi thì hỏi số đó trước tiên.

### Người dùng cần gì

Trong khung chat claude.ai (web hoặc ứng dụng): **không cần cài gì** — Node và poppler có
sẵn. Bật *Code execution and file creation* trong Settings là đủ.

Trong tab Code của ứng dụng máy tính: script chạy thẳng trên máy nên máy đó phải có Node
LTS, và poppler nếu muốn lọc trang. Người dùng không phải lập trình viên thì nên dùng khung
chat.

Script chạy trong workspace của phiên làm việc, không phải trên máy Chi nhánh. Máy người
dùng chỉ nhận file kết quả và chạy script PowerShell dọn dẹp, nên **không cần cài Node
trên máy đó**.

## Lối tắt khi đã biết dùng mẫu nào

Đường ngắn nhất: 4 lượt là ra file. Lệnh lượt đầu và lượt cuối **giống hệt nhau** —
script nhìn file trên đĩa để biết đang ở lượt nào.

```bash
node scripts/lam_ngay.js --vao "D:\hs\tặng cho T4.pdf" --bo-mau giao-dich-trang-4 \
  --goc-ra "C:\Users\Admin\Desktop\Ket qua"

node scripts/lam_ngay.js --bo-mau ?          # xem có những bộ mẫu nào
```

Lượt đầu in ra đường dẫn `mini.pdf` (đọc một lần thay vì mở từng ảnh) cùng khung
`ho_so.json` đã có sẵn đúng tên biến mà bộ mẫu cần, chia theo tầng nguồn. Điền giá trị
xong thì chạy lại lệnh trên. `--vao` là thư mục thì cả thư mục dùng chung bộ mẫu đó.

## Vòng lặp cuốn chiếu cho cả lô

```bash
node scripts/chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ \
  --nhat-ky "<...>/_nhat_ky_phan_loai.json" --khoi-tao

node scripts/chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ --tiep   # lặp
node scripts/chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/          # bảng tiến độ

node scripts/chay_cuon_chieu.js --thu-muc-lam-viec lv/ --goc-ra out/ --tong-ket \
  --goc-ra-may "C:\...\Ket qua" --goc-da-phan-loai "C:\...\Đã phân loại"
```

Tiến độ nằm trên ổ đĩa, không nằm trong ngữ cảnh — ngắt phiên giữa chừng rồi chạy lại
`--tiep` là đi tiếp đúng chỗ đang dở.

## Lệnh hay dùng

```bash
# Cắt trang rác trước khi đọc (xem references/loc-trang-truoc.md trước khi tin kết quả)
node scripts/loc_trang.js --pdf "thừa kế, tặng cho.pdf" --ra lv/
node scripts/loc_trang.js --thu-muc "Đã phân loại/" --ra lv/

# Xem mẫu cần những ô nào
node scripts/xem_mau.js --file assets/mau/giao-dich-trang-4/BC-tham-tra.docx --o-trong

# Đọc toàn văn một file .docx mà không cần mở Word
node scripts/xem_mau.js --file "BC da ky.docx"

# Tìm một chuỗi trước khi đưa vào bảng thay
node scripts/xem_mau.js --file "BC da ky.docx" --tim "AH 496977"

# Điền dữ liệu ra văn bản
node scripts/dien_mau.js --mau assets/mau/giao-dich-trang-4/BC-tham-tra.docx \
  --du-lieu ho_so.json --ra "BC 260519-0009.docx"

# Làm mẫu mới từ một văn bản đã ký (thử trước bằng --thu)
node scripts/tao_mau.js --vao "BC da ky.docx" --bang bang_thay.json --thu

# Xem rổ nào đã có mẫu, rổ nào còn thiếu
node scripts/thong_ke_mau.js

# Soi TOÀN BỘ mẫu xem có sót dữ kiện của hồ sơ mẫu — chạy sau mỗi lần sửa mẫu
node scripts/kiem_tra_mau.js --tat-ca

# Sổ hồ sơ: đã soạn bao nhiêu bộ, hỏng bao nhiêu, rổ nào nhiều, hồ sơ nào chạy lại
node scripts/so_ho_so.js --so "C:\Users\Admin\Desktop\tEST\Ket qua"
node scripts/so_ho_so.js --so "...\Ket qua" --lap --chi-tiet
```

### Sổ hồ sơ

`tao_bo_van_ban.js` tự ghi một dòng vào `<thư mục kết quả>/_so_ho_so/nhat_ky-<tên máy>-<năm>.jsonl`
sau mỗi lượt sinh văn bản: hồ sơ nào, rổ nào, bộ mẫu nào, ra đủ văn bản không, còn mấy ô
«CẦN ĐIỀN», lỗi gì nếu hỏng, cùng một vân tay của khối dữ kiện để biết lượt sau là chạy lại
y hệt hay chạy lại sau khi sửa. Không ai phải ghi chép thêm, và Claude không tốn token cho
việc này — sổ chỉ được đọc khi có người hỏi thống kê.

Sổ nằm trong thư mục kết quả chứ không nằm trong thư mục skill: trên máy cán bộ, skill là
bản đồng bộ chỉ đọc từ claude.ai, tải bản mới là mất. Mỗi máy ghi một file riêng mang tên
máy nên nhiều máy cùng ghi vào một thư mục đồng bộ (OneDrive, ổ mạng) cũng không đè nhau;
gộp số liệu là chép các file `nhat_ky-*.jsonl` về cùng một chỗ (dòng trùng tự bị bỏ).
Sổ có tên người dân nên chỉ để trên máy hoặc thư mục nội bộ — `dong_goi.js` không đụng tới.

## Nguyên tắc quan trọng nhất

**Ô nào chưa kiểm chứng được thì để trống lộ liễu.** Script tự thay các biến thiếu dữ
liệu bằng `«CẦN ĐIỀN: ten_bien»` ngay trong file. Mở file, tìm dấu `«` để tới từng chỗ.
Không trình ký khi còn dấu này.

Một ô trống giữa trang thì xấu, nhưng người ký nhìn là thấy. Một câu trôi chảy nhưng sai
dữ kiện thì lọt qua mắt, và ký rồi mới biết.
