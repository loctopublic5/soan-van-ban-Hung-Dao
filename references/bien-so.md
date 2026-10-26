# Từ điển biến số

Đọc file này khi cần biết một ô trống `{{...}}` lấy dữ liệu từ đâu, hoặc khi lập bảng
thay để làm mẫu mới.

## Mục lục

0. [Khối du_kien — ghi dữ kiện, script ghép câu](#0-khối-du_kien--ghi-dữ-kiện-script-ghép-câu)
1. [Ba tầng nguồn dữ liệu](#1-ba-tầng-nguồn-dữ-liệu)
2. [Biến đơn — điền thẳng](#2-biến-đơn--điền-thẳng)
3. [Biến câu ghép — Claude tự viết](#3-biến-câu-ghép--claude-tự-viết)
4. [Đoạn có điều kiện](#4-đoạn-có-điều-kiện)
5. [Ghép "thừa kế, tặng cho"](#5-ghép-thừa-kế-tặng-cho)
6. [Bẫy đã gặp thật](#6-bẫy-đã-gặp-thật)
7. [Biến riêng của từng bộ mẫu](#7-biến-riêng-của-từng-bộ-mẫu)

---

## 0. Khối du_kien — ghi dữ kiện, script ghép câu

Từ 15/09/2026, `ho_so.json` có một khối `du_kien`. Claude **chỉ ghi dữ kiện** vào đó —
mỗi thứ một lần, chép đúng như giấy tờ — và `scripts/ghep_cau.js` ghép ra mọi ô câu
(nguồn gốc, tách thửa, đăng ký biến động, thu hồi, danh sách GCN cấp, phiếu chuyển) theo
lối văn của bản đã ký. `tao_bo_van_ban.js` tự gọi bước ghép, nên cả lối tắt lẫn vòng cuốn
chiếu đều dùng nó.

Vì sao: hồ sơ tách thửa tặng cho ngày 14/09/2026, chạy trên bản đã có khuôn câu cho từng
mẫu, vẫn ra câu dài dòng, lặp ý (mô tả thửa kể lại địa chỉ, mục đích, thời hạn — ngay trên
ba dòng đã ghi chúng), và bỏ trống **cả** danh sách GCN của Báo cáo lẫn Thông báo chỉ vì
thiếu số seri. Cùng một nhúm dữ kiện xuất hiện ở tám chỗ với tám cách viết — ghi một lần
rồi để máy viết thì hết cả ba lỗi.

Khung trống: `node scripts/ghep_cau.js --khung`. Xem trước câu ghép từ một hồ sơ:
`node scripts/ghep_cau.js --du-lieu ho_so.json`. Ví dụ (tên giả):

```json
"du_kien": {
  "giao_dich": "tặng cho",
  "nguoi": {
    "a": { "goi": "ông", "ho_ten": "Nguyễn Văn A", "ngay_sinh": "17/08/1957", "giay_to": "CCCD",
           "so_giay_to": "<12 số>", "noi_cap": "Cục cảnh sát quản lý hành chính về trật tự xã hội",
           "ngay_cap": "09/05/2021", "dia_chi": "Thôn X, xã Y, thành phố Hà Nội" },
    "b": { "goi": "ông", "ho_ten": "Nguyễn Văn B", "ngay_sinh": "22/12/1986", "…": "…" }
  },
  "nguoi_de_nghi": ["a", "b"],
  "gcn_cu": { "so": "AA 0xxxxxxx", "co_quan_cap": "Chi nhánh Văn phòng đăng ký đất đai Quốc Oai",
              "ngay_cap": "20/07/2026", "chu": ["a"], "ghi_chu_vlap": true },
  "thua_cu": { "so": "100", "to": "12", "dien_tich": "571,7", "muc_dich": "Đất ở tại nông thôn",
               "thoi_han": "Lâu dài", "hinh_thuc": "Sử dụng riêng",
               "dia_chi": "Thôn X, xã Y, thành phố Hà Nội", "xa_hien_nay": "xã Y",
               "xa_cu": "xã Z, huyện Quốc Oai, thành phố Hà Nội", "so_moi": "", "to_moi": "" },
  "ban_ve": { "ngay_xac_nhan": "28/08/2026", "co_quan": "Chi nhánh Văn phòng đăng ký đất đai Quốc Oai" },
  "hop_dong": {
    "hd1": { "ten": "Hợp đồng tặng cho quyền sử dụng đất", "so": "1234/2026/CCGD", "vpcc": "Trần Hưng Đạo",
             "ngay_cong_chung": "05/09/2026", "ben_chuyen": ["a"], "ben_nhan": ["b"],
             "gia_tri": "0", "mien_giam": "bố tặng cho con" }
  },
  "thua_moi": [
    { "so": "201", "so_tam": "100-1", "dien_tich": "174,2", "muc_dich": "Đất ở tại nông thôn", "chu": ["b"], "theo": "hd1", "seri_gcn": "" },
    { "so": "202", "so_tam": "100-2", "dien_tich": "397,5", "muc_dich": "Đất ở tại nông thôn", "chu": ["a"], "seri_gcn": "" }
  ]
}
```

Những chỗ dễ ghi sai:

| Khoá | Ghi gì |
|---|---|
| `nguoi_de_nghi` | người **ký Đơn đăng ký biến động** — chủ cũ nếu còn giữ phần đất, cộng người nhận; bán hết thì chỉ người nhận. Không ghi người được uỷ quyền nộp hộ |
| `ngay_sinh` | đủ ngày tháng năm như trên căn cước — Thông báo cần ngày sinh; giấy tờ chỉ có năm thì ghi `nam_sinh` |
| `giay_to`, `noi_cap` | chép nguyên văn; script tự rút "Căn cước công dân" → "CCCD", "Cục cảnh sát quản lý hành chính…" → "Cục cảnh sát" như bản đã ký |
| `dien_tich` | chép như giấy tờ ("571,7"); script tự viết "571.7" |
| `xa_hien_nay` | xã/phường hiện nay — nơi nhận Thông báo. GCN cấp trước sáp nhập vẫn ghi xã cũ ở địa chỉ, nên ghi riêng |
| `xa_cu` | xã cũ kèm huyện, lấy ở Ghi chú của GCN cũ ("…thuộc xã Z, huyện Quốc Oai, thành phố Hà Nội (cũ)") — thành dòng "Thửa đất thuộc … (cũ)" của GCN mới |
| `so_moi`, `to_moi` | chỉ khi số thửa/tờ bản đồ đổi; rỗng = không đổi → đoạn "được thay đổi thành…" tự biến mất |
| `ghi_chu_vlap` | `true` nếu Ghi chú của GCN cũ có "Số tờ bản đồ, số thửa đất được xác định theo bản đồ Vlap" |
| `thua_moi[].theo` | mã văn bản mà người đứng tên thửa đó nhận theo. Tách thửa tặng cho/chuyển nhượng: chủ cũ giữ lại thì để rỗng (thành "Diện tích còn lại là…", không lập phiếu chuyển). **Phân chia tài sản chung: mọi thửa đều theo văn bản phân chia**, kể cả thửa về tay chính các chủ cũ. Để rỗng mà suy được thì script tự suy (xem dưới) |
| `thua_moi[].so_tam` | số hiệu tạm trên bản vẽ ("100-1") — phiếu chuyển ghi "100-1 (thửa mới 201)" |
| `thua_moi[].muc_dich` | một loại đất: tên loại như GCN; nhiều loại: mảng `[{"loai", "dien_tich"}]` — phiếu chuyển mục 3.1.6 ghi diện tích từng loại |
| `thua_moi[].seri_gcn` | chỉ khi bản scan có **tờ GCN mới**; thường chưa có → rỗng |
| `thua_moi[].cap_gcn` | `false` cho thửa không cấp GCN (lối đi chung) |
| `thua_goc` | **chỉ hợp thửa**: mỗi thửa gốc một phần tử kèm GCN riêng của nó |
| `hop_dong` | **mọi** văn bản căn cứ, theo thứ tự thời gian: thừa kế rồi tặng cho thì hai mục (văn bản phân chia di sản, hợp đồng tặng cho) — mục VI phiếu chuyển kể đủ cả hai |
| `nguoi.*.quan_he` | `"vợ"` / `"chồng"` khi hai vợ chồng cùng nhận — thành "… và vợ là bà …" như phiếu chuyển đã ký, chung địa chỉ ghi một lần |
| `gcn_moi_so` | **chỉ giao dịch cấp đổi** (mẫu không có `thua_moi`): seri tờ GCN mới nếu có |
| `gcn_cu.so_vao_so` | tách thửa không đổi chủ: "Số vào sổ cấp GCN" ở trang ghi chú GCN cũ (trang bổ sung cần) |
| `ban_ve.ngay_lap` | tách thửa không đổi chủ, hợp thửa, cấp đổi: ngày lập mảnh trích đo |
| cấp đổi GCN | `gcn_cu.cap_cho_ho` (GCN cấp cho "Hộ ông…"), `thanh_vien_ho` (mã các thành viên), `thua_cu.ky_hieu_cu` ("T"), `ban_ve.don_vi_do`, `ban_ve.dien_tich_vlap`, `ban_ve.ly_do_chenh_lech`; `thua_moi` là MỘT thửa theo trích đo |
| `tai_san_rieng` | **mọi mẫu**: văn bản cam đoan/cam kết/xác định tài sản riêng — dòng "+ Là tài sản riêng của ông … theo …" in ngay dưới tên chủ trên GCN (không nằm trong mục Ghi chú), hoặc văn bản riêng trong bộ hồ sơ. `chu` = người có tài sản riêng (chủ cũ hoặc người nhận); hai văn bản thì ghi mảng. Không có thì rỗng — dòng tự biến mất |

**Khung theo từng mẫu.** `lam_ngay.js` sinh khối `du_kien` chỉ gồm những mục bộ mẫu đó
dùng, kèm dòng `_rieng_mau_nay` dặn đúng trường hợp của mẫu. Khung chung cho mọi mẫu từng
dặn "chủ cũ giữ lại thì để rỗng" cho cả hồ sơ phân chia tài sản chung — Claude làm đúng lời
dặn thì không ra phiếu chuyển nào (tái hiện trên hồ sơ thật 15/09/2026). `ghep_cau.js --khung`
không kèm tên mẫu thì in đủ mọi mục.

**Script tự suy `theo`** khi để rỗng: văn bản nào có đủ người đứng tên thửa trong `ben_nhan`
thì thửa theo văn bản đó; hồ sơ phân chia tài sản chung chỉ có một văn bản thì mọi thửa theo
văn bản đó. Phần chủ cũ giữ lại ở tách thửa tặng cho không nằm trong `ben_nhan` nên không bị
suy nhầm.

**Đơn vị diện tích luôn in "m²"** (từ 16/09/2026): script tự đổi mọi "m2" — trong câu ghép, giá trị
chép từ giấy tờ và chữ cố định của mẫu — nên ghi "m2" hay "m²" vào du_kien đều được.

**Tài sản riêng** (từ 17/09/2026, theo bộ tách thửa không đổi chủ do cán bộ hoàn thiện): có
`tai_san_rieng` thì dòng "+ Là tài sản riêng của ông … theo Văn bản cam đoan tài sản riêng số … do
VPCC … công chứng ngày …." được thêm vào **cuối phần Ghi chú của mục cấp GCN** trong Báo cáo và
Thông báo. Chỉ in trên GCN của đúng người có tài sản riêng: tách thửa nhiều người thì chỉ khối GCN
của người đó; người đã chuyển hết đất (không đứng tên GCN nào sau thủ tục) thì không in. Thông báo
cấp đổi GCN không có phần Ghi chú: dòng đứng sau câu cấp đổi. Trang 4 không cấp GCN mới: dòng đứng
sau nội dung biến động, không có "+", như bản đã ký. `chu` để trống thì hiểu là chủ GCN cũ; hồ sơ
chuyển cả thửa (trang 4, giao dịch cấp đổi) thì là người nhận — bản trang 4 đã ký ghi tài sản riêng
của người nhận.

**Phiếu chuyển — ghi như bộ văn bản được Chi nhánh nghiệm thu (15/09/2026):** 2.1 đủ cơ quan
cấp căn cước; 3.1.5 "Nhận tặng cho quyền sử dụng đất"; 3.1.6 diện tích từng loại đất, một
loại cũng ghi m²; VI "Hợp đồng tặng cho quyền sử dụng đất; giấy tờ miễn giảm; các loại tờ
khai." — thừa kế rồi tặng cho thì kể cả văn bản di sản, chuyển nhượng thì không có giấy tờ
miễn giảm. "Giấy tờ miễn giảm" có khi hợp đồng có `mien_giam`.

**Mấy phiếu chuyển:** tách thửa tặng cho/chuyển nhượng lập **mỗi thửa nhận theo hợp đồng một
phiếu** — vợ chồng hay nhiều người cùng nhận một thửa (cả hai trong `chu` của thửa đó) chung một
phiếu, vì tờ khai lệ phí trước bạ, thuế TNCN của họ là một tờ chung, mỗi người một dòng tỷ lệ
(từ 09/2026; trước đó mỗi người một phiếu). Tên file ghi đủ tên: "PC Nguyễn Văn A, Trần Thị B.docx".
Phân chia tài sản chung vẫn **mỗi người một phiếu**. Giao dịch trang 4, cấp đổi chỉ có một phiếu.

Muốn giữ câu viết tay cho một ô thì ghi `"giu_viet_tay": ["ten_o"]` ở ngoài cùng — nếu
không, câu ghép thay câu viết tay. Riêng "không áp dụng" suy từ chỗ du_kien không nhắc tới
thì không xoá câu đã viết sẵn. Từ 15/09/2026 cả 7 bộ mẫu không còn ô nào phải viết tay.

Câu ghép luôn viết dạng đầy đủ ("- Ngày …", "UBND xã Y", "…, nội dung:"); `dien_mau.js`
gọt phần trùng với chữ mẫu đặt sẵn quanh ô (mẫu có sẵn "- ", "UBND xã ", ", nội dung:"
thì bỏ phần lặp). Giá trị viết tay cũng được gọt như vậy.

Đã đối chiếu với bản đã ký của cả 7 bộ mẫu (15/09/2026): ghép từ dữ kiện của chính hồ sơ
đã ký ra lại đúng từng đoạn, trừ lỗi gõ của bản ký và những chỗ Chi nhánh chủ ý viết gọn
hơn (mẫu tách thửa phát sinh chủ theo lối của bản phân chia tài sản chung; câu lập hợp
đồng của giao dịch cấp đổi không nhắc lại thửa). Chạy thử trọn trên hồ sơ thật: tách thửa
tặng cho (2 bộ), phân chia tài sản chung, chuyển nhượng cấp đổi vợ chồng cùng nhận — chỉ
còn «CẦN ĐIỀN» ở ô hệ thống, seri GCN mới và số điện thoại hồ sơ không ghi.

---

## 1. Ba tầng nguồn dữ liệu

Phân biệt ba tầng này quan trọng hơn mọi chi tiết kỹ thuật khác trong skill, vì nó
quyết định chỗ nào được phép tự điền và chỗ nào tuyệt đối không.

| Tầng | Nguồn | Được tự điền? |
|---|---|---|
| **1. Sao chép** | đọc thẳng từ PDF hồ sơ: GCN, hợp đồng công chứng, đơn đăng ký biến động | Có — nhưng phải trích dẫn được câu chữ gốc |
| **2. Tra hệ thống** | VLIS/VLAP, phần mềm một cửa, cán bộ xác minh thực địa | **Không.** Để trống thành `«CẦN ĐIỀN»` |
| **3. Kết luận** | suy luận pháp lý từ tầng 1 + tầng 2 | Có — kèm lập luận để chuyên viên bác được |

Sai lầm nguy hiểm nhất của một skill soạn văn bản là viết trôi chảy một câu thuộc
tầng 2. Câu đó đọc lên rất thuận, không ai nghi ngờ, và nội dung thì chưa ai kiểm tra.
Một ô `«CẦN ĐIỀN: vi_tri_thua_dat»` giữa trang thì xấu, nhưng xấu là đúng việc.

### Tầng 1\* — số seri GCN MỚI

Trong cả mục "Cấp GCN" (danh sách GCN của Thông báo, khối "2.1 …" của Báo cáo, câu "Thu
hồi … cấp giấy chứng nhận số …"), **chỉ số seri** là thứ phải đọc từ tờ GCN mới. Người
được cấp, năm sinh, thửa, diện tích, mục đích và các dòng Ghi chú ("tách ra từ … tại GCN
số …", "hợp từ …", "thuộc xã … (cũ)") đều suy từ GCN cũ và giấy tờ trong hồ sơ — script
ghép chúng từ `du_kien`.

Lúc soạn văn bản, phôi GCN mới **thường chưa in**: bản đã ký có số seri vì cán bộ điền sau
khi in. Bản 14/09/2026 dặn "không có tờ GCN mới thì để trống cả ô" — và hồ sơ tách thửa
tặng cho hôm đó ra «CẦN ĐIỀN» cho cả danh sách GCN của TB lẫn BC, xoá theo cả họ tên, thửa,
diện tích vốn có đủ. Nay seri chưa có thì ghi rỗng ở `thua_moi[].seri_gcn`: **chỉ chỗ seri**
thành «CẦN ĐIỀN: seri GCN», phần còn lại vẫn ra đủ.

Rủi ro của nhóm này là **lấy nhầm số của GCN cũ** — hai tờ nằm cạnh nhau, cùng thửa gốc,
chỉ khác số seri. `tao_bo_van_ban.js` tự chặn khi một số ở vị trí "số mới" trùng số GCN
cũ, hoặc một số mới ghi cho hai người.

### `false` — "đã xét, hồ sơ này không có"

Để trống nghĩa là **chưa biết**: hiện «CẦN ĐIỀN» cho người ký thấy. Ghi `false` (không
ngoặc kép) nghĩa là **đã xét và không áp dụng**: không đổi bản đồ, bán hết không còn diện
tích, không có đối tượng miễn giảm… Cả đoạn chứa ô đó tự biến mất; ô nằm chung đoạn với
chữ khác ("V. Đối tượng miễn giảm: …") thì chỉ ô bị xoá, tiêu đề ở lại.

Phải có hai cách nói khác nhau: nếu ô rỗng cũng tự biến mất thì một ô bị **quên** sẽ
lặng lẽ biến mất theo — đúng loại sai kín mà cả skill này dựng lên để tránh. Danh sách ô
hay gặp: `assets/nguon_bien.json`, mục `co_the_khong_ap_dung`.

### Khuôn câu — theo từng bộ mẫu

(Phần lớn ô câu nay do `ghep_cau.js` ghép từ `du_kien` — mục 0. Khuôn dưới đây dùng cho
những ô còn phải viết tay, và là nguồn để viết thêm công thức ghép cho mẫu mới.)

Các ô "tự viết cả câu" phải viết đúng như bản đã ký **của chính mẫu đó**, vì mỗi mẫu một
kiểu. Cùng câu kết luận, mẫu giao dịch trang 4 viết "do nhận chuyển nhượng là đủ điều
kiện", mẫu tách thửa viết "nhận tặng cho là đủ điều kiện giải quyết". Cùng mục "Cấp GCN",
mẫu phân chia tài sản chung viết "2.1 Bà … số seri GCN … nội dung:", mẫu tách thửa phát
sinh chủ viết "- Số … cho ông …, nội dung:". Một công thức chung cho mọi mẫu đã sai ở 5/7
bộ mẫu (phát hiện 14/09/2026).

Vì vậy khuôn được **rút tự động** từ bảng thay của từng mẫu — câu gốc trong bản đã ký,
xoá hết dữ liệu cá nhân (`scripts/sinh_khuon_cau.js`). Sửa hay thêm mẫu thì khuôn tự
đúng theo, không có bảng nào phải sửa tay. `lam_ngay.js` in khuôn của đúng mẫu đang dùng;
`dong_goi.js` đưa khuôn vào gói và **từ chối đóng gói** nếu bộ soát độc lập còn thấy
họ tên, địa chỉ nơi ở hay số giấy tờ.

`assets/cong_thuc_cau.json` giữ phần **chung cho mọi mẫu** (đọc ở đâu, khi nào ghi
`false`) và **khuôn viết tay** cho những chỗ Chi nhánh muốn viết khác bản đã ký — hiện có
một chỗ: danh sách GCN cấp trong Thông báo phải kèm **ngày tháng năm sinh** của từng người
(yêu cầu 14/09/2026; bản ký cũ chỉ ghi tên).

Các dòng "Ghi chú: + Số tờ bản đồ…", "+ Thửa đất này được tách ra từ…", "+ Thửa đất thuộc
… (cũ)." được in sẵn trên tờ GCN mới — chép nguyên văn từ đó.

---

## 2. Biến đơn — điền thẳng

### Định danh hồ sơ và văn bản

| Biến | Ví dụ | Tầng | Ghi chú |
|---|---|---|---|
| `ma_ho_so` | H26.103.25.19-260519-0009 | 2 | Từ phiếu tiếp nhận một cửa |
| `ngay_nhan_ho_so` | 19/05/2026 | 2 | Ngày trong ngoặc sau mã hồ sơ |
| `ten_giam_doc` | Nguyễn Thế Anh | cấu hình | Đổi khi thay lãnh đạo |
| `can_bo_thu_ly` | Nguyễn Thị Xuân | cấu hình | |
| `can_bo_hop_dong` | Đỗ Văn Hùng | cấu hình | |
| `co_quan_thue` | Chi cục thuế khu vực Thạch Thất - Quốc Oai | cấu hình | |

Ngày ký văn bản để trống trong mẫu (`ngày … tháng … năm 2026`) — người ký tự điền.

### Giấy chứng nhận cũ

| Biến | Ví dụ | Tầng |
|---|---|---|
| `gcn_cu_so` | BC 602641 | 1 |
| `gcn_cu_co_quan_cap` | UBND huyện Quốc Oai | 1 |
| `gcn_cu_ngay_cap` | 15/09/2010 | 1 |

### Thửa đất

| Biến | Ví dụ | Tầng |
|---|---|---|
| `thua_cu_mo_ta` | thửa đất số 19, tờ bản đồ 30, diện tích 1440.0 m² | 1 |
| `muc_dich_su_dung` | Đất ở: 100.0 m²; đất trồng cây lâu năm: 1340.0 m² | 1 |
| `dia_chi_cu` | xã Hòa Thạch, huyện Quốc Oai, thành phố Hà Nội | 1 |
| `dia_chi_moi` | Thôn Cấn Thượng, xã Kiều Phú, thành phố Hà Nội | 2 |
| `vi_tri_thua_dat` | Khu dân cư nông thôn / VT 2 (Đường từ…) | **2** |

`dia_chi_cu` và `dia_chi_moi` là **hai biến riêng**, không được gộp. Địa danh cũ dùng ở
phần mô tả nguồn gốc và ghi chú "(cũ)"; địa danh mới dùng ở phần cấp GCN mới và nơi gửi
thông báo. Đây là hệ quả của việc sáp nhập đơn vị hành chính, không phải lỗi đánh máy.

### Văn bản căn cứ giao dịch

| Biến | Ví dụ | Tầng |
|---|---|---|
| `van_ban_can_cu_mo_ta` | Hợp đồng chuyển nhượng quyền sử dụng đất số 1273/2026/CCGD do VPCC Lê Vinh Hoa công chứng ngày 14/05/2026 | 1 |
| `van_ban_can_cu_ngay` | 14/05/2026 | 1 |

---

## 3. Biến câu ghép — Claude tự viết

Không phải chỗ nào cũng thay được một cụm từ, vì ngữ pháp câu đổi theo hồ sơ. Ví dụ
thật: bên nhận là một người thì câu là *"Chuyển nhượng cho ông X, sinh năm …, CCCD số …,
địa chỉ: …"*; bên nhận là hai vợ chồng thì thành *"Tặng cho ông X, sinh năm …, CCCD số …
**và vợ là bà Y, sinh năm …, Căn cước số …**, địa chỉ: …"*. Chèn thêm một mệnh đề vào
giữa câu bằng cách thay chuỗi thì phải bịa ra vô số biến điều kiện.

Với những chỗ này, mẫu để **một ô cho cả câu**. Từ 15/09/2026 câu đó do `ghep_cau.js`
ghép từ `du_kien` (vợ chồng cùng nhận thì ghi hai mã người trong `chu`/`ben_nhan`, script
tự nối "ông X, … và bà Y, …"); bảng dưới là nghĩa của từng ô, và là cách viết khi một bộ
mẫu chưa ghép được ô đó:

| Biến | Nội dung cần viết |
|---|---|
| `ben_dang_ky_mo_ta` | Bên đang đứng tên GCN: "Ông X và bà Y" |
| `ben_nhan_mo_ta_ngan` | Bên nhận, dạng ngắn: "ông X và bà Y" |
| `cau_muc_dich_giao_dich` | "để thực hiện việc {chuyển nhượng\|tặng cho} … cho …" |
| `cau_ket_luan_dieu_kien` | "do nhận chuyển nhượng là đủ điều kiện" / "do nhận thừa kế, tặng cho là đủ điều kiện" |
| `cau_thay_doi_ban_do` | Cả câu mô tả thay đổi số thửa/tờ bản đồ. Hai dạng đã gặp: đổi cả thửa lẫn tờ, hoặc chỉ đổi tờ |
| `cau_noi_dung_bien_dong` | Cả câu ghi vào trang 4 GCN — đầy đủ họ tên, năm sinh, số giấy tờ, nơi cấp, ngày cấp, địa chỉ, văn bản căn cứ |

Khi viết các câu này, bám đúng câu chữ trong hồ sơ. Chỗ nào hồ sơ ghi "Căn cước" thì
không đổi thành "CCCD" và ngược lại — hai loại giấy tờ này khác nhau về thời điểm cấp,
và văn bản đăng ký đất đai phải khớp với giấy tờ gốc.

---

## 4. Đoạn có điều kiện

Cú pháp `[[?ten_bien]]` đặt ở đầu đoạn: nếu `ten_bien` rỗng thì **cả đoạn biến mất**.

Dùng khi một đoạn chỉ áp dụng cho một số hồ sơ:

| Biến điều kiện | Đoạn |
|---|---|
| `cau_ghi_chu_tai_san_rieng` | "+ Là tài sản riêng của ông X theo Văn bản cam đoan tài sản riêng số …" — cuối Ghi chú mục cấp GCN (tách thửa không đổi chủ, hợp thửa, giao dịch cấp đổi, BC cấp đổi GCN). Hai mẫu tách thửa có người nhận thì dòng này nằm trong danh sách GCN ghép sẵn |
| `cau_tai_san_rieng` | Cùng câu, không có "+": trang 4 (sau nội dung biến động), TB cấp đổi GCN (sau câu cấp đổi) |

Đừng lạm dụng. Nếu một đoạn *luôn* có nhưng nội dung đổi, dùng biến câu ghép (mục 3);
đoạn điều kiện chỉ dành cho đoạn có-hoặc-không.

---

## 5. Ghép "thừa kế, tặng cho"

Một hồ sơ có thể vừa là thừa kế vừa là tặng cho — thường gặp khi các đồng thừa kế nhận
di sản rồi tặng lại phần của mình cho một người. Khi bản scan có **cả hai** yếu tố, ghép
bằng dấu phẩy ở mọi chỗ nhắc tới loại giao dịch:

| Biến | Chỉ tặng cho | Vừa thừa kế vừa tặng cho |
|---|---|---|
| `van_ban_can_cu_mo_ta` | Hợp đồng **tặng cho** quyền sử dụng đất số 4460/2026/CCGD… | Hợp đồng **thừa kế, tặng cho** quyền sử dụng đất số 4460/2026/CCGD… |
| `cau_muc_dich_giao_dich` | để thực hiện việc **tặng cho** quyền sử dụng đất cho… | để thực hiện việc **thừa kế, tặng cho** quyền sử dụng đất cho… |
| `cau_ket_luan_dieu_kien` | do nhận **tặng cho** là đủ điều kiện | do nhận **thừa kế, tặng cho** là đủ điều kiện |

Chỉ ghép khi hồ sơ thật sự có cả hai. Hồ sơ chỉ có văn bản phân chia di sản thì viết
"thừa kế"; chỉ có hợp đồng tặng cho thì viết "tặng cho". Ghép bừa làm sai bản chất giao
dịch — và đó chính là dòng cán bộ thuế đọc để tính nghĩa vụ tài chính.

Vì hai loại này dùng chung mẫu, rổ "Thừa kế" ở skill phân loại không cần tách nhánh. Chỉ
cần xác định hồ sơ ghi biến động lên trang 4 hay cấp GCN mới để chọn đúng bộ mẫu.

## 6. Bẫy đã gặp thật

**Chữ Việt trộn hai cách mã hoá.** Trong cùng một file, "để" có thể là một ký tự dựng
sẵn hoặc là "đ" cộng dấu rời. Nhìn giống hệt nhau nhưng khác byte, nên tìm-thay ngây
thơ trượt đúng những câu dài. `docx_lib.js` đã so khớp theo dạng NFD nên xử lý được,
nhưng khi tự tay soạn bảng thay thì nên chép chuỗi từ đầu ra của
`xem_mau.js --tim` thay vì gõ lại.

**Word cắt vụn câu thành nhiều đoạn XML.** Một câu người soạn từng sửa chính tả ở giữa
sẽ bị Word tách thành nhiều `<w:t>`. Thư viện đã xử lý; đừng thay bằng công cụ tìm-thay
thông thường trên file XML.

**Mẫu gốc có lỗi sao chép từ hồ sơ trước.** Đã gặp ít nhất ba lỗi trong bộ mẫu đang
dùng: trích yếu báo cáo chuyển nhượng ghi "nhận tặng cho"; mục 3 của tờ trình cấp đổi
nêu tên bốn người thuộc hồ sơ khác; báo cáo tặng cho ghi bên tặng cho chính là bên nhận.
Khi làm mẫu, phải sửa các chỗ này thành biến đúng nghĩa — nếu bê nguyên, mỗi hồ sơ về
sau đều mang theo lỗi đó.

**Khối chữ ký lệch dòng.** Bảng chữ ký trong mẫu gốc chỉ có một hàng hai cột: cột trái
chứa khối "Nơi nhận" rồi mới tới chức danh, cột phải bắt đầu ngay bằng chức danh. Hai
chức danh vì thế lệch nhau đúng chiều cao khối "Nơi nhận", nhìn như hai người ký ở hai
thời điểm. Chạy `scripts/can_bang_chu_ky.js` sau khi tạo mẫu là hết; script chèn thêm
dòng trống vào cột thiếu chứ không đổi cấu trúc bảng.

**Số hiệu văn bản pháp luật thiếu năm.** "Nghị định số 101/NĐ-CP" phải là
101/2024/NĐ-CP; "Thông tư số 1990/2021/TT-TCĐC" phải là 1990/2001/TT-TCĐC (Tổng cục Địa
chính giải thể năm 2002 nên không thể ban hành thông tư năm 2021). Các số hiệu này nằm
trong phần cố định của mẫu, sửa một lần là xong cho mọi hồ sơ.

**Tên file lưu ở dạng Unicode tổ hợp (NFD).** Một số file trên máy Chi nhánh có tên lưu
dạng phân rã — "Báo cáo tách thửa.docx" thật ra là `Ba` + dấu sắc rời + `o`… Công cụ lấy
file gửi tên ở dạng dựng sẵn (NFC) nên máy trả về "does not exist" **dù file hiển thị
bình thường trong Explorer và trong kết quả liệt kê thư mục**. Đây là cùng một họ bẫy với
lỗi so chuỗi trong `docx_lib.js`, chỉ khác chỗ xảy ra.

Dấu hiệu nhận ra: liệt kê thư mục thấy file, nhưng lấy file thì báo không tồn tại. Cách
xử lý: gửi lại tên ở dạng NFD (`"Báo cáo tách thửa.docx"`).
Đã gặp ở 3 file: `Cấp đổi\Mẫu Tờ trình.doc`, và `Báo cáo tách thửa.docx` trong cả hai thư
mục "Tách thửa không phát sinh chủ" và "hợp thửa".

Lưu ý cho khâu chạy hàng loạt: thư mục hồ sơ PDF cũng có thể mang tên dạng NFD. Khi một
hồ sơ báo "không tìm thấy file" mà mắt vẫn thấy file đó, kiểm tra dạng chuẩn hoá trước
khi kết luận hồ sơ bị thiếu — đừng xếp nhầm nó vào diện "chưa xử lý được".

**Giá trị mảng in ra thành mã XML giữa văn bản.** Đã sửa trong `dien_mau.js`, ghi lại vì
bẫy này dễ tái phát khi ai đó sửa lại chỗ nối chuỗi. Xuống dòng trong một đoạn Word phải
là thẻ `<w:br/>` thật, nhưng `thayChuoi()` thoát dấu XML cho cả nút chữ **sau khi** thay,
nên thẻ ghép sẵn vào giá trị sẽ bị biến thành chữ và in ra nguyên văn `</w:t><w:br/>…`
giữa báo cáo. Cách đúng: dùng một ký tự tạm không bao giờ có trong hồ sơ, đổi thành thẻ
thật sau khi thay xong tất cả. Cùng lý do, `chuyenGiaTri()` không được tự thoát dấu XML —
thoát hai lần thì dấu `&` trong hồ sơ in ra thành `&amp;`.

**`can_bang_chu_ky.js` đếm hụt số dòng cần chèn.** Khối "Nơi nhận" thường có dòng
"- Giám đốc; (để b/c)". Nếu nhận diện chức danh không phân biệt hoa thường thì dòng đó bị
tính là chức danh, script tưởng hai cột đã gần ngang nhau và chèn thiếu. Chức danh người
ký luôn viết HOA và đứng riêng một dòng — đã siết lại điều kiện, nhưng nếu Chi nhánh đổi
thể thức thì kiểm tra chỗ này trước tiên.

**Bản gốc lặp chữ và dính chữ.** Gặp ở nhiều mẫu: "hồ sơ của của ông…"; mệnh đề "đã xác
minh thông tin điều kiện đăng ký biến động đất đai, kết quả:" bị dán hai lần;
"Độclập - Tự do - Hạnhphúc" mất dấu cách ngay trong quốc hiệu; khối chữ ký vỡ thành
"CÁN BCÁN BỘ HỢP ĐỒNG". Sửa bằng dấu `=` trong bảng thay (thay bằng chữ cố định thay vì
ô trống) — sửa ở mẫu là hết cho mọi hồ sơ về sau.

**Một file .doc chứa hai văn bản.** Bản gốc của hợp thửa và tách thửa đều có Thông báo
nằm ngay sau Báo cáo trong cùng file, ngăn bằng dấu ngắt trang. Lấy nguyên file làm mẫu
Báo cáo thì mỗi hồ sơ in ra kèm một Thông báo thừa. Đọc hết file trước khi làm mẫu, cắt
phần thừa rồi mới lập bảng thay.

---

## 7. Biến riêng của từng bộ mẫu

Mục 2 và 3 liệt kê các biến dùng chung. Phần này chỉ ghi những biến chỉ xuất hiện ở
một hoặc hai bộ mẫu, để khi soạn hồ sơ của rổ đó biết phải đi tìm dữ kiện gì.

Cách tra nhanh biến mà một mẫu cụ thể cần, không phải đọc bảng:

```bash
node scripts/xem_mau.js --file assets/mau/<bo-mau>/<file>.docx --o-trong
```

### Tên chỉ người — ba biến khác nghĩa, đừng dùng lẫn

| Biến | Dùng ở | Nghĩa |
|---|---|---|
| `ben_nhan_mo_ta_ngan` | giao-dich-*, cap-doi-gcn | Bên **nhận** quyền sau giao dịch |
| `ben_dang_ky_mo_ta` | giao-dich-trang-4, cap-doi-gcn | Người **đang đứng tên** GCN trước biến động |
| `chu_su_dung_mo_ta_ngan` | hop-thua, tach-thua-khong-doi-chu | Chủ sử dụng **không đổi** — hai rổ này không có bên nhận |
| `ben_de_nghi_mo_ta` | tach-thua-phat-sinh-chu | **Cả hai** bên cùng đứng đơn |

Chọn nhầm biến ở đây làm văn bản gọi sai vai của người trong hồ sơ — lỗi đọc lên vẫn
trôi nên khó phát hiện, mà bản chất là ghi sai chủ thể pháp lý.

### cap-doi-gcn

| Biến | Tầng | Ghi chú |
|---|---|---|
| `don_vi_do_dac` | 1 | Đơn vị lập mảnh trích đo, ghi trong hồ sơ |
| `ngay_trich_do` | 1 | Ngày đo đạc lại |
| `thua_vlap_mo_ta` | 2 | Thửa theo bản đồ Vlap — **khác** thửa trích đo cả số lẫn diện tích, phải tra hệ thống |
| `cau_giai_thich_chenh_lech` | 3 | Vì sao diện tích trích đo lệch bản đồ Vlap |
| `cau_thanh_vien_ho` | 1 | Danh sách thành viên hộ gia đình kèm số giấy tờ |
| `cau_nguoi_de_nghi` | 1 | Người đứng đơn ở mục 3 — chỗ bản gốc từng chép nhầm bốn người của hồ sơ khác |
| `cau_ky_hieu_muc_dich` | 1 | Ví dụ: "mục đích đất ở" ký hiệu chữ "T" |

### hop-thua

| Biến | Tầng | Ghi chú |
|---|---|---|
| `cau_nguon_goc_cac_thua` | 1 | Nguồn gốc từng thửa đem hợp — điền dạng danh sách |
| `cau_cac_thua_dem_hop` | 1 | Liệt kê các thửa đem hợp |
| `cau_thua_sau_hop` | 1 | Thửa sau khi hợp |
| `cau_ghi_chu_hop_tu` | 1 | Dòng "Thửa đất này được hợp từ…" |
| `cau_gcn_cu_thu_hoi` | 1 | Danh sách GCN cũ bị thu hồi |

### tach-thua-khong-doi-chu

| Biến | Tầng | Ghi chú |
|---|---|---|
| `cau_thua_cu_tach_thanh` | 1 | Cả câu "Thửa … được tách thành 06 thửa:" |
| `cau_cac_thua_sau_tach` | 1 | Danh sách thửa sau tách — điền dạng danh sách |
| `cau_cac_thua_cap_gcn` | 1 | Danh sách thửa được cấp GCN |
| `cau_seri_gcn_moi` | 1* | "từ số seri … đến số seri …", hoặc "số seri …" nếu chỉ cấp một — đọc từ TỜ GCN MỚI |
| `cau_ghi_chu_loi_di_chung` | 1 | **Đoạn có điều kiện** — để rỗng khi hồ sơ không có lối đi chung |
| `gcn_cu_so_vao_so` | 1 | Số vào sổ cấp GCN, chỉ Trang bổ sung cần |

### tach-thua-phat-sinh-chu

| Biến | Tầng | Ghi chú |
|---|---|---|
| `loai_giao_dich` | 1 | "tặng cho" hay "chuyển nhượng" — bộ mẫu dùng chung cho cả hai |
| `cau_tach_thua` | 1 | Câu mô tả việc tách |
| `danh_sach_thua_sau_tach` | 1 | Danh sách thửa sau tách |
| `cau_dien_tich_con_lai` | 1 | Diện tích còn lại của bên chuyển quyền |
| `cau_thu_hoi_cap_moi` | 1 | Câu thu hồi GCN cũ, cấp GCN mới |
| `cau_danh_sach_gcn_cap` | 1* | Danh sách GCN cấp cho từng người (bản Thông báo, gọn) — đọc từ TỜ GCN MỚI |
| `cau_danh_sach_gcn_cap_chi_tiet` | 1* | Cùng nội dung nhưng kèm thửa/diện tích/thời hạn (bản Báo cáo) — đọc từ TỜ GCN MỚI |
| `cau_xac_nhan_ban_ve` | 1 | Xác nhận bản vẽ tách thửa |
| `dia_chi_cu_day_du` | 1 | Địa chỉ có kèm tên thôn, khác `dia_chi_cu` |
| `thua_vlap_so_to` | 2 | Số thửa/tờ theo Vlap |

### Giá trị dạng danh sách

Các biến liệt kê nhiều dòng (`cau_cac_thua_sau_tach`, `cau_danh_sach_gcn_cap`,
`cau_nguon_goc_cac_thua`…) nhận **mảng chuỗi** trong file JSON dữ liệu:

```json
{ "cau_cac_thua_sau_tach": [
    "- Thửa đất số 970, diện tích 100.0 m² đất ở.",
    "- Thửa đất số 971, diện tích 100.0 m² đất ở."
] }
```

Mỗi phần tử thành **một đoạn riêng** trong Word, mang nguyên căn lề, thụt đầu dòng của chỗ
đặt ô — đúng như bản đã ký, nơi mỗi "+ Thửa đất số…" là một đoạn. Trước 14/09/2026 các
phần tử bị nối bằng ngắt dòng mềm trong một đoạn căn đều, và Word kéo giãn những dòng đó
cho đầy lề ("thuộc    quyền    sử    dụng"). Nhiều người nhận, nhiều thửa, nhiều hợp
đồng thì mỗi thứ một phần tử. Ô đặt sau gạch đầu dòng cố định (`- {{bien}}`) thì chỉ phần
tử đầu có sẵn gạch — từ phần tử thứ hai tự viết `- ` ở đầu.