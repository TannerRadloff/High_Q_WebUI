"use client"

import React from 'react'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { MarbleBackground } from '@/components/ui/marble-background'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ThemeShowcase() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="flex justify-end mb-8">
        <ModeToggle />
      </div>

      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight gold-text mb-2">
            ÆTHER<span className="text-foreground font-light">JET</span>
          </h1>
          <p className="text-muted-foreground">Luxury Private Aviation Experience</p>
        </header>

        <section className="mb-12">
          <MarbleBackground className="w-full h-[300px] flex items-center justify-center mb-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold gold-text mb-4">Unparalleled Luxury</h2>
              <p className="text-lg text-gray-300 max-w-lg mx-auto">
                Experience air travel redefined with our exclusive fleet of private jets
              </p>
              <Button variant="luxury" className="mt-6">Reserve Your Flight</Button>
            </div>
          </MarbleBackground>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="luxury-card">
            <CardHeader>
              <CardTitle className="gold-text">Premium Fleet</CardTitle>
              <CardDescription className="text-gray-400">Curated aircraft selection</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                Our fleet features the latest aviation technology with bespoke interiors designed for ultimate comfort.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="border-amber-400/30 text-amber-400 hover:bg-gray-800">View Aircraft</Button>
            </CardFooter>
          </Card>

          <Card className="luxury-card">
            <CardHeader>
              <CardTitle className="gold-text">Concierge Service</CardTitle>
              <CardDescription className="text-gray-400">24/7 dedicated attention</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                Our elite concierge team anticipates your needs before you even realize them yourself.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="border-amber-400/30 text-amber-400 hover:bg-gray-800">Meet Your Team</Button>
            </CardFooter>
          </Card>

          <Card className="luxury-card">
            <CardHeader>
              <CardTitle className="gold-text">Global Access</CardTitle>
              <CardDescription className="text-gray-400">Worldwide destinations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                Whether business or leisure, our network gives you access to private terminals around the globe.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="border-amber-400/30 text-amber-400 hover:bg-gray-800">Explore Destinations</Button>
            </CardFooter>
          </Card>
        </section>

        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Experience <span className="gold-text">Luxury</span> in Every Detail</h2>
            <p className="text-muted-foreground">From takeoff to landing, enjoy the finest aviation experience</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 p-6 rounded-lg gold-border">
              <h3 className="text-xl font-medium mb-3 gold-text">Membership Tiers</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <span>Platinum Access</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <span>Diamond Privileges</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <span>Bespoke Journeys</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg gold-border">
              <h3 className="text-xl font-medium mb-3 gold-text">Exclusive Benefits</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <span>Priority Booking</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <span>Curated In-flight Experiences</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <span>Dedicated Flight Attendants</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="text-center py-6 border-t border-gray-800">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} ÆTHERJET Luxury Aviation • Where the journey is the destination
          </p>
        </footer>
      </div>
    </div>
  )
} 