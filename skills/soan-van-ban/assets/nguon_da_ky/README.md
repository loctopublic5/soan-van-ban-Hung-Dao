# Bản đã ký dùng làm nguồn của mẫu

Để ở đây chứ không để cạnh mẫu, vì `kiem_tra_mau.js --tat-ca` quét cả thư mục
`assets/mau/` — mà bản đã ký thì đương nhiên còn nguyên dữ liệu hồ sơ gốc, nên nằm ở đó
sẽ báo động giả hàng chục lỗi nặng mỗi lần soi.

Giữ lại để khi Chi nhánh đổi thể thức còn chạy lại được `tao_mau.js` trên cùng một
nguồn, thay vì phải đi xin lại văn bản đã ký.

## tach-thua-phan-chia-chung

Hồ sơ gốc: `H26.103.25.19-260722-0057` — ông Nguyễn Khắc Châu và bà Vương Thị Sửu,
thửa 197 tờ 64 tách thành 454 + 455.

| File | Là gì |
|---|---|
| `_goc_BC-da-ky.docx` | bản gốc, **chứa cả Báo cáo lẫn Thông báo** trong một file |
| `BC-nguon-da-cat.docx` | bản trên đã cắt bỏ phần Thông báo — đây mới là nguồn của mẫu BC. Cắt lại ngày 11/09/2026: bản cắt lần đầu cắt giữa bảng tiêu đề của Thông báo nên Word không mở được. Nay cắt theo phần tử con của `<w:body>` — giữ phần tử [0..54], tức hết bảng chữ ký Báo cáo cộng một đoạn rỗng, rồi dùng `sectPr` của phần Báo cáo. Xem `references/lam-mau-moi.md`, mục "Bản đã ký chứa hai văn bản trong một file". |
| `TB-nguon.docx` | Thông báo bản rời (`tb.doc`) |
| `PC454-da-ky.docx`, `PC455-da-ky.docx` | hai Phiếu chuyển, dùng để đối chiếu xem chỗ nào khác nhau giữa hai người |

Bản gốc trên máy người dùng là `.doc` (Word 97-2003), đã chuyển sang `.docx` bằng Word.
**Lưu ý khi chuyển:** Word treo ở `SaveAs2` nếu đường dẫn đích quá dài — lưu ra một
đường dẫn ngắn (ví dụ `C:\tam\`) rồi mới chuyển vào đây.

Sinh lại mẫu:

```bash
node scripts/tao_mau.js --vao assets/nguon_da_ky/tach-thua-phan-chia-chung/BC-nguon-da-cat.docx \
  --bang assets/mau/tach-thua-phan-chia-chung/bang_thay_BC.json \
  --ra   assets/mau/tach-thua-phan-chia-chung/BC-tham-tra.docx

node scripts/tao_mau.js --vao assets/nguon_da_ky/tach-thua-phan-chia-chung/TB-nguon.docx \
  --bang assets/mau/tach-thua-phan-chia-chung/bang_thay_TB.json \
  --ra   assets/mau/tach-thua-phan-chia-chung/TB-cap-gcn.docx
```

## tra-lai-mat-gcn

Bản gốc `.doc` ở `D:\Draft\a Đạt\` (05/11/2026), đã chuyển sang `.docx` bằng Word. Công văn lấy từ
một hồ sơ, Báo cáo và Quyết định lấy từ một hồ sơ khác.

**Không nằm trong git:** repo công khai, nên các file dưới đây và ba `bang_thay_*.json` chứa dữ liệu
thật của hồ sơ chỉ giữ trên máy người bảo trì (khai trong `.gitignore`). Sinh lại mẫu phải có chúng.

| File | Là gì |
|---|---|
| `CV-goc.docx` | Công văn niêm yết công khai |
| `BC-goc.docx` | Báo cáo (file gốc đặt tên Tờ trình) |
| `QD-goc.docx` | Quyết định, bản chuyển nguyên trạng |
| `QD-nguon-da-cat.docx` | bản trên đã bỏ 37 đoạn thừa trong ô Nơi nhận (có một dấu "." lạc) và hai ngắt section sau bảng chữ ký, giữ `sectPr` của phần văn bản. Đây mới là nguồn của mẫu QD |

Bảng thay nằm trong `assets/mau/tra-lai-mat-gcn/`: `bang_thay_CV.json` với `CV-goc.docx` ra
`CV-niem-yet.docx`, `bang_thay_BC.json` với `BC-goc.docx` ra `BC-tham-tra.docx`,
`bang_thay_QD.json` với `QD-nguon-da-cat.docx` ra `QD-huy-cap-lai.docx`.
