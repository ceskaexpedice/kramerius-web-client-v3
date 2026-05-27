import { Injectable, signal, WritableSignal } from '@angular/core';

export interface PopupPositionConfig {
  triggerEvent?: Event;
  popupWidth?: number;
  popupHeight?: number;
  offsetX?: number;
  offsetY?: number;
  preferredSide?: 'right' | 'left' | 'center';
  viewportMargin?: number;
}

export interface PopupState {
  showPopup: WritableSignal<boolean>;
  popupPositioned: WritableSignal<boolean>;
  closePopup: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class PopupPositioningService {

  private static currentOpenPopup: any = null;
  private clickOutsideListener?: (event: Event) => void;

  /**
   * Creates popup state signals and management functions
   */
  createPopupState(): PopupState {
    const showPopup = signal(false);
    const popupPositioned = signal(false);

    const closePopup = () => {
      showPopup.set(false);
      popupPositioned.set(false);
      this.removeClickOutsideListener();

      // Clear static reference if this was the current popup
      if (PopupPositioningService.currentOpenPopup?.closePopup === closePopup) {
        PopupPositioningService.currentOpenPopup = null;
      }
    };

    return {
      showPopup,
      popupPositioned,
      closePopup
    };
  }

  /**
   * Shows and positions a popup relative to a trigger element
   */
  showPopup(
    popupState: PopupState,
    config: PopupPositionConfig = {},
    popupSelector: string = '.favorites-popup-wrapper'
  ): void {
    // Close any existing popup first
    if (PopupPositioningService.currentOpenPopup &&
        PopupPositioningService.currentOpenPopup !== popupState) {
      PopupPositioningService.currentOpenPopup.closePopup();
    }

    // Reset positioning state and show popup
    popupState.popupPositioned.set(false);
    popupState.showPopup.set(true);

    // Set this as the currently open popup
    PopupPositioningService.currentOpenPopup = popupState;

    // Position popup after it's shown
    setTimeout(() => {
      this.positionPopup(popupState, config, popupSelector);
    }, 0);
  }

  /**
   * Positions the popup based on configuration
   */
  public positionPopup(
    popupState: PopupState,
    config: PopupPositionConfig,
    popupSelector: string
  ): void {
    const popup = document.querySelector(popupSelector) as HTMLElement;
    if (!popup) return;

    const {
      triggerEvent,
      popupWidth = 265,
      popupHeight = 400,
      offsetX = 0,
      offsetY = 0,
      preferredSide = 'right',
      viewportMargin = 16
    } = config;

    // Measure the popup's actual rendered size; the config values are only a
    // fallback. Popups like the day-issues list have a content-driven width that
    // can be far larger than the defaults, so trusting the config would let the
    // popup run off-screen.
    const measuredWidth = popup.offsetWidth || popupWidth;
    const measuredHeight = popup.offsetHeight || popupHeight;

    if (triggerEvent) {
      // Position relative to trigger element
      const button = triggerEvent.target as HTMLElement;
      const rect = button.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let leftPosition: number;
      let topPosition = rect.bottom + offsetY;

      // Determine horizontal positioning
      switch (preferredSide) {
        case 'left':
          leftPosition = rect.right - measuredWidth + offsetX;
          break;
        case 'center':
          leftPosition = rect.left + (rect.width / 2) - (measuredWidth / 2) + offsetX;
          break;
        case 'right':
        default:
          leftPosition = rect.left + offsetX;
          break;
      }

      // Clamp horizontally so the popup always stays within the viewport. The
      // right-edge clamp takes precedence; the left clamp guards against popups
      // wider than the available space.
      const maxLeft = viewportWidth - measuredWidth - viewportMargin;
      if (leftPosition > maxLeft) {
        leftPosition = maxLeft;
      }
      if (leftPosition < viewportMargin) {
        leftPosition = viewportMargin;
      }

      // Vertical overflow: flip above the trigger, then pin within the viewport.
      if (topPosition + measuredHeight > viewportHeight - viewportMargin) {
        const aboveTop = rect.top - measuredHeight - offsetY;
        topPosition = aboveTop >= viewportMargin
          ? aboveTop
          : viewportHeight - measuredHeight - viewportMargin;
      }
      if (topPosition < viewportMargin) {
        topPosition = viewportMargin;
      }

      popup.style.top = `${topPosition}px`;
      popup.style.left = `${leftPosition}px`;
    } else {
      // Fallback to center positioning
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const leftPosition = Math.max(viewportMargin, (viewportWidth - measuredWidth) / 2);
      const topPosition = Math.max(viewportMargin, (viewportHeight - measuredHeight) / 2);

      popup.style.top = `${topPosition}px`;
      popup.style.left = `${leftPosition}px`;
    }

    popupState.popupPositioned.set(true);
    this.setupClickOutsideListener(popupState, popupSelector);
  }

  /**
   * Sets up click outside listener to close popup
   */
  private setupClickOutsideListener(popupState: PopupState, popupSelector: string): void {
    this.removeClickOutsideListener();

    this.clickOutsideListener = (event: Event) => {
      const target = event.target as Element;
      const popup = document.querySelector(popupSelector);

      if (popup && !popup.contains(target)) {
        popupState.closePopup();
      }
    };

    // Add listener with a slight delay to prevent immediate closure
    setTimeout(() => {
      document.addEventListener('click', this.clickOutsideListener!, true);
    }, 100);
  }

  /**
   * Removes click outside listener
   */
  private removeClickOutsideListener(): void {
    if (this.clickOutsideListener) {
      document.removeEventListener('click', this.clickOutsideListener, true);
      this.clickOutsideListener = undefined;
    }
  }

  /**
   * Cleanup method for component destruction
   */
  cleanup(): void {
    this.removeClickOutsideListener();
  }
}
