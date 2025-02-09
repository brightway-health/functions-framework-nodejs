"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyPubSubEventMiddleware = void 0;
const PUBSUB_EVENT_TYPE = 'google.pubsub.topic.publish';
const PUBSUB_MESSAGE_TYPE = 'type.googleapis.com/google.pubsub.v1.PubsubMessage';
const PUBSUB_SERVICE = 'pubsub.googleapis.com';
/**
 * Type predicate that checks if a given Request is a RawPubSubRequest
 * @param request a Request object to typecheck
 * @returns true if this Request is a RawPubSubRequest
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isRawPubSubRequestBody = (body) => {
    return !!(body &&
        !body.context &&
        body.subscription &&
        body.message &&
        body.message.data &&
        body.message.messageId);
};
/**
 * Extract the Pub/Sub topic name from the HTTP request path.
 * @param path the URL path of the http request
 * @returns the Pub/Sub topic name if the path matches the expected format,
 * null otherwise
 */
const extractPubSubTopic = (path) => {
    const parsedTopic = path.match(/projects\/[^/?]+\/topics\/[^/?]+/);
    if (parsedTopic) {
        return parsedTopic[0];
    }
    console.warn('Failed to extract the topic name from the URL path.');
    console.warn("Configure your subscription's push endpoint to use the following path: ", 'projects/PROJECT_NAME/topics/TOPIC_NAME');
    return null;
};
/**
 * Marshal the body of an HTTP request from a Pub/Sub subscription
 * @param body an unmarshalled http request body from a Pub/Sub push subscription
 * @param path the HTTP request path
 * @returns the marshalled request body expected by wrapEventFunction
 */
const marshalPubSubRequestBody = (body, path) => ({
    context: {
        eventId: body.message.messageId,
        timestamp: body.message.publishTime || new Date().toISOString(),
        eventType: PUBSUB_EVENT_TYPE,
        resource: {
            service: PUBSUB_SERVICE,
            type: PUBSUB_MESSAGE_TYPE,
            name: extractPubSubTopic(path),
        },
    },
    data: {
        '@type': PUBSUB_MESSAGE_TYPE,
        data: body.message.data,
        attributes: body.message.attributes || {},
    },
});
/**
 * Express middleware used to marshal the HTTP request body received directly from a
 * Pub/Sub subscription into the format that is expected downstream by wrapEventFunction
 * @param req express request object
 * @param res express response object
 * @param next function used to pass control to the next middle middleware function in the stack
 */
const legacyPubSubEventMiddleware = (req, res, next) => {
    const { body, path } = req;
    if (isRawPubSubRequestBody(body)) {
        req.body = marshalPubSubRequestBody(body, path);
    }
    next();
};
exports.legacyPubSubEventMiddleware = legacyPubSubEventMiddleware;
//# sourceMappingURL=pubsub_middleware.js.map