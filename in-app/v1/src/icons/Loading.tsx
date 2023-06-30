import { SVGProps } from 'react';

export const LoadingIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="16"
    height="17"
    viewBox="0 0 16 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <clipPath id="loading-icon-clip">
      <path d="M16 8.5C16 12.9183 12.4183 16.5 8 16.5C3.58172 16.5 0 12.9183 0 8.5C0 4.08172 3.58172 0.5 8 0.5C12.4183 0.5 16 4.08172 16 8.5ZM2.4 8.5C2.4 11.5928 4.90721 14.1 8 14.1C11.0928 14.1 13.6 11.5928 13.6 8.5C13.6 5.40721 11.0928 2.9 8 2.9C4.90721 2.9 2.4 5.40721 2.4 8.5Z" />
    </clipPath>

    <foreignObject x="0" y="0" width="16" height="17" clipPath="url(#loading-icon-clip)">
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'conic-gradient(from 180deg, rgba(217, 217, 217, 0), rgba(14, 203, 203, 1))',
        }}
      />
    </foreignObject>
  </svg>
);
