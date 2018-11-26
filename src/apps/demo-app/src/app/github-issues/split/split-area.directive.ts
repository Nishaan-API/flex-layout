import {Directive, ElementRef} from '@angular/core';

@Directive({
  selector: '[ngxSplitArea]',
  host: {
    style: 'overflow: auto;'
  }
})
export class SplitAreaDirective {
  constructor(public elementRef: ElementRef) {}
}
