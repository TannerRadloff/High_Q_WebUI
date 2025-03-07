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
  };

  const toggleAnimations = () => {
    const newState = !animationsEnabled;
    setAnimationsEnabled(newState);
    document.documentElement.style.setProperty(
      '--animation-play-state',
      newState ? 'running' : 'paused'
    );
  };

  const toggleNebula = () => {
    const newState = !nebulaEnabled;
    setNebulaEnabled(newState);
    document.documentElement.style.setProperty(
      '--nebula-opacity',
      newState ? '0.7' : '0'
    );
    
    // Ensure the aurora element exists and is visible
    const aurora = document.querySelector('.aurora') as HTMLElement | null;
    if (aurora) {
      aurora.style.display = newState ? 'block' : 'none';
    } else if (newState) {
      ensureAnimationElementsExist();
    }
  };

  const toggleStars = () => {
    const newState = !starsEnabled;
    setStarsEnabled(newState);
    document.documentElement.style.setProperty(
      '--stars-opacity',
      newState ? '0.7' : '0'
    );
    
    // Ensure the stars elements exist and are visible
    const pulsatingStars = document.querySelector('.pulsating-stars') as HTMLElement | null;
    const parallaxStars = document.querySelector('.parallax-stars') as HTMLElement | null;
    
    if (pulsatingStars) {
      pulsatingStars.style.display = newState ? 'block' : 'none';
    }
    
    if (parallaxStars) {
      parallaxStars.style.display = newState ? 'block' : 'none';
    }
    
    if (newState && (!pulsatingStars || !parallaxStars)) {
      ensureAnimationElementsExist();
    }
  };

  const toggleShootingStars = () => {
    const newState = !shootingStarsEnabled;
    setShootingStarsEnabled(newState);
    document.documentElement.style.setProperty(
      '--shooting-stars-display',
      newState ? 'block' : 'none'
    );
    
    // Ensure the shooting star element exists and is visible
    const shootingStar = document.querySelector('.shooting-star') as HTMLElement | null;
    if (shootingStar) {
      shootingStar.style.display = newState ? 'block' : 'none';
    } else if (newState) {
      ensureAnimationElementsExist();
    }
  };

  const resetAnimations = () => {
    setAnimationsEnabled(true);
    setNebulaEnabled(true);
    setStarsEnabled(true);
    setShootingStarsEnabled(true);
    
    document.documentElement.style.setProperty('--animation-play-state', 'running');
    document.documentElement.style.setProperty('--nebula-opacity', '0.7');
    document.documentElement.style.setProperty('--stars-opacity', '0.7');
    document.documentElement.style.setProperty('--shooting-stars-display', 'block');
    
    // Ensure all animation elements exist
    ensureAnimationElementsExist();
    
    // Make sure all elements are visible
    const aurora = document.querySelector('.aurora') as HTMLElement | null;
    const shootingStar = document.querySelector('.shooting-star') as HTMLElement | null;
    const cosmicDust = document.querySelector('.cosmic-dust') as HTMLElement | null;
    const pulsatingStars = document.querySelector('.pulsating-stars') as HTMLElement | null;
    const parallaxStars = document.querySelector('.parallax-stars') as HTMLElement | null;
    
    if (aurora) aurora.style.display = 'block';
    if (shootingStar) shootingStar.style.display = 'block';
    if (cosmicDust) cosmicDust.style.display = 'block';
    if (pulsatingStars) pulsatingStars.style.display = 'block';
    if (parallaxStars) parallaxStars.style.display = 'block';
    
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