---
name: soan-tra-lai
description: "Soạn THÔNG BÁO TRẢ LẠI hồ sơ đất đai (hồ sơ chưa đủ điều kiện giải quyết) theo đúng mẫu đã ký cho từng dạng: chậm lũ, cấp đổi, hủy đăng ký, quy hoạch, sai hiện trạng, 515, tăng diện tích, vi phạm, đồng sử dụng, và công văn xin ý kiến xã khi GCN cấp không đúng quy định. Dùng khi người dùng nói trả lại hồ sơ, thông báo chưa đủ điều kiện, gửi trả hồ sơ, hoặc gọi /soan-tra-lai. Không dùng cho bộ BC-TB-PC trình ký (skill soan-van-ban)."
---

# Soạn thông báo trả lại hồ sơ

Thông báo trả lại là văn bản Chi nhánh gửi người dân (Phó Giám đốc ký): hồ sơ chưa đủ điều
kiện, nêu lý do, căn cứ pháp lý, đề nghị bổ sung, và gửi lại toàn bộ hồ sơ. **Lý do trả lại là
quyết định của cán bộ** — chồng quy hoạch, ảnh vệ tinh, tra cơ sở dữ liệu — không suy ra được
từ bản scan. Vì vậy dạng trả lại luôn do người dùng nói; bản scan chỉ cho dữ kiện (người, thửa,
GCN, ngày).

## Tài nguyên

Skill này dùng chung script và mẫu với skill `soan-van-ban` của cùng plugin: thư mục
`../soan-van-ban/` tính từ thư mục chứa file SKILL.md này. Mọi lệnh dưới đây chạy bằng
`node <thư mục soan-van-ban>/scripts/lam_ngay.js …` — script tự định vị mẫu, chạy từ đâu cũng
được. Không đi tìm mẫu trên máy người dùng, không tự dựng lại mẫu.

## Tên gọi thống nhất — luôn bắt đầu bằng "trả lại"

| Gọi (`--bo-mau`) | Dùng khi | Văn bản |
|---|---|---|
| `trả lại chậm lũ` | tách thửa, thửa một phần nằm trong quy hoạch phòng, chống lũ và đê điều | TB-TL |
| `trả lại cấp đổi` | xã đã đo vẽ bản đồ địa chính, đơn ghi không nhu cầu cấp mới → phải cấp đổi đồng thời | TB-TL |
| `trả lại hủy đăng ký` | xin hủy nội dung đăng ký biến động mà chưa có bản án/quyết định | TB-TL |
| `trả lại quy hoạch` | (bản gốc hiện trùng nội dung "hủy đăng ký" — script in cảnh báo) | TB-TL |
| `trả lại sai hiện trạng` | đã thông báo bản vẽ sai hiện trạng mà chưa hoàn thiện | TB-TL |
| `trả lại 515` | đất nông nghiệp chưa đo đạc bản đồ địa chính, cần phối hợp xã xác định mốc giới | TB-TL |
| `trả lại tăng diện tích` | diện tích theo CSDL tăng so với GCN — thẩm quyền UBND xã | TB-TL |
| `trả lại vi phạm` | đất sử dụng sai mục đích, xử lý vi phạm trước khi chuyển quyền | TB-TL |
| `trả lại đồng sử dụng` | nhiều người chung thửa, thiếu văn bản cử người đại diện giữ GCN | TB-TL |
| `trả lại GCN cấp sai` | GCN cấp không đúng quy định — **công văn xin ý kiến UBND xã**, không gửi dân | CV |

Danh sách chuẩn luôn khớp mẫu thật: `lam_ngay.js --bo-mau "trả lại"` in đủ các dạng.

Ba luật giữ cho không lẫn mẫu:

1. **Chữ "trả lại" là bắt buộc.** Script chỉ chọn mẫu trả lại khi có chữ đó, và không bao giờ
   chọn mẫu trả lại khi thiếu nó. Gõ "chậm lũ" trơn thì script dừng và chỉ tên đúng.
2. **Không đoán dạng.** Người dùng không nói dạng cho một hồ sơ, hoặc lời họ khớp nhiều dạng
   (script in "khớp nhiều bộ mẫu") → hỏi lại, đưa danh sách để họ chọn. Đọc bản scan thấy
   "giống vi phạm" cũng không tự chọn.
3. **Một hồ sơ một dạng.** Hồ sơ vướng hai lý do thì hỏi người dùng lấy dạng nào.

## Một hồ sơ

```bash
node <soan-van-ban>/scripts/lam_ngay.js --vao "<...>\hs trả lại\A.pdf" --bo-mau "trả lại vi phạm"
```

Hồ sơ nằm trong thư mục `hs trả lại` thì **không truyền `--goc-ra`**: kết quả tự về
`kết quả trả lại` cạnh nó, mỗi lần soạn một thư mục đợt (`2026-11-04 lần 1`). Hồ sơ ngoài thư
mục đó thì thêm `--goc-ra "<thư mục kết quả>"`.

Bốn lượt như skill `soan-van-ban`: chạy lệnh → đọc **một** `mini.pdf` nó in → điền khung
`ho_so.json` đã sinh sẵn → chạy **lại đúng lệnh đó** ra `.docx`. Khung trả lại không có khối
`du_kien`: câu văn đã cố định trong mẫu, chỉ điền **dữ kiện** vào từng ô, chép đúng giấy tờ.
Script in nghĩa từng ô ngay ở lượt 1, và `khung_mau.txt` cho thấy mỗi ô nằm giữa câu nào.

Hay sai nhất:
- `nguoi_de_nghi` viết như **giữa câu**, chữ thường đầu: "ông Nguyễn Văn A", "hộ ông Nguyễn Văn
  A", "ông Nguyễn Văn A và bà Trần Thị B"; có ủy quyền thì thêm "(UQ: Lê Văn C)". Dòng Kính gửi
  tự viết hoa — không điền riêng.
- `ten_xa` không có chữ "xã" ("Hưng Đạo"); `xung_ho` là ông | bà | ông bà.
- Mã hồ sơ, ngày nộp, số liệu tra từ cơ sở dữ liệu (tăng diện tích) chỉ có trong hệ thống: để
  rỗng **trừ khi người dùng gõ trong câu lệnh** — khi đó ghi đúng như họ gõ (bản đã ký dùng mã
  ngắn dạng 261007-0028). Không lấy mã in trong bản scan.
- Không đọc chắc thì để rỗng — script đánh «CẦN ĐIỀN» đúng chỗ. Ngày ký, số văn bản để trống.

**Không có dòng cán bộ.** Thông báo trả lại giữ đúng bản gốc: chỉ Phó Giám đốc ký, không có
cán bộ thụ lý hay cán bộ hợp đồng (người dùng chốt 27/10/2026). `--can-bo` là của Báo cáo
(skill `soan-van-ban`) — không cần truyền khi soạn trả lại, và không thêm dòng cán bộ vào văn
bản trả lại dù người dùng có nhắc tên cán bộ.

## Nhiều hồ sơ, nhiều dạng

- **Người dùng kể trong câu lệnh** ("file A trả lại chậm lũ, file B và C trả lại vi phạm"):
  chạy mỗi dạng một lệnh `--bo-mau`. Hồ sơ nào chưa được nói dạng thì
  hỏi trước khi chạy, đừng chạy phần đã rõ rồi đoán phần còn lại.
- **Lô lớn — xếp theo thư mục**: trong `hs trả lại`, mỗi thư mục con mang tên dạng ở bảng trên
  (ở đây được bỏ chữ "trả lại": `vi phạm` hay `trả lại vi phạm` đều nhận), hồ sơ nằm trong thư
  mục của dạng nó cần, rồi:

  ```bash
  node <soan-van-ban>/scripts/lam_ngay.js --vao "<...>\hs trả lại"
  ```

  Script dò mọi tên thư mục trước khi làm gì; một tên sai hay một file nằm lẻ ngoài thư mục là
  dừng cả lô và in lý do. Lượt 4 vẫn là chạy lại đúng lệnh đó.

Hồ sơ đã soạn ở lần trước được bỏ qua, nên hồ sơ cũ để lại trong `hs trả lại` không lẫn vào đợt
mới; muốn soạn lại thì thêm `--soan-lai` (ghi đè vào đúng đợt cũ, hỏi trước nếu họ có thể đã sửa
tay file kết quả).

Kết quả: `kết quả trả lại\<đợt>\<mã ngắn> <tên chủ> - <dạng trả lại>\` (vd. `Nguyễn Văn A - Trả
lại vi phạm` khi chưa có mã), file `TB-TL <mã>.docx` (hoặc `CV <mã>.docx` với GCN cấp sai).
Người dùng dặn "lưu theo tên chủ và dạng trả lại" thì script đã làm đúng như vậy — không tự tạo
thêm tầng thư mục.

## Bàn giao

Báo đúng ba điều: văn bản nào, dạng nào, ở đâu · còn bao nhiêu ô «CẦN ĐIỀN», ô nào · chỗ nào
trong hồ sơ mờ hoặc mâu thuẫn. Dạng `trả lại quy hoạch` thì nhắc người dùng đọc lại đoạn lý do
(bản gốc đang trùng mẫu hủy đăng ký). Sửa ở mẫu, không sửa ở kết quả; mẫu mới hay sửa mẫu là
việc của người bảo trì (`../soan-van-ban/references/lam-mau-moi.md`).
