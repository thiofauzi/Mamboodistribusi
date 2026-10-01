export const tokens = {
  colors: {
    primary: {
      50: '#EEF2FF',
      100: '#E8EEFD',
      300: '#93A8F0',
      500: '#3B82F6',
      600: '#2563EB',
      hover: '#1D4ED8',
      pressed: '#1E40AF',
      disabled: '#93B4F5',
    },
    accent: {
      orange: '#FF8A00',
    },
    surface: {
      page: '#FAFAFA',
      surface: '#FFFFFF',
      rowAlt: '#F5F8FE',
      chipBg: '#D6DAE3',
    },
    border: {
      default: '#E5E7EB',
      banner: '#93A8F0',
    },
    text: {
      primary: '#111827',
      secondary: '#4B5563',
      disabled: '#C7CDD6',
    },
    chart: {
      mechanical: '#D0382E',
      synchron: '#FFB400',
      performing: '#4B3BE8',
      dsp: '#3F9468',
      empty: '#757575',
    },
    status: {
      dalamPemakaian: {
        text: '#C2610C',
        bg: '#FFF8F0',
        border: '#F3D9BF',
      },
      tersedia: {
        text: '#2F855A',
        bg: '#F3FBF6',
        border: '#B7DCC5',
      },
      tidakTersedia: {
        text: '#4B5563', // disesuaikan agar kontras terbaca (WCAG note)
        bg: '#F3F4F6',
        border: '#E5E7EB',
      },
      pemakaianExclusive: {
        text: '#4B5563',
        bg: '#FFFFFF',
        border: '#E5E7EB',
      },
    },
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    display: {
      fontSize: '32px',
      lineHeight: '40px',
      fontWeight: 500,
    },
    heading1: {
      fontSize: '28px',
      lineHeight: '36px',
      fontWeight: 700,
    },
    heading2: {
      fontSize: '18px',
      lineHeight: '24px',
      fontWeight: 500,
    },
    heading3: {
      fontSize: '18px',
      lineHeight: '24px',
      fontWeight: 600,
    },
    nav: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 600,
    },
    tableHead: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 600,
    },
    body: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 400,
    },
    tableCell: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 500,
    },
    label: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 500,
    },
    button: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 600,
    },
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadows: {
    card: '0 1px 3px rgba(16, 24, 40, 0.10), 0 1px 2px rgba(16, 24, 40, 0.06)',
  },
} as const;
