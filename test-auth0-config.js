#!/usr/bin/env node

console.log('🔍 AUTH0 CONFIGURATION TEST');
console.log('=============================');

// Test environment variables
console.log('\n📋 Environment Variables:');
console.log('REACT_APP_AUTH0_DOMAIN:', process.env.REACT_APP_AUTH0_DOMAIN || '❌ NOT SET');
console.log('REACT_APP_AUTH0_CLIENT_ID:', process.env.REACT_APP_AUTH0_CLIENT_ID || '❌ NOT SET');
console.log('REACT_APP_AUTH0_AUDIENCE:', process.env.REACT_APP_AUTH0_AUDIENCE || '❌ NOT SET');

console.log('\nServer-side:');
console.log('AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN || '❌ NOT SET');
console.log('AUTH0_AUDIENCE:', process.env.AUTH0_AUDIENCE || '❌ NOT SET');

// Test file configurations
const fs = require('fs');

console.log('\n📁 File Configurations:');

try {
  const indexJs = fs.readFileSync('./client/src/index.js', 'utf8');
  console.log('✅ client/src/index.js exists');
  
  if (indexJs.includes('audience &&')) {
    console.log('✅ Audience undefined handling: FIXED');
  } else {
    console.log('❌ Audience undefined handling: MISSING');
  }
  
  if (indexJs.includes('console.log')) {
    console.log('✅ Debugging enabled: YES');
  }
} catch (e) {
  console.log('❌ Cannot read client/src/index.js');
}

try {
  const authContext = fs.readFileSync('./client/src/AuthContext.jsx', 'utf8');
  if (authContext.includes('detailedResponse: true')) {
    console.log('✅ AuthContext debugging: ENABLED');
  } else {
    console.log('⚠️  AuthContext debugging: LIMITED');
  }
} catch (e) {
  console.log('❌ Cannot read AuthContext.jsx');
}

console.log('\n🎯 NEXT STEPS:');
console.log('1. Deploy these changes to see debugging output in browser console');
console.log('2. Check browser console for "Auth0 Configuration Check" messages');  
console.log('3. Look for token generation errors');
console.log('4. Verify environment variables are set in production');

console.log('\n🚀 This should reveal the EXACT point where Auth0 fails!');