# ALH Luxury Perfumes

A luxury perfume e-commerce website built with HTML, CSS, JavaScript, and Firebase.

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Build Tailwind CSS:
```bash
npm run build
```

3. For development with auto-rebuild:
```bash
npm run build-css
```

4. Serve locally:
```bash
npm run serve
```

## Production Deployment

1. Build the CSS for production:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy
```

## Features

- Responsive design with Tailwind CSS
- Firebase Authentication and Firestore
- Razorpay payment integration
- Beautiful perfume bottle loading animation
- Mobile-optimized UI

## Project Structure

- `index.html` - Main landing page
- `checkout.html` - Checkout page with payment integration
- `functions/` - Firebase Cloud Functions
- `src/input.css` - Tailwind CSS source file
- `dist/output.css` - Compiled Tailwind CSS
- `assets/` - Images and static assets
