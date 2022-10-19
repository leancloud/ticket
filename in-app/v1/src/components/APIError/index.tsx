import { SVGProps } from 'react';
import { useTranslation } from 'react-i18next';

function RadarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={100}
      height={101}
      viewBox="0 0 100 101"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path fill="none" d="M0 .5h100v100H0z" />
      <ellipse opacity={0.06} cx={50.001} cy={91.024} rx={17.551} ry={2.643} fill="#000" />
      <g filter="url(#prefix__filter0_i)" stroke="#BFBFBF" strokeWidth={4.286}>
        <circle cx={52.891} cy={48.645} r={4.286} transform="rotate(45 52.89 48.645)" />
        <path
          d="M63.876 51.801a11.426 11.426 0 00-2.905-11.237 11.425 11.425 0 00-11.135-2.934M71.004 52.755c1.358-6.01-.303-12.563-4.981-17.242A18.517 18.517 0 0060 31.483m-11.22-.951a18.655 18.655 0 014.077-.458M49.355 52.18l-3.03 3.031M35.717 65.818c5.341 5.341 13.86 5.569 19.471.683.417-.363.415-1 .025-1.39l-18.79-18.789c-.39-.39-1.026-.392-1.39.024-4.885 5.612-4.657 14.13.684 19.472z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <path
        clipRule="evenodd"
        d="M21.971 36.542a3.572 3.572 0 11-7.143 0 3.572 3.572 0 017.143 0z"
        stroke="#F0F0F0"
        strokeWidth={2.571}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M37.142 21.928a1.429 1.429 0 102.857 0V20.5h1.429a1.429 1.429 0 100-2.857h-1.429v-1.429a1.429 1.429 0 10-2.857 0v1.429h-1.428a1.429 1.429 0 000 2.857h1.428v1.428z"
        fill="#F0F0F0"
      />
      <path
        opacity={0.5}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M74.286 74.786a1.429 1.429 0 102.857 0v-1.429h1.429a1.429 1.429 0 000-2.857h-1.429v-1.428a1.429 1.429 0 10-2.857 0V70.5h-1.429a1.429 1.429 0 100 2.857h1.429v1.429z"
        fill="#F0F0F0"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.428 69.071a1.429 1.429 0 102.858 0v-1.428h1.428a1.429 1.429 0 100-2.857h-1.428v-1.429a1.429 1.429 0 10-2.858 0v1.429H10a1.429 1.429 0 000 2.857h1.428v1.428zM80 36.214a1.429 1.429 0 002.858 0v-1.428h1.428a1.429 1.429 0 100-2.857h-1.428V30.5a1.429 1.429 0 10-2.857 0v1.429h-1.429a1.428 1.428 0 100 2.857h1.429v1.428z"
        fill="#F0F0F0"
      />
      <defs>
        <filter
          id="prefix__filter0_i"
          x={9.454}
          y={15.31}
          width={73.236}
          height={73.236}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy={0.714} />
          <feComposite in2="hardAlpha" operator="arithmetic" k2={-1} k3={1} />
          <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0" />
          <feBlend in2="shape" result="effect1_innerShadow" />
        </filter>
      </defs>
    </svg>
  );
}

export interface APIErrorProps {
  error?: Error | null;
  onRetry?: () => void;
}

export function APIError({ error, onRetry }: APIErrorProps) {
  const { t } = useTranslation();

  return (
    <div className="h-full flex grow">
      <div className="mx-auto mt-24 sm:my-auto text-center">
        <RadarIcon className="mx-auto" />
        <div className="mt-2 h-6 text-[#BFBFBF]">{error?.message ?? t('network_error')}</div>
        <button
          className="mt-3 px-3 h-8 box-border rounded-full border border-[rgba(0,0,0,0.06)] text-tapBlue text-sm"
          onClick={onRetry}
        >
          {t('network_error.retry')}
        </button>
      </div>
    </div>
  );
}
