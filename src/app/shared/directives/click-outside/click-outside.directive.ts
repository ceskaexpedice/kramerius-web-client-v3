import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Output
} from '@angular/core';

@Directive({
  selector: '[appClickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // First check: is the clicked element inside the directive's element DOM tree?
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (clickedInside) {
      return;
    }

    // Second check: is the clicked element a child element that belongs to this component
    // (even if positioned outside)? Check if target or any of its parents originated from within
    if (this.isChildElement(target)) {
      return;
    }

    // If we got here, the click is truly outside
    this.clickOutside.emit();
  }

  @HostListener('document:keydown.escape')
  onEscapeKeyDown(): void {
    this.clickOutside.emit();
  }

  private isChildElement(element: HTMLElement): boolean {
    // Check if this element or any parent is a child of our component
    // by traversing up and checking contains() at each level
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      // If this element is contained in our directive's element, it's a child
      if (this.elementRef.nativeElement.contains(current)) {
        return true;
      }

      // Check if current element has any relationship to elements inside our directive
      // by checking all select wrappers and their dropdowns
      const allSelectWrappers = this.elementRef.nativeElement.querySelectorAll('.select-wrapper');
      for (const wrapper of Array.from(allSelectWrappers) as HTMLElement[]) {
        const parent = wrapper.parentElement;
        if (parent && parent.contains(element)) {
          return true;
        }
      }

      current = current.parentElement;
    }

    return false;
  }
}
