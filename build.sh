#!/bin/bash

# Build script for ALH Luxury Perfumes
echo "🚀 Building ALH Luxury Perfumes..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build CSS
echo "🎨 Building Tailwind CSS..."
npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify

# Verify build
if [ -f "./dist/output.css" ]; then
    echo "✅ CSS build successful!"
    echo "📊 Build size: $(wc -c < ./dist/output.css) bytes"
else
    echo "❌ CSS build failed!"
    exit 1
fi

# Check if styles directory exists
if [ -d "./styles" ]; then
    echo "✅ Styles directory found"
else
    echo "❌ Styles directory missing!"
    exit 1
fi

echo "🎉 Build completed successfully!"
echo "Ready for deployment! 🚀"
