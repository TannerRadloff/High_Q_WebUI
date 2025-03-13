import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  return (
    <nav className="flex items-center space-x-4 py-2">
      <Link href="/" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
        Chat
      </Link>
      
      <Link href="/agent-mode" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/agent-mode') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
        Agent Mode
      </Link>
    </nav>
  );
} 

