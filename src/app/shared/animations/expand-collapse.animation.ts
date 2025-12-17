import { animate, state, style, transition, trigger } from '@angular/animations';

export const expandCollapseAnimation = trigger('expandCollapse', [
  state('expanded', style({ height: '*', opacity: 1 })),
  state('collapsed', style({ height: '0px', opacity: 0 })),
  transition('expanded <=> collapsed', animate('200ms ease-in-out'))
]);
