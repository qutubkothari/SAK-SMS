/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 2025 Enterprise Color Palette
        mint: {
          50: '#F0FDF9',
          100: '#CCFBEF',
          200: '#99F6E0',
          300: '#5FEACD',
          400: '#2DD4B4',
          500: '#00C49A',  // Primary Mint Green
          600: '#00A17F',
          700: '#007D65',
          800: '#006350',
          900: '#004D3D',
        },
        lemon: {
          50: '#FEFCE8',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#FCEE21',  // Secondary Lemon Yellow
          600: '#E5D700',
          700: '#CAB800',
          800: '#A89300',
          900: '#8A7700',
        },
        // Keep slate for text
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'mint-sm': '0 2px 8px rgba(0, 196, 154, 0.1)',
        'mint-md': '0 4px 16px rgba(0, 196, 154, 0.15)',
        'mint-lg': '0 8px 32px rgba(0, 196, 154, 0.2)',
        'mint-xl': '0 16px 48px rgba(0, 196, 154, 0.25)',
        'lemon-sm': '0 2px 8px rgba(252, 238, 33, 0.1)',
        'lemon-md': '0 4px 16px rgba(252, 238, 33, 0.15)',
        'soft': '0 4px 24px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 8px 40px rgba(0, 0, 0, 0.08)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'shine': 'shine 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'scale-in': 'scale-in 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
