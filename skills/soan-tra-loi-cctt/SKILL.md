---
name: soan-tra-loi-cctt
description: "Soạn văn bản TRẢ LỜI phiếu đề nghị cung cấp thông tin, hồ sơ (CCTT) mà phòng của UBND xã gửi Chi nhánh, theo mẫu đã ký, gộp nhiều phiếu vào một văn bản hoặc trả lời riêng từng phiếu. Dùng khi người dùng nói trả lời CCTT, trả lời phiếu cung cấp thông tin, xã đề nghị cung cấp hồ sơ cấp GCN, không có file scan, hoặc gọi /soan-tra-loi-cctt. Không dùng cho thông báo trả lại hồ sơ người dân (skill soan-tra-lai) và bộ BC-TB-PC (skill soan-van-ban)."
---

# Trả lời phiếu cung cấp thông tin

Phòng của UBND xã gửi công văn đề nghị Chi nhánh cung cấp hồ sơ cấp Giấy chứng nhận. Chi nhánh
trả lời bằng một văn bản Phó Giám đốc ký, gửi lại phòng đó. **Trả lời thế nào là quyết định của
cán bộ** sau khi tra lưu trữ, không suy ra được từ phiếu. Vì vậy mẫu luôn do người dùng nói; phiếu
chỉ cho dữ kiện.

## Tài nguyên

Skill này dùng chung script và mẫu với skill `soan-van-ban`: thư mục `../soan-van-ban/` tính từ
thư mục chứa file SKILL.md này. Không tự dựng lại mẫu, không sửa câu văn của mẫu.

| Gọi (`--mau`) | Dùng khi |
|---|---|
| `không có scan` | GCN cấp trước ngày thành lập Chi nhánh, hồ sơ lưu ở Phòng TN&MT huyện (cũ), Chi nhánh không có |

Người dùng không nói mẫu thì hỏi, kể cả khi bảng chỉ có một dòng. Mẫu không có trong bảng thì nói
chưa có mẫu đó, xin văn bản đã ký để bổ sung.

## Thư mục

Phiếu để trong `hs cctt`, kết quả tự về `kết quả cctt` cạnh nó (thư mục nguồn mang tên khác cũng
vậy). Muốn nơi khác thì thêm `--goc-ra`.

## Các bước

1. Liệt kê phiếu chưa soạn:

   ```bash
   node <soan-van-ban>/scripts/soan_cctt.js --vao "<...>\hs cctt"
   ```

2. Đọc thẳng từng file PDF trong danh sách (phiếu chỉ một hai trang, không qua `lam_ngay.js`).

3. Ghi `<kết quả cctt>\_lam_viec\phieu.json`:

   ```json
   { "phieu": [ {
     "file": "26-ht.pdf",
     "so_van_ban": "26/HT-NN&MT",
     "ngay_van_ban": "03/11/2026",
     "co_quan": "Phòng Hạ tầng - Nông nghiệp và Môi trường - UBND xã Kiều Phú",
     "so_gcn": "S 123456",
     "co_quan_cap": "UBND huyện Quốc Oai",
     "ngay_cap": "22/06/2004",
     "nguoi_duoc_cap": "hộ ông Nguyễn Văn A",
     "dia_chi": "thôn B, xã C, huyện Quốc Oai, tỉnh Hà Tây",
     "so_thua": "157", "so_to": "04", "dien_tich": "299,0",
     "dia_chi_nay": "nay là thôn B, xã Kiều Phú"
   } ] }
   ```

4. Chạy, người dùng dặn gộp hay riêng thì theo bảng dưới:

   ```bash
   node <soan-van-ban>/scripts/soan_cctt.js --vao "<...>\hs cctt" --mau "không có scan" --du-lieu "<...>\phieu.json"
   ```

## Gộp hay riêng

| Người dùng nói | Làm |
|---|---|
| không nói, hoặc "gộp" | không thêm gì: các phiếu cùng cơ quan gửi vào một văn bản, mỗi cơ quan một văn bản |
| "trả lời riêng từng phiếu" | thêm `--rieng` |
| "gộp 25 với 26, còn 79 riêng" | thêm `"nhom"` vào từng phiếu: phiếu cùng giá trị vào một văn bản, ví dụ 25 và 26 cùng `"nhom": "A"`, 79 `"nhom": "B"` |

Một văn bản chỉ có một dòng Kính gửi nên không gộp được hai cơ quan; script dừng và báo.

## Điền dữ kiện

- `so_van_ban`: chép đúng ký hiệu trên phiếu. Số viết tay mờ thì đối chiếu tên file (`26-ht.pdf`).
- `co_quan`: **lấy theo tiêu đề và dấu của phiếu**, viết thống nhất `Phòng <tên> - UBND xã <xã>`.
  Tên phòng trong thân phiếu khác tiêu đề, dấu thì vẫn theo tiêu đề, dấu, và báo lại. Script gộp
  theo ô này nên cùng một phòng phải ghi cùng một tên, dù mỗi phiếu ghi ký hiệu một kiểu.
- `nguoi_duoc_cap`, `dia_chi`, `ngay_cap`: chép theo đoạn nói về GCN, là địa chỉ **ghi trên GCN**,
  không phải nơi ở hiện nay của người nộp. Viết như giữa câu: "hộ ông Nguyễn Văn A".
- `so_thua`, `so_to`, `dien_tich`: phiếu không nêu thì **bỏ khỏi JSON**, văn bản tự bỏ vế đó. Chỉ ghi
  số, không ghi "m2". Không suy từ nguồn khác.
- `dia_chi_nay`: chép phần trong ngoặc của phiếu, kể cả chữ "nay là / nay thuộc", không ghi ngoặc.
- Lỗi đánh máy rõ ràng của phiếu ("tở bản đồ") thì sửa. Phiếu tự mâu thuẫn ("hộ bà" ở tiêu đề,
  "hộ ông" ở thân bài cùng một tên) thì chọn cách ghi có căn cứ hơn và báo lại ở bàn giao.
- Không đọc chắc thì **bỏ ô đó**: ô bắt buộc tự thành «CẦN ĐIỀN». Số, ngày của văn bản trả lời để
  trống cho văn thư.

## Script dừng khi nào

- GCN cấp từ ngày thành lập Chi nhánh trở đi mà dùng mẫu `không có scan`: câu "không có thông tin"
  sẽ sai. Báo người dùng phiếu đó để họ xem lại, **không tự sửa ngày cho chạy qua**.
- Một nhóm có hai cơ quan.

Script soát cả lô trước khi ghi nên khi dừng thì chưa có file nào ra. Phiếu đã soạn được bỏ qua;
muốn soạn lại thì thêm `--soan-lai` (ghi đè văn bản cũ, hỏi trước nếu họ có thể đã sửa tay).

Kết quả: `kết quả cctt\25, 26 UBND xã X - không có scan.docx` khi gộp,
`kết quả cctt\26 hộ ông Nguyễn Văn A - không có scan.docx` khi riêng. Không tự tạo thêm tầng thư mục.

## Bàn giao

Báo đúng: văn bản nào, gộp những phiếu nào, ở đâu · còn ô «CẦN ĐIỀN» nào · chỗ phiếu mờ hoặc mâu
thuẫn · phiếu có hạn trả lời ghi rõ ngày thì nêu ngày đó.
