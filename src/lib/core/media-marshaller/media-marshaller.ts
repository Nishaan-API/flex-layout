/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Injectable} from '@angular/core';
import {merge, Observable, Subscription} from 'rxjs';
import {BreakPoint} from '../breakpoints/break-point';
import {BreakPointRegistry} from '../breakpoints/break-point-registry';
import {MatchMedia} from '../match-media/match-media';
import {MediaChange} from '../media-change';

type ValueMap = Map<string, string>;
type BreakpointMap = Map<string, ValueMap>;
type ElementMap = Map<HTMLElement, BreakpointMap>;
type WatcherMap = WeakMap<HTMLElement, Subscription>;
type BuilderMap = Map<HTMLElement, Map<string, Function>>;

/**
 * MediaMarshaller - marshal MatchMedia events to their respective directives
 */
@Injectable({providedIn: 'root'})
export class MediaMarshaller {
  private activatedBreakpoints: BreakPoint[] = [];
  private elementMap: ElementMap = new Map();
  private watcherMap: WatcherMap = new WeakMap();
  private builderMap: BuilderMap = new Map();

  get activatedBreakpoint(): string {
    return this.activatedBreakpoints[0] ? this.activatedBreakpoints[0].alias : '';
  }

  constructor(protected matchMedia: MatchMedia,
              protected breakpoints: BreakPointRegistry) {
    this.matchMedia
      .observe()
      .subscribe((mc: MediaChange) => this.activate(mc));
  }

  /**
   * activate or deactivate a given breakpoint
   * @param mc
   */
  activate(mc: MediaChange) {
    const bp: BreakPoint | null = this.findByQuery(mc.mediaQuery);
    if (mc.matches && bp) {
      this.activatedBreakpoints.push(bp);
      this.activatedBreakpoints.sort((a, b) => {
        const priorityA = a.priority || 0;
        const priorityB = b.priority || 0;
        return priorityB - priorityA;
      });
    } else if (!mc.matches && bp) {
      this.activatedBreakpoints.splice(this.activatedBreakpoints.indexOf(bp), 1);
    }
    this.updateStyles();
  }

  /**
   * initialize the marshaller with necessary elements for delegation on an element
   * @param element
   * @param key
   * @param builder optional so that custom bp directives don't have to re-provide this
   * @param observables
   */
  init(element: HTMLElement,
       key: string,
       builder?: Function,
       observables?: Observable<any>[]): void {
    if (builder) {
      let builders = this.builderMap.get(element);
      if (!builders) {
        builders = new Map();
        this.builderMap.set(element, builders);
      }
      builders.set(key, builder);
    }
    if (observables && !this.watcherMap.get(element)) {
      const subscription = merge(...observables).subscribe(() => {
        const currentValue = this.getValue(element, key);
        this.updateElement(element, key, currentValue);
      });
      this.watcherMap.set(element, subscription);
    }
  }

  /**
   * get the value for an element and key and optionally a given breakpoint
   * @param element
   * @param key
   */
  getValue(element: HTMLElement, key: string): string {
    const bpMap = this.elementMap.get(element);
    if (bpMap) {
      const values = this.getFallback(bpMap);
      if (values) {
        return values.get(key) || '';
      }
    }
    return '';
  }

  /**
   * Set the value for an input on a directive
   * @param element the element in question
   * @param key the type of the directive (e.g. flex, layout-gap, etc)
   * @param bp the breakpoint suffix (empty string = default)
   * @param val the value for the breakpoint
   */
  setValue(element: HTMLElement, key: string, val: any, bp: string): void {
    let bpMap: BreakpointMap | undefined = this.elementMap.get(element);
    if (!bpMap) {
      bpMap = new Map().set(bp, new Map().set(key, val));
      this.elementMap.set(element, bpMap);
    } else {
      const values = (bpMap.get(bp) || new Map()).set(key, val);
      bpMap.set(bp, values);
      this.elementMap.set(element, bpMap);
    }
    this.updateElement(element, key, this.getValue(element, key));
  }

  /** update all styles for all elements on the current breakpoint */
  updateStyles(): void {
    this.elementMap.forEach((bpMap, el) => {
      const valueMap = this.getFallback(bpMap);
      if (valueMap) {
        valueMap.forEach((v, k) => this.updateElement(el, k, v));
      }
    });
  }

  /**
   * update a given element with the activated values for a given key
   * @param element
   * @param key
   * @param val
   */
  updateElement(element: HTMLElement, key: string, val: any): void {
    const builders = this.builderMap.get(element);
    if (builders) {
      const builder = builders.get(key);
      if (builder) {
        builder(val);
      }
    }
  }

  destroy(): void {
  }

  /** Breakpoint locator by mediaQuery */
  private findByQuery(query: string) {
    return this.breakpoints.findByQuery(query);
  }

  /**
   * get the fallback breakpoint for a given element, starting with the current breakpoint
   * @param bpMap
   */
  private getFallback(bpMap: BreakpointMap): ValueMap | undefined {
    for (let i = 0; i < this.activatedBreakpoints.length; i++) {
      const activatedBp = this.activatedBreakpoints[i];
      const valueMap = bpMap.get(activatedBp.alias);
      if (valueMap) {
        return valueMap;
      }
    }
    return bpMap.get('');
  }
}
