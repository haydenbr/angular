/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import { resolve } from 'path';
import { Esm2015ReflectionHost } from '../../../../src/ngcc/src/host/esm2015_host';

describe('Esm2015ReflectionHost', () => {
  let program: ts.Program;
  let host: Esm2015ReflectionHost;
  let file: ts.SourceFile;

  beforeEach(() => {
    const packagePath = resolve(process.env.TEST_SRCDIR, 'angular/packages/compiler-cli/test/ngcc/unit/host/test_files/fesm2015');
    const entryPointPath = resolve(packagePath, 'test.js');
    program = createProgram(packagePath, entryPointPath);
    host = new Esm2015ReflectionHost(program.getTypeChecker());
    file = program.getSourceFile(entryPointPath)!;
  });

  describe('getDecoratorsOfDeclaration()', () => {
    it('should find the decorators on a class', () => {
      const classNode = getNode('NgForOf');
      const decorators = host.getDecoratorsOfDeclaration(classNode)!;
      expect(decorators).toBeDefined();
      expect(decorators.length).toEqual(1);

      const decorator = decorators[0];
      expect(decorator.name).toEqual('Directive');
      expect(decorator.import).toEqual({ name: 'Directive', from: '@angular/core' });
      expect(decorator.args!.map(arg => arg.getText())).toEqual([
        `{ selector: '[ngFor][ngForOf]' }`
      ]);
    });
  });

  describe('getClassDecorators()', () => {
    it('should find the decorators on a class', () => {
      const classSymbol = getSymbol('NgForOf');

      const decorators = host.getClassDecorators(classSymbol);
      expect(decorators).toBeDefined();
      expect(decorators.length).toEqual(1);

      const decorator = decorators[0];
      expect(decorator.name).toEqual('Directive');
      expect(decorator.import).toEqual({ name: 'Directive', from: '@angular/core' });
      expect(decorator.args!.map(arg => arg.getText())).toEqual([
        `{ selector: '[ngFor][ngForOf]' }`
      ]);
    });

    it('should return an empty array if there are no decorators', () => {
      const classSymbol = getSymbol('SimpleClass');
      const decorators = host.getClassDecorators(classSymbol);
      expect(decorators).toEqual([]);
    });

    it('should return an empty array if the symbol is not a class', () => {
      const functionSymbol = getSymbol('foo');
      const decorators = host.getClassDecorators(functionSymbol);
      expect(decorators).toEqual([]);
    });
  });


  function createProgram(packagePath: string, entryPointPath: string) {
    const options: ts.CompilerOptions = { allowJs: true, rootDir: packagePath };
    const host = ts.createCompilerHost(options);
    return ts.createProgram([entryPointPath], options, host);
  }

  function getNode(name: string) {
    let namedNode: ts.NamedDeclaration;
    const walk = (rootNode: ts.Node) => {
      ts.forEachChild(rootNode, node => {
        if (isNamedDeclaration(node) && node.name!.getText() === name) {
          namedNode = node;
        } else {
          walk(node);
        }
      });
    };
    walk(file);
    return namedNode!;
  }

  function isNamedDeclaration(node: ts.Node): node is ts.NamedDeclaration {
    return ((node as any).name);
  }

  function getSymbol(name: string) {
    const node = getNode(name);
    return program.getTypeChecker().getSymbolAtLocation(node.name!)!;
  }
});
