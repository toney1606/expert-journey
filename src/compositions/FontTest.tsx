import { AbsoluteFill } from 'remotion';
import { SafeZoneFrame } from '../components/SafeZoneFrame';
import { colors, fontFamily, lineHeight } from '../design/tokens';
import { useFonts } from '../design/useFonts';

const STACKED = 'Ắ Ằ Ẳ Ẵ Ặ Ấ Ầ Ẩ Ẫ Ậ Ế Ề Ể Ễ Ệ Ố Ồ Ổ Ỗ Ộ Ớ Ờ Ở Ỡ Ợ Ứ Ừ Ử Ữ Ự';

/** Visual check that stacked Vietnamese diacritics render and are not clipped. */
export const FontTest: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: colors.bg, color: colors.text }}>
      <SafeZoneFrame debug>
        <div
          style={{
            fontFamily: fontFamily.title,
            fontWeight: 800,
            fontSize: 84,
            lineHeight: lineHeight.title,
          }}
        >
          Tiếng Việt: Cấu trúc dữ liệu & thuật toán
        </div>
        <div
          style={{
            fontFamily: fontFamily.title,
            fontWeight: 700,
            fontSize: 56,
            lineHeight: lineHeight.title,
            marginTop: 32,
          }}
        >
          {STACKED}
        </div>
        <div
          style={{
            fontFamily: fontFamily.title,
            fontWeight: 400,
            fontSize: 44,
            lineHeight: lineHeight.body,
            marginTop: 32,
          }}
        >
          Nguyễn Thị Ngọc Hoàng ở Đắk Lắk uống nước Ấm.
        </div>
        <div
          style={{
            fontFamily: fontFamily.code,
            fontWeight: 400,
            fontSize: 40,
            marginTop: 32,
            color: colors.diagram,
          }}
        >
          {'const index = new BTree<string>(); // O(log n)'}
        </div>
      </SafeZoneFrame>
    </AbsoluteFill>
  );
};
