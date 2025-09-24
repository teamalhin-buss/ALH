/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./functions/**/*.js",
    "./**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#D4A76A',
        'primary-dark': '#b38a4e',
        secondary: '#000000'
      },
      borderRadius: {
        button: '8px'
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif']
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce': 'bounce 1s infinite',
        'slide-in-left': 'slideInLeft 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.6s ease-out forwards',
        'slide-in-up': 'slideInUp 0.6s ease-out forwards',
        'fade-in-section': 'fadeIn 0.8s ease-out forwards',
        'slide-in-right-large': 'slideInRightLarge 0.8s ease-out forwards',
        'bottle-float': 'bottleFloat 3s ease-in-out infinite',
        'fill-bottle': 'fillBottle 2s ease-out forwards',
        'bottle-shine': 'bottleShine 2s ease-in-out infinite',
        'spray': 'sprayAnimation 1.5s ease-out infinite',
        'dot-pulse': 'dotPulse 1.5s ease-in-out infinite',
        'float-particle': 'floatParticle 4s ease-in-out infinite',
        'loader-fade-out': 'loaderFadeOut 0.8s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'typewriter': 'typewriter 3s steps(40, end)',
        'blink-caret': 'blink-caret 0.75s step-end infinite',
        'pop-in': 'popIn 0.3s ease-out forwards',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-50px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(50px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        slideInUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRightLarge: {
          from: { opacity: '0', transform: 'translateX(100px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        bottleFloat: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' }
        },
        fillBottle: {
          '0%': { height: '0%' },
          '100%': { height: '85%' }
        },
        bottleShine: {
          '0%': { left: '-100%', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { left: '100%', opacity: '0' }
        },
        sprayAnimation: {
          '0%': {
            opacity: '1',
            transform: 'translateX(0) translateY(0) scale(1)'
          },
          '100%': {
            opacity: '0',
            transform: 'translateX(60px) translateY(-30px) scale(0.3)'
          }
        },
        dotPulse: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' }
        },
        floatParticle: {
          '0%, 100%': {
            opacity: '0',
            transform: 'translateY(0px) translateX(0px) scale(1)'
          },
          '25%': {
            opacity: '0.8',
            transform: 'translateY(-20px) translateX(10px) scale(1.2)'
          },
          '50%': {
            opacity: '1',
            transform: 'translateY(-40px) translateX(-5px) scale(0.8)'
          },
          '75%': {
            opacity: '0.6',
            transform: 'translateY(-20px) translateX(15px) scale(1.1)'
          }
        },
        loaderFadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0', visibility: 'hidden' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        typewriter: {
          from: { width: '0' },
          to: { width: '100%' }
        },
        'blink-caret': {
          from: { 'border-color': 'transparent' },
          to: { 'border-color': 'transparent' },
          '50%': { 'border-color': '#D4AF37' }
        },
        popIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '70%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}
