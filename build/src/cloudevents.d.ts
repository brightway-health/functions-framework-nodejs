import * as express from 'express';
import { CloudEventsContext } from './functions';
/**
 * Custom exception class to represent errors durring event conversions.
 */
export declare class EventConversionError extends Error {
}
export declare const CE_SERVICE: {
    FIREBASE_AUTH: string;
    FIREBASE_DB: string;
    FIREBASE: string;
    FIRESTORE: string;
    PUBSUB: string;
    STORAGE: string;
};
/**
 * Checks whether the incoming request is a CloudEvents event in binary content
 * mode. This is verified by checking the presence of required headers.
 *
 * @link https://github.com/cloudevents/spec/blob/master/http-protocol-binding.md#3-http-message-mapping
 *
 * @param req Express request object.
 * @return True if the request is a CloudEvents event in binary content mode,
 *     false otherwise.
 */
export declare function isBinaryCloudEvent(req: express.Request): boolean;
/**
 * Returns a CloudEvents context from the given CloudEvents request. Context
 * attributes are retrieved from request headers.
 *
 * @param req Express request object.
 * @return CloudEvents context.
 */
export declare function getBinaryCloudEventContext(req: express.Request): CloudEventsContext;
