/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          earth: '#241C18',     // Warm Ink Black
          terracotta: '#C4572E',// Terracotta Burnt Orange (như ảnh mẫu)
          amber: '#D26B38',     // Warm Ember
          tint: '#F5ECE4',      // Soft Clay Tint
        },
        secondary: {
          olive: '#384E42',     // Deep Pine
          herbal: '#5A7566',    // Sage Mist
          sand: '#E8E2D8',      // Warm Stone border
          cream: '#FAF6F0',     // Oat Linen Ground (chuẩn màu nền ảnh mẫu)
        },
        semantic: {
          success: '#2A694E',
          successBg: '#EDF5F1',
          warning: '#B86A1B',
          warningBg: '#FDF7EE',
          error: '#A83232',
          errorBg: '#FDF2F2',
        }
      },
      borderRadius: {
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      }
    },
  },
  plugins: [],
}