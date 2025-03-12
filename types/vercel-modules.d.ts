declare module '@vercel/analytics/react' {
  import * as React from 'react';
  
  export interface AnalyticsProps {
    beforeSend?: (event: any) => any | false;
    debug?: boolean;
    mode?: 'auto' | 'production' | 'development';
  }
  
  export const Analytics: React.FC<AnalyticsProps>;
}

declare module '@vercel/speed-insights/next' {
  import * as React from 'react';
  
  export interface SpeedInsightsProps {
    sampleRate?: number;
    debug?: boolean;
  }
  
  export const SpeedInsights: React.FC<SpeedInsightsProps>;
} 