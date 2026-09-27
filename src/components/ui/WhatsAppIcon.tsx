import React from 'react';

interface WhatsAppIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Official, high-fidelity WhatsApp Brand Icon.
 * Features the signature WhatsApp vibrant green (#25D366) speech bubble
 * and the crisp white telephone receiver handset inside.
 */
export const WhatsAppIcon: React.FC<WhatsAppIconProps> = ({
  className = 'w-5 h-5 flex-shrink-0',
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#25D366"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2Z"
      />
      <path
        fill="#FFFFFF"
        d="M17.52 14.33C17.22 14.18 15.75 13.45 15.48 13.35C15.2 13.25 15.01 13.2 14.81 13.5C14.61 13.8 14.04 14.47 13.87 14.67C13.69 14.87 13.52 14.89 13.22 14.74C12.92 14.59 11.96 14.28 10.82 13.26C9.93 12.47 9.33 11.49 9.16 11.19C8.98 10.89 9.14 10.73 9.29 10.58C9.43 10.45 9.59 10.23 9.74 10.06C9.89 9.89 9.94 9.76 10.04 9.56C10.14 9.36 10.09 9.19 10.02 9.04C9.94 8.89 9.34 7.42 9.09 6.82C8.85 6.24 8.61 6.32 8.43 6.31C8.26 6.3 8.06 6.3 7.86 6.3C7.66 6.3 7.34 6.37 7.07 6.67C6.8 6.97 6.03 7.69 6.03 9.16C6.03 10.63 7.1 12.05 7.25 12.25C7.4 12.45 9.35 15.45 12.33 16.74C13.04 17.05 13.6 17.23 14.03 17.37C14.75 17.6 15.4 17.56 15.92 17.49C16.5 17.4 17.7 16.76 17.95 16.05C18.2 15.35 18.2 14.75 18.12 14.63C18.05 14.5 17.82 14.48 17.52 14.33Z"
      />
    </svg>
  );
};

export default WhatsAppIcon;
