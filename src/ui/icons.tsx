import type { CSSProperties, ReactNode } from 'react';

type IconBaseProps = {
  className?: string;
  style?: CSSProperties;
};

function SvgIcon({
  children,
  className,
  style,
  viewBox = '0 0 1024 1024',
}: IconBaseProps & { children: ReactNode; viewBox?: string }) {
  const finalStyle = { fontSize: 'var(--ink-icon-size, 20px)', ...style };
  return (
    <svg
      className={className}
      style={{ width: '1em', height: '1em', display: 'inline-block', ...finalStyle }}
      viewBox={viewBox}
      fill="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function PlusOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M480 160h64v704h-64z" />
      <path d="M160 480h704v64H160z" />
    </SvgIcon>
  );
}

export function MinusOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M160 480h704v64H160z" />
    </SvgIcon>
  );
}

export function ReloadOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 192c-176.7 0-320 143.3-320 320s143.3 320 320 320c141.3 0 261.3-91.6 304.6-218.5l-60.7-20.7C722.9 691.1 626.2 768 512 768c-141.4 0-256-114.6-256-256s114.6-256 256-256c82.5 0 155.9 39 203.3 99.7L640 416h224V192l-84.7 84.7C720.2 219.1 620.2 192 512 192z" />
    </SvgIcon>
  );
}

export function PlayCircleOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 96c229.8 0 416 186.2 416 416S741.8 928 512 928 96 741.8 96 512 282.2 96 512 96zm0 64C317.2 160 160 317.2 160 512s157.2 352 352 352 352-157.2 352-352-157.2-352-352-352z" />
      <path d="M448 352l288 160-288 160V352z" />
    </SvgIcon>
  );
}

export function PauseCircleOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 96c229.8 0 416 186.2 416 416S741.8 928 512 928 96 741.8 96 512 282.2 96 512 96zm0 64C317.2 160 160 317.2 160 512s157.2 352 352 352 352-157.2 352-352-157.2-352-352-352z" />
      <path d="M384 352h96v320h-96z" />
      <path d="M544 352h96v320h-96z" />
    </SvgIcon>
  );
}

export function StopOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M256 256h512v512H256z" />
    </SvgIcon>
  );
}

export function CopyOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M352 192h448v512h-64V256H352z" />
      <path d="M224 320h448v512H224z" />
    </SvgIcon>
  );
}

export function DownOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M256 384l256 256 256-256-45.3-45.3L512 549.5 301.3 338.7z" />
    </SvgIcon>
  );
}

export function LeftOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M640 256L384 512l256 256-45.3 45.3L294.7 512l300-301.3z" />
    </SvgIcon>
  );
}

export function RightOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M384 256l45.3-45.3L729.3 512l-300 301.3L384 768l256-256z" />
    </SvgIcon>
  );
}

export function CloseOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M256 256l512 512-45.3 45.3-512-512z" />
      <path d="M768 256L256 768l-45.3-45.3 512-512z" />
    </SvgIcon>
  );
}

export function QuestionCircleOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 96c229.8 0 416 186.2 416 416S741.8 928 512 928 96 741.8 96 512 282.2 96 512 96zm0 64C317.2 160 160 317.2 160 512s157.2 352 352 352 352-157.2 352-352-157.2-352-352-352z" />
      <path d="M480 704h64v64h-64z" />
      <path d="M512 320c-61.9 0-112 50.1-112 112h64c0-26.5 21.5-48 48-48s48 21.5 48 48c0 18.2-10.3 34.1-25.4 42.2-41.1 21.8-70.6 64.9-70.6 114.8V640h64v-50.9c0-25.3 14.2-48.4 37.1-60.6C582.2 509.9 624 472.4 624 432c0-61.9-50.1-112-112-112z" />
    </SvgIcon>
  );
}

export function AimOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 160c194.4 0 352 157.6 352 352S706.4 864 512 864 160 706.4 160 512 317.6 160 512 160zm0 64c-159 0-288 129-288 288s129 288 288 288 288-129 288-288-129-288-288-288z" />
      <path d="M480 288h64v160h160v64H544v160h-64V512H320v-64h160z" />
    </SvgIcon>
  );
}

export function CodeOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M384 320L192 512l192 192-45.3 45.3L101.4 512l237.3-237.3z" />
      <path d="M640 320l45.3-45.3L922.6 512 685.3 749.3 640 704l192-192z" />
      <path d="M576 256l64 16-192 496-64-16z" />
    </SvgIcon>
  );
}

export function ConsoleOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M192 224h640c35.3 0 64 28.7 64 64v448c0 35.3-28.7 64-64 64H192c-35.3 0-64-28.7-64-64V288c0-35.3 28.7-64 64-64zm0 64v448h640V288H192z" />
      <path d="M320 384l128 128-128 128-45.3-45.3L357.4 512l-82.7-82.7z" />
      <path d="M512 640h192v64H512z" />
    </SvgIcon>
  );
}

export function ToolOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-4.9-2.4-7.3-1.3L9 6 6 9 2.3 5.3C1.2 7.8 1.6 10.7 3.6 12.7c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l1.8-1.8c.4-.4.4-1 0-1.4z" />
    </SvgIcon>
  );
}

export function RocketOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M4 5h16v14H4V5zm2 2v10h12V7H6z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M13 2L6 14h6l-1 8 7-12h-6l1-8z" />
    </SvgIcon>
  );
}

export function AppstoreOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M160 160h288v288H160zM576 160h288v288H576zM160 576h288v288H160zM576 576h288v288H576z" />
    </SvgIcon>
  );
}

export function BookOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M256 160h512c35.3 0 64 28.7 64 64v544c0 35.3-28.7 64-64 64H256c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64zm0 64v544h512V224H256z" />
      <path d="M320 288h384v64H320zM320 416h384v64H320zM320 544h256v64H320z" />
    </SvgIcon>
  );
}

export function GlobalOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 96c229.8 0 416 186.2 416 416S741.8 928 512 928 96 741.8 96 512 282.2 96 512 96zm0 64C317.2 160 160 317.2 160 512s157.2 352 352 352 352-157.2 352-352-157.2-352-352-352z" />
      <path d="M512 160c88.4 0 160 157.2 160 352S600.4 864 512 864 352 706.8 352 512 423.6 160 512 160zm0 64c-40.4 0-96 119.4-96 288s55.6 288 96 288 96-119.4 96-288-55.6-288-96-288z" />
      <path d="M160 480h704v64H160z" />
    </SvgIcon>
  );
}

export function TableOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M160 224h704v576H160zM224 288v128h576V288H224zm0 192v256h192V480H224zm256 0v256h320V480H480z" />
    </SvgIcon>
  );
}

export function CloudDownloadOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 128c132.5 0 244.4 87 282.2 206.6C871.4 346.8 928 417.7 928 512c0 123.7-100.3 224-224 224H320c-123.7 0-224-100.3-224-224 0-105.9 73.6-194.6 172.6-218.2C298.4 196.7 395.2 128 512 128zm32 256h-64v224H352l160 160 160-160H544V384z" />
    </SvgIcon>
  );
}

export function CloudUploadOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 128c132.5 0 244.4 87 282.2 206.6C871.4 346.8 928 417.7 928 512c0 123.7-100.3 224-224 224H320c-123.7 0-224-100.3-224-224 0-105.9 73.6-194.6 172.6-218.2C298.4 196.7 395.2 128 512 128zm0 224l-160 160h128v224h64V512h128L512 352z" />
    </SvgIcon>
  );
}

export function DeleteOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M256 320h512l-32 576H288l-32-576z" />
      <path d="M384 192h256l32 64H352z" />
      <path d="M224 256h576v64H224z" />
    </SvgIcon>
  );
}

export function MessageOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M160 192h704v480H352L224 800V672H160z" />
    </SvgIcon>
  );
}

export function DownloadOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M480 128h64v416h160L512 736 320 544h160z" />
      <path d="M192 800h640v64H192z" />
    </SvgIcon>
  );
}

export function UploadOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M480 896h64V480h160L512 288 320 480h160z" />
      <path d="M192 160h640v64H192z" />
    </SvgIcon>
  );
}

export function SwapOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M224 352h512l-96-96 45.3-45.3L864 384 685.3 557.3 640 512l96-96H224z" />
      <path d="M800 672H288l96 96-45.3 45.3L160 640l178.7-173.3L384 512l-96 96h512z" />
    </SvgIcon>
  );
}

export function ExclamationCircleOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 96c229.8 0 416 186.2 416 416S741.8 928 512 928 96 741.8 96 512 282.2 96 512 96zm0 64C317.2 160 160 317.2 160 512s157.2 352 352 352 352-157.2 352-352-157.2-352-352-352z" />
      <path d="M480 256h64v384h-64z" />
      <path d="M480 704h64v64h-64z" />
    </SvgIcon>
  );
}

export function CheckCircleTwoTone(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M512 96c229.8 0 416 186.2 416 416S741.8 928 512 928 96 741.8 96 512 282.2 96 512 96z"
        fill="color-mix(in srgb, var(--ink-demo-success), transparent 70%)"
      />
      <path d="M416 544l-96-96-45.3 45.3L416 634.7 749.3 301.3 704 256z" />
    </SvgIcon>
  );
}

export function ClockCircleTwoTone(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M512 96c229.8 0 416 186.2 416 416S741.8 928 512 928 96 741.8 96 512 282.2 96 512 96z"
        fill="color-mix(in srgb, var(--ink-demo-warning), transparent 70%)"
      />
      <path d="M480 256h64v256h192v64H480z" />
    </SvgIcon>
  );
}

export function HourglassTwoTone(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M512 96c229.8 0 416 186.2 416 416S741.8 928 512 928 96 741.8 96 512 282.2 96 512 96z"
        fill="color-mix(in srgb, var(--ink-demo-primary), transparent 75%)"
      />
      <path d="M352 256h320v64l-96 96 96 96v64H352v-64l96-96-96-96z" />
    </SvgIcon>
  );
}

export function CaretDownOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M256 384l256 256 256-256z" />
    </SvgIcon>
  );
}

export function CaretRightOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M384 256l256 256-256 256z" />
    </SvgIcon>
  );
}

export function EyeInvisibleOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M128 512c96-160 224-240 384-240s288 80 384 240c-96 160-224 240-384 240S224 672 128 512z" />
      <path d="M512 416a96 96 0 110 192 96 96 0 010-192z" />
      <path d="M256 256l512 512-45.3 45.3-512-512z" />
    </SvgIcon>
  );
}

export function LockOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M320 448v-96c0-106 86-192 192-192s192 86 192 192v96h64v416H256V448h64zm64 0h256v-96c0-70.7-57.3-128-128-128s-128 57.3-128 128v96z" />
      <path d="M512 608a48 48 0 00-24 89.7V768h48v-70.3A48 48 0 00512 608z" />
    </SvgIcon>
  );
}

export function SyncOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 192c-176.7 0-320 143.3-320 320h64c0-141.4 114.6-256 256-256 82.5 0 155.9 39 203.3 99.7L640 416h224V192l-84.7 84.7C720.2 219.1 620.2 192 512 192z" />
      <path d="M768 512c0 141.4-114.6 256-256 256-82.5 0-155.9-39-203.3-99.7L384 608H160v224l84.7-84.7C303.8 804.9 403.8 832 512 832c176.7 0 320-143.3 320-320h-64z" />
    </SvgIcon>
  );
}

export function UserOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 512a160 160 0 110-320 160 160 0 010 320z" />
      <path d="M224 832c0-159 129-288 288-288s288 129 288 288H224z" />
    </SvgIcon>
  );
}

export function ClearOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M192 672l320-320 320 320-96 96H288l-96-96z" />
      <path d="M384 160l64-64 416 416-64 64z" />
    </SvgIcon>
  );
}

export function CloseCircleOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 96c229.8 0 416 186.2 416 416S741.8 928 512 928 96 741.8 96 512 282.2 96 512 96zm0 64C317.2 160 160 317.2 160 512s157.2 352 352 352 352-157.2 352-352-157.2-352-352-352z" />
      <path d="M320 320l384 384-45.3 45.3-384-384z" />
      <path d="M704 320L320 704l-45.3-45.3 384-384z" />
    </SvgIcon>
  );
}

export function FileTextOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M256 160h384l128 128v576H256V160zm384 64v128h128L640 224z" />
      <path d="M320 416h384v64H320zM320 544h384v64H320zM320 672h256v64H320z" />
    </SvgIcon>
  );
}

export function InfoCircleOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 96c229.8 0 416 186.2 416 416S741.8 928 512 928 96 741.8 96 512 282.2 96 512 96zm0 64C317.2 160 160 317.2 160 512s157.2 352 352 352 352-157.2 352-352-157.2-352-352-352z" />
      <path d="M480 448h64v256h-64z" />
      <path d="M480 320h64v64h-64z" />
    </SvgIcon>
  );
}

export function WarningOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 128L64 896h896L512 128z" />
      <path d="M480 448h64v192h-64z" />
      <path d="M480 672h64v64h-64z" />
    </SvgIcon>
  );
}

export function AppleOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M640 256c-48 0-88 18.7-128 56-40-37.3-80-56-128-56-115.2 0-208 107.4-208 240 0 194.1 176.4 352 208 352 32 0 80-32 128-32s96 32 128 32c31.6 0 208-157.9 208-352 0-132.6-92.8-240-208-240z" />
      <path d="M576 160c40-48 32-96 32-96s-56 8-96 56c-40 48-32 96-32 96s56-8 96-56z" />
    </SvgIcon>
  );
}

export function ChromeOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 96c229.8 0 416 186.2 416 416S741.8 928 512 928 96 741.8 96 512 282.2 96 512 96zm0 64C317.2 160 160 317.2 160 512s157.2 352 352 352 352-157.2 352-352-157.2-352-352-352z" />
      <path d="M512 352a160 160 0 110 320 160 160 0 010-320z" />
    </SvgIcon>
  );
}

export function DashboardOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 160c194.4 0 352 157.6 352 352S706.4 864 512 864 160 706.4 160 512s157.6-352 352-352zm0 64c-159 0-288 129-288 288s129 288 288 288 288-129 288-288-129-288-288-288z" />
      <path d="M512 512l160-96-32-54-160 96z" />
      <path d="M512 560a48 48 0 110-96 48 48 0 010 96z" />
    </SvgIcon>
  );
}

export function DesktopOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M192 224h640v448H192V224zm64 64v320h512V288H256z" />
      <path d="M416 704h192v64H416z" />
      <path d="M352 768h320v64H352z" />
    </SvgIcon>
  );
}

export function HddOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M192 256h640v512H192V256zm64 64v384h512V320H256z" />
      <path d="M320 640h64v64h-64z" />
      <path d="M448 640h256v64H448z" />
    </SvgIcon>
  );
}

export function PoweroffOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M480 96h64v416h-64z" />
      <path d="M384 184.5l36.6 52.5C311.9 281.4 256 387.2 256 512c0 141.4 114.6 256 256 256s256-114.6 256-256c0-124.8-55.9-230.6-164.6-275l36.6-52.5C770.5 240.7 832 369.1 832 512c0 176.7-143.3 320-320 320S192 688.7 192 512c0-142.9 61.5-271.3 192-327.5z" />
    </SvgIcon>
  );
}

export function WifiOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M192 448c88.4-88.4 206.2-137.3 320-137.3S743.6 359.6 832 448l-45.3 45.3C710.4 417 614.5 372.7 512 372.7S313.6 417 237.3 493.3L192 448z" />
      <path d="M288 544c61.9-61.9 144.2-96 224-96s162.1 34.1 224 96l-45.3 45.3C639.5 538.4 578.8 512 512 512s-127.5 26.4-178.7 77.3L288 544z" />
      <path d="M384 640c35.3-35.3 82.1-54.7 128-54.7s92.7 19.4 128 54.7l-45.3 45.3C571.5 662 542.4 648 512 648s-59.5 14-82.7 37.3L384 640z" />
      <path d="M512 768a48 48 0 110 96 48 48 0 010-96z" />
    </SvgIcon>
  );
}

export function ClockCircleOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M512 96c229.8 0 416 186.2 416 416S741.8 928 512 928 96 741.8 96 512 282.2 96 512 96zm0 64C317.2 160 160 317.2 160 512s157.2 352 352 352 352-157.2 352-352-157.2-352-352-352z" />
      <path d="M480 256h64v288h192v64H480z" />
    </SvgIcon>
  );
}

export function SearchOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M448 160c159.1 0 288 128.9 288 288 0 64.8-21.4 124.6-57.6 172.7l155.4 155.4-45.3 45.3-155.4-155.4C572.6 702.6 512.8 724 448 724c-159.1 0-288-128.9-288-288s128.9-288 288-288zm0 64c-123.7 0-224 100.3-224 224s100.3 224 224 224 224-100.3 224-224-100.3-224-224-224z" />
    </SvgIcon>
  );
}

export function EyeOutlined(props: IconBaseProps) {
  return (
    <SvgIcon {...props}>
      <path d="M96 512c97.5-170.7 251.1-256 416-256s318.5 85.3 416 256c-97.5 170.7-251.1 256-416 256S193.5 682.7 96 512zm416-192c-106 0-192 86-192 192s86 192 192 192 192-86 192-192-86-192-192-192z" />
      <path d="M512 416a96 96 0 110 192 96 96 0 010-192z" />
    </SvgIcon>
  );
}
