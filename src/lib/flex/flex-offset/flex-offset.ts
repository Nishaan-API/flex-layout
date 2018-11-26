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
  Optional,
  SimpleChanges,
  SkipSelf,
  Injectable,
} from '@angular/core';
import {Directionality} from '@angular/cdk/bidi';
import {
  MediaMarshaller,
  NewBaseDirective,
  StyleBuilder,
  StyleDefinition,
  StyleUtils,
} from '@angular/flex-layout/core';

import {LayoutDirective} from '../layout/layout';
import {isFlowHorizontal} from '../../utils/layout-validator';
import {EMPTY} from 'rxjs';

export interface FlexOffsetParent {
  layout: string;
}

@Injectable({providedIn: 'root'})
export class FlexOffsetStyleBuilder extends StyleBuilder {
  constructor(protected directionality: Directionality) {
    super();
  }

  buildStyles(offset: string, parent: FlexOffsetParent) {
    const isPercent = String(offset).indexOf('%') > -1;
    const isPx = String(offset).indexOf('px') > -1;
    if (!isPx && !isPercent && !isNaN(+offset)) {
      offset = offset + '%';
    }
    const isRtl = this.directionality.value === 'rtl';
    const horizontalLayoutKey = isRtl ? 'margin-right' : 'margin-left';
    const styles = isFlowHorizontal(parent.layout) ? {[horizontalLayoutKey]: `${offset}`} :
      {'margin-top': `${offset}`};

    return styles;
  }
}

const inputs = [
  'fxFlexOffset', 'fxFlexOffset.xs', 'fxFlexOffset.sm', 'fxFlexOffset.md',
  'fxFlexOffset.lg', 'fxFlexOffset.xl', 'fxFlexOffset.lt-sm', 'fxFlexOffset.lt-md',
  'fxFlexOffset.lt-lg', 'fxFlexOffset.lt-xl', 'fxFlexOffset.gt-xs', 'fxFlexOffset.gt-sm',
  'fxFlexOffset.gt-md', 'fxFlexOffset.gt-lg'
];
const selector = `
  [fxFlexOffset], [fxFlexOffset.xs], [fxFlexOffset.sm], [fxFlexOffset.md],
  [fxFlexOffset.lg], [fxFlexOffset.xl], [fxFlexOffset.lt-sm], [fxFlexOffset.lt-md],
  [fxFlexOffset.lt-lg], [fxFlexOffset.lt-xl], [fxFlexOffset.gt-xs], [fxFlexOffset.gt-sm],
  [fxFlexOffset.gt-md], [fxFlexOffset.gt-lg]
`;

// const selectors = inputs.map(i => `[${i}]`);
// const selector = selectors.join(',');

/**
 * 'flex-offset' flexbox styling directive
 * Configures the 'margin-left' of the element in a layout container
 */
@Directive({selector, inputs})
export class FlexOffsetDirective extends NewBaseDirective implements OnChanges {
  protected DIRECTIVE_KEY = 'flex-offset';

  constructor(protected elRef: ElementRef,
              @Optional() @SkipSelf() protected container: LayoutDirective,
              protected directionality: Directionality,
              protected styleBuilder: FlexOffsetStyleBuilder,
              protected marshal: MediaMarshaller,
              protected styler: StyleUtils) {
    super(elRef, styleBuilder, styler, marshal);
    this.marshal.init(this.elRef.nativeElement, this.DIRECTIVE_KEY,
      this.updateWithValue.bind(this), [this.container ? this.container.layout$ : EMPTY,
        this.directionality.change]);
  }

  // *********************************************
  // Lifecycle Methods
  // *********************************************

  /**
   * For @Input changes on the current mq activation property, see onMediaQueryChanges()
   */
  ngOnChanges(changes: SimpleChanges): void {
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

  /**
   * Using the current fxFlexOffset value, update the inline CSS
   * NOTE: this will assign `margin-left` if the parent flex-direction == 'row',
   *       otherwise `margin-top` is used for the offset.
   */
  updateWithValue(value?: string|number): void {
    value = value || 0;

    // The flex-direction of this element's flex container. Defaults to 'row'.
    const layout = this.getFlexFlowDirection(this.parentElement, true);
    const isRtl = this.directionality.value === 'rtl';
    if (layout === 'row' && isRtl) {
      this.styleCache = flexOffsetCacheRowRtl;
    } else if (layout === 'row' && !isRtl) {
      this.styleCache = flexOffsetCacheRowLtr;
    } else if (layout === 'column' && isRtl) {
      this.styleCache = flexOffsetCacheColumnRtl;
    } else if (layout === 'column' && !isRtl) {
      this.styleCache = flexOffsetCacheColumnLtr;
    }
    this.addStyles((value && (value + '') || ''), {layout});
  }
}

const flexOffsetCacheRowRtl: Map<string, StyleDefinition> = new Map();
const flexOffsetCacheColumnRtl: Map<string, StyleDefinition> = new Map();
const flexOffsetCacheRowLtr: Map<string, StyleDefinition> = new Map();
const flexOffsetCacheColumnLtr: Map<string, StyleDefinition> = new Map();
