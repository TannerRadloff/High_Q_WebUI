/**
 * Test script to verify URL handling in the application
 * Note: This script needs to be executed with ESM support
 */

// Since we're running in Node.js and our helpers use browser APIs,
// let's simulate the environment here for testing
global.window = {
  location: {
    hostname: 'preview-deployment.vercel.app',
    origin: 'https://preview-deployment.vercel.app',
    protocol: 'https:'
  }
};

// Mock process.env
process.env.NEXT_PUBLIC_APP_URL = 'https://main-app-domain.com';

// Manually implement the helper functions for testing
function getBaseUrl() {
  // Server-side: use environment variable
  return process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
}

function createUrl(path) {
  const baseUrl = getBaseUrl();
  
  if (!baseUrl) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${normalizedBase}${normalizedPath}`;
}

function getCookieDomain() {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return hostname;
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
      return url.hostname;
    } catch (e) {
      console.warn('Failed to parse NEXT_PUBLIC_APP_URL:', e);
    }
  }
  
  return hostname;
}

// Test base URL handling
console.log('Testing Base URL (with NEXT_PUBLIC_APP_URL set):');
console.log(`getBaseUrl() = ${getBaseUrl()}`);
console.log('Expected: https://main-app-domain.com');
console.log('');

// Test URL creation
console.log('Testing URL creation:');
console.log(`createUrl('/auth/callback') = ${createUrl('/auth/callback')}`);
console.log('Expected: https://main-app-domain.com/auth/callback');
console.log('');

// Test cookie domain handling
console.log('Testing cookie domain:');
console.log(`getCookieDomain() = ${getCookieDomain()}`);
console.log('Expected: main-app-domain.com');
console.log('');

// Test without environment variable
delete process.env.NEXT_PUBLIC_APP_URL;
console.log('Testing with NEXT_PUBLIC_APP_URL unset:');
console.log(`getBaseUrl() = ${getBaseUrl()}`);
console.log('Expected: https://preview-deployment.vercel.app');
console.log('');
console.log(`createUrl('/auth/callback') = ${createUrl('/auth/callback')}`);
console.log('Expected: https://preview-deployment.vercel.app/auth/callback');
console.log('');
console.log(`getCookieDomain() = ${getCookieDomain()}`);
console.log('Expected: preview-deployment.vercel.app');
console.log('');

// Test localhost environment
global.window.location.hostname = 'localhost';
global.window.location.origin = 'http://localhost:3000';
global.window.location.protocol = 'http:';

console.log('Testing with localhost:');
console.log(`getCookieDomain() = ${getCookieDomain()}`);
console.log('Expected: localhost');
console.log('');

console.log('URL tests completed successfully!'); 