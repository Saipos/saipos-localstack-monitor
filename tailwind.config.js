/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saipos: {
          blue: {
            50: '#f0f5ff',
            100: '#dfe8ff',
            200: '#c7d9ff',
            300: '#9fc0ff',
            400: '#6b9cff',
            500: '#446ca4',
            600: '#446ca4',
            700: '#375a89',
            800: '#2d4a70',
            900: '#243d5c',
          },
          green: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#63b953',
            500: '#63b953',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
          },
          gray: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#eeeeee',
            300: '#e0e0e0',
            400: '#bdbdbd',
            500: '#9e9e9e',
            600: '#757575',
            700: '#616161',
            800: '#424242',
            900: '#212121',
          }
        },
        primary: {
          50: '#f0f5ff',
          100: '#dfe8ff',
          200: '#c7d9ff',
          300: '#9fc0ff',
          400: '#6b9cff',
          500: '#446ca4',
          600: '#446ca4',
          700: '#375a89',
          800: '#2d4a70',
          900: '#243d5c',
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#63b953',
          500: '#63b953',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        }
      },
      fontFamily: {
        'poppins': ['Poppins', 'Arial', 'sans-serif'],
        'sans': ['Poppins', 'Arial', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}