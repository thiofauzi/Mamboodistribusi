import React from 'react';
import { Button } from './Button';
import { Typography } from './Typography';

export interface VerificationBannerProps {
  title?: string;
  description?: string;
  buttonLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const VerificationBanner: React.FC<VerificationBannerProps> = ({
  title = 'Segera Verifikasi Publisher',
  description = 'Lengkapi dokumen legalitas dan verifikasi akun publisher Anda agar royalti dan data katalog dapat diproses.',
  buttonLabel = 'Verifikasi Sekarang',
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`bg-[#EEF2FF] border-[1.5px] border-[#93A8F0] rounded-[12px] p-5 flex items-center justify-between gap-5 ${className}`.trim()}
    >
      <div className="flex items-start gap-4">
        {/* Verification Icon Badge */}
        <div className="w-12 h-12 rounded-full bg-[#E8EEFD] flex items-center justify-center shrink-0 text-[#2563EB]">
          <svg className="w-6 h-6 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <div>
          <Typography variant="heading-3" className="text-[#2563EB] mb-1">
            {title}
          </Typography>
          <Typography variant="body" className="text-[#2563EB] max-w-xl opacity-90">
            {description}
          </Typography>
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={onAction}
        className="shrink-0"
      >
        {buttonLabel}
      </Button>
    </div>
  );
};
