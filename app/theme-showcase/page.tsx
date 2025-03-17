"use client"

import React, { useRef, useEffect } from 'react'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { MarbleBackground } from '@/components/ui/marble-background'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useScrollReveal, useMagneticEffect, useParallaxEffect } from "@/lib/hooks/useAnimations"

export default function ThemeShowcase() {
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  useScrollReveal()
  useMagneticEffect(buttonRef)
  useParallaxEffect()

  return (
    <div className="min-h-screen marble-bg theme-transition">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-end mb-8">
          <ModeToggle />
        </div>
        
        <section className="reveal">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 gold-text gold-shimmer">
            Luxury Experience
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-300">
            Discover the perfect blend of elegance and innovation
          </p>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 my-16">
          <div className="reveal glass-card p-6">
            <h3 className="text-2xl font-semibold mb-4 gold-text">Premium Design</h3>
            <p className="text-gray-300">Crafted with attention to every detail</p>
          </div>
          
          <div className="reveal glass-card p-6 delay-100">
            <h3 className="text-2xl font-semibold mb-4 gold-text">Exclusive Features</h3>
            <p className="text-gray-300">Tailored for discerning clients</p>
          </div>
          
          <div className="reveal glass-card p-6 delay-200">
            <h3 className="text-2xl font-semibold mb-4 gold-text">Bespoke Service</h3>
            <p className="text-gray-300">Personalized to your preferences</p>
          </div>
        </section>

        <section className="reveal text-center my-16">
          <div className="magnetic-wrap inline-block">
            <div className="magnetic-area" />
            <Button 
              ref={buttonRef}
              variant="luxury" 
              className="text-lg px-8 py-6"
            >
              Experience Luxury
            </Button>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-12 my-16">
          <div className="reveal">
            <div className="luxury-card p-8">
              <h3 className="text-2xl font-semibold mb-4 gold-text">Private Aviation</h3>
              <p className="text-gray-300 mb-6">
                Experience the ultimate in luxury travel with our private jet services.
                Tailored to your schedule, with unparalleled comfort and privacy.
              </p>
              <Button variant="luxury" className="mt-4">Reserve Your Flight</Button>
            </div>
          </div>

          <div className="reveal delay-100">
            <div className="luxury-card p-8">
              <h3 className="text-2xl font-semibold mb-4 gold-text">Concierge Service</h3>
              <p className="text-gray-300 mb-6">
                Our dedicated team ensures every detail of your journey is perfect,
                from departure to arrival and beyond.
              </p>
              <Button variant="luxury" className="mt-4">Contact Concierge</Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
} 