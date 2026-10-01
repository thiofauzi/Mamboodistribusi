import React, { useState } from 'react';
import { Card } from './Card';
import { Typography } from './Typography';

export interface ChartLegendItem {
  label: string;
  color: string;
}

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  amount: number | string;
  legends?: ChartLegendItem[];
  isEmpty?: boolean;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  amount,
  legends = [
    { label: 'Mechanical', color: '#D0382E' },
    { label: 'Synchron', color: '#FFB400' },
    { label: 'Performing', color: '#4B3BE8' },
    { label: 'DSP', color: '#3F9468' },
  ],
  isEmpty = false,
  className = '',
}) => {
  const [isMasked, setIsMasked] = useState(false);

  const formattedAmount =
    typeof amount === 'number'
      ? new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(amount)
      : amount;

  return (
    <Card className={`h-[190px] flex items-center gap-6 ${className}`}>
      {/* Donut Chart representation (120px) */}
      <div className="relative w-[120px] h-[120px] shrink-0 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="transparent"
            stroke={isEmpty ? '#757575' : '#E5E7EB'}
            strokeWidth="14"
          />
          {!isEmpty && (
            <>
              {/* Segmen contoh donut */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#D0382E"
                strokeWidth="14"
                strokeDasharray="60 178"
                strokeDashoffset="0"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#FFB400"
                strokeWidth="14"
                strokeDasharray="50 188"
                strokeDashoffset="-60"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#4B3BE8"
                strokeWidth="14"
                strokeDasharray="70 168"
                strokeDashoffset="-110"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#3F9468"
                strokeWidth="14"
                strokeDasharray="58 180"
                strokeDashoffset="-180"
              />
            </>
          )}
        </svg>
      </div>

      {/* Info Content */}
      <div className="flex flex-col justify-between flex-1 h-full py-1">
        <div>
          <Typography variant="heading-2" color="primary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body" color="secondary" className="mt-0.5">
              {subtitle}
            </Typography>
          )}

          {/* Amount Display with Eye toggle */}
          <div className="flex items-center gap-3 mt-2">
            <Typography variant="display" color="primary" className="font-semibold text-[26px]">
              {isEmpty ? 'Rp 0' : isMasked ? 'Rp ********' : formattedAmount}
            </Typography>

            {!isEmpty && (
              <button
                type="button"
                onClick={() => setIsMasked((prev) => !prev)}
                className="p-1 rounded text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
                title={isMasked ? 'Tampilkan Nominal' : 'Sembunyikan Nominal'}
              >
                {isMasked ? (
                  // Eye Closed
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  // Eye Open
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {legends.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: isEmpty ? '#757575' : item.color }}
              />
              <Typography variant="label" color="secondary" className="text-[13px]">
                {item.label}
              </Typography>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
