'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';

export function AnimationToggle() {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [nebulaEnabled, setNebulaEnabled] = useState(true);
  const [starsEnabled, setStarsEnabled] = useState(true);
  const [shootingStarsEnabled, setShootingStarsEnabled] = useState(true);

  useEffect(() => {
    // Initialize state based on current CSS variables
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    setAnimationsEnabled(computedStyle.getPropertyValue('--animation-play-state') !== 'paused');
    setNebulaEnabled(parseFloat(computedStyle.getPropertyValue('--nebula-opacity') || '0') > 0);
    setStarsEnabled(parseFloat(computedStyle.getPropertyValue('--stars-opacity') || '0') > 0);
    setShootingStarsEnabled(computedStyle.getPropertyValue('--shooting-stars-display') !== 'none');
    
    // Ensure animation elements exist
    ensureAnimationElementsExist();
  }, []);

  const ensureAnimationElementsExist = () => {
    // Look for the messages-background container
    const messagesBackground = document.querySelector('.messages-background');
    if (!messagesBackground) return; // If not found, exit early
    
    if (!messagesBackground.querySelector('.aurora')) {
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
      
      messagesBackground.appendChild(aurora);
    }
    
    if (!messagesBackground.querySelector('.shooting-star')) {
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
      
      messagesBackground.appendChild(shootingStar);
    }
    
    if (!messagesBackground.querySelector('.cosmic-dust')) {
      const cosmicDust = document.createElement('div');
      cosmicDust.className = 'cosmic-dust';
      messagesBackground.appendChild(cosmicDust);
    }
    
    if (!messagesBackground.querySelector('.pulsating-stars')) {
      const pulsatingStars = document.createElement('div');
      pulsatingStars.className = 'pulsating-stars';
      
      for (let i = 1; i <= 6; i++) {
        const star = document.createElement('div');
        star.className = `star star-${i}`;
        pulsatingStars.appendChild(star);
      }
      
      messagesBackground.appendChild(pulsatingStars);
    }
    
    if (!messagesBackground.querySelector('.parallax-stars')) {
      const parallaxStars = document.createElement('div');
      parallaxStars.className = 'parallax-stars';
      
      for (let i = 1; i <= 3; i++) {
        const layer = document.createElement('div');
        layer.className = `layer layer-${i}`;
        parallaxStars.appendChild(layer);
      }
      
      messagesBackground.appendChild(parallaxStars);
    }
  };

  // Helper function to find all animation elements, including those in the messages container
  const findAllAnimationElements = () => {
    // Get all animation elements, focusing on those in the messages container
    const auroras = document.querySelectorAll('.messages-background .aurora') as NodeListOf<HTMLElement>;
    const shootingStars = document.querySelectorAll('.messages-background .shooting-star') as NodeListOf<HTMLElement>;
    const cosmicDusts = document.querySelectorAll('.messages-background .cosmic-dust') as NodeListOf<HTMLElement>;
    const pulsatingStars = document.querySelectorAll('.messages-background .pulsating-stars') as NodeListOf<HTMLElement>;
    const parallaxStars = document.querySelectorAll('.messages-background .parallax-stars') as NodeListOf<HTMLElement>;
    
    return {
      auroras,
      shootingStars,
      cosmicDusts,
      pulsatingStars,
      parallaxStars
    };
  };

  const toggleAnimations = () => {
    const newState = !animationsEnabled;
    setAnimationsEnabled(newState);
    
    // Set CSS variable for animation play state
    document.documentElement.style.setProperty(
      '--animation-play-state',
      newState ? 'running' : 'paused'
    );
    
    // Toggle the messages background visibility
    const messagesBackground = document.querySelector('.messages-background') as HTMLElement | null;
    if (messagesBackground) {
      messagesBackground.style.opacity = newState ? '1' : '0';
    }
  };

  const toggleNebula = () => {
    const newState = !nebulaEnabled;
    setNebulaEnabled(newState);
    
    // Set CSS variable for nebula opacity
    document.documentElement.style.setProperty(
      '--nebula-opacity',
      newState ? '0.7' : '0'
    );
    
    // Toggle all aurora elements
    const { auroras } = findAllAnimationElements();
    auroras.forEach(aurora => {
      aurora.style.display = newState ? 'block' : 'none';
    });
    
    if (newState) {
      ensureAnimationElementsExist();
    }
  };

  const toggleStars = () => {
    const newState = !starsEnabled;
    setStarsEnabled(newState);
    
    // Set CSS variable for stars opacity
    document.documentElement.style.setProperty(
      '--stars-opacity',
      newState ? '0.7' : '0'
    );
    
    // Toggle all star-related elements
    const { pulsatingStars, parallaxStars, cosmicDusts } = findAllAnimationElements();
    
    pulsatingStars.forEach(element => {
      element.style.display = newState ? 'block' : 'none';
    });
    
    parallaxStars.forEach(element => {
      element.style.display = newState ? 'block' : 'none';
    });
    
    cosmicDusts.forEach(element => {
      element.style.display = newState ? 'block' : 'none';
    });
    
    if (newState) {
      ensureAnimationElementsExist();
    }
  };

  const toggleShootingStars = () => {
    const newState = !shootingStarsEnabled;
    setShootingStarsEnabled(newState);
    
    // Set CSS variable for shooting stars display
    document.documentElement.style.setProperty(
      '--shooting-stars-display',
      newState ? 'block' : 'none'
    );
    
    // Toggle all shooting star elements
    const { shootingStars } = findAllAnimationElements();
    shootingStars.forEach(element => {
      element.style.display = newState ? 'block' : 'none';
    });
    
    if (newState) {
      ensureAnimationElementsExist();
    }
  };

  const resetAnimations = () => {
    setAnimationsEnabled(true);
    setNebulaEnabled(true);
    setStarsEnabled(true);
    setShootingStarsEnabled(true);
    
    // Reset all CSS variables
    document.documentElement.style.setProperty('--animation-play-state', 'running');
    document.documentElement.style.setProperty('--nebula-opacity', '0.7');
    document.documentElement.style.setProperty('--stars-opacity', '0.7');
    document.documentElement.style.setProperty('--shooting-stars-display', 'block');
    
    // Ensure all animation elements exist
    ensureAnimationElementsExist();
    
    // Make sure all elements are visible
    const { auroras, shootingStars, cosmicDusts, pulsatingStars, parallaxStars } = findAllAnimationElements();
    
    auroras.forEach(element => { element.style.display = 'block'; });
    shootingStars.forEach(element => { element.style.display = 'block'; });
    cosmicDusts.forEach(element => { element.style.display = 'block'; });
    pulsatingStars.forEach(element => { element.style.display = 'block'; });
    parallaxStars.forEach(element => { element.style.display = 'block'; });
    
    // Make sure the messages background is visible
    const messagesBackground = document.querySelector('.messages-background') as HTMLElement | null;
    if (messagesBackground) {
      messagesBackground.style.opacity = '1';
    }
    
    // Force animation restart
    setTimeout(() => {
      document.documentElement.style.setProperty('--animation-play-state', 'paused');
      setTimeout(() => {
        document.documentElement.style.setProperty('--animation-play-state', 'running');
      }, 50);
    }, 100);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border shadow-lg">
      <Button
        variant="outline"
        size="sm"
        onClick={resetAnimations}
        className="w-full"
      >
        Reset Animations
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={animationsEnabled ? "default" : "outline"}
          size="sm"
          onClick={toggleAnimations}
        >
          {animationsEnabled ? "Pause" : "Play"}
        </Button>
        <Button
          variant={nebulaEnabled ? "default" : "outline"}
          size="sm"
          onClick={toggleNebula}
        >
          Nebula
        </Button>
        <Button
          variant={starsEnabled ? "default" : "outline"}
          size="sm"
          onClick={toggleStars}
        >
          Stars
        </Button>
        <Button
          variant={shootingStarsEnabled ? "default" : "outline"}
          size="sm"
          onClick={toggleShootingStars}
        >
          Shooting
        </Button>
      </div>
    </div>
  );
} 