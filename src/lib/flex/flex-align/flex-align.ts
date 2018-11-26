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
  MediaMarshaller,
  NewBaseDirective,
  StyleBuilder,
  StyleDefinition,
  StyleUtils,
} from '@angular/flex-layout/core';

@Injectable({providedIn: 'root'})
export class FlexAlignStyleBuilder extends StyleBuilder {
  buildStyles(input: string) {
    const styles: StyleDefinition = {};

    // Cross-axis
    switch (input) {
      case 'start':
        styles['align-self'] = 'flex-start';
        break;
      case 'end':
        styles['align-self'] = 'flex-end';
        break;
      default:
        styles['align-self'] = input;
        break;
    }

    return styles;
  }
}

const inputs = [
  'fxFlexAlign', 'fxFlexAlign.xs', 'fxFlexAlign.sm', 'fxFlexAlign.md',
  'fxFlexAlign.lg', 'fxFlexAlign.xl', 'fxFlexAlign.lt-sm', 'fxFlexAlign.lt-md',
  'fxFlexAlign.lt-lg', 'fxFlexAlign.lt-xl', 'fxFlexAlign.gt-xs', 'fxFlexAlign.gt-sm',
  'fxFlexAlign.gt-md', 'fxFlexAlign.gt-lg'
];
const selector = `
  [fxFlexAlign], [fxFlexAlign.xs], [fxFlexAlign.sm], [fxFlexAlign.md],
  [fxFlexAlign.lg], [fxFlexAlign.xl], [fxFlexAlign.lt-sm], [fxFlexAlign.lt-md],
  [fxFlexAlign.lt-lg], [fxFlexAlign.lt-xl], [fxFlexAlign.gt-xs], [fxFlexAlign.gt-sm],
  [fxFlexAlign.gt-md], [fxFlexAlign.gt-lg]
`;

/**
 * 'flex-align' flexbox styling directive
 * Allows element-specific overrides for cross-axis alignments in a layout container
 * @see https://css-tricks.com/almanac/properties/a/align-self/
 */
@Directive({selector, inputs})
export class FlexAlignDirective extends NewBaseDirective implements OnChanges {

  protected DIRECTIVE_KEY = 'flex-align';

  constructor(protected elRef: ElementRef,
              protected styleUtils: StyleUtils,
              protected styleBuilder: FlexAlignStyleBuilder,
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

  protected updateWithValue(value?: string|number) {
    value = value || 'stretch';
    this.addStyles(value && (value + '') || '');
  }

  protected _styleCache = flexAlignCache;
}

const flexAlignCache: Map<string, StyleDefinition> = new Map();
