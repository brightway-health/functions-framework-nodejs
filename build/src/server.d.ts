/// <reference types="node" />
import * as http from 'http';
import { HandlerFunction } from './functions';
import { SignatureType } from './types';
/**
 * Creates and configures an Express application and returns an HTTP server
 * which will run it.
 * @param userFunction User's function.
 * @param functionSignatureType Type of user's function signature.
 * @return HTTP server.
 */
export declare function getServer(userFunction: HandlerFunction, functionSignatureType: SignatureType): http.Server;
