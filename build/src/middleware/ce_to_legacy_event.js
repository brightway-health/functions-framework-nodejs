"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ceToLegacyEventMiddleware = exports.parseSource = exports.CE_TO_BACKGROUND_TYPE = void 0;
const cloudevents_1 = require("../cloudevents");
// Maps CloudEvent types to the equivalent GCF Event type
exports.CE_TO_BACKGROUND_TYPE = {
    'google.cloud.pubsub.topic.v1.messagePublished': 'google.pubsub.topic.publish',
    'google.cloud.storage.object.v1.finalized': 'google.storage.object.finalize',
    'google.cloud.storage.object.v1.deleted': 'google.storage.object.delete',
    'google.cloud.storage.object.v1.archived': 'google.storage.object.archive',
    'google.cloud.storage.object.v1.metadataUpdated': 'google.storage.object.metadataUpdate',
    'google.cloud.firestore.document.v1.written': 'providers/cloud.firestore/eventTypes/document.write',
    'google.cloud.firestore.document.v1.created': 'providers/cloud.firestore/eventTypes/document.create',
    'google.cloud.firestore.document.v1.updated': 'providers/cloud.firestore/eventTypes/document.update',
    'google.cloud.firestore.document.v1.deleted': 'providers/cloud.firestore/eventTypes/document.delete',
    'google.firebase.auth.user.v1.created': 'providers/firebase.auth/eventTypes/user.create',
    'google.firebase.auth.user.v1.deleted': 'providers/firebase.auth/eventTypes/user.delete',
    'google.firebase.analytics.log.v1.written': 'providers/google.firebase.analytics/eventTypes/event.log',
    'google.firebase.database.document.v1.created': 'providers/google.firebase.database/eventTypes/ref.create',
    'google.firebase.database.document.v1.written': 'providers/google.firebase.database/eventTypes/ref.write',
    'google.firebase.database.document.v1.updated': 'providers/google.firebase.database/eventTypes/ref.update',
    'google.firebase.database.document.v1.deleted': 'providers/google.firebase.database/eventTypes/ref.delete',
};
const PUBSUB_MESSAGE_TYPE = 'type.googleapis.com/google.pubsub.v1.PubsubMessage';
/**
 * Regex to split a CE source string into service and name components.
 */
const CE_SOURCE_REGEX = /\/\/([^/]+)\/(.+)/;
/**
 * Is the given request a known CloudEvent that can be converted to a legacy event.
 * @param request express request object
 * @returns true if the request can be converted
 */
const isConvertableCloudEvent = (request) => {
    if (cloudevents_1.isBinaryCloudEvent(request)) {
        const ceType = request.header('ce-type');
        return !!ceType && ceType in exports.CE_TO_BACKGROUND_TYPE;
    }
    return false;
};
/**
 * Splits a CloudEvent source string into resource and subject components.
 * @param source the cloud event source
 * @returns the parsed service and name components of the CE source string
 */
const parseSource = (source) => {
    const match = source.match(CE_SOURCE_REGEX);
    if (!match) {
        throw new cloudevents_1.EventConversionError(`Failed to convert CloudEvent with invalid source: "${source}"`);
    }
    return {
        service: match[1],
        name: match[2],
    };
};
exports.parseSource = parseSource;
/**
 * Marshal a known GCP CloudEvent request the equivalent context/data legacy event format.
 * @param req express request object
 * @returns the request body of the equivalent legacy event request
 */
const marshallConvertableCloudEvent = (req) => {
    const ceContext = cloudevents_1.getBinaryCloudEventContext(req);
    const { service, name } = exports.parseSource(ceContext.source);
    const subject = ceContext.subject;
    let data = req.body;
    // The default resource is a string made up of the source name and subject.
    let resource = `${name}/${subject}`;
    switch (service) {
        case cloudevents_1.CE_SERVICE.PUBSUB:
            // PubSub resource format
            resource = {
                service: service,
                name: name,
                type: PUBSUB_MESSAGE_TYPE,
            };
            // If the data payload has a "message", it needs to be flattened
            if ('message' in data) {
                data = data.message;
            }
            break;
        case cloudevents_1.CE_SERVICE.FIREBASE_AUTH:
            // FirebaseAuth resource format
            resource = name;
            if ('metadata' in data) {
                // Some metadata are not consistent between cloudevents and legacy events
                const metadata = data.metadata;
                data.metadata = {};
                // eslint-disable-next-line prefer-const
                for (let [k, v] of Object.entries(metadata)) {
                    k = k === 'createTime' ? 'createdAt' : k;
                    k = k === 'lastSignInTime' ? 'lastSignedInAt' : k;
                    data.metadata[k] = v;
                }
            }
            break;
        case cloudevents_1.CE_SERVICE.STORAGE:
            // CloudStorage resource format
            resource = {
                name: `${name}/${subject}`,
                service: service,
                type: data.kind,
            };
            break;
    }
    return {
        context: {
            eventId: ceContext.id,
            timestamp: ceContext.time,
            eventType: exports.CE_TO_BACKGROUND_TYPE[ceContext.type],
            resource,
        },
        data,
    };
};
/**
 * Express middleware to convert cloud event requests to legacy GCF events. This enables
 * functions using the "EVENT" signature type to accept requests from a cloud event producer.
 * @param req express request object
 * @param res express response object
 * @param next function used to pass control to the next middle middleware function in the stack
 */
const ceToLegacyEventMiddleware = (req, res, next) => {
    if (isConvertableCloudEvent(req)) {
        // This is a CloudEvent that can be converted a known legacy event.
        req.body = marshallConvertableCloudEvent(req);
    }
    else if (cloudevents_1.isBinaryCloudEvent(req)) {
        // Support CloudEvents in binary content mode, with data being the whole
        // request body and context attributes retrieved from request headers.
        req.body = {
            context: cloudevents_1.getBinaryCloudEventContext(req),
            data: req.body,
        };
    }
    next();
};
exports.ceToLegacyEventMiddleware = ceToLegacyEventMiddleware;
//# sourceMappingURL=ce_to_legacy_event.js.map