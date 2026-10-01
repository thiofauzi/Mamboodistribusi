import React from 'react';
import { Typography } from './Typography';

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  hasSubmenu?: boolean;
  badge?: number | string;
  badgeColor?: string;
  onClick?: () => void;
}

export interface SidebarProps {
  publisherName?: string;
  role?: string;
  logoSrc?: string;
  items: NavItem[];
  onLogout?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  publisherName = 'Nama Publisher',
  role = 'Publisher',
  logoSrc,
  items,
  onLogout,
  className = '',
}) => {
  return (
    <aside
      className={`w-[216px] min-h-screen bg-white border-r border-[#E5E7EB] flex flex-col justify-between px-4 py-8 select-none shrink-0 ${className}`}
    >
      {/* Top: Logo & Publisher Profile */}
      <div className="flex flex-col items-center">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center font-bold text-xl text-[#2563EB] tracking-wider mb-4">
          {logoSrc ? <img src={logoSrc} alt="LOKA" className="h-10" /> : 'LOKA'}
        </div>

        {/* Publisher Info */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="inline-flex items-center gap-1.5 justify-center">
            <Typography variant="heading-3" color="primary" className="text-center font-semibold">
              {publisherName}
            </Typography>
            {/* Verified Badge */}
            <svg
              className="w-4 h-4 text-[#3B82F6] shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <Typography variant="body" color="secondary" className="mt-0.5">
            {role}
          </Typography>
        </div>

        {/* Navigation Menu */}
        <nav className="w-full flex flex-col gap-1 mt-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-[8px] text-[16px] leading-[24px] font-semibold transition-all duration-150 text-left ${
                item.active
                  ? 'bg-[#E8EEFD] text-[#2563EB]'
                  : 'text-[#111827] hover:bg-[#FAFAFA]'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon && <span className="w-5 h-5 shrink-0 flex items-center justify-center">{item.icon}</span>}
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge !== undefined && item.badge !== null && item.badge !== 0 && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      item.badgeColor || 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.hasSubmenu && (
                  <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom: Logout */}
      <div className="pt-4 border-t border-[#E5E7EB]">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-[8px] text-[16px] leading-[24px] font-semibold text-[#111827] hover:bg-[#FAFAFA] transition-colors text-left"
        >
          <svg className="w-5 h-5 text-[#4B5563]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
