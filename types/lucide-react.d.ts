declare module 'lucide-react' {
  import * as React from 'react';
  
  export interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  }
  
  export type LucideIcon = React.ComponentType<IconProps>;
  
  export const Send: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Search: LucideIcon;
  export const FileText: LucideIcon;
  export const Loader2: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const Check: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Circle: LucideIcon;
  // Add any other icons used in your project
  
  // Default export if needed
  const Icons: Record<string, LucideIcon>;
  export default Icons;
} 