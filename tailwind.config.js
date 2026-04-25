/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nerixi: {
          bg: '#0a1628',
          surface: '#111f38',
          card: '#162240',
          border: 'rgba(0,200,120,0.15)',
          green: '#00c878',
          accent: '#00e89a',
          muted: '#7a9bb0',
          text: '#e8f4f0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
