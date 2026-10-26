# Lối tắt: người dùng chỉ định sẵn hồ sơ và mẫu

Đọc khi người dùng nói kiểu *"soạn file này bằng mẫu tách thửa"*, *"thư mục D:\lô này
dùng mẫu trang 4"* — tức là họ đã tự trả lời hai câu mà quy trình đầy đủ phải dò mới
biết: **hồ sơ nào** và **dùng mẫu nào**. Không còn gì để phân loại thì đừng chạy máy
phân loại.

## Nhận ra lối tắt

Dùng `lam_ngay.js` khi câu lệnh của người dùng có **cả hai**:

- một đường dẫn cụ thể tới file `.pdf` hoặc tới thư mục chứa hồ sơ, **và**
- một chỉ định bộ mẫu — bằng mã (`giao-dich-trang-4`) hoặc bằng tiếng Việt tự nhiên
  ("mẫu trang 4", "hợp thửa", "tách thửa phát sinh chủ").

Thiếu một trong hai thì quay về [`quy-trinh-cuon-chieu.md`](quy-trinh-cuon-chieu.md).
Đừng tự suy ra bộ mẫu để ép vào lối tắt — chỗ đó chính là thứ lối tắt được phép bỏ qua
*vì người dùng đã quyết*, không phải vì nó không quan trọng.

**Tên mẫu mơ hồ thì hỏi, đừng chọn.** "cấp đổi" khớp cả `giao-dich-cap-doi` lẫn
`cap-doi-gcn`; "tách thửa" khớp cả `tach-thua-khong-doi-chu` lẫn `tach-thua-phat-sinh-chu`.
Script in ra cả hai ứng viên và dừng — đưa đúng hai dòng đó cho người dùng chọn. Đây
đúng là câu hỏi mà rổ cha `CAN_HOI_NHANH` vẫn hỏi, chỉ khác là hỏi sớm hơn và rẻ hơn.

Truyền nguyên văn tên người dùng gõ vào `--bo-mau` — script nhận cả mã, tên gọi quen
("tặng cho trang 4", "chuyển nhượng cấp đổi", "tách thửa không phát sinh chủ") lẫn tên rổ
skill phân loại in ra ("Tặng cho - Trang 4"); danh sách ở `ten_goi_khac` trong
`ban_do_ro_mau.json`. Loại chưa có mẫu (đính chính, thế chấp…) thì script nói thẳng là
chưa có mẫu: dừng và báo, không lấy mẫu khác dùng tạm.

Xem có những bộ mẫu nào: `node scripts/lam_ngay.js --bo-mau ?`

## Bốn lượt

```bash
# lượt 1 — lọc trang, dựng mini.pdf, sinh khung ho_so.json
node scripts/lam_ngay.js --vao "D:\hs\tặng cho T4.pdf" --bo-mau giao-dich-trang-4 \
  --goc-ra "C:\Users\Admin\Desktop\Ket qua"

# lượt 2 — đọc MỘT file: mini.pdf mà lượt 1 vừa in đường dẫn ra
# lượt 3 — ghi DỮ KIỆN vào khối du_kien của khung ho_so.json (không viết câu)

# lượt 4 — CHẠY LẠI ĐÚNG LỆNH Ở LƯỢT 1
node scripts/lam_ngay.js --vao "D:\hs\tặng cho T4.pdf" --bo-mau giao-dich-trang-4 \
  --goc-ra "C:\Users\Admin\Desktop\Ket qua"
```

Lệnh lượt 1 và lượt 4 **giống hệt nhau**. Script nhìn file có trên đĩa để biết đang ở
lượt nào, nên không phải nhớ hai lệnh, và chạy nhầm thêm một lần cũng không hỏng gì.

Cả thư mục thì đổi `--vao` thành đường dẫn thư mục — mọi hồ sơ trong đó dùng chung bộ
mẫu đã chỉ định. Thư mục trộn nhiều loại biến động thì **không** dùng lối tắt.

## Bốn thứ được bỏ, và vì sao bỏ được

| Bỏ | Vì |
|---|---|
| Đọc nhật ký phân loại, suy rổ, hỏi nhánh Trang 4 / Cấp đổi | người dùng đã chỉ định bộ mẫu |
| Chốt lô, sổ tiến độ, `--tiep` | một hồ sơ thì nhìn file trên đĩa là biết đang ở đâu |
| Nạp `bien-so.md` (17 KB) | script tự mở đúng các `.docx` của bộ mẫu, rút danh sách biến thật và chia theo tầng nguồn rồi in ra |
| Gõ tên giám đốc, cán bộ, cơ quan thuế | trộn sẵn từ `assets/cau_hinh_chi_nhanh.json` |

Điểm thứ ba là điểm đáng kể nhất, và nó còn **chính xác hơn** đọc từ điển: danh sách rút
thẳng từ file mẫu nên sửa mẫu xong là danh sách đúng ngay, không có bảng tra nào đi lạc
hậu phía sau.

Vẫn mở `bien-so.md` khi gặp một biến không rõ nghĩa, hoặc khi phân vân giữa bốn biến chỉ
người (`ben_nhan_mo_ta_ngan` / `ben_dang_ky_mo_ta` / `chu_su_dung_mo_ta_ngan` /
`ben_de_nghi_mo_ta`) — `assets/nguon_bien.json` mục `de_nham_lan` ghi gọn cả bốn.

## Đọc một lần bằng mini.pdf

Lượt 1 gộp các trang đã lọc thành `mini.pdf`. Đọc **một** file đó thay vì mở 9 ảnh rời
là 1 lượt gọi công cụ thay vì 9 — đây là phần "sớm nhất có thể" của lối tắt.

Trên 10 trang thì phải kèm tham số `pages` khi đọc; script in sẵn khoảng trang gợi ý.

Thiếu `pdfseparate`/`pdfunite` thì không dựng được `mini.pdf`; script tự chuyển sang liệt
kê từng ảnh và nói rõ vì sao. Vẫn chạy được, chỉ tốn thêm lượt.

## Khung `ho_so.json`

Lượt 1 sinh sẵn khung gồm **khối `du_kien`** và các ô chỉ có trong hệ thống. Lượt 3 là
ghi `du_kien`: người, GCN cũ, thửa gốc, bản vẽ, hợp đồng, từng thửa mới — mỗi dữ kiện một
lần, chép như giấy tờ, **không viết câu nào**. Script ghép mọi câu ở lượt 4 — cả 7 bộ mẫu
không còn ô nào phải viết tay. Khối `du_kien` **sinh riêng cho bộ mẫu đã chọn**: chỉ có
những mục mẫu đó dùng, và dòng `_rieng_mau_nay` dặn đúng trường hợp của mẫu (phân chia tài
sản chung, vợ chồng cùng nhận, thửa theo trích đo…) — đọc dòng đó trước. Lời dặn cho từng
khoá nằm ngay trong khung (các khoá `_…`); mô tả đủ ở `bien-so.md` mục 0.

```jsonc
{
  "_huong_dan": "...",
  "ma_ho_so": "",                    // rỗng, trừ khi người dùng gõ sẵn trong câu lệnh
  "ten_nguoi_ho_so": "",             // để rỗng thì script lấy tên những người đứng đơn
  "bo_mau": null,                    // script tự điền
  "du_kien": {
    "giao_dich": "tặng cho",
    "nguoi": { "a": { "goi": "ông", "ho_ten": "Nguyễn Văn A", "ngay_sinh": "…", … } },
    "gcn_cu": { … }, "thua_cu": { … }, "ban_ve": { … }, "hop_dong": { … },
    "thua_moi": [ { "so": "…", "chu": ["a"], "theo": "hd1", "seri_gcn": "" } ]
  },
  "_de_trong": "các khoá dưới chỉ có trong hệ thống — rỗng, trừ khi người dùng gõ sẵn",
  "vi_tri_thua_dat": ""
}
```

Lượt 1 in rõ: script tự ghép những ô nào, ô lẻ nào còn phải điền tay. Số seri GCN mới
(`thua_moi[].seri_gcn`) chỉ ghi khi bản scan có tờ GCN mới — thường là chưa: để rỗng,
chỉ đúng chỗ seri thành «CẦN ĐIỀN», danh sách GCN vẫn ra đủ người, thửa, ghi chú.

Ba loại giá trị cho ô lẻ, ba nghĩa khác nhau:

| Ghi | Nghĩa | Kết quả trong Word |
|---|---|---|
| giá trị | đọc được từ hồ sơ | điền vào |
| rỗng `""` | **chưa biết** | «CẦN ĐIỀN: ten_bien» — người ký thấy ngay |
| `false` | **đã xét, hồ sơ này không có** | cả đoạn chứa ô biến mất; ô chung đoạn với chữ khác thì chỉ ô bị xoá |

Đoán một giá trị trông hợp lý vẫn là cách hỏng hồ sơ êm ái nhất — lối tắt không đổi được
điều đó. Nhưng một ô đã xác định là không áp dụng thì **ghi `false`, đừng để trống**: để
trống thì cán bộ phải tự xoá tay từng dòng «CẦN ĐIỀN» vô nghĩa.

Mảng thì mỗi phần tử thành một **đoạn riêng** mang nguyên định dạng — dùng cho nhiều
người nhận, nhiều thửa, nhiều hợp đồng. Đừng dồn nhiều người vào một chuỗi dài.

Khoá bắt đầu bằng `_` là chú thích, script tự gỡ trước khi điền mẫu.

### Khuôn câu và chữ cố định quanh ô

Chỉ áp dụng cho ô lẻ **còn phải viết tay** — ô ghép từ `du_kien` thì script đã viết đúng
khuôn. Lượt 1 in mục **"KHUÔN CÂU CỦA MẪU <bộ mẫu>"**: với từng ô tự viết mà bộ mẫu cần,
in câu gốc trong bản đã ký **của chính mẫu đó** (dữ liệu cá nhân đã thay bằng `<Họ tên>`,
`<seri>`, `<ngày>`…), rồi tới lưu ý chung. `¶` trong khuôn là sang phần tử mảng mới. Mỗi
mẫu viết một kiểu, nên chép theo khuôn đang in, đừng theo câu của mẫu khác — ví dụ
`cau_xac_nhan_ban_ve` có mẫu dừng ở "cụ thể:", có mẫu viết luôn "thửa đất … được tách ra
làm 0N thửa đất:". Ngắn, đúng khuôn, không kể lại phần sở hữu hay lý do giao dịch.

Khuôn nằm trong `assets/khuon_cau.json` của gói; chạy từ repo (chưa đóng gói) thì script
tự rút từ bảng thay. Chỗ nào Chi nhánh muốn viết khác bản đã ký thì có khuôn viết tay
trong `assets/cong_thuc_cau.json` → `theo_bo_mau`, được ưu tiên hơn.

Lượt 1 cũng ghi `khung_mau.txt` cạnh `ho_so.json`: toàn bộ chữ cố định của các mẫu với
`{{ô}}` đúng chỗ. Đọc khi cần biết một ô nằm giữa câu nào.

Script còn tự gọt phần giá trị trùng với chữ mẫu đặt sẵn sát ô ("- ", "UBND xã ",
", nội dung:", ";;") — viết đủ câu cũng không sợ lặp — và tự chặn cả hồ sơ nếu số GCN
mới trùng số GCN cũ.

## Cấu hình Chi nhánh

`assets/cau_hinh_chi_nhanh.json` giữ các giá trị không đổi theo hồ sơ: `ten_giam_doc`,
`can_bo_thu_ly`, `can_bo_hop_dong`, `co_quan_thue`. Script trộn vào mọi hồ sơ, nên không
ai phải gõ 15 lần cho một lô.

Đổi lãnh đạo thì **sửa file đó**, đừng sửa từng `ho_so.json`. Một giá trị sai ở đây sai
ở toàn bộ văn bản của mọi hồ sơ về sau, và sai rất kín vì tên người ký đọc lên vẫn thuận.
Vì thế script in lại các giá trị này mỗi lần chạy — **đọc dòng đó**, đừng lướt qua.

Hồ sơ nào đi lệch thì ghi thẳng giá trị vào `ho_so.json`; giá trị trong hồ sơ luôn thắng
cấu hình chung.

Không muốn trộn thì thêm `--khong-cau-hinh`, khi đó các ô này thành `«CẦN ĐIỀN»`.

## Cờ khác

```bash
--trang 1,7,12     bỏ hẳn bước lọc, dùng đúng các trang này (khi đã biết trang nào cần)
--dpi 80           ảnh nét hơn cho bản scan mờ
--lv <thư mục>     nơi để file trung gian (mặc định "<--goc-ra>/_lam_viec")
--lam-lai          xoá kết quả lọc cũ và làm lại từ đầu
--goc-ra-may "..." đường dẫn bên máy người dùng, khi soạn hộ qua thiết bị liên kết
```

## Vẫn phải làm

Lối tắt rút ngắn đường đi, không rút ngắn trách nhiệm. Trước khi bàn giao vẫn đọc mục 4
của [`bay-loi-va-ngoai-le.md`](bay-loi-va-ngoai-le.md), và vẫn báo đủ ba điều: đã soạn gì
ở đâu, còn bao nhiêu ô `«CẦN ĐIỀN»` và là những ô nào, chỗ nào trong hồ sơ mâu thuẫn hoặc
mờ không đọc chắc.
