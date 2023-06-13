import { ComponentPropsWithoutRef, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';

import styles from './index.module.css';

function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={101}
      height={101}
      viewBox="0 0 101 101"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path fill="none" d="M.5.5h100v100H.5z" />
      <ellipse opacity={0.06} cx={50.499} cy={91.274} rx={17.262} ry={2.589} fill="#000" />
      <g filter="url(#prefix__filter0_i)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M50.5 34.072c-9.073 0-16.428 7.355-16.428 16.428S41.427 66.93 50.5 66.93c9.074 0 16.429-7.356 16.429-16.429 0-9.073-7.355-16.428-16.429-16.428zM29.786 50.5c0-11.44 9.274-20.714 20.714-20.714S71.215 39.06 71.215 50.5 61.94 71.214 50.5 71.214c-11.44 0-20.714-9.274-20.714-20.714z"
          fill="#BFBFBF"
        />
      </g>
      <g filter="url(#prefix__filter1_i)">
        <path
          d="M69.976 51.929c6.102 3.222 9.68 6.28 9.056 8.2-1.097 3.377-14.76 1.964-30.518-3.156-15.758-5.12-27.643-12.008-26.546-15.385.428-1.316 2.765-1.904 6.39-1.83"
          stroke="#BFBFBF"
          strokeWidth={4.286}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g filter="url(#prefix__filter2_i)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M35.027 44.971c2.27-6.353 8.341-10.9 15.475-10.9 9.073 0 16.428 7.356 16.428 16.429 0 1.857-.308 3.642-.875 5.306l4.047 1.414a20.689 20.689 0 001.114-6.72c0-11.44-9.274-20.714-20.714-20.714-9.005 0-16.668 5.746-19.523 13.772l4.048 1.413z"
          fill="#BFBFBF"
        />
      </g>
      <path
        opacity={0.5}
        clipRule="evenodd"
        d="M75.328 27.97a3.572 3.572 0 11-7.143 0 3.572 3.572 0 017.143 0z"
        stroke="#F0F0F0"
        strokeWidth={2.571}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        clipRule="evenodd"
        d="M93.9 52.256a3.572 3.572 0 11-7.143 0 3.572 3.572 0 017.143 0z"
        stroke="#F0F0F0"
        strokeWidth={2.571}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity={0.5}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M26.214 26.214a1.429 1.429 0 002.857 0v-1.428h1.428a1.429 1.429 0 100-2.857h-1.428V20.5a1.429 1.429 0 10-2.857 0v1.429h-1.429a1.429 1.429 0 100 2.857h1.429v1.428zM70.5 77.643a1.429 1.429 0 002.858 0v-1.429h1.428a1.429 1.429 0 100-2.857h-1.428V71.93a1.429 1.429 0 10-2.857 0v1.428h-1.429a1.429 1.429 0 000 2.857h1.429v1.429z"
        fill="#F0F0F0"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.928 69.071a1.429 1.429 0 102.858 0v-1.428h1.428a1.429 1.429 0 100-2.857h-1.428v-1.429a1.429 1.429 0 10-2.858 0v1.429H10.5a1.429 1.429 0 100 2.857h1.428v1.428z"
        fill="#F0F0F0"
      />
      <defs>
        <filter
          id="prefix__filter0_i"
          x={29.786}
          y={29.786}
          width={41.429}
          height={41.429}
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
        <filter
          id="prefix__filter1_i"
          x={19.755}
          y={37.61}
          width={61.491}
          height={26.498}
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
        <filter
          id="prefix__filter2_i"
          x={30.98}
          y={29.786}
          width={40.237}
          height={27.434}
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

function LoadingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={17}
      height={17}
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#prefix__clip0)" fill="#D9D9D9">
        <path d="M2.31 5.28a1.588 1.588 0 103.176 0 1.588 1.588 0 00-3.175 0zM6.628 3.162a1.662 1.662 0 103.324 0 1.662 1.662 0 00-3.324 0zM11.627 4.75a.53.53 0 101.06 0 .53.53 0 00-1.06 0zM12.847 7.879a.745.745 0 101.49 0 .745.745 0 00-1.49 0zM11.913 11.598a.935.935 0 101.87 0 .935.935 0 00-1.87 0zM8.318 13.787a1.058 1.058 0 102.117 0 1.058 1.058 0 00-2.117 0zM4.222 13.11a1.265 1.265 0 102.53 0 1.265 1.265 0 00-2.53 0zM1.5 9.547a1.43 1.43 0 102.858 0 1.43 1.43 0 00-2.858 0z" />
      </g>
      <defs>
        <clipPath id="prefix__clip0">
          <path fill="#fff" transform="translate(1.5 1.5)" d="M0 0h14v14H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function LoadingHint(props: ComponentPropsWithoutRef<'div'>) {
  const { t } = useTranslation();

  return (
    <div {...props} className={cx('h-6 flex items-center', props.className)}>
      <LoadingIcon className={styles.spinner} />
      <div className="ml-2 text-[#BFBFBF] text-[13px]">{t('general.loading')}...</div>
    </div>
  );
}

interface LoadingProps {
  className?: string;
  fullScreen?: boolean;
}

export function Loading({ className, fullScreen }: LoadingProps) {
  return (
    <div
      className={cx(
        className,
        'mx-auto min-h-[10em] flex flex-col items-center justify-center py-4',
        fullScreen ? 'h-screen' : 'min-h-[10em]'
      )}
    >
      <StarIcon />
      <LoadingHint className="mt-1" />
    </div>
  );
}
