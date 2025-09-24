#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building ALH Luxury Perfumes...');

// Build CSS (skip npm install to avoid postinstall loop)
console.log('🎨 Building Tailwind CSS...');
try {
  execSync('npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ CSS build failed!');
  console.error(error.message);
  process.exit(1);
}

// Verify build
const outputPath = './dist/output.css';
if (fs.existsSync(outputPath)) {
  const stats = fs.statSync(outputPath);
  console.log('✅ CSS build successful!');
  console.log(`📊 Build size: ${stats.size} bytes`);
} else {
  console.error('❌ CSS build failed!');
  process.exit(1);
}

// Check if styles directory exists
const stylesPath = './styles';
if (fs.existsSync(stylesPath)) {
  console.log('✅ Styles directory found');
} else {
  console.error('❌ Styles directory missing!');
  process.exit(1);
}

// Check if main.css exists in styles
const mainCssPath = './styles/main.css';
if (fs.existsSync(mainCssPath)) {
  const stats = fs.statSync(mainCssPath);
  console.log(`✅ Custom styles found: ${stats.size} bytes`);
} else {
  console.error('❌ Custom styles missing!');
  process.exit(1);
}

console.log('🎉 Build completed successfully!');
console.log('Ready for deployment! 🚀');
