import Svg, { Path, Circle, ClipPath, Defs, G, Rect } from 'react-native-svg';

/* ── 三横线菜单按钮 ── */
export function MenuIcon({ size = 24, color = '#1E1E1E' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12H3M21 18H3M21 6H3" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ── 新建对话按钮 ── */
export function EditIcon({ size = 23, color = '#1E1E1E' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 23 23" fill="none">
      <Path
        d="M10.25 3.37132H3.25C2.71957 3.37132 2.21086 3.58203 1.83579 3.95711C1.46071 4.33218 1.25 4.84089 1.25 5.37132V19.3713C1.25 19.9018 1.46071 20.4105 1.83579 20.7855C2.21086 21.1606 2.71957 21.3713 3.25 21.3713H17.25C17.7804 21.3713 18.2891 21.1606 18.6642 20.7855C19.0393 20.4105 19.25 19.9018 19.25 19.3713V12.3713M17.75 1.87132C18.1478 1.4735 18.6874 1.25 19.25 1.25C19.8126 1.25 20.3522 1.4735 20.75 1.87132C21.1478 2.26915 21.3713 2.80871 21.3713 3.37132C21.3713 3.93393 21.1478 4.4735 20.75 4.87132L11.25 14.3713L7.25 15.3713L8.25 11.3713L17.75 1.87132Z"
        stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ── 模型选择按钮 ── */
export function ModelIcon({ size = 20, color = '#1E1E1E' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M6.66667 5H17.5M6.66667 10H17.5M6.66667 15H17.5M2.5 5H2.50833M2.5 10H2.50833M2.5 15H2.50833" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ── 麦克风 ── */
export function MicIcon({ size = 38 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 38 38" fill="none">
      <Circle cx={19} cy={19} r={19} fill="white" />
      <Circle cx={19} cy={19} r={18.5} stroke="black" strokeOpacity={0.12} />
      <G clipPath="url(#mic-clip)">
        <Path
          d="M19.5 9.79169C18.8701 9.79169 18.266 10.0419 17.8206 10.4873C17.3752 10.9327 17.125 11.5368 17.125 12.1667V18.5C17.125 19.1299 17.3752 19.734 17.8206 20.1794C18.266 20.6248 18.8701 20.875 19.5 20.875C20.1299 20.875 20.734 20.6248 21.1794 20.1794C21.6248 19.734 21.875 19.1299 21.875 18.5V12.1667C21.875 11.5368 21.6248 10.9327 21.1794 10.4873C20.734 10.0419 20.1299 9.79169 19.5 9.79169Z"
          fill="#444746" stroke="#444746" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        />
        <Path d="M25.0416 16.9167V18.5C25.0416 19.9698 24.4578 21.3793 23.4185 22.4186C22.3793 23.4578 20.9697 24.0417 19.5 24.0417C18.0302 24.0417 16.6207 23.4578 15.5814 22.4186C14.5422 21.3793 13.9583 19.9698 13.9583 18.5V16.9167" stroke="#444746" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M19.5 24.0417V27.2084" stroke="#444746" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M16.3333 27.2083H22.6666" stroke="#444746" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </G>
      <Defs>
        <ClipPath id="mic-clip">
          <Rect width={19} height={19} fill="white" x={10} y={9} />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

/* ── 三点折叠按钮 ── */
export function MoreIcon({ size = 24, color = '#1E1E1E' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" fill={color} />
      <Path d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z" fill={color} />
      <Path d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z" fill={color} />
      <Path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ── 发送按钮 ── */
export function SendIcon({ size = 38 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 38 38" fill="none">
      <Circle cx={19} cy={19} r={18.5} fill="#444746" stroke="#444746" />
      <Path d="M19 24.6842V11.4211M25.0789 18.0527L19 11.4211L12.921 18.0527" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 23.5789V28.0344" stroke="white" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}
