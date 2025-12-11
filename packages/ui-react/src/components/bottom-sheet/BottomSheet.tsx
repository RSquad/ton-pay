import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import './BottomSheet.css';
import type { BottomSheetProps } from '../../types';

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  detents = [0.5, 0.9],
  initialDetent = 0,
  children,
  className = '',
  backdropClassName = '',
  handleClassName = '',
  contentClassName = '',
  enableBackdropClose = true,
  enableSwipeToClose = true,
  maxHeight = '90vh',
  minHeight = '20vh',
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentDetent, setCurrentDetent] = useState(initialDetent);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  const mouseStartTimeRef = useRef(0);
  const scrollTopRef = useRef(0);
  const canDragRef = useRef(true);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosingRef = useRef(false);
  const isSnappingRef = useRef(false);
  const targetDetentRef = useRef<number | null>(null);

  const getDetentValue = useCallback(
    (index: number): number => {
      const clampedIndex = Math.max(0, Math.min(index, detents.length - 1));
      return detents[clampedIndex];
    },
    [detents],
  );

  const calculateSheetHeight = useCallback((): number => {
    if (!sheetRef.current) return 0;
    const viewportHeight = window.innerHeight;
    const detentValue = getDetentValue(currentDetent);
    return viewportHeight * detentValue;
  }, [currentDetent, getDetentValue]);

  useEffect(() => {
    if (isOpen) {
      if (isClosingRef.current) return;

      isClosingRef.current = false;
      setIsClosing(false);
      setCurrentDetent(initialDetent);

      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }

      setSheetHeight(0);

      openTimeoutRef.current = setTimeout(() => {
        const viewportHeight = window.innerHeight;
        const detentValue = getDetentValue(initialDetent);
        setSheetHeight(viewportHeight * detentValue);
        openTimeoutRef.current = null;
      }, 10);
    } else {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
        openTimeoutRef.current = null;
      }
      setSheetHeight(0);
      setCurrentDetent(initialDetent);
    }
  }, [isOpen, initialDetent, getDetentValue]);

  const handleClose = useCallback(() => {
    if (isClosing || isClosingRef.current) return;

    isClosingRef.current = true;
    setIsClosing(true);
    setSheetHeight(0);
    setCurrentDetent(initialDetent);

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = setTimeout(() => {
      isClosingRef.current = false;
      setIsClosing(false);
      onClose();
    }, 200);
  }, [isClosing, onClose, initialDetent]);

  useEffect(() => {
    if (
      isOpen &&
      !isDragging &&
      !isSnappingRef.current &&
      targetDetentRef.current === null
    ) {
      const expectedHeight = calculateSheetHeight();
      const heightDiff = Math.abs(sheetHeight - expectedHeight);
      if (heightDiff > 1) {
        setSheetHeight(expectedHeight);
      }
    }
  }, [isOpen, isDragging, currentDetent, sheetHeight, calculateSheetHeight]);

  const findNearestDetent = useCallback(
    (position: number): number => {
      const viewportHeight = window.innerHeight;
      const normalizedPosition = position / viewportHeight;

      let nearestIndex = 0;
      let minDistance = Math.abs(normalizedPosition - detents[0]);

      detents.forEach((detent, index) => {
        const distance = Math.abs(normalizedPosition - detent);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = index;
        }
      });

      return nearestIndex;
    },
    [detents],
  );

  const snapToDetent = useCallback(
    (detentIndex: number) => {
      const clampedIndex = Math.max(
        0,
        Math.min(detentIndex, detents.length - 1),
      );
      isSnappingRef.current = true;
      targetDetentRef.current = clampedIndex;
      const viewportHeight = window.innerHeight;
      const newHeight = viewportHeight * getDetentValue(clampedIndex);
      setCurrentDetent(clampedIndex);
      setSheetHeight(newHeight);
      setTimeout(() => {
        isSnappingRef.current = false;
        targetDetentRef.current = null;
      }, 200);
    },
    [detents, getDetentValue],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isOpen || isClosing) return;

      const touch = e.touches[0];
      touchStartYRef.current = touch.clientY;
      touchStartTimeRef.current = Date.now();
      setStartY(touch.clientY);
      setCurrentY(touch.clientY);

      if (contentRef.current) {
        scrollTopRef.current = contentRef.current.scrollTop;
        setIsScrolling(false);
        canDragRef.current = scrollTopRef.current === 0;
      } else {
        canDragRef.current = true;
      }
    },
    [isOpen, isClosing],
  );

  const calculateNewHeight = useCallback(
    (touchY: number): number => {
      const viewportHeight = window.innerHeight;
      const baseHeight = viewportHeight * getDetentValue(currentDetent);
      const delta = touchStartYRef.current - touchY;
      const maxDetentHeight = viewportHeight * Math.max(...detents);
      const minDetentHeight = viewportHeight * Math.min(...detents);
      const isAtMaxDetent = currentDetent === detents.length - 1;
      const isAtMinDetent = currentDetent === 0;
      const isDraggingDown = delta < 0;

      let newHeight = baseHeight + delta;

      if (isAtMaxDetent) {
        newHeight = Math.max(0, Math.min(maxDetentHeight, newHeight));
      } else if (isAtMinDetent) {
        if (isDraggingDown && enableSwipeToClose) {
          newHeight = Math.max(0, Math.min(maxDetentHeight, newHeight));
        } else {
          newHeight = Math.max(
            minDetentHeight,
            Math.min(maxDetentHeight, newHeight),
          );
        }
      } else {
        newHeight = Math.max(
          minDetentHeight,
          Math.min(maxDetentHeight, newHeight),
        );
      }

      return newHeight;
    },
    [currentDetent, detents, enableSwipeToClose, getDetentValue],
  );

  const handleTouchMoveNative = useCallback(
    (e: TouchEvent) => {
      if (!isOpen || isClosing) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaY = touch.clientY - touchStartYRef.current;
      const currentScrollTop = contentRef.current?.scrollTop ?? 0;
      const isContentScrollable = contentRef.current
        ? contentRef.current.scrollHeight > contentRef.current.clientHeight
        : false;

      if (!contentRef.current) return;

      const touchTarget = e.target as HTMLElement;
      const isTouchingContent = contentRef.current.contains(touchTarget);
      const isTouchingHandle =
        touchTarget.closest('.bottom-sheet-handle-container') !== null;

      if (isDragging) {
        if (e.cancelable) e.preventDefault();
        setCurrentY(touch.clientY);
        setSheetHeight(calculateNewHeight(touch.clientY));
        return;
      }

      if (isTouchingHandle && Math.abs(deltaY) > 5) {
        if (e.cancelable) e.preventDefault();
        setIsDragging(true);
        setIsScrolling(false);
        setCurrentY(touch.clientY);
        setSheetHeight(calculateNewHeight(touch.clientY));
        return;
      }

      if (isTouchingContent && !isDragging) {
        if (currentScrollTop > 0) return;
        if (deltaY < 0 && isContentScrollable) return;

        if (
          currentScrollTop === 0 &&
          deltaY > 0 &&
          canDragRef.current &&
          Math.abs(deltaY) > 5
        ) {
          if (e.cancelable) e.preventDefault();
          setIsDragging(true);
          setIsScrolling(false);
          setCurrentY(touch.clientY);
          setSheetHeight(calculateNewHeight(touch.clientY));
        }
      }
    },
    [isOpen, isDragging, isClosing, calculateNewHeight],
  );

  const handleTouchEnd = useCallback(
    (e?: React.TouchEvent | TouchEvent) => {
      if (!isOpen || isClosing) return;
      if (isScrolling) {
        setIsScrolling(false);
        return;
      }
      if (!isDragging) return;

      setIsDragging(false);
      const viewportHeight = window.innerHeight;
      const currentPosition = sheetHeight / viewportHeight;
      const minDetentValue = Math.min(...detents);
      const maxDetentValue = Math.max(...detents);
      const swipeDuration = Date.now() - touchStartTimeRef.current;

      const finalTouchY =
        e && 'changedTouches' in e && e.changedTouches[0]
          ? e.changedTouches[0].clientY
          : currentY;
      const swipeDistance = finalTouchY - touchStartYRef.current;
      const swipeVelocity =
        Math.abs(swipeDistance) / Math.max(swipeDuration, 1);
      const isAtMaxDetent = currentDetent === detents.length - 1;
      const isAtMinDetent = currentDetent === 0;
      const isSwipingDown = swipeDistance > 0;
      const isSwipingUp = swipeDistance < 0;

      if (isAtMaxDetent && isSwipingDown && enableSwipeToClose) {
        if (
          swipeDistance > 50 ||
          swipeVelocity > 0.3 ||
          currentPosition < maxDetentValue * 0.7
        ) {
          handleClose();
          return;
        }
      }

      if (isAtMinDetent && detents.length > 1) {
        const nextDetentIndex = Math.min(1, detents.length - 1);
        const nextDetentValue = detents[nextDetentIndex];
        const midpoint = (minDetentValue + nextDetentValue) / 2;

        const shouldGoToNextDetent =
          (isSwipingUp &&
            (Math.abs(swipeDistance) > 30 || swipeVelocity > 0.2)) ||
          currentPosition >= midpoint;

        if (shouldGoToNextDetent) {
          snapToDetent(nextDetentIndex);
          return;
        }
      }

      const shouldClose =
        enableSwipeToClose &&
        (currentPosition < minDetentValue * 0.5 ||
          (swipeDistance > 100 && swipeVelocity > 0.5) ||
          sheetHeight < viewportHeight * 0.15);

      if (shouldClose) {
        handleClose();
        return;
      }

      const nearestDetentIndex = findNearestDetent(sheetHeight);
      snapToDetent(nearestDetentIndex);
    },
    [
      isOpen,
      isDragging,
      isClosing,
      isScrolling,
      sheetHeight,
      currentY,
      currentDetent,
      detents,
      enableSwipeToClose,
      handleClose,
      findNearestDetent,
      snapToDetent,
    ],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isOpen || isClosing) return;

      mouseStartTimeRef.current = Date.now();
      setStartY(e.clientY);
      setCurrentY(e.clientY);

      if (contentRef.current) {
        scrollTopRef.current = contentRef.current.scrollTop;
        setIsScrolling(false);
        canDragRef.current = scrollTopRef.current === 0;
      } else {
        canDragRef.current = true;
      }
    },
    [isOpen, isClosing],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isOpen || !isDragging || isClosing) return;

      const viewportHeight = window.innerHeight;
      const baseHeight = viewportHeight * getDetentValue(currentDetent);
      const delta = startY - e.clientY;
      const maxDetentHeight = viewportHeight * Math.max(...detents);
      const minDetentHeight = viewportHeight * Math.min(...detents);
      const isAtMaxDetent = currentDetent === detents.length - 1;
      const isAtMinDetent = currentDetent === 0;

      let newHeight = baseHeight + delta;

      if (isAtMaxDetent) {
        newHeight = Math.max(0, Math.min(maxDetentHeight, newHeight));
      } else if (isAtMinDetent) {
        newHeight = Math.max(
          minDetentHeight,
          Math.min(maxDetentHeight, newHeight),
        );
      } else {
        newHeight = Math.max(
          minDetentHeight,
          Math.min(maxDetentHeight, newHeight),
        );
      }

      setSheetHeight(newHeight);
      setCurrentY(e.clientY);
    },
    [
      isOpen,
      isDragging,
      startY,
      currentDetent,
      detents,
      getDetentValue,
      isClosing,
    ],
  );

  const handleMouseUp = useCallback(() => {
    if (!isOpen || !isDragging || isClosing) return;

    setIsDragging(false);
    const viewportHeight = window.innerHeight;
    const currentPosition = sheetHeight / viewportHeight;
    const minDetentValue = Math.min(...detents);
    const maxDetentValue = Math.max(...detents);
    const swipeDuration = Date.now() - mouseStartTimeRef.current;
    const swipeDistance = currentY - startY;
    const swipeVelocity = Math.abs(swipeDistance) / Math.max(swipeDuration, 1);
    const isAtMaxDetent = currentDetent === detents.length - 1;
    const isAtMinDetent = currentDetent === 0;
    const isSwipingDown = swipeDistance > 0;
    const isSwipingUp = swipeDistance < 0;

    if (isAtMaxDetent && isSwipingDown && enableSwipeToClose) {
      if (
        swipeDistance > 50 ||
        swipeVelocity > 0.3 ||
        currentPosition < maxDetentValue * 0.7
      ) {
        handleClose();
        return;
      }
    }

    if (isAtMinDetent && detents.length > 1) {
      const nextDetentIndex = Math.min(1, detents.length - 1);
      const nextDetentValue = detents[nextDetentIndex];
      const midpoint = (minDetentValue + nextDetentValue) / 2;

      if (isSwipingUp && (swipeDistance < -30 || swipeVelocity > 0.2)) {
        snapToDetent(nextDetentIndex);
        return;
      }

      if (currentPosition >= midpoint) {
        snapToDetent(nextDetentIndex);
        return;
      }
    }

    const shouldClose =
      enableSwipeToClose &&
      (currentPosition < minDetentValue * 0.5 ||
        (swipeDistance > 100 && swipeVelocity > 0.5) ||
        sheetHeight < viewportHeight * 0.15);

    if (shouldClose) {
      handleClose();
      return;
    }

    const nearestDetentIndex = findNearestDetent(sheetHeight);
    snapToDetent(nearestDetentIndex);
  }, [
    isOpen,
    isDragging,
    isClosing,
    sheetHeight,
    currentY,
    startY,
    currentDetent,
    detents,
    enableSwipeToClose,
    handleClose,
    findNearestDetent,
    snapToDetent,
  ]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTouchEndNative = useCallback(
    (e: TouchEvent) => {
      handleTouchEnd(e);
    },
    [handleTouchEnd],
  );

  useEffect(() => {
    const sheetElement = sheetRef.current;
    if (!sheetElement || !isOpen) return;

    sheetElement.addEventListener('touchmove', handleTouchMoveNative, {
      passive: false,
    });
    sheetElement.addEventListener('touchend', handleTouchEndNative, {
      passive: false,
    });

    return () => {
      sheetElement.removeEventListener('touchmove', handleTouchMoveNative);
      sheetElement.removeEventListener('touchend', handleTouchEndNative);
    };
  }, [isOpen, handleTouchMoveNative, handleTouchEndNative]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
        openTimeoutRef.current = null;
      }
      isClosingRef.current = false;
    };
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const maxHeightValue =
    typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;
  const minHeightValue =
    typeof minHeight === 'number' ? `${minHeight}px` : minHeight;
  const currentHeight = `${sheetHeight}px`;

  const calculateBackdropOpacity = (): number => {
    if (!isOpen) return 0.5;
    const viewportHeight = window.innerHeight;
    const maxDetentHeight = viewportHeight * Math.max(...detents);
    if (maxDetentHeight === 0) return 0.5;
    const progress = Math.max(0, Math.min(1, sheetHeight / maxDetentHeight));
    return progress * 0.5;
  };

  const calculateBackdropBlur = (): number => {
    if (!isOpen) return 8;
    const viewportHeight = window.innerHeight;
    const maxDetentHeight = viewportHeight * Math.max(...detents);
    if (maxDetentHeight === 0) return 8;
    const progress = Math.max(0, Math.min(1, sheetHeight / maxDetentHeight));
    return progress * 8;
  };

  const backdropOpacity = calculateBackdropOpacity();
  const backdropBlur = calculateBackdropBlur();

  const backdropStyle: React.CSSProperties = {
    backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
    backdropFilter: `blur(${backdropBlur}px)`,
    WebkitBackdropFilter: `blur(${backdropBlur}px)`,
    ...(isDragging
      ? {}
      : {
          transition:
            'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), backdrop-filter 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }),
  };

  return (
    <div
      className={`bottom-sheet-backdrop ${backdropClassName} ${isClosing ? 'closing' : ''}`}
      onClick={enableBackdropClose ? handleClose : undefined}
      style={backdropStyle}
    >
      <div
        ref={sheetRef}
        className={`bottom-sheet ${className} ${isDragging ? 'dragging' : ''} ${isClosing ? 'closing' : ''}`}
        style={{
          height: currentHeight,
          maxHeight: maxHeightValue,
          minHeight: minHeightValue,
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onMouseDown={handleMouseDown}
      >
        <div className="bottom-sheet-handle-container">
          <div
            className={`bottom-sheet-handle ${handleClassName}`}
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          />
        </div>
        <div
          ref={contentRef}
          className={`bottom-sheet-content ${contentClassName} ${isScrolling ? 'scrolling' : ''}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default BottomSheet;
