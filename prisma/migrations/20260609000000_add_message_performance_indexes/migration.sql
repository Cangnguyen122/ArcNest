-- Improve chat history, pinned-message, and shared-media lookups for large rooms.
CREATE INDEX "Message_channelId_createdAt_idx" ON "Message"("channelId", "createdAt");
CREATE INDEX "Message_channelId_pinned_createdAt_idx" ON "Message"("channelId", "pinned", "createdAt");
CREATE INDEX "DirectMessage_conversationId_createdAt_idx" ON "DirectMessage"("conversationId", "createdAt");
CREATE INDEX "DirectMessage_conversationId_pinned_createdAt_idx" ON "DirectMessage"("conversationId", "pinned", "createdAt");
CREATE INDEX "DirectMessage_conversationId_fileUrl_createdAt_idx" ON "DirectMessage"("conversationId", "fileUrl", "createdAt");
