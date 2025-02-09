import { Request, Response, NextFunction } from 'express';
export declare const CE_TO_BACKGROUND_TYPE: {
    [k: string]: string;
};
/**
 * Splits a CloudEvent source string into resource and subject components.
 * @param source the cloud event source
 * @returns the parsed service and name components of the CE source string
 */
export declare const parseSource: (source: string) => {
    service: string;
    name: string;
};
/**
 * Express middleware to convert cloud event requests to legacy GCF events. This enables
 * functions using the "EVENT" signature type to accept requests from a cloud event producer.
 * @param req express request object
 * @param res express response object
 * @param next function used to pass control to the next middle middleware function in the stack
 */
export declare const ceToLegacyEventMiddleware: (req: Request, res: Response, next: NextFunction) => void;
