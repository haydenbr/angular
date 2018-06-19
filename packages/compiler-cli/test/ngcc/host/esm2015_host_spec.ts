/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import { resolve } from 'path';
import { Esm2015ReflectionHost } from '../../../src/ngcc/src/host/esm2015_host';

describe('Esm2015ReflectionHost', () => {
  let program: ts.Program;
  let host: Esm2015ReflectionHost;
  let file: ts.SourceFile;

  beforeEach(() => {
    const packagePath = resolve(process.env.TEST_SRCDIR, 'angular/packages/compiler-cli/test/ngcc/host/test_files');
    const entryPointPath = resolve(packagePath, 'test.js');
    program = createProgram(packagePath, entryPointPath);
    host = new Esm2015ReflectionHost(program.getTypeChecker());
    file = program.getSourceFile(entryPointPath)!;
  });

  describe('getDecoratorsOfDeclaration()', () => {
    it('should find the decorators on a class', () => {
      const classNode = getClassNode('NgForOf');
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


  function createProgram(packagePath: string, entryPointPath: string) {
    const options: ts.CompilerOptions = { allowJs: true, rootDir: packagePath };
    const host = ts.createCompilerHost(options);
    return ts.createProgram([entryPointPath], options, host);
  }

  function getClassNode(name: string) {
    let classNode: ts.ClassDeclaration;
    const walk = (rootNode: ts.Node) => {
      ts.forEachChild(rootNode, node => {
        if (ts.isClassDeclaration(node) && node.name && node.name.text === name) {
          classNode = node;
        } else {
          walk(node);
        }
      });
    };
    walk(file);
    return classNode!;
  }
});
