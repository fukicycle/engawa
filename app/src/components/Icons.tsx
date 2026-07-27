import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export const HomeIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
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
    {...props}
  >
    {/* Stylized traditional Engawa / Japanese House roof and pillars */}
    <path d="M3 10V21H21V10" />
    <path d="M1 10L12 2L23 10" />
    <path d="M9 21V14H15V21" />
    <line x1="6" y1="14" x2="18" y2="14" />
  </svg>
);

export const PostIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
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
    {...props}
  >
    {/* Stylized sliding Shoji screen or letter scroll */}
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
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
    {...props}
  >
    {/* Classic Japanese Tear-off Washi Calendar */}
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </svg>
);

export const UserIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
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
    {...props}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Ink brush style thick elegant plus */}
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const LogOutIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
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
    {...props}
  >
    {/* sliding out of a gate */}
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const SendIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
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
    {...props}
  >
    {/* Floating leaf or elegant paper plane */}
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export const PollIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
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
    {...props}
  >
    {/* Voting slips */}
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    <path d="M13 13h4" />
    <path d="M13 17h4" />
  </svg>
);

export const ArrowLeftIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
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
    {...props}
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
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
    {...props}
  >
    {/* Wind chime or bell */}
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
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
    {...props}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
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
    {...props}
  >
    {/* Traditional ink brush / quill writing silhouette */}
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
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
    {...props}
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export const LeafIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    {/* Beautiful, authentic Japanese Maple Leaf (Momiji / 紅葉) clean path */}
    <path d="M12 21.3c-.2 0-.3-.1-.3-.3v-7.1c-.1.1-.2.2-.2.2l-3.3 4.2c-.1.1-.3.2-.5.1-.2-.1-.3-.3-.2-.5l2-4.5c-.3.3-.5.6-.8.8l-1.5 1.5c-.1.1-.3.1-.4 0-.1-.1-.1-.3 0-.4l2-2c.3-.3.7-.7 1-.9L7.3 12c-.2.1-.3 0-.4-.1-.1-.2 0-.3.1-.4l3.1-1.3c-.3 0-.6.1-.8.1h-.5c-.1 0-.3-.1-.3-.2 0-.1.1-.3.2-.3l3.2-1c-.1-.1-.3-.3-.4-.5L9 8c-.1-.1-.1-.3 0-.4.1-.1.3-.1.4 0l3 1.2c0-.3 0-.6-.1-.9V7.5c0-.1.1-.3.2-.3s.3.1.3.2v.9c.2-.5.3-1 .5-1.5l-3-2c-.1-.1-.1-.3 0-.4.1-.1.3-.1.4 0l3.3 2.2c0-.4.1-.7.1-1.1V4.2c0-.2.1-.3.3-.3s.3.1.3.3v1.2c0 .4.1.8.1 1.1l3.3-2.2c.1-.1.3-.1.4 0 .1.1 0 .3 0 .4l-3 2c.2.5.3 1 .5 1.5v-.9c0-.1.1-.2.3-.2s.2.1.2.2v.4c0 .3 0 .6-.1.9l3-1.2c.1-.1.3 0 .4.1.1.1 0 .3 0 .4l-2.6 1c-.1.2-.3.4-.4.5l3.2 1c.1 0 .2.2.2.3 0 .1-.1.2-.3.2h-.5c-.2 0-.5-.1-.8-.1l3.1 1.3c.1.1.2.2.1.4 0 .1-.2.1-.4.1l-3.2-.4c.3.2.7.6 1 .9l2 2c.1.1.1.3 0 .4-.1.1-.3.1-.4 0l-1.5-1.5c-.3-.2-.5-.5-.8-.8l2 4.5c.1.2 0 .4-.2.5-.2.1-.4 0-.5-.1L12.3 14c0-.1-.1-.2-.2-.2v7.2c0 .2-.1.3-.1.3z" />
  </svg>
);
