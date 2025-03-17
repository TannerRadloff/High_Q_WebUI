# Barebones Next.js Application

This is an ultra-minimal Next.js application with only the absolute essentials needed to get started.

## Project Structure

```
├── app/                  # Next.js App Router
│   ├── globals.css      # Global styles (Tailwind imports)
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── public/              # Static assets
│   └── favicon.ico      # Favicon
├── next.config.js       # Next.js configuration
├── package.json         # Project dependencies
├── postcss.config.mjs   # PostCSS configuration
├── tailwind.config.ts   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Next.js App Router
- TypeScript
- Tailwind CSS
- Absolute minimum configuration
- Zero unnecessary components or utilities 