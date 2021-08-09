import * as React from 'react';

function ThumbDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4.178 10.044h-.491A1.637 1.637 0 012.05 8.407V3.57c0-.904.733-1.636 1.637-1.636h.491v8.11zM5.378 11.348V1.934h4.964c1.237 0 2.313.85 2.6 2.053l.943 3.961a1.982 1.982 0 01-1.928 2.441H9.194c.147.272.305.577.441.888.16.364.305.772.353 1.159.048.377.017.867-.349 1.233a1.31 1.31 0 01-.87.395 1.737 1.737 0 01-.857-.2c-.496-.246-.985-.694-1.422-1.167a18.394 18.394 0 01-1.112-1.349z"
        fill="currentColor"
      />
    </svg>
  );
}

export default ThumbDown;
