# ALH Luxury Perfumes

A luxury perfume e-commerce website built with HTML, CSS, JavaScript, and Firebase.

## 🚀 Quick Deployment (Vercel/Netlify)

### **Automatic Deployment:**
1. **Push to your repository**
2. **Connect to Vercel or Netlify**
3. **Automatic build** triggers on push
4. **CDN fallback** ensures styles always load

### **Manual Build (if needed):**
```bash
npm install
npm run build
```

## 🔧 Development Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Build Tailwind CSS:**
```bash
npm run build
```

3. **Development with auto-rebuild:**
```bash
npm run build-css
```

4. **Serve locally:**
```bash
npm run serve
```

## 🎨 Styling Features

### ✅ **Robust CSS Loading:**
- **CDN Fallback** - Tailwind loads from CDN first
- **Built CSS** - Optimized production build (4,900+ lines)
- **Custom animations** - Perfume bottle loader, scroll effects
- **Mobile responsive** - Optimized for all devices
- **Error handling** - Console warnings if CSS fails to load

### ✅ **Working Components:**
- **All Tailwind classes** (`bg-primary`, `animate-fade-in`, etc.)
- **Custom colors** - Primary: #D4A76A
- **Google Fonts** - Playfair Display & Inter
- **Icon libraries** - RemixIcon integration

## 🚀 Production Deployment

### **Vercel (Recommended):**
1. **Connect repository** to Vercel
2. **Build command**: `npm run build`
3. **Root directory**: `./`
4. **Node version**: `18.x`

### **Netlify:**
1. **Connect repository** to Netlify
2. **Build command**: `npm run build`
3. **Publish directory**: `./`
4. **Node version**: `18.x`

### **Firebase (Legacy):**
```bash
firebase deploy
```

## 🛠 Troubleshooting

### **If styles are missing on deployment:**
1. **Check build logs** in Vercel/Netlify dashboard
2. **Verify CSS files** exist:
   - `dist/output.css` (4,900+ lines)
   - `styles/main.css` (855+ lines)
3. **Check browser console** for CSS loading errors
4. **CDN fallback** should provide basic styling

### **Common Issues:**
- **Build fails**: Ensure Node.js 18+ is used
- **CSS not loading**: Check file paths in HTML head
- **Fonts not loading**: Verify internet connection
- **Animations missing**: Check CSS loading order

## 📱 Mobile Optimization

- **Responsive design** - Works perfectly on all screen sizes
- **Touch-friendly interactions** - Optimized for mobile
- **Performance optimized** - Fast loading on mobile networks
- **Reduced motion support** - Respects accessibility preferences

## 🔒 Security & Performance

- **Security headers** - XSS protection, CSP headers
- **Optimized caching** - Long-term caching for static assets
- **CDN resources** - Fast global delivery
- **Error handling** - Graceful fallbacks for failed resources

## 📂 Project Structure

```
├── index.html              # Main landing page
├── src/input.css          # Tailwind CSS source
├── dist/output.css        # Built Tailwind CSS (4,900+ lines)
├── styles/main.css        # Custom animations & styles (855+ lines)
├── assets/                # Images and static assets
├── functions/             # Firebase Cloud Functions
├── build.sh               # Build script
├── tailwind.config.js     # Tailwind configuration
├── vercel.json            # Vercel deployment config
└── package.json           # Dependencies and scripts
```

---

## **🎉 Deployment Ready!**

Your site now has:
- ✅ **Robust build process** with fallbacks
- ✅ **CDN backup** for reliable styling
- ✅ **Mobile optimization** for all devices
- ✅ **Security headers** for production
- ✅ **Error handling** for failed resources

**Push to deploy and enjoy your perfectly styled website!** 🚀
