/**
 * @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
import { Directive } from '@angular/core';

class NgForOf {
}
NgForOf.decorators = [
    { type: Directive, args: [{ selector: '[ngFor][ngForOf]' },] }
];
NgForOf.ctorParameters = () => [
  { type: ViewContainerRef, },
  { type: TemplateRef, },
  { type: IterableDiffers, },
];
NgForOf.propDecorators = {
  "ngForOf": [{ type: Input },],
  "ngForTrackBy": [{ type: Input },],
  "ngForTemplate": [{ type: Input },],
};

class SimpleClass {
}

function foo() {

}