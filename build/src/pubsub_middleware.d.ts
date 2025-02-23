import { Request, Response, NextFunction } from 'express';
declare const PUBSUB_EVENT_TYPE = "google.pubsub.topic.publish";
declare const PUBSUB_MESSAGE_TYPE = "type.googleapis.com/google.pubsub.v1.PubsubMessage";
declare const PUBSUB_SERVICE = "pubsub.googleapis.com";
/**
 * The request body of an HTTP request received directly from a Pub/Sub subscription.
 *
 * @link https://cloud.google.com/pubsub/docs/push?hl=en#receiving_messages
 */
export interface RawPubSubBody {
    /**
     * The name of the subscription for which this request was made. Format is:
     * projects/{project}/subscriptions/{sub}.
     */
    subscription: string;
    /**
     * A message that is published by publishers and consumed by subscribers. The message must
     * contain either a non-empty data field or at least one attribute.
     *
     * @link https://cloud.google.com/pubsub/docs/reference/rest/v1/PubsubMessage
     */
    message: {
        /**
         * Attributes for this message. If this field is empty, the message must contain non-empty
         * data.
         */
        attributes?: {
            [key: string]: string;
        };
        /**
         * Base64 encoded message data. If this field is empty, the message must contain at least one
         * attribute.
         */
        data: string;
        /**
         * ID of this message, assigned by the server when the message is published. Guaranteed to be
         * unique within the topic.
         */
        messageId: string;
        /**
         * If non-empty, identifies related messages for which publish order should be respected. This
         * field is not set by the Pub/Sub emulator.
         */
        orderingKey?: string;
        /**
         * The time at which the message was published, formatted as timestamp in RFC3339 UTC "Zulu"
         * format. This field is not set by the Pub/Sub emulator.
         */
        publishTime?: string;
    };
}
/**
 * The request body schema that is expected by the downstream by the function loader for Pub/Sub
 * event functions.
 */
export interface MarshalledPubSubBody {
    context: {
        eventId: string;
        timestamp: string;
        eventType: typeof PUBSUB_EVENT_TYPE;
        resource: {
            service: typeof PUBSUB_SERVICE;
            type: typeof PUBSUB_MESSAGE_TYPE;
            name: string | null;
        };
    };
    data: {
        '@type': typeof PUBSUB_MESSAGE_TYPE;
        data: string;
        attributes: {
            [key: string]: string;
        };
    };
}
/**
 * Express middleware used to marshal the HTTP request body received directly from a
 * Pub/Sub subscription into the format that is expected downstream by wrapEventFunction
 * @param req express request object
 * @param res express response object
 * @param next function used to pass control to the next middle middleware function in the stack
 */
export declare const legacyPubSubEventMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export {};
