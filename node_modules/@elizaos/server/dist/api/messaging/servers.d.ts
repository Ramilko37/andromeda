import express from 'express';
import type { AgentServer } from '../../index';
/**
 * Server management functionality
 */
export declare function createServersRouter(serverInstance: AgentServer): express.Router;
