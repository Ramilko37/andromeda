import type { UUID, ChannelType } from '@elizaos/core';
import type { ServerMetadata, ChannelMetadata, MessageMetadata } from '@elizaos/api-client';
export interface MessageServer {
    id: UUID;
    name: string;
    sourceType: string;
    sourceId?: string;
    metadata?: ServerMetadata;
    createdAt: Date;
    updatedAt: Date;
}
export interface MessageChannel {
    id: UUID;
    messageServerId: UUID;
    name: string;
    type: ChannelType;
    sourceType?: string;
    sourceId?: string;
    topic?: string;
    metadata?: ChannelMetadata;
    createdAt: Date;
    updatedAt: Date;
}
export interface CentralRootMessage {
    id: UUID;
    channelId: UUID;
    authorId: UUID;
    content: string;
    rawMessage?: unknown;
    inReplyToRootMessageId?: UUID;
    sourceType?: string;
    sourceId?: string;
    createdAt: Date;
    updatedAt: Date;
    metadata?: MessageMetadata;
}
export interface MessageServiceStructure {
    id: UUID;
    channel_id: UUID;
    server_id: UUID;
    author_id: UUID;
    author_display_name?: string;
    content: string;
    raw_message?: unknown;
    source_id?: string;
    source_type?: string;
    in_reply_to_message_id?: UUID;
    created_at: number;
    metadata?: MessageMetadata;
}
export interface Attachment {
    url?: string;
    [key: string]: unknown;
}
export type AttachmentInput = string | Attachment | (string | Attachment)[];
export interface MessageContentWithAttachments {
    attachments?: AttachmentInput;
    [key: string]: unknown;
}
export interface MessageMetadataWithAttachments {
    attachments?: AttachmentInput;
    [key: string]: unknown;
}
export interface MessageWithAttachments {
    content?: MessageContentWithAttachments | unknown;
    metadata?: MessageMetadataWithAttachments;
    [key: string]: unknown;
}
export * from './types/sessions';
