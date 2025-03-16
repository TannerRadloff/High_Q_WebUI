/**
 * Centralized Icon Exports
 * 
 * This file exports all icons used throughout the application.
 * It consolidates icons from multiple sources:
 * 1. Custom SVG icons
 * 2. Re-exports from third-party libraries
 */

// Import icons from Lucide React
import CopyIcon from 'lucide-react/dist/esm/icons/copy';
import XIcon from 'lucide-react/dist/esm/icons/x';
import MenuIcon from 'lucide-react/dist/esm/icons/menu';
import MailIcon from 'lucide-react/dist/esm/icons/mail';
import TrashIcon from 'lucide-react/dist/esm/icons/trash';
import PlusIcon from 'lucide-react/dist/esm/icons/plus';
import SendIcon from 'lucide-react/dist/esm/icons/send';
import SearchIcon from 'lucide-react/dist/esm/icons/search';
import EditIcon from 'lucide-react/dist/esm/icons/edit';
import MoreHorizontalIcon from 'lucide-react/dist/esm/icons/more-horizontal';
import ChevronRightIcon from 'lucide-react/dist/esm/icons/chevron-right';
import ChevronLeftIcon from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronDownIcon from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUpIcon from 'lucide-react/dist/esm/icons/chevron-up';
import SparklesIcon from 'lucide-react/dist/esm/icons/sparkles';
import BotIcon from 'lucide-react/dist/esm/icons/bot';
import PencilIcon from 'lucide-react/dist/esm/icons/pencil';

// Re-export the imported icons
export {
  CopyIcon,
  XIcon as CloseIcon,
  MenuIcon,
  MailIcon,
  TrashIcon,
  PlusIcon,
  SendIcon,
  SearchIcon,
  EditIcon,
  MoreHorizontalIcon as MoreIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  BotIcon,
  PencilIcon as PencilEditIcon
};

// Custom SVG icons interface
interface IconProps {
  className?: string;
  size?: number;
}

// ThumbUp icon implementation
export const ThumbUpIcon = ({ className, size = 16 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M7 10v12"></path>
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path>
  </svg>
);

// ThumbDown icon implementation
export const ThumbDownIcon = ({ className, size = 16 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M17 14V2"></path>
    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"></path>
  </svg>
); 