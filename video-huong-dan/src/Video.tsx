import React from 'react';
import {linearTiming, TransitionSeries} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {useVideoConfig} from 'remotion';
import {
  Ket, KetQuaChuyenDi, LenhGonChuyenDi, LenhGonTraLai, LenhMoPhienChuyenDi, LenhMoPhienTraLai,
  LoChuyenDi, MoDau, TaoPhienChuyenDi, TaoPhienTraLai,
} from './scenes';

const chuyen = <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 12})} />;

export const HuongDanCowork: React.FC = () => {
  const {fps} = useVideoConfig();
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="Mở đầu" durationInFrames={4 * fps}><MoDau /></TransitionSeries.Sequence>
      {chuyen}
      <TransitionSeries.Sequence name="Tạo phiên chuyển đi" durationInFrames={5 * fps}><TaoPhienChuyenDi /></TransitionSeries.Sequence>
      {chuyen}
      <TransitionSeries.Sequence name="Câu lệnh mở phiên chuyển đi" durationInFrames={16 * fps}><LenhMoPhienChuyenDi /></TransitionSeries.Sequence>
      {chuyen}
      <TransitionSeries.Sequence name="Kết quả chuyển đi" durationInFrames={7 * fps}><KetQuaChuyenDi /></TransitionSeries.Sequence>
      {chuyen}
      <TransitionSeries.Sequence name="Câu lệnh gọn chuyển đi" durationInFrames={8 * fps}><LenhGonChuyenDi /></TransitionSeries.Sequence>
      {chuyen}
      <TransitionSeries.Sequence name="Lô chuyển đi" durationInFrames={9 * fps}><LoChuyenDi /></TransitionSeries.Sequence>
      {chuyen}
      <TransitionSeries.Sequence name="Tạo phiên trả lại" durationInFrames={5 * fps}><TaoPhienTraLai /></TransitionSeries.Sequence>
      {chuyen}
      <TransitionSeries.Sequence name="Câu lệnh mở phiên trả lại" durationInFrames={16 * fps}><LenhMoPhienTraLai /></TransitionSeries.Sequence>
      {chuyen}
      <TransitionSeries.Sequence name="Lần sau và lô trả lại" durationInFrames={10 * fps}><LenhGonTraLai /></TransitionSeries.Sequence>
      {chuyen}
      <TransitionSeries.Sequence name="Kết" durationInFrames={6 * fps}><Ket /></TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
