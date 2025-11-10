import type { ElizaOS } from '@elizaos/core';
import type { Server as SocketIOServer } from 'socket.io';
import type { AgentServer } from '../index';
export declare class SocketIORouter {
    private elizaOS;
    private connections;
    private logStreamConnections;
    private serverInstance;
    constructor(elizaOS: ElizaOS, serverInstance: AgentServer);
    setupListeners(io: SocketIOServer): void;
    private handleNewConnection;
    private handleGenericMessage;
    private handleChannelJoining;
    private handleMessageSubmission;
    private sendErrorResponse;
    private handleLogSubscription;
    private handleLogUnsubscription;
    private handleLogFilterUpdate;
    broadcastLog(io: SocketIOServer, logEntry: any): void;
    private handleDisconnect;
}
