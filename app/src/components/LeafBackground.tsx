import React from 'react';
import { LeafIcon } from './Icons';

export const LeafBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Wood textured background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-wood-100/90 via-wood-200/50 to-wood-300/40" />
      
      {/* Scattered leaves with slow falling animations */}
      <div className="leaf leaf-1 text-engawa-500"><LeafIcon size={20} /></div>
      <div className="leaf leaf-2 text-engawa-600"><LeafIcon size={24} /></div>
      <div className="leaf leaf-3 text-engawa-500"><LeafIcon size={16} /></div>
      <div className="leaf leaf-4 text-engawa-700"><LeafIcon size={22} /></div>
      <div className="leaf leaf-5 text-engawa-600"><LeafIcon size={18} /></div>
    </div>
  );
};
