import { type Character, DatabaseAdapter, type IAgentRuntime, type UUID, ElizaOS } from '@elizaos/core';
import express from 'express';
import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { type Plugin } from '@elizaos/core';
import type { CentralRootMessage, MessageChannel, MessageServer } from './types.js';
/**
 * Expands a file path starting with `~` to the project directory.
 *
 * @param filepath - The path to expand.
 * @returns The expanded path.
 */
export declare function expandTildePath(filepath: string): string;
export declare function resolvePgliteDir(dir?: string, fallbackDir?: string): string;
/**
 * Represents a function that acts as a server middleware.
 * @param {express.Request} req - The request object.
 * @param {express.Response} res - The response object.
 * @param {express.NextFunction} next - The next function to be called in the middleware chain.
 * @returns {void}
 */
export type ServerMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => void;
/**
 * Interface for defining server configuration.
 * Used for unified server initialization and startup.
 */
export interface ServerConfig {
    middlewares?: ServerMiddleware[];
    dataDir?: string;
    postgresUrl?: string;
    clientPath?: string;
    port?: number;
    agents?: Array<{
        character: Character;
        plugins?: (Plugin | string)[];
        init?: (runtime: IAgentRuntime) => Promise<void>;
    }>;
    isTestMode?: boolean;
}
/**
 * Determines if the web UI should be enabled based on environment variables.
 *
 * @returns {boolean} - Returns true if UI should be enabled, false otherwise
 */
export declare function isWebUIEnabled(): boolean;
/**
 * Class representing an agent server.
 */ /**
* Represents an agent server which handles agents, database, and server functionalities.
*/
export declare class AgentServer {
    app: express.Application;
    server: http.Server;
    socketIO: SocketIOServer;
    isInitialized: boolean;
    private isWebUIEnabled;
    private clientPath?;
    elizaOS?: ElizaOS;
    database: DatabaseAdapter;
    private rlsOwnerId?;
    serverId: UUID;
    loadCharacterTryPath: (characterPath: string) => Promise<Character>;
    jsonToCharacter: (character: unknown) => Promise<Character>;
    /**
     * Start multiple agents in batch (true parallel)
     * @param agents - Array of agent configurations (character + optional plugins/init)
     * @param options - Optional configuration (e.g., isTestMode for test dependencies)
     * @returns Array of started agent runtimes
     */
    startAgents(agents: Array<{
        character: Character;
        plugins?: (Plugin | string)[];
        init?: (runtime: IAgentRuntime) => Promise<void>;
    }>, options?: {
        isTestMode?: boolean;
    }): Promise<IAgentRuntime[]>;
    /**
     * Stop multiple agents in batch
     * @param agentIds - Array of agent IDs to stop
     */
    stopAgents(agentIds: UUID[]): Promise<void>;
    /**
     * Get all agents from the ElizaOS instance
     * @returns Array of agent runtimes
     */
    getAllAgents(): IAgentRuntime[];
    /**
     * Get an agent by ID from the ElizaOS instance
     * @param agentId - The agent ID
     * @returns The agent runtime or undefined
     */
    getAgent(agentId: UUID): IAgentRuntime | undefined;
    /**
     * Constructor for AgentServer class.
     *
     * @constructor
     */
    constructor();
    /**
     * Initializes the database and server (internal use only).
     *
     * @param {ServerConfig} [config] - Optional server configuration.
     * @returns {Promise<void>} A promise that resolves when initialization is complete.
     * @private
     */
    private initialize;
    private ensureDefaultServer;
    /**
     * Initializes the server with the provided configuration.
     *
     * @param {ServerConfig} [config] - Optional server configuration.
     * @returns {Promise<void>} - A promise that resolves once the server is initialized.
     * @private
     */
    private initializeServer;
    /**
     * Registers an agent with the provided runtime.
     * Note: Agents should ideally be created through ElizaOS.addAgent() for proper orchestration.
     * This method exists primarily for backward compatibility.
     *
     * @param {IAgentRuntime} runtime - The runtime object containing agent information.
     * @throws {Error} if the runtime is null/undefined, if agentId is missing, if character configuration is missing,
     * or if there are any errors during registration.
     */
    registerAgent(runtime: IAgentRuntime): Promise<void>;
    /**
     * Unregisters an agent from the system.
     *
     * @param {UUID} agentId - The unique identifier of the agent to unregister.
     * @returns {void}
     */
    unregisterAgent(agentId: UUID): Promise<void>;
    /**
     * Add middleware to the server's request handling pipeline
     * @param {ServerMiddleware} middleware - The middleware function to be registered
     */
    registerMiddleware(middleware: ServerMiddleware): void;
    /**
     * Starts the server with unified configuration.
     * Handles initialization, port resolution, and optional agent startup.
     *
     * @param {ServerConfig} config - Server configuration including port, agents, and infrastructure options.
     * @returns {Promise<void>} A promise that resolves when the server is listening.
     * @throws {Error} If there is an error during initialization or startup.
     */
    start(config?: ServerConfig): Promise<void>;
    /**
     * Resolves and finds an available port.
     * - If port is provided (number): validates and returns it (strict - fails if unavailable)
     * - If port is undefined: finds next available port starting from env/default (auto-discovery)
     */
    private resolveAndFindPort;
    /**
     * Finds an available port starting from the requested port.
     * Tries incrementing ports up to maxAttempts.
     */
    private findAvailablePort;
    /**
     * Checks if a port is available by attempting to bind to it.
     */
    private isPortAvailable;
    /**
     * Starts the HTTP server on the specified port.
     */
    private startHttpServer;
    /**
     * Stops the server if it is running. Closes the server connection,
     * stops the database connection, and logs a success message.
     */
    stop(): Promise<void>;
    createServer(data: Omit<MessageServer, 'id' | 'createdAt' | 'updatedAt'>): Promise<MessageServer>;
    getServers(): Promise<MessageServer[]>;
    getServerById(serverId: UUID): Promise<MessageServer | null>;
    getServerBySourceType(sourceType: string): Promise<MessageServer | null>;
    createChannel(data: Omit<MessageChannel, 'id' | 'createdAt' | 'updatedAt'> & {
        id?: UUID;
    }, participantIds?: UUID[]): Promise<MessageChannel>;
    addParticipantsToChannel(channelId: UUID, userIds: UUID[]): Promise<void>;
    getChannelsForServer(serverId: UUID): Promise<MessageChannel[]>;
    getChannelDetails(channelId: UUID): Promise<MessageChannel | null>;
    getChannelParticipants(channelId: UUID): Promise<UUID[]>;
    deleteMessage(messageId: UUID): Promise<void>;
    updateChannel(channelId: UUID, updates: {
        name?: string;
        participantCentralUserIds?: UUID[];
        metadata?: any;
    }): Promise<MessageChannel>;
    deleteChannel(channelId: UUID): Promise<void>;
    clearChannelMessages(channelId: UUID): Promise<void>;
    findOrCreateCentralDmChannel(user1Id: UUID, user2Id: UUID, messageServerId: UUID): Promise<MessageChannel>;
    createMessage(data: Omit<CentralRootMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<CentralRootMessage>;
    getMessagesForChannel(channelId: UUID, limit?: number, beforeTimestamp?: Date): Promise<CentralRootMessage[]>;
    updateMessage(messageId: UUID, patch: {
        content?: string;
        rawMessage?: any;
        sourceType?: string;
        sourceId?: string;
        metadata?: any;
        inReplyToRootMessageId?: UUID;
    }): Promise<CentralRootMessage | null>;
    removeParticipantFromChannel(): Promise<void>;
    /**
     * Add an agent to a server
     * @param {UUID} serverId - The server ID
     * @param {UUID} agentId - The agent ID to add
     */
    addAgentToServer(serverId: UUID, agentId: UUID): Promise<void>;
    /**
     * Remove an agent from a server
     * @param {UUID} serverId - The server ID
     * @param {UUID} agentId - The agent ID to remove
     */
    removeAgentFromServer(serverId: UUID, agentId: UUID): Promise<void>;
    /**
     * Get all agents associated with a server
     * @param {UUID} serverId - The server ID
     * @returns {Promise<UUID[]>} Array of agent IDs
     */
    getAgentsForServer(serverId: UUID): Promise<UUID[]>;
    /**
     * Get all servers an agent belongs to
     * @param {UUID} agentId - The agent ID
     * @returns {Promise<UUID[]>} Array of server IDs
     */
    getServersForAgent(agentId: UUID): Promise<UUID[]>;
    /**
     * Registers signal handlers for graceful shutdown.
     * This is called once in the constructor to prevent handler accumulation.
     */
    private registerSignalHandlers;
}
export { tryLoadFile, loadCharactersFromUrl, jsonToCharacter, loadCharacter, loadCharacterTryPath, hasValidRemoteUrls, loadCharacters, } from './loader';
export * from './types';
export { ElizaOS } from '@elizaos/core';
