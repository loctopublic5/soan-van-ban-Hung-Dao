# Làm mẫu mới cho một rổ chưa có

Đọc file này khi cần bổ sung bộ mẫu cho một rổ mới, hoặc khi Chi nhánh đổi thể thức
văn bản và mẫu cũ không dùng được nữa.

## Nguyên tắc: lấy văn bản thật làm mẫu, không gõ lại

Mẫu được sinh ra từ đúng file cán bộ đã ký ban hành, bằng cách thay từng dữ kiện cụ thể
bằng tên biến. Thể thức văn bản hành chính — font, giãn dòng, vị trí khối chữ ký, khung
quốc hiệu, kiểu đánh số mục — đã qua duyệt rồi. Gõ lại là tự nhận rủi ro sai thể thức mà
chẳng đổi lấy được gì.

## Bốn bước

### Bước 1 — Đọc văn bản thật

```bash
node scripts/xem_mau.js --file "BC goc.docx"
```

Đọc hết một lượt, xác định đâu là phần cố định (dùng lại cho mọi hồ sơ) và đâu là dữ
kiện của riêng hồ sơ này. Chú ý cả phần trong bảng: khối quốc hiệu, khối chữ ký và mã
hồ sơ ở "Nơi nhận" đều nằm trong bảng.

### Bước 2 — Lập bảng thay

Tạo `bang_thay.json` dạng `{ "giá trị thật": "ten_bien" }`.

Trước khi khai một giá trị, tìm thử xem nó xuất hiện mấy lần và ở đâu:

```bash
node scripts/xem_mau.js --file "BC goc.docx" --tim "Hà Nội"
```

Bước này tránh được tai nạn kiểu thay `"Hà Nội"` rồi hỏng luôn quốc hiệu và địa danh ký.
Chọn chuỗi đủ dài để chỉ trúng chỗ mình muốn.

Với chỗ ngữ pháp đổi theo hồ sơ, khai cả câu thành một biến `cau_*` thay vì cắt nhỏ
(xem `bien-so.md` mục 3). Với đoạn có-hoặc-không, khai giá trị thay là
`"[[?ten_bien]]{{ten_bien}}"`.

Đoạn có-hoặc-không mà bản đã ký **không có** (bản ký không phải hồ sơ tài sản riêng nên thiếu
dòng "+ Là tài sản riêng của …") thì khai lệnh chèn: khoá `"@sau <chữ của đoạn đứng trước>"`,
giá trị là chữ của đoạn mới. Đoạn mới mang định dạng của đoạn đứng trước:

```json
"@sau {{cau_ghi_chu_thua_thuoc}}": "[[?cau_ghi_chu_tai_san_rieng]]{{cau_ghi_chu_tai_san_rieng}}"
```

Thêm đoạn vào một mẫu đã làm, khi không còn bản ký gốc bên cạnh: chạy `tao_mau.js` với
`--chi-them` (chỉ chèn, không thay), `--vao` và `--ra` cùng là file mẫu. Đoạn đã có thì không
chèn lại.

### Bước 3 — Sinh mẫu và soát

```bash
node scripts/tao_mau.js --vao "BC goc.docx" --bang bang_thay.json --thu
```

`--thu` chỉ in kết quả, chưa ghi file. Nhìn cột "Không tìm thấy": chuỗi nào trượt thì
gần như luôn do chép sai khoảng trắng hoặc do chữ Việt mã hoá tổ hợp — chép lại chuỗi
từ đầu ra của `--tim` là hết.

Chạy thật khi đã sạch:

```bash
node scripts/tao_mau.js --vao "BC goc.docx" --bang bang_thay.json \
  --ra "assets/mau/<bo-mau>/BC-tham-tra.docx"
```

### Bước 3b — Soi mẫu tìm dữ liệu sót (bắt buộc)

```bash
node scripts/kiem_tra_mau.js --file "assets/mau/<bo-mau>/BC-tham-tra.docx"
```

Bước này bắt đúng cái bẫy lớn nhất của cách làm mẫu từ văn bản thật. Một giá trị xuất
hiện hai lần mà bảng thay chỉ bắt được một, hoặc một dữ kiện người làm mẫu không nhận ra
là dữ kiện — nó sẽ nằm lại trong mẫu và in ra ở mọi hồ sơ về sau, im lặng.

Công cụ soi ba lớp: **cấu trúc XML** (thẻ nào mở mà không đóng — Word sẽ không mở được
file), đối chiếu chính bảng thay (giá trị nào đáng lẽ đã thay mà còn), và quét theo dấu
hiệu (số GCN, số căn cước, số công chứng, mã hồ sơ, ngày tháng, số tiền). Ngày tháng nằm
cạnh chữ "Luật/Nghị định/Thông tư" được xếp riêng vì đó là ngày ban hành văn bản pháp
luật, giữ nguyên mới đúng.

Chưa sạch thì đừng sang bước 4.

**Rồi mở mẫu bằng Word thật.** Lớp cấu trúc bắt được thẻ không đóng, nhưng Word còn kiểm
nhiều thứ khác. Mẫu `tach-thua-phan-chia-chung/BC` từng qua hết mọi phép soát bằng chữ,
được báo "Sạch", rồi đến tay người dùng thì Word báo *"The document may be corrupt"*.
Mở một lần mất mười giây; không mở thì người phát hiện là cán bộ lúc sắp trình ký.

### Bản đã ký chứa hai văn bản trong một file

Hay gặp: Báo cáo và Thông báo nằm chung một file, ngăn bằng ngắt trang. Phải cắt bỏ phần
thừa trước khi lập bảng thay — nhưng **cắt theo phần tử con trực tiếp của `<w:body>`**,
không bao giờ cắt theo vị trí của dấu ngắt trang.

Lý do: dấu ngắt trang thường nằm *bên trong ô đầu tiên của bảng tiêu đề* văn bản thứ
hai (khung "VĂN PHÒNG ĐĂNG KÝ… / CỘNG HOÀ XÃ HỘI…"). Cắt ngay chỗ ngắt trang là cắt giữa
bảng, để lại `<w:tbl><w:tr><w:tc>` không đóng. Đã xảy ra thật, đúng như vậy.

Cách cắt đúng: liệt kê các phần tử con của `<w:body>` (đếm độ sâu thẻ, hoặc dùng parser
XML), tìm phần tử chứa ngắt trang, bỏ từ phần tử đó trở đi. Giữ lại:

- **Một đoạn rỗng sau bảng cuối cùng** — Word cần văn bản kết thúc bằng một đoạn, không
  phải bằng bảng.
- **`sectPr` của phần văn bản được giữ**, không phải `sectPr` cuối file. Hai cái có thể
  khác nhau: ở mẫu tách thửa phân chia, `sectPr` của phần Báo cáo có đánh số trang từ 1,
  còn `sectPr` cuối file thì không.

Cắt xong chạy `kiem_tra_mau.js` ngay trên file nguồn đã cắt, trước khi lập bảng thay.

### Bước 4 — Nghiệm thu bằng hồ sơ khác

Đây là bước hay bị bỏ và là bước duy nhất chứng minh mẫu dùng được. Lấy **một hồ sơ khác**
đã có văn bản ký thật, điền vào mẫu vừa tạo, rồi so từng đoạn với bản thật:

```bash
node scripts/dien_mau.js --mau "assets/mau/<bo-mau>/BC-tham-tra.docx" \
  --du-lieu ho_so_khac.json --ra /tmp/thu.docx
node scripts/xem_mau.js --file /tmp/thu.docx > /tmp/sinh.txt
node scripts/xem_mau.js --file "BC that cua ho so khac.docx" > /tmp/that.txt
diff /tmp/sinh.txt /tmp/that.txt
```

Mọi khác biệt phải giải thích được. Ba khả năng:

- **Thiếu biến** — mẫu còn chôn cứng dữ kiện của hồ sơ gốc. Bổ sung vào bảng thay, làm lại.
- **Ngữ pháp đổi** — chuyển sang biến câu ghép hoặc đoạn điều kiện.
- **Bản thật sai** — có thật, đã gặp. Khi đó bản sinh ra đúng hơn bản thật; ghi lại vào
  `bien-so.md` mục 5 để người sau không tưởng là mẫu hỏng.

Khi làm mẫu cho bộ `giao-dich-trang-4`, phép nghiệm thu này cho 24/26 đoạn trùng khớp
tuyệt đối, 1 đoạn lệch dấu chấm cuối câu, 1 đoạn bản thật ghi nhầm bên tặng cho thành
bên nhận. Đó là mức đạt.

## Đặt tên và khai báo

Đặt mẫu vào `assets/mau/<ten-bo-mau>/`, đặt tên file theo mã văn bản: `BC-tham-tra.docx`,
`TB-cap-nhat.docx`, `PC-nghia-vu-tai-chinh.docx`. Giữ luôn `bang_thay.json` cạnh mẫu —
lần sau đổi thể thức chỉ cần chạy lại lệnh cũ trên file mới.

Khai bộ mẫu vào `assets/ban_do_ro_mau.json`: thêm mục trong `bo_mau`, rồi trỏ rổ tương
ứng trong `ro_dung_bo_mau`. Không cần sửa SKILL.md.

## Bản đã ký là `.doc` chứ không phải `.docx`

`tao_mau.js` (và cả `xem_mau.js`, `dien_mau.js`) đọc `.docx` — thực chất là một file zip
chứa XML. File `.doc` của Word 97-2003 là định dạng nhị phân OLE2 hoàn toàn khác, mở
bằng `docx_lib.js` chỉ ra lỗi zip hỏng.

Chuyển bằng Word: mở file → **File → Save As** → chọn *Word Document (\*.docx)*.

Đừng cố tự dựng lại nội dung từ chữ đọc được. Nguyên tắc của skill là mẫu phải là văn bản
Chi nhánh đã ký; gõ lại thì mất thể thức, mất khoảng cách dòng, mất khối chữ ký — mà đó
lại chính là phần không ai soát khi đọc bản in.

*Đã thử tự động hoá bằng Word COM (`Documents.Open` + `SaveAs2`): mở file thì được, đến
`SaveAs2` thì treo ở một hộp thoại không nhìn thấy được vì Word chạy ẩn. Không đáng đấu
tiếp — thao tác tay nhanh hơn.*

## Một mẫu, nhiều bản: `lap_lai`

Có hồ sơ cần in cùng một mẫu nhiều lần với dữ liệu khác nhau. Thật nhất là tách thửa để
phân chia tài sản chung cho hai người: mỗi người nhận một thửa và tự nộp thuế trên thửa
của mình, nên phải có **một Phiếu chuyển cho mỗi người**.

Khai trong `ban_do_ro_mau.json`, ngay tại mục văn bản đó:

```json
{
  "ma": "PC",
  "mau": "mau/chung/PC-nghia-vu-tai-chinh.docx",
  "gui": "Cơ quan thuế",
  "lap_lai": "cac_ben_nhan",
  "lap_lai_bien": ["hau_to", "ben_nhan_mo_ta_day_du", "thua_cu_so", "dien_tich_thua"]
}
```

`lap_lai` trỏ vào một **mảng** trong `ho_so.json`; mỗi phần tử sinh ra một văn bản. Giá
trị trong phần tử **ghi đè** lên giá trị chung, phần còn lại dùng chung — nên chỉ khai
trong phần tử đúng những gì khác nhau giữa các bản.

`hau_to` đi vào tên file, và **đặt theo tên người** mà văn bản lập cho:
`hau_to: "Nguyễn Văn A"` cho ra `PC Nguyễn Văn A.docx`. Câu đầu tiên phải trả lời khi
nhìn hai Phiếu chuyển nằm cạnh nhau là *"phiếu này của ai"* — số thửa không trả lời được
câu đó mà phải mở file ra xem. Mã hồ sơ đã nằm ở tên thư mục cha nên không nhắc lại.
Không khai `hau_to` thì script dùng số thứ tự.

Bản lặp vì thế **không mang mã ngắn** trong tên file, khác với BC/TB cùng thư mục:

```
260101-0001 Trần Thị B và Nguyễn Văn A\
├── BC 260101-0001.docx
├── TB 260101-0001.docx
├── PC Nguyễn Văn A.docx
└── PC Trần Thị B.docx
```

`lap_lai_bien` chỉ dùng để `lam_ngay.js` dựng sẵn khung — không khai vẫn chạy.

**Thiếu mảng đó thì script báo thiếu chứ không lặng lẽ sinh một bản.** Đây là chủ ý:
thiếu một Phiếu chuyển là hồ sơ tắc ở cơ quan thuế, mà nhìn thư mục kết quả vẫn thấy "có
PC rồi" nên không ai đi tìm.

Cách tìm ra đúng những biến nào cần lặp: lấy hai bản đã ký của cùng một hồ sơ và so từng
dòng. Với PC 454/PC 455 của hồ sơ H26.xxx.xx.xx-260101-0001, chỉ 5 chỗ khác nhau — người
đứng tên, số thửa, diện tích thửa, diện tích sử dụng riêng, và số phiếu bị thay thế.
