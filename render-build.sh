# Render build script
echo "🚀 Starting Render build process..."

# Install dependencies first
echo "📦 Installing npm dependencies..."
npm install

# Create necessary directories
echo "📁 Creating cache directories..."
mkdir -p /opt/render/.cache/puppeteer
mkdir -p /opt/render/.cache/ms-playwright

# Install browsers with specific timeout and error handling
echo "🌐 Installing Puppeteer Chrome..."
timeout 300 npx puppeteer browsers install chrome || echo "Puppeteer Chrome installation timed out or failed"

echo "🌐 Installing Playwright Chromium..."
timeout 300 npx playwright install chromium || echo "Playwright Chromium installation timed out or failed"

# Try system Chrome as backup
echo "🔧 Installing system Chrome as fallback..."
apt-get update && apt-get install -y google-chrome-stable || apt-get install -y chromium-browser || echo "System Chrome installation failed"

# Verify installations
echo "🔍 Verifying browser installations..."
ls -la /opt/render/.cache/puppeteer/ || echo "Puppeteer cache not found"
ls -la /opt/render/.cache/ms-playwright/ || echo "Playwright cache not found"
which google-chrome-stable || which chromium-browser || echo "No system Chrome found"

echo "✅ Build process completed"