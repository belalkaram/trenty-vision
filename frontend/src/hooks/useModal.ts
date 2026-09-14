import { useState, useCallback } from 'react';

/**
 * useModal hook ensures closed by default, explicit boolean control,
 * and eliminates race conditions or accidental opening during renders.
 */
export function useModal(initialState: boolean = false) {
  const [isOpen, setIsOpen] = useState<boolean>(initialState);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  };
}
