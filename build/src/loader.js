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
exports.getUserFunction = void 0;
/**
 * Returns user's function from function file.
 * Returns null if function can't be retrieved.
 * @return User's function or null.
 */
function getUserFunction(codeLocation, functionTarget) {
    try {
        const functionModulePath = getFunctionModulePath(codeLocation);
        if (functionModulePath === null) {
            console.error('Provided code is not a loadable module.');
            return null;
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const functionModule = require(functionModulePath);
        let userFunction = functionTarget
            .split('.')
            .reduce((code, functionTargetPart) => {
            if (typeof code === 'undefined') {
                return undefined;
            }
            else {
                return code[functionTargetPart];
            }
        }, functionModule);
        // TODO: do we want 'function' fallback?
        if (typeof userFunction === 'undefined') {
            // eslint-disable-next-line no-prototype-builtins
            if (functionModule.hasOwnProperty('function')) {
                userFunction = functionModule['function'];
            }
            else {
                console.error(`Function '${functionTarget}' is not defined in the provided ` +
                    'module.\nDid you specify the correct target function to execute?');
                return null;
            }
        }
        if (typeof userFunction !== 'function') {
            console.error(`'${functionTarget}' needs to be of type function. Got: ` +
                `${typeof userFunction}`);
            return null;
        }
        return userFunction;
    }
    catch (ex) {
        let additionalHint;
        // TODO: this should be done based on ex.code rather than string matching.
        if (ex.stack && ex.stack.includes('Cannot find module')) {
            additionalHint =
                'Did you list all required modules in the package.json ' +
                    'dependencies?\n';
        }
        else {
            additionalHint = 'Is there a syntax error in your code?\n';
        }
        console.error(`Provided module can't be loaded.\n${additionalHint}` +
            `Detailed stack trace: ${ex.stack}`);
        return null;
    }
}
exports.getUserFunction = getUserFunction;
/**
 * Returns resolved path to the module containing the user function.
 * Returns null if the module can not be identified.
 * @param codeLocation Directory with user's code.
 * @return Resolved path or null.
 */
function getFunctionModulePath(codeLocation) {
    let path = null;
    try {
        path = require.resolve(codeLocation);
    }
    catch (ex) {
        try {
            // TODO: Decide if we want to keep this fallback.
            path = require.resolve(codeLocation + '/function.js');
        }
        catch (ex) {
            return path;
        }
    }
    return path;
}
//# sourceMappingURL=loader.js.map