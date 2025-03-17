'use client';

import { useEffect, useRef } from 'react';

export const useScrollReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);
};

export const useMagneticEffect = <T extends HTMLElement>(ref: React.RefObject<T | null>) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      const { left, top, width, height } = element.getBoundingClientRect();
      const x = mouseEvent.clientX - left;
      const y = mouseEvent.clientY - top;
      
      const centerX = width / 2;
      const centerY = height / 2;
      
      const deltaX = x - centerX;
      const deltaY = y - centerY;
      
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
      const maxDistance = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
      const strength = Math.min(distance / maxDistance, 1);
      
      const translateX = deltaX * strength * 0.2;
      const translateY = deltaY * strength * 0.2;
      
      element.style.transform = `translate(${translateX}px, ${translateY}px)`;
    };

    const handleMouseLeave = () => {
      element.style.transform = 'translate(0, 0)';
    };

    const area = element.querySelector('.magnetic-area');
    if (area) {
      area.addEventListener('mousemove', handleMouseMove as EventListener);
      area.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (area) {
        area.removeEventListener('mousemove', handleMouseMove as EventListener);
        area.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [ref]);
};

export const useParallaxEffect = () => {
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      document.querySelectorAll('.marble-bg').forEach((element) => {
        const speed = 0.5;
        const yPos = -(scrolled * speed);
        (element as HTMLElement).style.backgroundPositionY = yPos + 'px';
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}; 