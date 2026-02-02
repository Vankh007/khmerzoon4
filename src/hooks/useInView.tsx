import { useEffect, useRef, useState, RefObject } from 'react';

interface UseInViewOptions {
  threshold?: number;
  triggerOnce?: boolean;
}

interface UseInViewReturn {
  ref: RefObject<HTMLDivElement>;
  isInView: boolean;
}

export const useInView = ({ threshold = 0.1, triggerOnce = false }: UseInViewOptions = {}): UseInViewReturn => {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, triggerOnce]);

  return { ref, isInView };
};
