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
import {Observable, ReplaySubject} from 'rxjs';

import {buildLayoutCSS} from '../../utils/layout-validator';

export type Layout = {
  direction: string;
  wrap: boolean;
};

export interface LayoutParent {
  announcer: ReplaySubject<Layout>;
}

@Injectable({providedIn: 'root'})
export class LayoutStyleBuilder extends StyleBuilder {
  buildStyles(input: string, _parent: LayoutParent) {
    const styles = buildLayoutCSS(input);
    return styles;
  }
  sideEffect(_input: string, styles: StyleDefinition, parent: LayoutParent) {
    parent.announcer.next({
      direction: styles['flex-direction'] as string,
      wrap: !!styles['flex-wrap'] && styles['flex-wrap'] !== 'nowrap'
    });
  }
}

const inputs = [
  'fxLayout', 'fxLayout.xs', 'fxLayout.sm', 'fxLayout.md',
  'fxLayout.lg', 'fxLayout.xl', 'fxLayout.lt-sm', 'fxLayout.lt-md',
  'fxLayout.lt-lg', 'fxLayout.lt-xl', 'fxLayout.gt-xs', 'fxLayout.gt-sm',
  'fxLayout.gt-md', 'fxLayout.gt-lg'
];
const selector = `
  [fxLayout], [fxLayout.xs], [fxLayout.sm], [fxLayout.md],
  [fxLayout.lg], [fxLayout.xl], [fxLayout.lt-sm], [fxLayout.lt-md],
  [fxLayout.lt-lg], [fxLayout.lt-xl], [fxLayout.gt-xs], [fxLayout.gt-sm],
  [fxLayout.gt-md], [fxLayout.gt-lg]
`;

/**
 * 'layout' flexbox styling directive
 * Defines the positioning flow direction for the child elements: row or column
 * Optional values: column or row (default)
 * @see https://css-tricks.com/almanac/properties/f/flex-direction/
 *
 */
@Directive({selector, inputs})
export class LayoutDirective extends NewBaseDirective implements OnChanges {

  /**
   * Create Observable for nested/child 'flex' directives. This allows
   * child flex directives to subscribe/listen for flexbox direction changes.
   */
  protected announcer: ReplaySubject<Layout>;

  protected DIRECTIVE_KEY = 'layout';

  /**
   * Publish observer to enabled nested, dependent directives to listen
   * to parent 'layout' direction changes
   */
  layout$: Observable<Layout>;

  constructor(protected elRef: ElementRef,
              protected styleUtils: StyleUtils,
              protected styleBuilder: LayoutStyleBuilder,
              protected marshal: MediaMarshaller) {
    super(elRef, styleBuilder, styleUtils, marshal);
    this.marshal.init(this.elRef.nativeElement, this.DIRECTIVE_KEY,
      this.updateWithValue.bind(this));
    this.announcer = new ReplaySubject<Layout>(1);
    this.layout$ = this.announcer.asObservable();
  }

  // *********************************************
  // Lifecycle Methods
  // *********************************************

  /**
   * On changes to any @Input properties...
   * Default to use the non-responsive Input value ('fxLayout')
   * Then conditionally override with the mq-activated Input's current value
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

  /** Validate the direction value and then update the host's inline flexbox styles */
  protected updateWithValue(value: string) {
    this.addStyles(value, {announcer: this.announcer});
  }

  protected _styleCache = layoutCache;
}

const layoutCache: Map<string, StyleDefinition> = new Map();
