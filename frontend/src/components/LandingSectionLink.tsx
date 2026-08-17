import type { ReactNode } from 'react';
import { useLandingSectionNav } from '../hooks/useLandingSectionNav';

interface LandingSectionLinkProps {
  sectionId: string;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
}

/** Smooth-scrolls to a landing section; navigates home first when on other pages. */
export function LandingSectionLink({
  sectionId,
  children,
  className,
  onNavigate,
}: LandingSectionLinkProps) {
  const { goToSection } = useLandingSectionNav();

  return (
    <button
      type="button"
      onClick={() => {
        goToSection(sectionId);
        onNavigate?.();
      }}
      className={[className, 'bg-transparent border-0 p-0 cursor-pointer text-inherit font-inherit']
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}
