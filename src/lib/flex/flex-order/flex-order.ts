/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Directive,
  ElementRef,
  OnChanges,
  SimpleChanges,
  Injectable,
} from '@angular/core';
import {
  NewBaseDirective,
  StyleBuilder,
  StyleDefinition,
  StyleUtils,
  MediaMarshaller,
} from '@angular/flex-layout/core';

@Injectable({providedIn: 'root'})
export class FlexOrderStyleBuilder extends StyleBuilder {
  buildStyles(value: string) {
    const val = parseInt(value, 10);
    const styles = {order: isNaN(val) ? 0 : val};
    return styles;
  }
}

const inputs = [
  'fxFlexOrder', 'fxFlexOrder.xs', 'fxFlexOrder.sm', 'fxFlexOrder.md',
  'fxFlexOrder.lg', 'fxFlexOrder.xl', 'fxFlexOrder.lt-sm', 'fxFlexOrder.lt-md',
  'fxFlexOrder.lt-lg', 'fxFlexOrder.lt-xl', 'fxFlexOrder.gt-xs', 'fxFlexOrder.gt-sm',
  'fxFlexOrder.gt-md', 'fxFlexOrder.gt-lg'
];
const selector = `
  [fxFlexOrder], [fxFlexOrder.xs], [fxFlexOrder.sm], [fxFlexOrder.md],
  [fxFlexOrder.lg], [fxFlexOrder.xl], [fxFlexOrder.lt-sm], [fxFlexOrder.lt-md],
  [fxFlexOrder.lt-lg], [fxFlexOrder.lt-xl], [fxFlexOrder.gt-xs], [fxFlexOrder.gt-sm],
  [fxFlexOrder.gt-md], [fxFlexOrder.gt-lg]
`;

/**
 * 'flex-order' flexbox styling directive
 * Configures the positional ordering of the element in a sorted layout container
 * @see https://css-tricks.com/almanac/properties/o/order/
 */
@Directive({selector, inputs})
export class FlexOrderDirective extends NewBaseDirective implements OnChanges {

  protected DIRECTIVE_KEY = 'flex-order';

  constructor(protected elRef: ElementRef,
              protected styleUtils: StyleUtils,
              protected styleBuilder: FlexOrderStyleBuilder,
              protected marshal: MediaMarshaller) {
    super(elRef, styleBuilder, styleUtils, marshal);
    this.marshal.init(this.elRef.nativeElement, this.DIRECTIVE_KEY,
      this.updateWithValue.bind(this));
  }

  // *********************************************
  // Lifecycle Methods
  // *********************************************

  /**
   * For @Input changes on the current mq activation property, see onMediaQueryChanges()
   */
  ngOnChanges(changes: SimpleChanges) {
    // TODO: figure out how custom breakpoints interact with this method
    // maybe just have it as @Inputs for them?
    Object.keys(changes).forEach(key => {
      if (inputs.indexOf(key) !== -1) {
        const bp = key.split('.')[1] || '';
        const val = changes[key].currentValue;
        this.setValue(val, bp);
      }
    });
  }

  // *********************************************
  // Protected methods
  // *********************************************

  protected updateWithValue(value?: string) {
    value = value || '0';
    this.addStyles(value);
  }

  protected _styleCache = flexOrderCache;
}

const flexOrderCache: Map<string, StyleDefinition> = new Map();
