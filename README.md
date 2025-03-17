# Minimal Next.js Application

This is a stripped-down Next.js application with only the essential components. It provides a clean starting point for building Next.js applications without unnecessary complexity.

## Project Structure

```
├── app/                  # Next.js App Router
│   ├── api/              # API routes
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
│   └── ui/               # UI components
│       └── button.tsx    # Button component
├── lib/                  # Utility functions and shared code
│   └── utils/            # Utility functions
│       └── cn.ts         # Class name utility
├── public/               # Static assets
│   └── favicon.ico       # Favicon
├── next.config.js        # Next.js configuration
├── package.json          # Project dependencies
├── postcss.config.mjs    # PostCSS configuration
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
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
- Minimal UI components
- Clean project structure 