/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        notion: {
          bg: {
            light: '#FBFBFA',
            dark: '#191919',
          },
          sidebar: {
            light: '#F7F6F3',
            dark: '#202020',
          },
          card: {
            light: '#FFFFFF',
            dark: '#252525',
          },
          hover: {
            light: 'rgba(55, 53, 47, 0.08)',
            dark: 'rgba(255, 255, 255, 0.085)',
          },
          border: {
            light: 'rgba(55, 53, 47, 0.12)',
            dark: 'rgba(255, 255, 255, 0.13)',
          },
          text: {
            main: '#37352F',
            muted: '#787774',
            darkMain: '#D4D4D4',
            darkMuted: '#9B9B9B',
          },
          accent: {
            blue: '#2383E2',
            blueBg: 'rgba(35, 131, 226, 0.1)',
            green: '#0F7B6C',
            greenBg: 'rgba(15, 123, 108, 0.12)',
            rose: '#EB5757',
            roseBg: 'rgba(235, 87, 87, 0.12)',
            amber: '#D9730D',
            amberBg: 'rgba(217, 115, 13, 0.12)',
            purple: '#6940C5',
            purpleBg: 'rgba(105, 64, 197, 0.12)',
          }
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'notion-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'notion-md': '0 4px 12px rgba(0, 0, 0, 0.06)',
        'notion-lg': '0 8px 24px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulseSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [],
}
