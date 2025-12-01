#!/bin/bash
# Browser detection script for Render deployment
echo "🔍 Browser Detection Report for Render"
echo "======================================"

echo "📍 Environment:"
echo "NODE_ENV: ${NODE_ENV:-'Not set'}"
echo "PUPPETEER_EXECUTABLE_PATH: ${PUPPETEER_EXECUTABLE_PATH:-'Not set'}"
echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: ${PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:-'Not set'}"

echo ""
echo "🔍 Checking system browsers:"
for path in "/usr/bin/google-chrome-stable" "/usr/bin/google-chrome" "/usr/bin/chromium-browser" "/usr/bin/chromium"; do
  if [ -f "$path" ]; then
    echo "✅ Found: $path"
    $path --version 2>/dev/null || echo "   ⚠️  (Cannot get version)"
  else
    echo "❌ Missing: $path"
  fi
done

echo ""
echo "📁 Checking cache directories:"
for cache_dir in "/opt/render/.cache/puppeteer" "/opt/render/.cache/ms-playwright"; do
  if [ -d "$cache_dir" ]; then
    echo "✅ Found: $cache_dir"
    ls -la "$cache_dir" 2>/dev/null | head -5
  else
    echo "❌ Missing: $cache_dir"
  fi
done

echo ""
echo "🔍 Node.js and npm versions:"
node --version 2>/dev/null || echo "❌ Node.js not found"
npm --version 2>/dev/null || echo "❌ npm not found"

echo ""
echo "📦 Installed packages:"
npm list puppeteer 2>/dev/null || echo "❌ Puppeteer not installed"
npm list playwright 2>/dev/null || echo "❌ Playwright not installed"