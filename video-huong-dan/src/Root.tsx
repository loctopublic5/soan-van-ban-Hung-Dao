import {Composition} from 'remotion';
import {HuongDanCowork} from './Video';

// 86 giây cảnh − 9 lần chuyển cảnh × 12 frame chồng lên nhau.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HuongDanCowork"
        component={HuongDanCowork}
        durationInFrames={86 * 30 - 9 * 12}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
