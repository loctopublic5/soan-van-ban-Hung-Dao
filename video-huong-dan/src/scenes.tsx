import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {C, fontFamily} from './theme';
import {BongBong, Canh, CauLenh, CayThuMuc, ChuGiai, DanhSach, Doan, OGo, The, UngDung} from './ui';

const kep = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const PHIEN_CD = 'Soạn văn bản chuyển đi';
const PHIEN_TL = 'Soạn văn bản trả lại';

const LENH = [
  {ten: '/soan-van-ban', phu: 'BC · TB · PC chuyển đi'},
  {ten: '/soan-tra-lai', phu: 'Thông báo trả lại'},
];

const MAU_BC = [
  {ten: 'tặng cho trang 4', phu: 'BC·TB·PC'},
  {ten: 'tặng cho cấp đổi', phu: 'BC·TB·PC'},
  {ten: 'cấp đổi giấy chứng nhận', phu: 'BC-TD·BC·TB'},
  {ten: 'tách thửa không đổi chủ', phu: 'BC·TB·TBS'},
  {ten: 'tách thửa tặng cho', phu: 'BC·TB·PC'},
  {ten: 'tách thửa phân chia tài sản chung', phu: 'BC·TB·PC'},
  {ten: 'hợp thửa', phu: 'BC·TB'},
  {ten: 'chuyển nhượng / thừa kế …', phu: 'trang 4 · cấp đổi'},
];

const DANG_TL = [
  {ten: 'trả lại chậm lũ'},
  {ten: 'trả lại cấp đổi'},
  {ten: 'trả lại hủy đăng ký'},
  {ten: 'trả lại quy hoạch'},
  {ten: 'trả lại sai hiện trạng'},
  {ten: 'trả lại 515'},
  {ten: 'trả lại tăng diện tích'},
  {ten: 'trả lại vi phạm'},
  {ten: 'trả lại đồng sử dụng'},
  {ten: 'trả lại GCN cấp sai', phu: 'công văn'},
];

/* ------------------------------------------------------------ 1. mở đầu ---- */

export const MoDau: React.FC = () => {
  const frame = useCurrentFrame();
  const hien = (tu: number) => ({
    opacity: interpolate(frame, [tu, tu + 18], [0, 1], kep),
    translate: interpolate(frame, [tu, tu + 18], ['0px 30px', '0px 0px'], {...kep, easing: Easing.bezier(0.16, 1, 0.3, 1)}),
  });
  return (
    <AbsoluteFill style={{backgroundColor: C.nen, fontFamily, justifyContent: 'center', padding: '0 160px', color: '#FFFFFF'}}>
      <div style={{fontSize: 40, fontWeight: 600, color: C.nhan, letterSpacing: 2, ...hien(0)}}>TỔ HƯNG ĐẠO — CHI NHÁNH VPĐKĐĐ QUỐC OAI</div>
      <div style={{fontSize: 104, fontWeight: 700, lineHeight: 1.12, margin: '24px 0 56px', ...hien(8)}}>Soạn văn bản hồ sơ đất đai<br />trên Claude Cowork</div>
      <div style={{display: 'flex', gap: 36, ...hien(24)}}>
        {LENH.map((l) => (
          <div key={l.ten} style={{backgroundColor: C.lenhNen, color: C.lenh, borderRadius: 20, padding: '22px 34px', border: `3px solid ${C.lenh}`}}>
            <div style={{fontSize: 52, fontWeight: 700}}>{l.ten}</div>
            <div style={{fontSize: 34, color: C.chu, marginTop: 6}}>{l.phu}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------- 2. tạo phiên chuyển đi ---- */

export const TaoPhienChuyenDi: React.FC = () => (
  <Canh buoc="Bước 1" chuThich="Trong dự án Hồ sơ, tạo phiên mới cho văn bản chuyển đi">
    <UngDung phien={[{ten: PHIEN_CD, moiTu: 70}]} dangMo={0} nutMoi={[25, 70]} tieuDePhien={PHIEN_CD}>
      <TrongRong tu={75} chu="Phiên mới — mỗi việc một phiên riêng, gõ câu lệnh mở phiên ở ô dưới." />
      <OGo doan={[]} />
    </UngDung>
  </Canh>
);

const TrongRong: React.FC<{tu: number; chu: string}> = ({tu, chu}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 180, textAlign: 'center', fontSize: 38, color: C.nhat, opacity: interpolate(frame, [tu, tu + 15], [0, 1], kep), padding: '0 120px'}}>
      {chu}
    </div>
  );
};

/* -------------------------------------------- 3. câu lệnh mở phiên BC-TB-PC ---- */

const LENH_MO_CD: Doan[] = [
  {t: '/', k: 'thuong', tu: 20, den: 80},
  {t: '/soan-van-ban', k: 'lenh', tu: 80, ngay: true},
  {t: ' theo mẫu ', k: 'thuong', tu: 90},
  {t: 'tách thửa tặng cho', k: 'mau', tu: 200, ngay: true},
  {t: ', các hồ sơ trong thư mục ', k: 'thuong', tu: 210},
  {t: 'D:\\Hồ sơ\\Lô 03-11', k: 'duong', tu: 228},
  {t: ', cán bộ Hải Yến. Trả kết quả vào ', k: 'thuong', tu: 242},
  {t: 'D:\\Hồ sơ\\Kết quả', k: 'ra', tu: 266},
  {t: ', mỗi hồ sơ một thư mục theo tên chủ và loại biến động.', k: 'ra', tu: 278},
];

export const LenhMoPhienChuyenDi: React.FC = () => (
  <Canh buoc="Bước 2" chuThich="Câu lệnh mở phiên — nói đủ một lần">
    <UngDung phien={[{ten: PHIEN_CD}]} dangMo={0} tieuDePhien={PHIEN_CD}>
      <OGo doan={LENH_MO_CD}>
        <DanhSach tieuDe="GÕ / ĐỂ GỌI LỆNH" muc={LENH} chon={0} tu={28} den={82} />
        <DanhSach tieuDe="MẪU DÙNG ĐƯỢC VỚI /soan-van-ban" muc={MAU_BC} chon={4} tu={110} den={202} cot={2} />
        <ChuGiai tu={330} muc={[{k: 'lenh', chu: 'Lệnh'}, {k: 'mau', chu: 'Mẫu'}, {k: 'duong', chu: 'Thư mục hồ sơ'}, {k: 'ra', chu: 'Nơi lưu + đặt tên thư mục'}]} />
      </OGo>
    </UngDung>
  </Canh>
);

/* --------------------------------------------------------- 4. kết quả ---- */

export const KetQuaChuyenDi: React.FC = () => (
  <Canh chuThich="Claude soạn xong cả lô — mỗi hồ sơ một thư mục">
    <UngDung phien={[{ten: PHIEN_CD}]} dangMo={0} tieuDePhien={PHIEN_CD}>
      <div style={{position: 'absolute', inset: '36px 44px', display: 'flex', flexDirection: 'column', gap: 26}}>
        <BongBong tu={0} nguoi><CauLenh doan={LENH_MO_CD} daGui /></BongBong>
        <BongBong tu={30}>
          Đã soạn 3 hồ sơ theo mẫu <b>tách thửa tặng cho</b>. Còn 3 ô <span style={{color: '#B42318', fontWeight: 700}}>«CẦN ĐIỀN»</span> (mã hồ sơ).
          <CayThuMuc tu={50} dong={[
            {chu: 'Kết quả', cap: 0},
            {chu: 'Nguyễn Văn A — Tách thửa tặng cho', cap: 1, phu: 'BC · TB · PC'},
            {chu: 'Trần Văn B — Tách thửa tặng cho', cap: 1, phu: 'BC · TB · PC'},
            {chu: 'Lê Thị C — Tách thửa tặng cho', cap: 1, phu: 'BC · TB · PC'},
          ]} />
        </BongBong>
      </div>
    </UngDung>
  </Canh>
);

/* ----------------------------------------------- 5. câu lệnh gọn lần sau ---- */

const LENH_GON_CD: Doan[] = [
  {t: '/soan-van-ban', k: 'lenh', tu: 20, ngay: true},
  {t: ' tặng cho trang 4', k: 'mau', tu: 32},
  {t: ' — file ', k: 'thuong', tu: 46},
  {t: 'Phạm Văn D.pdf', k: 'duong', tu: 52},
];

export const LenhGonChuyenDi: React.FC = () => (
  <Canh buoc="Bước 3" chuThich="Các lần sau trong phiên: chỉ gọi lệnh và chọn mẫu">
    <UngDung phien={[{ten: PHIEN_CD}]} dangMo={0} tieuDePhien={PHIEN_CD}>
      <div style={{position: 'absolute', left: 44, right: 44, top: 36}}>
        <The tu={90} tieuDe="CLAUDE ĐÃ NHỚ TỪ CÂU LỆNH MỞ PHIÊN">
          thư mục hồ sơ · nơi lưu kết quả · cách đặt tên thư mục · cán bộ hợp đồng
        </The>
        <div style={{marginTop: 26}}>
          <BongBong tu={150}>✓ Phạm Văn D — Tặng cho trang 4: <b>BC · TB · PC</b> đã lưu vào thư mục kết quả.</BongBong>
        </div>
      </div>
      <OGo doan={LENH_GON_CD} />
    </UngDung>
  </Canh>
);

/* ------------------------------------------------------------- 6. lô ---- */

export const LoChuyenDi: React.FC = () => (
  <Canh chuThich="Một lô nhiều hồ sơ — cùng loại hay khác loại biến động">
    <UngDung phien={[{ten: PHIEN_CD}]} dangMo={0} tieuDePhien={PHIEN_CD}>
      <div style={{position: 'absolute', inset: '40px 44px', display: 'flex', gap: 34}}>
        <The tu={10} tieuDe="CÙNG LOẠI — MỘT MẪU" style={{flex: 1}}>
          <LenhTinh doan={[
            {t: '/soan-van-ban', k: 'lenh', tu: 0, ngay: true},
            {t: ' tách thửa tặng cho', k: 'mau', tu: 0, ngay: true},
            {t: ' — cả thư mục ', k: 'thuong', tu: 0, ngay: true},
            {t: 'Lô 04-11', k: 'duong', tu: 0, ngay: true},
          ]} />
          <div style={{fontSize: 30, color: C.nhat, marginTop: 20}}>Mọi file trong thư mục dùng chung một mẫu.</div>
        </The>
        <The tu={60} tieuDe="KHÁC LOẠI — THƯ MỤC THEO TÊN MẪU" style={{flex: 1.15}}>
          <LenhTinh doan={[
            {t: '/soan-van-ban', k: 'lenh', tu: 0, ngay: true},
            {t: ' lô ', k: 'thuong', tu: 0, ngay: true},
            {t: 'Lô 05-11', k: 'duong', tu: 0, ngay: true},
            {t: ' theo tên thư mục', k: 'thuong', tu: 0, ngay: true},
          ]} />
          <CayThuMuc tu={90} dong={[
            {chu: 'Lô 05-11', cap: 0, mau: C.duong},
            {chu: 'tách thửa tặng cho', cap: 1, mau: C.mau},
            {chu: 'tặng cho trang 4', cap: 1, mau: C.mau},
            {chu: 'hợp thửa', cap: 1, mau: C.mau},
          ]} />
          <div style={{fontSize: 28, color: C.nhat, marginTop: 16}}>Ít hồ sơ thì kể luôn: “A.pdf: hợp thửa — B.pdf: tặng cho trang 4”.</div>
        </The>
      </div>
    </UngDung>
  </Canh>
);

const LenhTinh: React.FC<{doan: Doan[]}> = ({doan}) => (
  <div style={{fontSize: 36, lineHeight: 1.7}}><CauLenh doan={doan} daGui /></div>
);

/* ------------------------------------------------- 7. tạo phiên trả lại ---- */

export const TaoPhienTraLai: React.FC = () => (
  <Canh buoc="Bước 4" chuThich="Xong chuyển đi — tạo tiếp phiên trả lại trong dự án Hồ sơ">
    <UngDung phien={[{ten: PHIEN_CD}, {ten: PHIEN_TL, moiTu: 70}]} dangMo={1} nutMoi={[25, 70]} tieuDePhien={PHIEN_TL}>
      <TrongRong tu={75} chu="Phiên trả lại riêng — thiết lập lại một lần bằng câu lệnh mở phiên." />
      <OGo doan={[]} />
    </UngDung>
  </Canh>
);

/* --------------------------------------------- 8. câu lệnh mở phiên trả lại ---- */

const LENH_MO_TL: Doan[] = [
  {t: '/', k: 'thuong', tu: 20, den: 80},
  {t: '/soan-tra-lai', k: 'lenh', tu: 80, ngay: true},
  {t: ' theo dạng ', k: 'thuong', tu: 90},
  {t: 'trả lại vi phạm', k: 'mau', tu: 210, ngay: true},
  {t: ', các hồ sơ trong thư mục ', k: 'thuong', tu: 220},
  {t: 'D:\\Hồ sơ\\Trả lại 03-11', k: 'duong', tu: 238},
  {t: '. Trả kết quả vào ', k: 'thuong', tu: 254},
  {t: 'D:\\Hồ sơ\\Kết quả trả lại', k: 'ra', tu: 266},
  {t: ', mỗi hồ sơ một thư mục theo tên chủ và dạng trả lại.', k: 'ra', tu: 282},
];

export const LenhMoPhienTraLai: React.FC = () => (
  <Canh buoc="Bước 5" chuThich="Mở phiên trả lại — tên dạng luôn bắt đầu bằng “trả lại”">
    <UngDung phien={[{ten: PHIEN_CD}, {ten: PHIEN_TL}]} dangMo={1} tieuDePhien={PHIEN_TL}>
      <OGo doan={LENH_MO_TL}>
        <DanhSach tieuDe="GÕ / ĐỂ GỌI LỆNH" muc={LENH} chon={1} tu={28} den={82} />
        <DanhSach tieuDe="DẠNG TRẢ LẠI DÙNG ĐƯỢC VỚI /soan-tra-lai" muc={DANG_TL} chon={7} tu={110} den={212} cot={2} />
        <ChuGiai tu={330} muc={[{k: 'lenh', chu: 'Lệnh'}, {k: 'mau', chu: 'Dạng trả lại'}, {k: 'duong', chu: 'Thư mục hồ sơ'}, {k: 'ra', chu: 'Nơi lưu + đặt tên thư mục'}]} />
      </OGo>
      <GhiChu tu={360} chu="Thông báo trả lại không có dòng cán bộ — không cần gõ tên cán bộ." />
    </UngDung>
  </Canh>
);

const GhiChu: React.FC<{tu: number; chu: string}> = ({tu, chu}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 44, right: 44, top: 36, fontSize: 32, color: C.lenh, backgroundColor: C.lenhNen, borderRadius: 16, padding: '16px 24px', opacity: interpolate(frame, [tu, tu + 12], [0, 1], kep)}}>
      {chu}
    </div>
  );
};

/* ------------------------------------------- 9. lần sau + lô trả lại ---- */

const LENH_GON_TL: Doan[] = [
  {t: '/soan-tra-lai', k: 'lenh', tu: 20, ngay: true},
  {t: ' trả lại chậm lũ', k: 'mau', tu: 32},
  {t: ' — file ', k: 'thuong', tu: 46},
  {t: 'Lê Thị E.pdf', k: 'duong', tu: 52},
];

export const LenhGonTraLai: React.FC = () => (
  <Canh buoc="Bước 6" chuThich="Lần sau: lệnh + dạng · Lô khác dạng: xếp thư mục">
    <UngDung phien={[{ten: PHIEN_CD}, {ten: PHIEN_TL}]} dangMo={1} tieuDePhien={PHIEN_TL}>
      <div style={{position: 'absolute', left: 44, right: 44, top: 36, display: 'flex', gap: 30}}>
        <The tu={110} tieuDe="LÔ KHÁC DẠNG" style={{flex: 1}}>
          <LenhTinh doan={[
            {t: '/soan-tra-lai', k: 'lenh', tu: 0, ngay: true},
            {t: ' lô ', k: 'thuong', tu: 0, ngay: true},
            {t: 'Trả lại 04-11', k: 'duong', tu: 0, ngay: true},
            {t: ' theo tên thư mục', k: 'thuong', tu: 0, ngay: true},
          ]} />
        </The>
        <The tu={140} tieuDe="THƯ MỤC = TÊN DẠNG" style={{flex: 0.9}}>
          <CayThuMuc tu={160} dong={[
            {chu: 'Trả lại 04-11', cap: 0, mau: C.duong},
            {chu: 'trả lại chậm lũ', cap: 1, mau: C.mau},
            {chu: 'trả lại vi phạm', cap: 1, mau: C.mau},
            {chu: 'trả lại tăng diện tích', cap: 1, mau: C.mau},
          ]} />
        </The>
      </div>
      <OGo doan={LENH_GON_TL} />
    </UngDung>
  </Canh>
);

/* ------------------------------------------------------------ 10. kết ---- */

const QUY_TAC = [
  {so: '1', chu: 'Mở phiên: lệnh + mẫu + thư mục + nơi lưu — nói đủ một lần'},
  {so: '2', chu: 'Các lần sau trong phiên: chỉ lệnh + mẫu'},
  {so: '3', chu: 'Lô khác loại: xếp thư mục theo tên mẫu'},
  {so: '4', chu: 'Trả lại: luôn gõ “trả lại <dạng>”, không gõ cán bộ'},
];

export const Ket: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: C.nen, fontFamily, justifyContent: 'center', padding: '0 160px', color: '#FFFFFF'}}>
      <div style={{fontSize: 84, fontWeight: 700, marginBottom: 50}}>Nhớ bốn điều</div>
      {QUY_TAC.map((q, i) => (
        <div key={q.so} style={{display: 'flex', alignItems: 'center', gap: 34, marginBottom: 30, opacity: interpolate(frame, [10 + i * 12, 22 + i * 12], [0, 1], kep), translate: interpolate(frame, [10 + i * 12, 22 + i * 12], ['-40px 0px', '0px 0px'], kep)}}>
          <div style={{width: 84, height: 84, borderRadius: 42, backgroundColor: C.nhan, color: C.nen, fontSize: 46, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>{q.so}</div>
          <div style={{fontSize: 50, fontWeight: 500}}>{q.chu}</div>
        </div>
      ))}
      <div style={{fontSize: 30, color: '#9BA5B2', marginTop: 40, opacity: interpolate(frame, [70, 85], [0, 1], kep)}}>Tên người, đường dẫn trong video là ví dụ. Chi tiết: Cẩm nang soạn văn bản (HUONG_DAN_CAN_BO).</div>
    </AbsoluteFill>
  );
};
