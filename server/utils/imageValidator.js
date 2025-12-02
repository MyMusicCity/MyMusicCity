const axios = require('axios');

// Validate if URL is a proper image
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return false;
  }
  
  // Check for image file extensions (more flexible pattern)
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)([?#].*)?$/i;
  if (!imageExtensions.test(url)) return false;
  
  // Avoid obvious placeholder/generic images
  const genericPatterns = [
    /placeholder/i,
    /generic/i,
    /default/i,
    /no-image/i,
    /1x1\.png/,
    /blank\./,
    /spacer\./,
    /transparent\./
  ];
  
  if (genericPatterns.some(pattern => pattern.test(url))) return false;
  
  return true;
}

// Validate image quality by checking headers
async function validateImageQuality(url) {
  try {
    const response = await axios.head(url, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const contentLength = parseInt(response.headers['content-length'] || '0');
    const contentType = response.headers['content-type'] || '';
    
    const isValid = contentType.startsWith('image/') && contentLength > 5000; // At least 5KB
    const quality = contentLength > 100000 ? 'high' : contentLength > 30000 ? 'medium' : 'low';
    
    return {
      isValid,
      size: contentLength,
      type: contentType,
      quality,
      dimensions: extractDimensionsFromUrl(url)
    };
  } catch (error) {
    return { isValid: false, quality: 'invalid', error: error.message };
  }
}

// Extract dimensions from URL if available
function extractDimensionsFromUrl(url) {
  const dimensionMatch = url.match(/[&?]w=(\d+).*[&?]h=(\d+)/i) || url.match(/(\d+)x(\d+)/);
  if (dimensionMatch) {
    return {
      width: parseInt(dimensionMatch[1]),
      height: parseInt(dimensionMatch[2])
    };
  }
  return null;
}

// Get high-resolution version of image URL if possible
function getHighResVersion(imgSrc) {
  if (!imgSrc) return null;
  
  return imgSrc
    .replace('_thumb', '')
    .replace('_small', '_large')
    .replace('/small/', '/large/')
    .replace('/thumb/', '/full/')
    .replace('w=150', 'w=800')
    .replace('h=150', 'h=600')
    .replace('w=200', 'w=800')
    .replace('h=200', 'h=600')
    .replace('w=300', 'w=800')
    .replace('h=300', 'h=600');
}

module.exports = {
  isValidImageUrl,
  validateImageQuality,
  getHighResVersion,
  extractDimensionsFromUrl
};