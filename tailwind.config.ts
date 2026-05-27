import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0d0f0b',
        paper: '#f6f3ec',
        cream: '#ece8de',
        gold: { DEFAULT: '#b8922a', pale: '#f5e8c0', light: '#e0c46a' },
        teal: { DEFAULT: '#1a5c52', light: '#2a8a7a' },
        islamic: { DEFAULT: '#1a7a5c', light: '#20b87f' },
        danger: '#b03030',
      },
      fontFamily: {
        syne: ['var(--font-syne)', 'sans-serif'],
        serif: ['var(--font-instrument)', 'serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.8s infinite',
        'spin-slow': 'spin 0.7s linear infinite',
        'fade-up': 'fade-up 0.3s ease',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.4)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
