/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Inject, Injectable, Optional} from '@angular/core';
import {APP_BASE_HREF, LocationStrategy} from './location_strategy';
import {LocationChangeListener, PlatformLocation} from './platform_location';
import {joinWithSlash, normalizeQueryParams} from './util';



/**
 * @description
 * A {@link LocationStrategy} used to configure the {@link Location} service to
 * represent its state in the
 * [hash fragment](https://en.wikipedia.org/wiki/Uniform_Resource_Locator#Syntax)
 * of the browser's URL.
 *
 * For instance, if you call `location.go('/foo')`, the browser's URL will become
 * `example.com#/foo`.
 *
 * @usageNotes
 *
 * ### Example
 *
 * {@example common/location/ts/hash_location_component.ts region='LocationComponent'}
 *
 * @publicApi
 */
@Injectable()
export class HashLocationStrategy extends LocationStrategy {
  private _baseHref: string = '';
  constructor(
      private _platformLocation: PlatformLocation,
      @Optional() @Inject(APP_BASE_HREF) _baseHref?: string) {
    super();
    if (_baseHref != null) {
      this._baseHref = _baseHref;
    }
  }

  onPopState(fn: LocationChangeListener): void {
    this._platformLocation.onPopState(fn);
    this._platformLocation.onHashChange(fn);
  }

  getBaseHref(): string { return this._baseHref; }

  path(includeHash: boolean = false): string {
    // the hash value is always prefixed with a `#`
    // and if it is empty then it will stay empty
    let path = this._platformLocation.hash;
    if (path == null) path = '#';

    return path.length > 0 ? path.substring(1) : path;
  }

  prepareExternalUrl(internal: string): string {
    const url = joinWithSlash(this._baseHref, internal);
    // equivalnt to location.origin + location.pathname
    const baseUrl = this._platformLocation.protocol + '//' + this._platformLocation.hostname +
        (!!this._platformLocation.port ? ':' + this._platformLocation.port : '') +
        this._platformLocation.pathname + this._platformLocation.search;

    return url.length > 0 ? baseUrl + '#' + url : baseUrl;
  }

  pushState(state: any, title: string, path: string, queryParams: string) {
    let url = this.prepareExternalUrl(path + normalizeQueryParams(queryParams));

    this._platformLocation.pushState(state, title, url);
  }

  replaceState(state: any, title: string, path: string, queryParams: string) {
    let url = this.prepareExternalUrl(path + normalizeQueryParams(queryParams));

    this._platformLocation.replaceState(state, title, url);
  }

  forward(): void { this._platformLocation.forward(); }

  back(): void { this._platformLocation.back(); }
}
