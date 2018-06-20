/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import { Decorator } from '../../../ngtsc/host';
import { TypeScriptReflectionHost, reflectObjectLiteral } from '../../../ngtsc/metadata/src/reflector';
import { NgccReflectionHost } from './ngcc_host';

const DECORATORS = 'decorators' as ts.__String;
const PROP_DECORATORS = 'propDecorators' as ts.__String;

/**
 * Esm2015 packages contain ECMAScript 2015 classes, etc.
 * Decorators are static properties on the class. For example:
 *
 * ```
 * class NgForOf {
 * }
 * NgForOf.decorators = [
 *     { type: Directive, args: [{ selector: '[ngFor][ngForOf]' },] }
 * ];
 * NgForOf.ctorParameters = () => [
 *   { type: ViewContainerRef, },
 *   { type: TemplateRef, },
 *   { type: IterableDiffers, },
 * ];
 * NgForOf.propDecorators = {
 *   "ngForOf": [{ type: Input },],
 *   "ngForTrackBy": [{ type: Input },],
 *   "ngForTemplate": [{ type: Input },],
 * };
 * ```
 *
 * Items are decorated if they have a static property called `decorators`.
 *
 */
export class Esm2015ReflectionHost extends TypeScriptReflectionHost implements NgccReflectionHost {
  constructor(checker: ts.TypeChecker) {
    super(checker);
  }

  /**
   * Parse the declaration and find the decorators that were attached to it.
   * @param declaration A declaration, whose decorators we want.
   */
  getDecoratorsOfDeclaration(declaration: ts.Declaration): Decorator[]|null {
    if (ts.isClassDeclaration(declaration)) {
      if (declaration.name) {
        const symbol = this.checker.getSymbolAtLocation(declaration.name);
        if (symbol) {
          return this.getClassDecorators(symbol);
        }
      }
    }
    return null;
  }

  isClass(node: ts.Node): node is ts.Declaration {
    return ts.isClassDeclaration(node);
  }

  getClassDecorators(classSymbol: ts.Symbol) {
    if (classSymbol.exports && classSymbol.exports.has(DECORATORS)) {

      // Symbol of the identifier for `SomeClass.decorators`.
      const decoratorsSymbol = classSymbol.exports.get(DECORATORS)!;
      const decoratorsIdentifier = decoratorsSymbol.valueDeclaration;

      if (decoratorsIdentifier && decoratorsIdentifier.parent) {
        // AST of the array of decorator values
        const decoratorsArray = (decoratorsIdentifier.parent as ts.AssignmentExpression<ts.EqualsToken>).right;
        return this.getDecorators(decoratorsArray);
      }
    }
    return [];
  }

  getMemberDecorators(classSymbol: ts.Symbol) {
    const memberDecorators = new Map<string, Decorator[]>();
    if (classSymbol.exports && classSymbol.exports.get(PROP_DECORATORS)) {

      // Symbol of the identifier for `SomeClass.propDecorators`.
      const propDecoratorsMap = getPropertyValueFromSymbol(classSymbol.exports.get(PROP_DECORATORS)!);
      if (propDecoratorsMap && ts.isObjectLiteralExpression(propDecoratorsMap)) {
        const propertiesMap = reflectObjectLiteral(propDecoratorsMap);
        propertiesMap.forEach((value, name) => {
          memberDecorators.set(name, this.getDecorators(value));
        });
      }
    }
    return memberDecorators;
  }

  /**
   * Parse the declaration and find the decorators that were attached to the constructor.
   * @param declaration The declaration of the constructor, whose decorators we want.
   */
  getConstructorParamDecorators(classSymbol: ts.Symbol): Map<string, Decorator[]> {

    throw new Error('Not implemented (GK)');
  }


  private getDecorators(decoratorsArray: ts.Expression) {
    if (decoratorsArray && ts.isArrayLiteralExpression(decoratorsArray)) {
      const decorators: Decorator[] = [];

      // Add each decorator that is imported from `@angular/core` into the `decorators` array
      decoratorsArray.elements.forEach(node => {

        // If the decorator is not an object literal expression then we are not interested
        if(ts.isObjectLiteralExpression(node)) {
          // We are only interested in objects of the form: `{ type: DecoratorType, args: [...] }`
          const decorator = reflectObjectLiteral(node);

          // Is the value of the `type` property an identifier?
          const typeIdentifier = decorator.get('type');
          if (typeIdentifier && ts.isIdentifier(typeIdentifier)) {

            // Was the identifier was imported from `@angular/core`?
            const importInfo = this.getImportOfIdentifier(typeIdentifier);
            // Get the args for the decorator
            const argsProperty = node.properties.filter(ts.isPropertyAssignment).find(property => property.name.getText() === 'args');
            const argsExpression = argsProperty && argsProperty.initializer;
            const args = (argsExpression && ts.isArrayLiteralExpression(argsExpression)) ? Array.from(argsExpression.elements) : null;

            const decorator: Decorator = { name: typeIdentifier.getText(), import: importInfo, node, args };
            decorators.push(decorator);
          }
        }
      });
      return decorators;
    }
    return [];
  }
}

function getPropertyValueFromSymbol(propSymbol: ts.Symbol) {
  const propIdentifier = propSymbol.valueDeclaration;
  if (propIdentifier && propIdentifier.parent) {
    return (propIdentifier.parent as ts.AssignmentExpression<ts.EqualsToken>).right;
  }
}