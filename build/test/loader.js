"use strict";
// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const express = require("express");
const loader = require("../src/loader");
describe('loading function', () => {
    const testData = [
        {
            name: 'function without "main" in package.json',
            codeLocation: '/test/data/without_main',
            target: 'testFunction',
        },
        {
            name: 'function with "main" in package.json',
            codeLocation: '/test/data/with_main',
            target: 'testFunction',
        },
    ];
    for (const test of testData) {
        it(`should load ${test.name}`, () => {
            const loadedFunction = loader.getUserFunction(process.cwd() + test.codeLocation, test.target);
            const returned = loadedFunction(express.request, express.response);
            assert.strictEqual(returned, 'PASS');
        });
    }
});
//# sourceMappingURL=loader.js.map