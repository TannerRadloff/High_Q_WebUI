"use client"

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface MarbleBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  withGoldAnimation?: boolean
}

export function MarbleBackground({ 
  className, 
  withGoldAnimation = true,
  children,
  ...props 
}: MarbleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!withGoldAnimation || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
    }
    
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Gold inlay animation
    const particles: { x: number; y: number; size: number; velocity: number; angle: number; opacity: number }[] = []
    
    // Create gold particles
    const createParticles = () => {
      for (let i = 0; i < 30; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 0.5 + Math.random() * 2,
          velocity: 0.05 + Math.random() * 0.1,
          angle: Math.random() * Math.PI * 2,
          opacity: 0.1 + Math.random() * 0.5
        })
      }
    }

    createParticles()

    // Animation loop
    const animate = () => {
      // Create subtle black marble effect
      ctx.fillStyle = 'rgba(20, 20, 22, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Apply subtle noise for marble texture
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        const size = Math.random() * 1
        ctx.fillStyle = `rgba(30, 30, 35, ${Math.random() * 0.03})`
        ctx.fillRect(x, y, size, size)
      }
      
      // Draw gold veins/particles
      particles.forEach(particle => {
        // Update position
        particle.x += Math.cos(particle.angle) * particle.velocity
        particle.y += Math.sin(particle.angle) * particle.velocity
        
        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0
        
        // Change direction slightly for natural flow
        particle.angle += (Math.random() - 0.5) * 0.1
        
        // Draw the gold particle
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 2
        )
        gradient.addColorStop(0, `rgba(255, 215, 0, ${particle.opacity})`)
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)')
        
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      })
      
      requestAnimationFrame(animate)
    }
    
    const animationId = requestAnimationFrame(animate)
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [withGoldAnimation])

  return (
    <div className={cn("relative overflow-hidden bg-gray-900 rounded-lg", className)} {...props}>
      {withGoldAnimation && (
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full opacity-70"
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
} 