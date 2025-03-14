'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import type { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { memo, useRef, useState, useEffect } from 'react';
import { ArrowUpIcon } from './icons';

interface SuggestedActionsProps {
  chatId: string;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
}

function PureSuggestedActions({ chatId, append }: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'What are the advantages',
      label: 'of using Next.js?',
      action: 'What are the advantages of using Next.js?',
    },
    {
      title: 'Write code to',
      label: `demonstrate djikstra's algorithm`,
      action: `Write code to demonstrate djikstra's algorithm`,
    },
    {
      title: 'Help me write an essay',
      label: `about silicon valley`,
      action: `Help me write an essay about silicon valley`,
    },
    {
      title: 'What is the weather',
      label: 'in San Francisco?',
      action: 'What is the weather in San Francisco?',
    },
  ];

  const carouselRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const checkArrows = () => {
    if (carouselRef.current) {
      setShowLeftArrow(carouselRef.current.scrollLeft > 20);
      setShowRightArrow(
        carouselRef.current.scrollLeft < 
        carouselRef.current.scrollWidth - carouselRef.current.clientWidth - 20
      );
    }
  };

  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', checkArrows);
      // Initial check
      checkArrows();
      
      return () => {
        carousel.removeEventListener('scroll', checkArrows);
      };
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 200; // Adjust as needed
      const newScrollLeft = direction === 'left' 
        ? carouselRef.current.scrollLeft - scrollAmount 
        : carouselRef.current.scrollLeft + scrollAmount;
      
      carouselRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (carouselRef.current) {
      setIsDragging(true);
      setStartX(e.pageX - carouselRef.current.offsetLeft);
      setScrollLeft(carouselRef.current.scrollLeft);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Adjust scrolling speed
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="relative w-full">
      {/* Left scroll button */}
      {showLeftArrow && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-md rounded-full p-1 shadow-md border border-border/50 text-primary"
          onClick={() => scroll('left')}
        >
          <div style={{ transform: 'rotate(-90deg)' }}>
            <ArrowUpIcon size={16} />
          </div>
        </motion.button>
      )}

      {/* Carousel container */}
      <div 
        ref={carouselRef}
        role="region"
        aria-label="Suggested actions carousel"
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-2 p-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {suggestedActions.map((suggestedAction, index) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * index, duration: 0.2 }}
            key={`suggested-action-${suggestedAction.title}-${index}`}
            className="snap-start shrink-0 min-w-[200px] sm:min-w-[220px]"
          >
            <Button
              variant="ghost"
              onClick={async () => {
                window.history.replaceState({}, '', `/chat/${chatId}`);

                append({
                  role: 'user',
                  content: suggestedAction.action,
                });
              }}
              className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 flex-col w-full h-auto justify-start items-start bg-background/80 backdrop-blur-md hover:bg-primary/20 hover:border-primary/50 transition-all duration-200 hover:shadow-[0_0_15px_rgba(0,150,255,0.3)] shadow-sm"
            >
              <span className="font-medium text-foreground">{suggestedAction.title}</span>
              <span className="text-muted-foreground text-xs">
                {suggestedAction.label}
              </span>
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Right scroll button */}
      {showRightArrow && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-md rounded-full p-1 shadow-md border border-border/50 text-primary"
          onClick={() => scroll('right')}
        >
          <div style={{ transform: 'rotate(90deg)' }}>
            <ArrowUpIcon size={16} />
          </div>
        </motion.button>
      )}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
