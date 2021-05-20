"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyEventToCloudEventMiddleware = exports.splitResource = void 0;
const cloudevents_1 = require("../cloudevents");
const ce_to_legacy_event_1 = require("./ce_to_legacy_event");
// Maps GCF Event types to the equivalent CloudEventType
const BACKGROUND_TO_CE_TYPE = Object.assign({
    'providers/cloud.storage/eventTypes/object.change': 'google.cloud.storage.object.v1.finalized',
    'providers/cloud.pubsub/eventTypes/topic.publish': 'google.cloud.pubsub.topic.v1.messagePublished',
}, 
// include the inverse of CE_TO_BACKGROUND_TYPE
...Object.entries(ce_to_legacy_event_1.CE_TO_BACKGROUND_TYPE).map(([a, b]) => ({ [b]: a })));
// Maps background event services to their equivalent CloudEvent services.
const SERVICE_BACKGROUND_TO_CE = {
    'providers/cloud.firestore/': cloudevents_1.CE_SERVICE.FIRESTORE,
    'providers/google.firebase.analytics/': cloudevents_1.CE_SERVICE.FIREBASE,
    'providers/firebase.auth/': cloudevents_1.CE_SERVICE.FIREBASE_AUTH,
    'providers/google.firebase.database/': cloudevents_1.CE_SERVICE.FIREBASE_DB,
    'providers/cloud.pubsub/': cloudevents_1.CE_SERVICE.PUBSUB,
    'providers/cloud.storage/': cloudevents_1.CE_SERVICE.STORAGE,
    'google.pubsub': cloudevents_1.CE_SERVICE.PUBSUB,
    'google.storage': cloudevents_1.CE_SERVICE.STORAGE,
};
/**
 * Maps CloudEvent service strings to regular expressions used to split a background
 * event resource string into CloudEvent resource and subject strings. Each regex
 * must have exactly two capture groups: the first for the resource and the second
 * for the subject.
 */
const CE_SERVICE_TO_RESOURCE_RE = new Map([
    [cloudevents_1.CE_SERVICE.FIREBASE, /^(projects\/[^/]+)\/(events\/[^/]+)$/],
    [cloudevents_1.CE_SERVICE.FIREBASE_DB, /^(projects\/[^/]\/instances\/[^/]+)\/(refs\/.+)$/],
    [
        cloudevents_1.CE_SERVICE.FIRESTORE,
        /^(projects\/[^/]+\/databases\/\(default\))\/(documents\/.+)$/,
    ],
    [cloudevents_1.CE_SERVICE.STORAGE, /^(projects\/[^/]\/buckets\/[^/]+)\/(objects\/.+)$/],
]);
/**
 * Is this request a known GCF event that can be converted to a cloud event.
 * @param req the express request object
 * @returns true if this request can be converted to a CloudEvent
 */
const isConvertableLegacyEvent = (req) => {
    const { body } = req;
    const context = 'context' in body ? body.context : body;
    return (!cloudevents_1.isBinaryCloudEvent(req) &&
        'data' in body &&
        'eventType' in context &&
        'resource' in context &&
        context.eventType in BACKGROUND_TO_CE_TYPE);
};
/**
 * Convert the given HTTP request into the GCF Legacy Event data / context format.
 * @param body the express request object
 * @returns a marshalled legacy event
 */
const getLegacyEvent = (request) => {
    let { context } = request.body;
    const { data } = request.body;
    if (!context) {
        context = request.body;
        context.data = undefined;
        delete context.data;
    }
    return { context, data };
};
/**
 * Splits a background event's resource into a CloudEvent service, resource, and subject.
 * @param context the GCF event context to parse.
 * @returns the CloudEvent service, resource and subject fields for the given GCF event context.
 */
const splitResource = (context) => {
    var _a, _b;
    let service = '';
    let resource = '';
    let subject = '';
    if (typeof context.resource === 'string') {
        resource = context.resource;
        service = '';
    }
    else if (context.resource !== undefined) {
        resource = (_a = context.resource.name) !== null && _a !== void 0 ? _a : '';
        service = context.resource.service;
    }
    if (!service) {
        for (const [backgroundService, ceService] of Object.entries(SERVICE_BACKGROUND_TO_CE)) {
            if ((_b = context.eventType) === null || _b === void 0 ? void 0 : _b.startsWith(backgroundService)) {
                service = ceService;
            }
        }
    }
    if (!service) {
        throw new cloudevents_1.EventConversionError(`Unable to find equivalent CloudEvent service for ${context.eventType}.`);
    }
    const regex = CE_SERVICE_TO_RESOURCE_RE.get(service);
    if (regex) {
        const match = resource.match(regex);
        if (match) {
            resource = match[1];
            subject = match[2];
        }
        else {
            throw new cloudevents_1.EventConversionError(`Resource string did not match expected format: ${resource}.`);
        }
    }
    return {
        service,
        resource,
        subject,
    };
};
exports.splitResource = splitResource;
/**
 * Express middleware to convert legacy GCF requests to CloudEvents. This enables functions
 * using the "cloudevent" signature type to accept requests from a legacy event producer.
 * @param req express request object
 * @param res express response object
 * @param next function used to pass control to the next middleware function in the stack
 */
const legacyEventToCloudEventMiddleware = (req, res, next) => {
    var _a;
    if (isConvertableLegacyEvent(req)) {
        // eslint-disable-next-line prefer-const
        let { context, data } = getLegacyEvent(req);
        const newType = BACKGROUND_TO_CE_TYPE[(_a = context.eventType) !== null && _a !== void 0 ? _a : ''];
        if (!newType) {
            throw new cloudevents_1.EventConversionError(`Unable to find equivalent CloudEvent type for ${context.eventType}`);
        }
        // eslint-disable-next-line prefer-const
        let { service, resource, subject } = exports.splitResource(context);
        if (service === cloudevents_1.CE_SERVICE.PUBSUB) {
            // PubSub data is nested under the "message" key.
            data = { message: data };
        }
        if (service === cloudevents_1.CE_SERVICE.FIREBASE_AUTH) {
            if ('metadata' in data) {
                // Some metadata are not consistent between cloudevents and legacy events
                const metadata = data.metadata;
                data.metadata = {};
                // eslint-disable-next-line prefer-const
                for (let [k, v] of Object.entries(metadata)) {
                    k = k === 'createdAt' ? 'createTime' : k;
                    k = k === 'lastSignedInAt' ? 'lastSignInTime' : k;
                    data.metadata[k] = v;
                }
                // Subject comes from the 'uid' field in the data payload.
                if ('uid' in data) {
                    subject = `users/${data.uid}`;
                }
            }
        }
        const cloudEvent = {
            id: context.eventId,
            time: context.timestamp,
            specversion: '1.0',
            datacontenttype: 'application/json',
            type: newType,
            source: `//${service}/${resource}`,
            data,
        };
        if (subject) {
            cloudEvent.subject = subject;
        }
        req.body = cloudEvent;
    }
    next();
};
exports.legacyEventToCloudEventMiddleware = legacyEventToCloudEventMiddleware;
//# sourceMappingURL=legacy_event_to_cloudevent.js.map