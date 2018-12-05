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
  Inject,
  Injectable,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import {
  NewBaseDirective,
  LayoutConfigOptions,
  LAYOUT_CONFIG,
  StyleUtils,
  validateBasis,
  StyleBuilder,
  StyleDefinition,
  MediaMarshaller,
} from '@angular/flex-layout/core';
import {Subscription} from 'rxjs';

import {extendObject} from '../../utils/object-extend';
import {isFlowHorizontal} from '../../utils/layout-validator';

interface FlexBuilderParent {
  direction: string;
  hasWrap: boolean;
}

@Injectable({providedIn: 'root'})
export class FlexStyleBuilder extends StyleBuilder {
  constructor(@Inject(LAYOUT_CONFIG) protected layoutConfig: LayoutConfigOptions) {
    super();
  }
  buildStyles(input: string, parent: FlexBuilderParent) {
    let [grow, shrink, ...basisParts]: (string|number)[] = input.split(' ');
    let basis = basisParts.join(' ');

    // The flex-direction of this element's flex container. Defaults to 'row'.
    const direction = (parent.direction.indexOf('column') > -1) ? 'column' : 'row';

    const max = isFlowHorizontal(direction) ? 'max-width' : 'max-height';
    const min = isFlowHorizontal(direction) ? 'min-width' : 'min-height';

    const hasCalc = String(basis).indexOf('calc') > -1;
    const usingCalc = hasCalc || (basis === 'auto');
    const isPercent = String(basis).indexOf('%') > -1 && !hasCalc;
    const hasUnits = String(basis).indexOf('px') > -1 || String(basis).indexOf('em') > -1 ||
      String(basis).indexOf('vw') > -1 || String(basis).indexOf('vh') > -1;
    const isPx = String(basis).indexOf('px') > -1 || usingCalc;

    let isValue = (hasCalc || hasUnits);

    grow = (grow == '0') ? 0 : grow;
    shrink = (shrink == '0') ? 0 : shrink;

    // make box inflexible when shrink and grow are both zero
    // should not set a min when the grow is zero
    // should not set a max when the shrink is zero
    const isFixed = !grow && !shrink;

    let css: {[key: string]: string | number | null} = {};

    // flex-basis allows you to specify the initial/starting main-axis size of the element,
    // before anything else is computed. It can either be a percentage or an absolute value.
    // It is, however, not the breaking point for flex-grow/shrink properties
    //
    // flex-grow can be seen as this:
    //   0: Do not stretch. Either size to element's content width, or obey 'flex-basis'.
    //   1: (Default value). Stretch; will be the same size to all other flex items on
    //       the same row since they have a default value of 1.
    //   ≥2 (integer n): Stretch. Will be n times the size of other elements
    //      with 'flex-grow: 1' on the same row.

    // Use `null` to clear existing styles.
    const clearStyles = {
      'max-width': null,
      'max-height': null,
      'min-width': null,
      'min-height': null
    };
    switch (basis || '') {
      case '':
        const useColumnBasisZero = this.layoutConfig.useColumnBasisZero !== false;
        basis = direction === 'row' ? '0%' : (useColumnBasisZero ? '0.000000001px' : 'auto');
        break;
      case 'initial':   // default
      case 'nogrow':
        grow = 0;
        basis = 'auto';
        break;
      case 'grow':
        basis = '100%';
        break;
      case 'noshrink':
        shrink = 0;
        basis = 'auto';
        break;
      case 'auto':
        break;
      case 'none':
        grow = 0;
        shrink = 0;
        basis = 'auto';
        break;
      default:
        // Defaults to percentage sizing unless `px` is explicitly set
        if (!isValue && !isPercent && !isNaN(basis as any)) {
          basis = basis + '%';
        }

        // Fix for issue 280
        if (basis === '0%') {
          isValue = true;
        }

        if (basis === '0px') {
          basis = '0%';
        }

        // fix issue #5345
        if (hasCalc) {
          css = extendObject(clearStyles, {
            'flex-grow': grow,
            'flex-shrink': shrink,
            'flex-basis': isValue ? basis : '100%'
          });
        } else {
          css = extendObject(clearStyles, {
            'flex': `${grow} ${shrink} ${isValue ? basis : '100%'}`
          });
        }

        break;
    }

    if (!(css['flex'] || css['flex-grow'])) {
      if (hasCalc) {
        css = extendObject(clearStyles, {
          'flex-grow': grow,
          'flex-shrink': shrink,
          'flex-basis': basis
        });
      } else {
        css = extendObject(clearStyles, {
          'flex': `${grow} ${shrink} ${basis}`
        });
      }
    }

    // Fix for issues 277, 534, and 728
    if (basis !== '0%' && basis !== '0px' && basis !== '0.000000001px' && basis !== 'auto') {
      css[min] = isFixed || (isPx && grow) ? basis : null;
      css[max] = isFixed || (!usingCalc && shrink) ? basis : null;
    }

    // Fix for issue 528
    if (!css[min] && !css[max]) {
      if (hasCalc) {
        css = extendObject(clearStyles, {
          'flex-grow': grow,
          'flex-shrink': shrink,
          'flex-basis': basis
        });
      } else {
        css = extendObject(clearStyles, {
          'flex': `${grow} ${shrink} ${basis}`
        });
      }
    } else {
      // Fix for issue 660
      if (parent.hasWrap) {
        css[hasCalc ? 'flex-basis' : 'flex'] = css[max] ?
          (hasCalc ? css[max] : `${grow} ${shrink} ${css[max]}`) :
          (hasCalc ? css[min] : `${grow} ${shrink} ${css[min]}`);
      }
    }

    return extendObject(css, {'box-sizing': 'border-box'}) as StyleDefinition;
  }
}

const inputs = [
  'fxFlex', 'fxFlex.xs', 'fxFlex.sm', 'fxFlex.md',
  'fxFlex.lg', 'fxFlex.xl', 'fxFlex.lt-sm', 'fxFlex.lt-md',
  'fxFlex.lt-lg', 'fxFlex.lt-xl', 'fxFlex.gt-xs', 'fxFlex.gt-sm',
  'fxFlex.gt-md', 'fxFlex.gt-lg', 'fxShrink', 'fxGrow'
];
const selector = `
  [fxFlex], [fxFlex.xs], [fxFlex.sm], [fxFlex.md],
  [fxFlex.lg], [fxFlex.xl], [fxFlex.lt-sm], [fxFlex.lt-md],
  [fxFlex.lt-lg], [fxFlex.lt-xl], [fxFlex.gt-xs], [fxFlex.gt-sm],
  [fxFlex.gt-md], [fxFlex.gt-lg]
`;

/**
 * Directive to control the size of a flex item using flex-basis, flex-grow, and flex-shrink.
 * Corresponds to the css `flex` shorthand property.
 *
 * @see https://css-tricks.com/snippets/css/a-guide-to-flexbox/
 */
export class FlexDirective extends NewBaseDirective implements OnDestroy {

  /**
   * Subscription to the parent flex container's layout changes.
   * Stored so we can unsubscribe when this directive is destroyed.
   */
  protected layoutWatcher?: Subscription;

  protected DIRECTIVE_KEY = 'flex';
  protected direction = '';
  protected wrap = false;
  protected flexGrow = '1';
  protected flexShrink = '1';

  // Note: Explicitly @SkipSelf on LayoutDirective because we are looking
  //       for the parent flex container for this flex item.
  constructor(protected elRef: ElementRef,
              protected styleUtils: StyleUtils,
              @Inject(LAYOUT_CONFIG) protected layoutConfig: LayoutConfigOptions,
              protected styleBuilder: FlexStyleBuilder,
              protected marshal: MediaMarshaller) {
    super(elRef, styleBuilder, styleUtils, marshal);
    this.marshal.init(this.elRef.nativeElement, this.DIRECTIVE_KEY,
      this.updateStyle.bind(this));
    if (this.parentElement) {
      this.layoutWatcher = this.marshal.trackValue(this.parentElement, 'layout')
        .subscribe(this.onLayoutChange.bind(this));
    }
  }

  ngOnDestroy() {
    if (this.layoutWatcher) {
      this.layoutWatcher.unsubscribe();
    }
  }

  /**
   * Caches the parent container's 'flex-direction' and updates the element's style.
   * Used as a handler for layout change events from the parent flex container.
   */
  protected onLayoutChange(layout: string) {
    const layoutParts = layout.split(' ');
    this.direction = layoutParts[0];
    this.wrap = layoutParts[1] !== undefined && layoutParts[1] === 'wrap';
    this.updateStyle(this.marshal.getValue(this.nativeElement, this.DIRECTIVE_KEY));
  }

  /** Input to this is exclusively the basis input value */
  protected updateStyle(value: string) {
    const addFlexToParent = this.layoutConfig.addFlexToParent !== false;
    const direction = this.getFlexFlowDirection(this.parentElement!, addFlexToParent);
    const hasWrap = this.wrap;
    if (direction === 'row' && hasWrap) {
      this.styleCache = flexRowWrapCache;
    } else if (direction === 'row' && !hasWrap) {
      this.styleCache = flexRowCache;
    } else if (direction === 'column' && hasWrap) {
      this.styleCache = flexColumnWrapCache;
    } else if (direction === 'column' && !hasWrap) {
      this.styleCache = flexColumnCache;
    }
    const basis = String(value).replace(';', '');
    const parts = validateBasis(basis, this.flexGrow, this.flexShrink);
    this.addStyles(parts.join(' '), {direction, hasWrap});
  }
}

@Directive({inputs, selector})
export class DefaultFlexDirective extends FlexDirective implements OnChanges {
  protected inputs = inputs
    .filter(s => s !== 'fxShrink')
    .filter(s => s !== 'fxGrow');

  /**
   * For @Input changes on the current mq activation property, see onMediaQueryChanges()
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['fxGrow'] !== undefined) {
      this.flexGrow = changes['fxGrow'].currentValue || '1';
      const parts = validateBasis(this.activatedValue, this.flexGrow, this.flexShrink);
      this.marshal.updateElement(this.nativeElement, this.DIRECTIVE_KEY, parts.join(' '));
    }
    if (changes['fxShrink'] !== undefined) {
      this.flexShrink = changes['fxShrink'].currentValue || '1';
      const parts = validateBasis(this.activatedValue, this.flexGrow, this.flexShrink);
      this.marshal.updateElement(this.nativeElement, this.DIRECTIVE_KEY, parts.join(' '));
    }
    super.ngOnChanges(changes);
  }
}

const flexRowCache: Map<string, StyleDefinition> = new Map();
const flexColumnCache: Map<string, StyleDefinition> = new Map();
const flexRowWrapCache: Map<string, StyleDefinition> = new Map();
const flexColumnWrapCache: Map<string, StyleDefinition> = new Map();
