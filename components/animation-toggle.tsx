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
    setNebulaEnabled(parseFloat(computedStyle.getPropertyValue('--nebula-opacity')) > 0);
    setStarsEnabled(parseFloat(computedStyle.getPropertyValue('--stars-opacity')) > 0);
    setShootingStarsEnabled(computedStyle.getPropertyValue('--shooting-stars-display') !== 'none');
  }, []);

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
      newState ? '0.4' : '0'
    );
  };

  const toggleStars = () => {
    const newState = !starsEnabled;
    setStarsEnabled(newState);
    document.documentElement.style.setProperty(
      '--stars-opacity',
      newState ? '0.3' : '0'
    );
  };

  const toggleShootingStars = () => {
    const newState = !shootingStarsEnabled;
    setShootingStarsEnabled(newState);
    document.documentElement.style.setProperty(
      '--shooting-stars-display',
      newState ? 'block' : 'none'
    );
  };

  const resetAnimations = () => {
    setAnimationsEnabled(true);
    setNebulaEnabled(true);
    setStarsEnabled(true);
    setShootingStarsEnabled(true);
    
    document.documentElement.style.setProperty('--animation-play-state', 'running');
    document.documentElement.style.setProperty('--nebula-opacity', '0.4');
    document.documentElement.style.setProperty('--stars-opacity', '0.3');
    document.documentElement.style.setProperty('--shooting-stars-display', 'block');
    
    // Force animation restart
    setTimeout(() => {
      document.documentElement.style.setProperty('--animation-play-state', 'paused');
      setTimeout(() => {
        document.documentElement.style.setProperty('--animation-play-state', 'running');
      }, 50);
    }, 100);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
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