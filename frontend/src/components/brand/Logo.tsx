import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { PRODUCT_NAME } from '../../constants/brand';
import { BRAND_ASSETS } from '../../constants/brandAssets';

type LogoVariant = 'light' | 'dark' | 'marketing';

interface LogoProps {
  variant?: LogoVariant;
  showWordmark?: boolean;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  to?: string;
  className?: string;
}

const sizeClasses = {
  sm: { lockup: 'h-7', icon: 'h-7 w-7' },
  md: { lockup: 'h-8', icon: 'h-8 w-8' },
  lg: { lockup: 'h-10', icon: 'h-10 w-10' },
} as const;

export function Logo({
  variant = 'marketing',
  showWordmark = true,
  iconOnly = false,
  size = 'md',
  to = '/',
  className,
}: LogoProps) {
  const sizes = sizeClasses[size];
  const useWhite = variant === 'dark';

  const src = iconOnly || !showWordmark
    ? BRAND_ASSETS.iconApp
    : useWhite
      ? BRAND_ASSETS.lockupWhite
      : BRAND_ASSETS.lockup;

  const img = (
    <img
      src={src}
      alt={iconOnly || !showWordmark ? `${PRODUCT_NAME} icon` : PRODUCT_NAME}
      className={clsx(
        'w-auto object-contain flex-shrink-0',
        iconOnly || !showWordmark ? sizes.icon : sizes.lockup,
      )}
    />
  );

  if (to) {
    return (
      <Link to={to} className={clsx('inline-flex items-center', className)} aria-label={PRODUCT_NAME}>
        {img}
      </Link>
    );
  }

  return <div className={clsx('inline-flex items-center', className)}>{img}</div>;
}
