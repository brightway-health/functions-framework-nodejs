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
exports.getServer = void 0;
const bodyParser = require("body-parser");
const express = require("express");
const http = require("http");
const types_1 = require("./types");
const invoker_1 = require("./invoker");
const router_1 = require("./router");
const pubsub_middleware_1 = require("./pubsub_middleware");
const ce_to_legacy_event_1 = require("./middleware/ce_to_legacy_event");
const legacy_event_to_cloudevent_1 = require("./middleware/legacy_event_to_cloudevent");
/**
 * Creates and configures an Express application and returns an HTTP server
 * which will run it.
 * @param userFunction User's function.
 * @param functionSignatureType Type of user's function signature.
 * @return HTTP server.
 */
function getServer(userFunction, functionSignatureType) {
    // App to use for function executions.
    const app = express();
    // Express middleware
    // Set request-specific values in the very first middleware.
    app.use('/*', (req, res, next) => {
        invoker_1.setLatestRes(res);
        res.locals.functionExecutionFinished = false;
        next();
    });
    /**
     * Retains a reference to the raw body buffer to allow access to the raw body
     * for things like request signature validation.  This is used as the "verify"
     * function in body-parser options.
     * @param req Express request object.
     * @param res Express response object.
     * @param buf Buffer to be saved.
     */
    function rawBodySaver(req, res, buf) {
        req.rawBody = buf;
    }
    // Set limit to a value larger than 32MB, which is maximum limit of higher
    // level layers anyway.
    const requestLimit = '1024mb';
    const defaultBodySavingOptions = {
        limit: requestLimit,
        verify: rawBodySaver,
    };
    const cloudEventsBodySavingOptions = {
        type: 'application/cloudevents+json',
        limit: requestLimit,
        verify: rawBodySaver,
    };
    const rawBodySavingOptions = {
        limit: requestLimit,
        verify: rawBodySaver,
        type: '*/*',
    };
    // Use extended query string parsing for URL-encoded bodies.
    const urlEncodedOptions = {
        limit: requestLimit,
        verify: rawBodySaver,
        extended: true,
    };
    // Apply middleware
    app.use(bodyParser.json(cloudEventsBodySavingOptions));
    app.use(bodyParser.json(defaultBodySavingOptions));
    app.use(bodyParser.text(defaultBodySavingOptions));
    app.use(bodyParser.urlencoded(urlEncodedOptions));
    // The parser will process ALL content types so MUST come last.
    // Subsequent parsers will be skipped when one is matched.
    app.use(bodyParser.raw(rawBodySavingOptions));
    app.enable('trust proxy'); // To respect X-Forwarded-For header.
    // Disable Express 'x-powered-by' header:
    // http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
    app.disable('x-powered-by');
    if (functionSignatureType === types_1.SignatureType.EVENT ||
        functionSignatureType === types_1.SignatureType.CLOUDEVENT) {
        // If a Pub/Sub subscription is configured to invoke a user's function directly, the request body
        // needs to be marshalled into the structure that wrapEventFunction expects. This unblocks local
        // development with the Pub/Sub emulator
        app.use(pubsub_middleware_1.legacyPubSubEventMiddleware);
    }
    if (functionSignatureType === types_1.SignatureType.EVENT) {
        app.use(ce_to_legacy_event_1.ceToLegacyEventMiddleware);
    }
    if (functionSignatureType === types_1.SignatureType.CLOUDEVENT) {
        app.use(legacy_event_to_cloudevent_1.legacyEventToCloudEventMiddleware);
    }
    router_1.registerFunctionRoutes(app, userFunction, functionSignatureType);
    return http.createServer(app);
}
exports.getServer = getServer;
//# sourceMappingURL=server.js.map