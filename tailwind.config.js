/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        palabre: {
          bg: '#F6F7F4',
          surface: '#FFFFFF',
          text: '#14201C',
          muted: '#5B6B65',
          border: '#DDE3DF',
          primary: '#0F5C4A',
          primaryHover: '#0A4336',
          primaryLight: '#E8F5F1',
          accent: '#E8892B',
          accentHover: '#CF751D',
          ok: '#157347',
          okBg: '#E3F4EA',
          re: '#8A5A00',
          reBg: '#FFF1D6',
          fl: '#B3261E',
          flBg: '#FCE4E2',
          new: '#1F5FA8',
          newBg: '#E2EEFB',
          codeBg: '#0E1714',
          codeText: '#D7E7E1',
        }
      },
      borderRadius: {
        'card': '14px',
        'btn': '10px',
      }
    },
  },
  plugins: [],
}

