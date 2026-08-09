/**
 * VidyaSetu ERP — NotificationCategoryIcon Component
 * Renders high-quality Lucide SVG icons for notification categories.
 */
import React from 'react';
import {
  ClipboardList,
  GraduationCap,
  DollarSign,
  Briefcase,
  BookOpen,
  ShieldCheck,
  Settings,
  FileEdit,
  FileText,
  AlertTriangle,
  Bus,
  Megaphone,
  Cake,
  Bell,
} from 'lucide-react';

interface NotificationCategoryIconProps {
  category: string;
  size?: number;
  className?: string;
}

export function NotificationCategoryIcon({
  category,
  size = 15,
  className = '',
}: NotificationCategoryIconProps) {
  const cat = category ? category.toLowerCase() : '';

  switch (cat) {
    case 'attendance':
      return <ClipboardList size={size} className={className} />;
    case 'exam':
      return <GraduationCap size={size} className={className} />;
    case 'fee':
      return <DollarSign size={size} className={className} />;
    case 'leave':
      return <Briefcase size={size} className={className} />;
    case 'library':
      return <BookOpen size={size} className={className} />;
    case 'security':
      return <ShieldCheck size={size} className={className} />;
    case 'system':
      return <Settings size={size} className={className} />;
    case 'homework':
      return <FileEdit size={size} className={className} />;
    case 'certificate':
      return <FileText size={size} className={className} />;
    case 'behaviour':
      return <AlertTriangle size={size} className={className} />;
    case 'transport':
      return <Bus size={size} className={className} />;
    case 'notice':
      return <Megaphone size={size} className={className} />;
    case 'birthday':
      return <Cake size={size} className={className} />;
    case 'admission':
      return <ClipboardList size={size} className={className} />;
    default:
      return <Bell size={size} className={className} />;
  }
}
