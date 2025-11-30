// Quick Auth0 Token Debugger
// Add this to browser console to debug token issues

async function debugAuth0Token() {
  console.log('🔍 AUTH0 TOKEN DEBUG');
  console.log('==================');
  
  // Check if Auth0 is available
  if (typeof window.auth0 === 'undefined') {
    console.log('❌ Auth0 not available globally');
    return;
  }
  
  try {
    // Get token with debugging
    const token = await window.auth0.getAccessTokenSilently({
      detailedResponse: true,
      scope: "openid profile email"
    });
    
    console.log('✅ Raw token response:', token);
    
    // Decode JWT payload
    if (token.access_token) {
      const payload = JSON.parse(atob(token.access_token.split('.')[1]));
      console.log('🔓 Decoded token payload:', payload);
      
      console.log('📋 Claims check:');
      console.log('- sub (user ID):', payload.sub || '❌ MISSING');
      console.log('- email:', payload.email || '❌ MISSING');
      console.log('- aud (audience):', payload.aud || '❌ MISSING');
      console.log('- iss (issuer):', payload.iss || '❌ MISSING');
      console.log('- scope:', payload.scope || '❌ MISSING');
      
      // Check if audience matches expected
      const expectedAudience = process.env.REACT_APP_AUTH0_AUDIENCE;
      console.log('🎯 Audience check:');
      console.log('- Expected:', expectedAudience);
      console.log('- Actual:', payload.aud);
      console.log('- Match:', payload.aud === expectedAudience ? '✅' : '❌');
    }
    
  } catch (error) {
    console.error('❌ Token generation failed:', error);
    console.log('Error details:', {
      name: error.name,
      message: error.message,
      error_description: error.error_description
    });
  }
}

// Auto-run if Auth0 is available
if (typeof window !== 'undefined') {
  window.debugAuth0Token = debugAuth0Token;
  console.log('🛠️ Run debugAuth0Token() in console to debug Auth0 tokens');
}