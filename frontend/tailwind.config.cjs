/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Playfair Display"', 'Georgia', 'serif'],
                mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
                sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                ink: '#0A0806',
                surface: '#141110',
                bone: '#F5EDD8',
                ash: '#A8A29E',
                acid: '#D4AF37',
                acidHover: '#E5C158',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            keyframes: {
                'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
                'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
                'grain': {
                    '0%,100%': { transform: 'translate(0,0)' },
                    '10%': { transform: 'translate(-5%,-10%)' },
                    '20%': { transform: 'translate(-15%,5%)' },
                    '30%': { transform: 'translate(7%,-25%)' },
                    '40%': { transform: 'translate(-5%,25%)' },
                    '50%': { transform: 'translate(-15%,10%)' },
                    '60%': { transform: 'translate(15%,0%)' },
                    '70%': { transform: 'translate(0%,15%)' },
                    '80%': { transform: 'translate(3%,35%)' },
                    '90%': { transform: 'translate(-10%,10%)' },
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'grain': 'grain 8s steps(10) infinite',
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
};
