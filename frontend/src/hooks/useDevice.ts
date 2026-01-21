import { useState, useEffect, useMemo } from 'react';

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  platform: 'ios' | 'android' | 'web';
}

export const useDevice = (): DeviceInfo => {
  const [screenWidth, setScreenWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [screenHeight, setScreenHeight] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 768
  );
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  );

  useEffect(() => {
    // Debounce resize handler (150ms)
    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        setScreenWidth(width);
        setScreenHeight(height);
        setOrientation(width > height ? 'landscape' : 'portrait');
      }, 150);
    };

    // Check orientation change
    const handleOrientationChange = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setScreenWidth(width);
      setScreenHeight(height);
      setOrientation(width > height ? 'landscape' : 'portrait');
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Check for orientation media query
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(orientation: landscape)');
      const handleMediaChange = (e: MediaQueryListEvent) => {
        setOrientation(e.matches ? 'landscape' : 'portrait');
      };
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Detect touch capability
  const isTouch = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - for older browsers
      navigator.msMaxTouchPoints > 0
    );
  }, []);

  // Detect platform
  const platform = useMemo(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'web';
    const userAgent = navigator.userAgent || navigator.vendor || '';
    
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      return 'ios';
    }
    if (/android/i.test(userAgent)) {
      return 'android';
    }
    return 'web';
  }, []);

  // Calculate device type based on breakpoints
  const deviceInfo = useMemo<DeviceInfo>(() => {
    const isMobile = screenWidth < BREAKPOINTS.mobile;
    const isTablet = screenWidth >= BREAKPOINTS.mobile && screenWidth < BREAKPOINTS.tablet;
    const isDesktop = screenWidth >= BREAKPOINTS.tablet;

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouch,
      screenWidth,
      screenHeight,
      orientation,
      platform,
    };
  }, [screenWidth, screenHeight, orientation, isTouch, platform]);

  return deviceInfo;
};

