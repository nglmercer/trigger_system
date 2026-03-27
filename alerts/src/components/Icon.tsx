import { ICONS } from '../icons';

interface IconProps {
  name: keyof typeof ICONS;
  className?: string;
}

export function Icon({ name, className = '' }: IconProps) {
  return (
    <span 
      className={`inline-flex items-center justify-center ${className}`}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}