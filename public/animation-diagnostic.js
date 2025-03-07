// Animation Diagnostic Script
// This script checks the current state of animation variables and elements

function checkAnimationState() {
  console.group('Animation Diagnostic Results');
  
  // Check CSS Variables
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  console.log('CSS Variables:');
  console.log('--animation-play-state:', computedStyle.getPropertyValue('--animation-play-state'));
  console.log('--nebula-opacity:', computedStyle.getPropertyValue('--nebula-opacity'));
  console.log('--stars-opacity:', computedStyle.getPropertyValue('--stars-opacity'));
  console.log('--shooting-stars-display:', computedStyle.getPropertyValue('--shooting-stars-display'));
  
  // Check Animation Elements
  console.log('\nAnimation Elements:');
  
  const aurora = document.querySelector('.aurora');
  console.log('Aurora element exists:', !!aurora);
  if (aurora) {
    console.log('Aurora visibility:', getComputedStyle(aurora).display !== 'none');
    console.log('Aurora children count:', aurora.children.length);
  }
  
  const shootingStar = document.querySelector('.shooting-star');
  console.log('Shooting star element exists:', !!shootingStar);
  if (shootingStar) {
    console.log('Shooting star visibility:', getComputedStyle(shootingStar).display !== 'none');
    console.log('Shooting star children count:', shootingStar.children.length);
  }
  
  const cosmicDust = document.querySelector('.cosmic-dust');
  console.log('Cosmic dust element exists:', !!cosmicDust);
  if (cosmicDust) {
    console.log('Cosmic dust visibility:', getComputedStyle(cosmicDust).display !== 'none');
  }
  
  const pulsatingStars = document.querySelector('.pulsating-stars');
  console.log('Pulsating stars element exists:', !!pulsatingStars);
  if (pulsatingStars) {
    console.log('Pulsating stars visibility:', getComputedStyle(pulsatingStars).display !== 'none');
    console.log('Pulsating stars children count:', pulsatingStars.children.length);
  }
  
  const parallaxStars = document.querySelector('.parallax-stars');
  console.log('Parallax stars element exists:', !!parallaxStars);
  if (parallaxStars) {
    console.log('Parallax stars visibility:', getComputedStyle(parallaxStars).display !== 'none');
    console.log('Parallax stars children count:', parallaxStars.children.length);
  }
  
  // Check body pseudo-elements (indirectly)
  console.log('\nBody Pseudo-elements:');
  const bodyStyle = getComputedStyle(document.body);
  console.log('Body has background-image:', bodyStyle.backgroundImage !== 'none');
  
  // Check animation toggle
  const animationToggle = document.querySelector('.fixed.bottom-4.right-4');
  console.log('\nAnimation Toggle:');
  console.log('Animation toggle exists:', !!animationToggle);
  
  console.groupEnd();
  
  return {
    cssVars: {
      animationPlayState: computedStyle.getPropertyValue('--animation-play-state'),
      nebulaOpacity: computedStyle.getPropertyValue('--nebula-opacity'),
      starsOpacity: computedStyle.getPropertyValue('--stars-opacity'),
      shootingStarsDisplay: computedStyle.getPropertyValue('--shooting-stars-display')
    },
    elements: {
      aurora: !!aurora,
      shootingStar: !!shootingStar,
      cosmicDust: !!cosmicDust,
      pulsatingStars: !!pulsatingStars,
      parallaxStars: !!parallaxStars
    }
  };
}

// Run the diagnostic
const diagnosticResults = checkAnimationState();

// Fix animation issues
function fixAnimations() {
  console.log('Attempting to fix animations...');
  
  // Set animation variables
  document.documentElement.style.setProperty('--animation-play-state', 'running');
  document.documentElement.style.setProperty('--nebula-opacity', '0.7');
  document.documentElement.style.setProperty('--stars-opacity', '0.7');
  document.documentElement.style.setProperty('--shooting-stars-display', 'block');
  
  // Force animation restart
  setTimeout(function() {
    document.documentElement.style.setProperty('--animation-play-state', 'paused');
    setTimeout(function() {
      document.documentElement.style.setProperty('--animation-play-state', 'running');
    }, 50);
  }, 100);
  
  // Check if animation elements exist, if not, create them
  const body = document.body;
  
  if (!document.querySelector('.aurora')) {
    const aurora = document.createElement('div');
    aurora.className = 'aurora';
    
    const light1 = document.createElement('div');
    light1.className = 'light';
    
    const light2 = document.createElement('div');
    light2.className = 'light light-2';
    
    const light3 = document.createElement('div');
    light3.className = 'light light-3';
    
    aurora.appendChild(light1);
    aurora.appendChild(light2);
    aurora.appendChild(light3);
    
    body.prepend(aurora);
  }
  
  if (!document.querySelector('.shooting-star')) {
    const shootingStar = document.createElement('div');
    shootingStar.className = 'shooting-star';
    
    const star1 = document.createElement('div');
    star1.className = 'star-1';
    
    const star2 = document.createElement('div');
    star2.className = 'star-2';
    
    const star3 = document.createElement('div');
    star3.className = 'star-3';
    
    shootingStar.appendChild(star1);
    shootingStar.appendChild(star2);
    shootingStar.appendChild(star3);
    
    body.prepend(shootingStar);
  }
  
  if (!document.querySelector('.cosmic-dust')) {
    const cosmicDust = document.createElement('div');
    cosmicDust.className = 'cosmic-dust';
    body.prepend(cosmicDust);
  }
  
  if (!document.querySelector('.pulsating-stars')) {
    const pulsatingStars = document.createElement('div');
    pulsatingStars.className = 'pulsating-stars';
    
    for (let i = 1; i <= 6; i++) {
      const star = document.createElement('div');
      star.className = `star star-${i}`;
      pulsatingStars.appendChild(star);
    }
    
    body.prepend(pulsatingStars);
  }
  
  if (!document.querySelector('.parallax-stars')) {
    const parallaxStars = document.createElement('div');
    parallaxStars.className = 'parallax-stars';
    
    for (let i = 1; i <= 3; i++) {
      const layer = document.createElement('div');
      layer.className = `layer layer-${i}`;
      parallaxStars.appendChild(layer);
    }
    
    body.prepend(parallaxStars);
  }
  
  console.log('Animation fix applied. Rerunning diagnostic...');
  return checkAnimationState();
}

// Expose functions to global scope for console access
window.checkAnimationState = checkAnimationState;
window.fixAnimations = fixAnimations;
window.diagnosticResults = diagnosticResults;

console.log('Animation diagnostic script loaded. Run window.fixAnimations() to attempt to fix animation issues.'); 