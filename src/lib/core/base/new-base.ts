/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {ElementRef} from '@angular/core';

import {StyleDefinition, StyleUtils} from '../style-utils/style-utils';
import {StyleBuilder} from '../style-builder/style-builder';
import {MediaMarshaller} from '../media-marshaller/media-marshaller';
import {buildLayoutCSS} from '../../utils/layout-validator';

export abstract class NewBaseDirective {

  protected DIRECTIVE_KEY = '';

  /** Access to host element's parent DOM node */
  protected get parentElement(): any {
    return this.elementRef.nativeElement.parentNode;
  }

  protected get nativeElement(): HTMLElement {
    return this.elementRef.nativeElement;
  }

  /** Cache map for style computation */
  protected styleCache: Map<string, StyleDefinition> = new Map();

  protected constructor(protected elementRef: ElementRef,
                        protected styleBuilder: StyleBuilder,
                        protected styler: StyleUtils,
                        protected marshal: MediaMarshaller) {
  }

  /** Add styles to the element using predefined style builder */
  protected addStyles(input: string, parent?: Object) {
    const builder = this.styleBuilder;
    const useCache = builder.shouldCache;

    let genStyles: StyleDefinition | undefined = this.styleCache.get(input);

    if (!genStyles || !useCache) {
      genStyles = builder.buildStyles(input, parent);
      if (useCache) {
        this.styleCache.set(input, genStyles);
      }
    }

    this.applyStyleToElement(genStyles);
    builder.sideEffect(input, genStyles, parent);
  }

  /**
   * Determine the DOM element's Flexbox flow (flex-direction).
   *
   * Check inline style first then check computed (stylesheet) style.
   * And optionally add the flow value to element's inline style.
   */
  protected getFlexFlowDirection(target: HTMLElement, addIfMissing = false): string {
    if (target) {
      let [value, hasInlineValue] = this.styler.getFlowDirection(target);

      if (!hasInlineValue && addIfMissing) {
        const style = buildLayoutCSS(value);
        const elements = [target];
        this.styler.applyStyleToElements(style, elements);
      }

      return value.trim();
    }

    return 'row';
  }

  /** Applies styles given via string pair or object map to the directive element */
  protected applyStyleToElement(style: StyleDefinition,
                                value?: string | number,
                                element: HTMLElement = this.nativeElement) {
    this.styler.applyStyleToElement(element, style, value);
  }

  protected setValue(val: any, bp: string): void {
    this.marshal.setValue(this.nativeElement, this.DIRECTIVE_KEY, val, bp);
  }
}
