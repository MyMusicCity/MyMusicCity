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

echo "🌐 Installing Playwright browsers..."
timeout 300 npx playwright install --with-deps chromium || echo "Playwright installation failed, trying without deps..."
timeout 300 npx playwright install chromium || echo "Playwright Chromium installation timed out or failed"

# Alternative Playwright installation
echo "🔄 Alternative Playwright installation..."
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false npx playwright install chromium || echo "Alternative Playwright installation failed"

# Install system Chrome as primary option
echo "🔧 Installing system Chrome..."
echo "📦 Updating package lists..."
apt-get update

# Try Google Chrome first
echo "📥 Installing Google Chrome..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - || echo "Chrome key failed"
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
apt-get update
apt-get install -y google-chrome-stable || {
  echo "❌ Google Chrome installation failed, trying Chromium..."
  apt-get install -y chromium-browser || echo "❌ Chromium installation also failed"
}

# Set executable path based on what was installed
if [ -f "/usr/bin/google-chrome-stable" ]; then
  echo "✅ Google Chrome installed at /usr/bin/google-chrome-stable"
  export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
elif [ -f "/usr/bin/google-chrome" ]; then
  echo "✅ Google Chrome installed at /usr/bin/google-chrome"
  export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
elif [ -f "/usr/bin/chromium-browser" ]; then
  echo "✅ Chromium installed at /usr/bin/chromium-browser"
  export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
else
  echo "⚠️ No system Chrome found, will use bundled Chromium"
  unset PUPPETEER_EXECUTABLE_PATH
fi

# Verify installations and show available browsers
echo "🔍 Verifying browser installations..."
echo "📁 Checking cache directories..."
ls -la /opt/render/.cache/puppeteer/ 2>/dev/null || echo "Puppeteer cache not found"
ls -la /opt/render/.cache/ms-playwright/ 2>/dev/null || echo "Playwright cache not found"

echo "🔍 Checking system browsers..."
for browser_path in "/usr/bin/google-chrome-stable" "/usr/bin/google-chrome" "/usr/bin/chromium-browser" "/usr/bin/chromium"; do
  if [ -f "$browser_path" ]; then
    echo "✅ Found browser: $browser_path"
    $browser_path --version 2>/dev/null || echo "⚠️  Browser found but version check failed"
  else
    echo "❌ Not found: $browser_path"
  fi
done

echo "🔍 Final environment check..."
echo "PUPPETEER_EXECUTABLE_PATH: ${PUPPETEER_EXECUTABLE_PATH:-'Not set (will use bundled)'}"
echo "NODE_ENV: ${NODE_ENV:-'Not set'}"

echo "✅ Build process completed"