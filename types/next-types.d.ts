declare module 'next' {
  export interface Metadata {
    metadataBase?: URL;
    title?: string;
    description?: string;
    // Add other metadata properties as needed
  }
}

declare module 'next/server' {
  export class NextRequest extends Request {
    headers: Headers;
    nextUrl: URL;
    geo?: {
      city?: string;
      country?: string;
      region?: string;
    };
    ip?: string;
    cookies: Map<string, string>;
  }

  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: { status?: number }): NextResponse;
    static rewrite(destination: string | URL, init?: { status?: number }): NextResponse;
    static next(init?: ResponseInit): NextResponse;
  }
}

declare module 'next/script' {
  import * as React from 'react';
  
  export interface ScriptProps {
    src?: string;
    strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload';
    onLoad?: () => void;
    onError?: () => void;
    onReady?: () => void;
    id?: string;
    children?: React.ReactNode;
  }
  
  const Script: React.FC<ScriptProps>;
  export default Script;
} 