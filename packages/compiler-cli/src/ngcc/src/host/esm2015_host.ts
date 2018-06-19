/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import { Decorator } from '../../../ngtsc/host';
import { TypeScriptReflectionHost } from '../../../ngtsc/metadata/src/reflector';
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
  constructor(private checker2: ts.TypeChecker) {
    // if `TypeScriptReflectionHost` made `checker` "protected" then `checker2` would not be needed
    super(checker2);
  }

  /**
   * Parse the declaration and find the decorators that were attached to it.
   * @param declaration A declaration, whose decorators we want.
   */
  getDecoratorsOfDeclaration(declaration: ts.Declaration): Decorator[]|null {
    if (ts.isClassDeclaration(declaration)) {
      return this.getDecoratorsOfClass(declaration);
    } else if (ts.isClassElement(declaration)) {
      return this.getDecoratorsOfMember(declaration);
    } else if (ts.isConstructorDeclaration(declaration)) {
      return this.getDecoratorsOfConstructorParams(declaration);
    }
    return null;
  }

  /**
   * Parse the declaration and find the decorators that were attached to the class.
   * @param declaration A declaration of the class, whose decorators we want.
   */
  getDecoratorsOfClass(declaration: ts.ClassDeclaration) {
    if (declaration.name) {
      const symbol = this.checker2.getSymbolAtLocation(declaration.name);
      if (symbol) {
        if (symbol.exports && symbol.exports.has(DECORATORS)) {

          // Symbol of the identifier for `SomeClass.decorators`.
          const decoratorsSymbol = symbol.exports.get(DECORATORS)!;
          const decoratorsIdentifier = decoratorsSymbol.valueDeclaration;

          if (decoratorsIdentifier && decoratorsIdentifier.parent) {
            if (decoratorsIdentifier && decoratorsIdentifier.parent) {
              // AST of the array of decorator values
              const decoratorsValue = (decoratorsIdentifier.parent as ts.AssignmentExpression<ts.EqualsToken>).right;
              return this.getDecorators(decoratorsValue);
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Parse the declaration and find the decorators that were attached to the member of a class.
   * @param declaration A declaration of the property or method, whose decorators we want.
   */
  getDecoratorsOfMember(declaration: ts.ClassElement) {
    const memberName = declaration.name;
    if (memberName) {
      // We have a member declaration but we need to parse back up the AST to find its containing class,
      // which is what holds the static property that contains the property decorators.
      const classDeclaration = declaration.parent as ts.ClassDeclaration;
      const className = classDeclaration.name;
      if (className) {
        const classSymbol = this.checker2.getSymbolAtLocation(className);
        if (classSymbol) {
          if (classSymbol.exports && classSymbol.exports.get(PROP_DECORATORS)) {
            // Symbol of the identifier for `SomeClass.propDecorators`.
            const propDecoratorsSymbol = classSymbol.exports.get(PROP_DECORATORS)!;
            const propDecoratorsIdentifier = propDecoratorsSymbol.valueDeclaration;
            if (propDecoratorsIdentifier && propDecoratorsIdentifier.parent) {
              // The object literal map containing all the decorators for the properties
              const propDecoratorsMap = (propDecoratorsIdentifier.parent as ts.AssignmentExpression<ts.EqualsToken>).right;
              if (ts.isObjectLiteralExpression(propDecoratorsMap)) {
                // Look for a member of this object literal that has the
                const decoratorForMember = this.findPropertyValue(propDecoratorsMap, memberName.getText());
                if (decoratorForMember) {
                  return this.getDecorators(decoratorForMember);
                }
              }
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Parse the declaration and find the decorators that were attached to the constructor.
   * @param declaration The declaration of the constructor, whose decorators we want.
   */
  getDecoratorsOfConstructorParams(declaration: ts.ConstructorDeclaration): Decorator[]|null {
    throw new Error('Not implemented (GK)');
  }


  private getDecorators(decoratorsArray: ts.Expression) {
    if (decoratorsArray && ts.isArrayLiteralExpression(decoratorsArray)) {
      const decorators: Decorator[] = [];

      // Add each decorator that is imported from `@angular/core` into the `decorators` array
      decoratorsArray.elements.forEach(node => {

        // If the decorator is not an object literal expression then we are not interested
        // TODO(pbd): check whether we need to use some kind of resolver incase the decorators are not always object literals.
        if(ts.isObjectLiteralExpression(node)) {

          // We are only interested in objects of the form: `{ type: DecoratorType, args: [...] }`

          // Is this a `type` property?
          const typeIdentifier = this.findPropertyValue(node, 'type');
          // Is the value of the `type` property an identifier?
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
    return null;
  }

  private findPropertyValue(map: ts.ObjectLiteralExpression, propertyName: string) {
    // Properties could be an identifier or a string literal
    const properties = map.properties.filter(node => ts.isPropertyAssignment(node)) as ts.PropertyAssignment[];
    const property = properties.find(prop => prop.name.getText() === propertyName);
    return property ? property.initializer : null;
  }
}