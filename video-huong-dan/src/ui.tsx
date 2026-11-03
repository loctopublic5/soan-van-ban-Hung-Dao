import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {C, fontFamily} from './theme';

const kep = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const mem = Easing.bezier(0.16, 1, 0.3, 1);

/* ------------------------------------------------------------ khung ---- */

/** Nền tối + dải chú thích bước ở trên + cửa sổ ứng dụng ở dưới. */
export const Canh: React.FC<{buoc?: string; chuThich: string; children: React.ReactNode}> = ({buoc, chuThich, children}) => (
  <AbsoluteFill style={{backgroundColor: C.nen, fontFamily}}>
    <ChuThich buoc={buoc} chu={chuThich} />
    <div style={{position: 'absolute', left: 60, right: 60, top: 170, bottom: 40, borderRadius: 22, overflow: 'hidden', backgroundColor: C.cuaSo, boxShadow: '0 30px 80px rgba(0,0,0,0.45)'}}>
      {children}
    </div>
  </AbsoluteFill>
);

const ChuThich: React.FC<{buoc?: string; chu: string}> = ({buoc, chu}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute', left: 80, right: 80, top: 40, height: 100, display: 'flex', alignItems: 'center', gap: 28,
        opacity: interpolate(frame, [0, 15], [0, 1], kep),
        translate: interpolate(frame, [0, 15], ['0px -20px', '0px 0px'], {...kep, easing: mem}),
      }}
    >
      {buoc ? <div style={{backgroundColor: C.nhan, color: C.nen, fontWeight: 700, fontSize: 40, borderRadius: 14, padding: '10px 26px', whiteSpace: 'nowrap'}}>{buoc}</div> : null}
      <div style={{color: '#FFFFFF', fontSize: 46, fontWeight: 600, lineHeight: 1.15}}>{chu}</div>
    </div>
  );
};

export type Phien = {ten: string; moiTu?: number};

/** Cửa sổ kiểu Cowork: thanh bên có dự án "Hồ sơ" và các phiên, vùng chat bên phải. */
export const UngDung: React.FC<{phien: Phien[]; dangMo: number; nutMoi?: [number, number]; tieuDePhien: string; children: React.ReactNode}> = ({phien, dangMo, nutMoi, tieuDePhien, children}) => (
  <div style={{position: 'absolute', inset: 0, display: 'flex'}}>
    <div style={{width: 480, backgroundColor: C.thanh, borderRight: `2px solid ${C.vien}`, padding: '34px 26px', display: 'flex', flexDirection: 'column', gap: 18}}>
      <div style={{fontSize: 28, fontWeight: 600, color: C.nhat, letterSpacing: 1}}>COWORK</div>
      <div style={{fontSize: 24, color: C.nhat, marginTop: 18}}>Dự án</div>
      <div style={{fontSize: 36, fontWeight: 700, color: C.chu, display: 'flex', alignItems: 'center', gap: 14}}>
        <ThuMuc mau={C.lenh} /> Hồ sơ
      </div>
      <NutPhienMoi nhay={nutMoi} />
      {phien.map((p, i) => (
        <MucPhien key={p.ten} ten={p.ten} mo={i === dangMo} moiTu={p.moiTu} />
      ))}
    </div>
    <div style={{flex: 1, position: 'relative', display: 'flex', flexDirection: 'column'}}>
      <div style={{height: 96, borderBottom: `2px solid ${C.vien}`, display: 'flex', alignItems: 'center', padding: '0 44px', fontSize: 34, fontWeight: 600, color: C.chu}}>
        <span style={{color: C.nhat, fontWeight: 400, marginRight: 14}}>Hồ sơ /</span>{tieuDePhien}
      </div>
      <div style={{flex: 1, position: 'relative'}}>{children}</div>
    </div>
  </div>
);

const ThuMuc: React.FC<{mau: string}> = ({mau}) => (
  <svg width="40" height="32" viewBox="0 0 40 32"><path d="M2 6a4 4 0 0 1 4-4h9l4 5h15a4 4 0 0 1 4 4v15a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill={mau} /></svg>
);

const NutPhienMoi: React.FC<{nhay?: [number, number]}> = ({nhay}) => {
  const frame = useCurrentFrame();
  const sang = nhay ? interpolate(frame, [nhay[0], nhay[0] + 8, nhay[1] - 8, nhay[1]], [0, 1, 1, 0], kep) : 0;
  return (
    <div
      style={{
        fontSize: 30, fontWeight: 600, color: C.lenh, border: `3px solid ${C.lenh}`, borderRadius: 14, padding: '12px 18px', marginTop: 8,
        backgroundColor: `rgba(194,65,12,${0.15 * sang})`,
        boxShadow: `0 0 0 ${10 * sang}px rgba(251,191,36,${0.6 * sang})`,
        scale: interpolate(sang, [0, 1], [1, 1.04]),
      }}
    >
      + Phiên mới
    </div>
  );
};

const MucPhien: React.FC<{ten: string; mo: boolean; moiTu?: number}> = ({ten, mo, moiTu}) => {
  const frame = useCurrentFrame();
  const hien = moiTu === undefined ? 1 : interpolate(frame, [moiTu, moiTu + 12], [0, 1], kep);
  return (
    <div
      style={{
        fontSize: 30, padding: '14px 18px', borderRadius: 12, color: C.chu,
        backgroundColor: mo ? C.cuaSo : 'transparent', border: mo ? `2px solid ${C.vien}` : '2px solid transparent', fontWeight: mo ? 600 : 400,
        opacity: hien, translate: interpolate(hien, [0, 1], ['-30px 0px', '0px 0px']),
      }}
    >
      {ten}
    </div>
  );
};

/* ----------------------------------------------------------- câu lệnh ---- */

export type Kieu = 'thuong' | 'lenh' | 'mau' | 'duong' | 'ra';
/** Một đoạn câu lệnh: gõ dần từ frame `tu` (hoặc hiện ngay khi `ngay`), ẩn từ `den`. */
export type Doan = {t: string; k: Kieu; tu: number; ngay?: boolean; den?: number};

const TOC = 1.6; // ký tự mỗi frame

const kieuDoan = (k: Kieu): React.CSSProperties => ({
  thuong: {},
  lenh: {color: C.lenh, backgroundColor: C.lenhNen, fontWeight: 700, borderRadius: 10, padding: '2px 12px', border: `2px solid ${C.lenh}`},
  mau: {color: C.mau, backgroundColor: C.mauNen, fontWeight: 700, borderRadius: 8, padding: '0 8px'},
  duong: {color: C.duong, backgroundColor: C.duongNen, borderRadius: 8, padding: '0 8px'},
  ra: {color: C.ra, backgroundColor: C.raNen, borderRadius: 8, padding: '0 6px'},
}[k]);

/** Chữ của câu lệnh tại frame hiện tại — dùng cả trong ô gõ lẫn trong bong bóng đã gửi. */
export const CauLenh: React.FC<{doan: Doan[]; daGui?: boolean}> = ({doan, daGui}) => {
  const frame = useCurrentFrame();
  let dangGo = false;
  const phan = doan.map((d, i) => {
    if (d.den !== undefined && (daGui || frame >= d.den)) return null;
    const n = daGui ? d.t.length
      : d.ngay ? (frame >= d.tu ? d.t.length : 0)
      : Math.max(0, Math.min(d.t.length, Math.floor((frame - d.tu) * TOC)));
    if (!n) return null;
    if (n < d.t.length) dangGo = true;
    return <span key={i} style={kieuDoan(d.k)}>{d.t.slice(0, n)}</span>;
  });
  const conTro = !daGui && (dangGo || Math.floor(frame / 15) % 2 === 0);
  return (
    <>
      {phan}
      {conTro ? <span style={{display: 'inline-block', width: 4, height: '1.1em', backgroundColor: C.chu, verticalAlign: 'text-bottom', marginLeft: 3}} /> : null}
    </>
  );
};

/** Ô gõ ở cuối vùng chat. */
export const OGo: React.FC<{doan: Doan[]; children?: React.ReactNode}> = ({doan, children}) => (
  <div style={{position: 'absolute', left: 44, right: 44, bottom: 40}}>
    {children}
    <div style={{border: `3px solid ${C.vien}`, borderRadius: 22, padding: '26px 30px', fontSize: 40, lineHeight: 1.6, color: C.chu, backgroundColor: C.cuaSo, minHeight: 130, boxShadow: '0 6px 24px rgba(0,0,0,0.08)'}}>
      <CauLenh doan={doan} />
    </div>
  </div>
);

/** Danh sách bật lên phía trên ô gõ: lệnh khi gõ "/", hoặc các mẫu dùng được. Vệt chọn chạy tới mục `chon`. */
export const DanhSach: React.FC<{tieuDe: string; muc: {ten: string; phu?: string}[]; chon: number; tu: number; den: number; cot?: number}> = ({tieuDe, muc, chon, tu, den, cot = 1}) => {
  const frame = useCurrentFrame();
  const hien = interpolate(frame, [tu, tu + 8, den - 6, den], [0, 1, 1, 0], kep);
  if (hien === 0) return null;
  const dangChon = chon === 0 ? 0 : Math.round(interpolate(frame, [tu + 14, tu + 14 + chon * 5], [0, chon], kep));
  return (
    <div
      style={{
        marginBottom: 18, border: `3px solid ${C.vien}`, borderRadius: 20, backgroundColor: C.cuaSo, padding: '18px 18px 14px', boxShadow: '0 18px 50px rgba(0,0,0,0.18)',
        opacity: hien, translate: interpolate(hien, [0, 1], ['0px 30px', '0px 0px']),
      }}
    >
      <div style={{fontSize: 26, fontWeight: 600, color: C.nhat, margin: '0 10px 10px', letterSpacing: 1}}>{tieuDe}</div>
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${cot}, 1fr)`, gap: 6}}>
        {muc.map((m, i) => (
          <div key={m.ten} style={{fontSize: 32, padding: '10px 16px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', gap: 20, backgroundColor: i === dangChon ? C.mauNen : 'transparent', fontWeight: i === dangChon ? 700 : 400, color: C.chu}}>
            <span>{m.ten}</span>
            {m.phu ? <span style={{color: C.nhat, fontWeight: 400, fontSize: 24, whiteSpace: 'nowrap', alignSelf: 'center'}}>{m.phu}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Chú giải các phần của câu lệnh — hiện sau khi gõ xong. */
export const ChuGiai: React.FC<{tu: number; muc: {k: Kieu; chu: string}[]}> = ({tu, muc}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 18}}>
      {muc.map((m, i) => (
        <div key={m.chu} style={{...kieuDoan(m.k === 'thuong' ? 'ra' : m.k), fontSize: 30, padding: '8px 18px', opacity: interpolate(frame, [tu + i * 8, tu + i * 8 + 10], [0, 1], kep)}}>
          {i + 1}. {m.chu}
        </div>
      ))}
    </div>
  );
};

/* -------------------------------------------------------- tin nhắn ---- */

export const BongBong: React.FC<{tu: number; nguoi?: boolean; children: React.ReactNode}> = ({tu, nguoi, children}) => {
  const frame = useCurrentFrame();
  const hien = interpolate(frame, [tu, tu + 12], [0, 1], kep);
  return (
    <div style={{display: 'flex', justifyContent: nguoi ? 'flex-end' : 'flex-start', opacity: hien, translate: interpolate(hien, [0, 1], ['0px 24px', '0px 0px'])}}>
      <div style={{maxWidth: '82%', fontSize: 34, lineHeight: 1.55, color: C.chu, borderRadius: 22, padding: '20px 28px', backgroundColor: nguoi ? C.thanh : 'transparent', border: nguoi ? 'none' : `2px solid ${C.vien}`}}>
        {children}
      </div>
    </div>
  );
};

export const CayThuMuc: React.FC<{dong: {chu: string; cap: number; phu?: string; mau?: string}[]; tu: number}> = ({dong, tu}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{marginTop: 14, fontSize: 30, lineHeight: 1.5}}>
      {dong.map((d, i) => (
        <div key={d.chu + i} style={{paddingLeft: d.cap * 40, display: 'flex', alignItems: 'center', gap: 12, opacity: interpolate(frame, [tu + i * 6, tu + i * 6 + 10], [0, 1], kep)}}>
          {d.cap < 2 ? <ThuMuc mau={d.mau ?? C.ra} /> : <span style={{color: C.nhat}}>•</span>}
          <span style={{fontWeight: d.cap === 0 ? 700 : 500}}>{d.chu}</span>
          {d.phu ? <span style={{color: C.nhat}}>{d.phu}</span> : null}
        </div>
      ))}
    </div>
  );
};

export const The: React.FC<{tu: number; tieuDe: string; style?: React.CSSProperties; children: React.ReactNode}> = ({tu, tieuDe, style, children}) => {
  const frame = useCurrentFrame();
  const hien = interpolate(frame, [tu, tu + 14], [0, 1], kep);
  return (
    <div style={{border: `3px solid ${C.vien}`, borderRadius: 22, padding: '26px 30px', backgroundColor: C.cuaSo, opacity: hien, translate: interpolate(hien, [0, 1], ['0px 30px', '0px 0px'], {easing: mem}), ...style}}>
      <div style={{fontSize: 30, fontWeight: 700, color: C.nhat, marginBottom: 14}}>{tieuDe}</div>
      <div style={{fontSize: 36, lineHeight: 1.6, color: C.chu}}>{children}</div>
    </div>
  );
};
