import { Request, Response, NextFunction } from 'express';
import { CloudFunctionsContext } from '../functions';
/**
 * The CloudEvent service, resource and subject fields parsed from a GCF event context.
 */
interface ParsedResource {
    service: string;
    resource: string;
    subject: string;
}
/**
 * Splits a background event's resource into a CloudEvent service, resource, and subject.
 * @param context the GCF event context to parse.
 * @returns the CloudEvent service, resource and subject fields for the given GCF event context.
 */
export declare const splitResource: (context: CloudFunctionsContext) => ParsedResource;
/**
 * Express middleware to convert legacy GCF requests to CloudEvents. This enables functions
 * using the "cloudevent" signature type to accept requests from a legacy event producer.
 * @param req express request object
 * @param res express response object
 * @param next function used to pass control to the next middleware function in the stack
 */
export declare const legacyEventToCloudEventMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export {};
