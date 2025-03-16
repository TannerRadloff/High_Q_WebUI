'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TodoNav() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  return (
    <nav className="bg-white shadow mb-6">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600">Todo App</span>
            </div>
            <div className="ml-6 flex space-x-4">
              <Link 
                href="/todos"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/todos') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Main
              </Link>
              <Link 
                href="/todos/example"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/todos/example') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Example
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <Link 
              href="/"
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 