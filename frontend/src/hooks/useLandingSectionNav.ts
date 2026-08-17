import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { scrollToLandingSection } from '../utils/landingScroll';

export function useLandingSectionNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const goToSection = useCallback(
    (sectionId: string) => {
      if (location.pathname === '/') {
        scrollToLandingSection(sectionId);
        window.history.replaceState(null, '', `#${sectionId}`);
      } else {
        navigate('/', { state: { scrollTo: sectionId } });
      }
    },
    [location.pathname, navigate]
  );

  return { goToSection };
}
