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
          bg: '#F5F7F4',
          surface: '#FFFFFF',
          text: '#14201C',
          muted: '#53665F',
          border: '#D9E3DD',
          primary: '#0D604C',
          primaryHover: '#094635',
          primaryLight: '#E7F4EF',
          accent: '#D97724',
          accentHover: '#BC5E16',
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
