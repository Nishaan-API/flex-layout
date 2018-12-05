/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Directive, ElementRef, Input, Optional, Injectable} from '@angular/core';
import {
  NewBaseDirective,
  StyleUtils,
  MediaMarshaller,
  StyleBuilder
} from '@angular/flex-layout/core';
import {coerceBooleanProperty} from '@angular/cdk/coercion';

const DEFAULT_VALUE = '0';

export interface GridGapParent {
  inline: boolean;
}

@Injectable({providedIn: 'root'})
export class GridGapStyleBuilder extends StyleBuilder {
  buildStyles(input: string, parent: GridGapParent) {
    return {
      'display': parent.inline ? 'inline-grid' : 'grid',
      'grid-gap': input
    };
  }
}

export class GridGapDirective extends NewBaseDirective {
  protected DIRECTIVE_KEY = 'grid-gap';

  @Input('gdInline')
  get inline(): boolean { return this._inline; }
  set inline(val: boolean) { this._inline = coerceBooleanProperty(val); }
  protected _inline = false;

  constructor(protected elRef: ElementRef,
              protected styleUtils: StyleUtils,
              // NOTE: not actually optional, but we need to force DI without a
              // constructor call
              @Optional() protected styleBuilder: GridGapStyleBuilder,
              protected marshal: MediaMarshaller) {
    super(elRef, styleBuilder, styleUtils, marshal);
    this.marshal.init(this.elRef.nativeElement, this.DIRECTIVE_KEY,
      this.updateWithValue.bind(this));
  }

  // *********************************************
  // Protected methods
  // *********************************************

  protected updateWithValue(value?: string) {
    value = value || DEFAULT_VALUE;
    this.addStyles(value, {inline: this.inline});
  }
}

const inputs = [
  'gdGap',
  'gdGap.xs', 'gdGap.sm', 'gdGap.md', 'gdGap.lg', 'gdGap.xl',
  'gdGap.lt-sm', 'gdGap.lt-md', 'gdGap.lt-lg', 'gdGap.lt-xl',
  'gdGap.gt-xs', 'gdGap.gt-sm', 'gdGap.gt-md', 'gdGap.gt-lg'
];

const selector = `
  [gdGap],
  [gdGap.xs], [gdGap.sm], [gdGap.md], [gdGap.lg], [gdGap.xl],
  [gdGap.lt-sm], [gdGap.lt-md], [gdGap.lt-lg], [gdGap.lt-xl],
  [gdGap.gt-xs], [gdGap.gt-sm], [gdGap.gt-md], [gdGap.gt-lg]
`;

/**
 * 'grid-gap' CSS Grid styling directive
 * Configures the gap between items in the grid
 * Syntax: <row gap> [<column-gap>]
 * @see https://css-tricks.com/snippets/css/complete-guide-grid/#article-header-id-17
 */
@Directive({selector, inputs})
export class DefaultGridGapDirective extends GridGapDirective {
  protected inputs = inputs;
}
