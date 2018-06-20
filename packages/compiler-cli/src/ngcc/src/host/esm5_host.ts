/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import { ClassMember, Decorator, Parameter, ReflectionHost } from '../../../ngtsc/host';
import { TypeScriptReflectionHost } from '../../../ngtsc/metadata/src/reflector';
import { NgccReflectionHost } from './ngcc_host';

/**
 * ESM5 packages contain ECMAScript IIFE functions that act like classes. For example:
 *
 * ```
 * var CommonModule = (function () {
 *  function CommonModule() {
 *  }
 *  CommonModule.decorators = [ ... ];
 * ```
 *
 * Items are decorated if they have a static property called `decorators`.
 *
 */
export class Esm5ReflectionHost extends TypeScriptReflectionHost implements NgccReflectionHost {
  constructor(checker: ts.TypeChecker) {
    super(checker);
  }

  getDecoratorsOfDeclaration(declaration: ts.Declaration): Decorator[]|null {
    // This is different to ES2015 and TS
    throw new Error('Not implemented');
  }

  isClass(node: ts.Node): node is ts.Declaration {
    // Is this enough? Perhaps we should also check that the initializer is an IIFE?
    return ts.isFunctionDeclaration(node) && startsWithUppercase(node.name);
  }

  getClassDecorators(classSymbol: ts.Symbol): Decorator[] {
    throw new Error("Method not implemented.");
  }
  getMemberDecorators(classSymbol: ts.Symbol): Map<string, Decorator[]> {
    throw new Error("Method not implemented.");
  }
  getConstructorParamDecorators(classSymbol: ts.Symbol): Map<string, Decorator[]> {
    throw new Error("Method not implemented.");
  }
  getMembersOfClass(clazz: ts.Declaration): ClassMember[] {
    throw new Error("Method not implemented.");
  }
  getConstructorParameters(declaration: ts.Declaration): Parameter[] | null {
    throw new Error("Method not implemented.");
  }
}

function startsWithUppercase(name: ts.Identifier|undefined) {
  return !!name && /^[A-Z]/.test(name.getText());
}