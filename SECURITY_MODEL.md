# Dogecord Security Model

This project is moving toward a privacy-first Web3 chat model. The current implementation improves chat privacy, but it is not a complete Signal-grade E2EE system yet.

## Current Guarantees

- New text messages are encrypted in the browser before they are sent to the server.
- The server stores encrypted message payloads for new text messages instead of plaintext.
- Message POST/PATCH APIs reject text content that is not in the encrypted `dogecord:v1` payload format.
- Message history APIs verify that the authenticated profile belongs to the requested channel or direct conversation.
- Realtime updates are emitted to Socket.IO rooms instead of being broadcast globally.
- Joining a realtime room requires a short-lived signed room token from `/api/socket-token`.
- Message and socket-token endpoints have in-memory rate limiting to reduce API abuse.
- Wallet challenge and verification endpoints have in-memory rate limiting to reduce login abuse.
- Baseline security headers are configured through Next.js headers.
- File upload is disabled in encrypted rooms until client-side encrypted file handling exists.
- The database schema now has draft Web3 identity, wallet session, access pass, and payment models for the Arc Testnet migration.
- Prisma is now configured for PostgreSQL instead of MongoDB for stronger relational constraints around wallets, payments, access passes, memberships, and sessions.

## Current Non-Guarantees

- Existing historical messages already stored in the database may still be plaintext.
- Room keys are manually shared by users and are not yet exchanged through wallet-based cryptography.
- Room keys are kept in `sessionStorage`, so they are protected from persistence but still exposed to compromised browser sessions or XSS.
- Server operators can see metadata such as wallet/profile identity, server membership, channel IDs, timestamps, message sizes, and IP/network-level metadata.
- NFT ownership and USDC payments are public on-chain data.
- Arc Testnet access-pass enforcement is not active yet; the Web3 schema and config are groundwork for the next implementation phase.
- Existing MongoDB data is not automatically migrated by this branch. A deliberate migration/import script is required if legacy data must be preserved.
- Voice/video via LiveKit is not covered by the text-message encryption layer.
- Current rate limiting is process-local memory, not a distributed production rate limiter.
- This is not yet a formally audited cryptographic protocol.

## Required Next Steps

- Replace manual room keys with authenticated key exchange based on wallet signatures.
- Add per-member encrypted room keys and key rotation when members join or leave.
- Migrate the database to separate encrypted payload fields from legacy plaintext `content`.
- Add encrypted file upload before re-enabling attachments.
- Move rate limiting to Redis or an edge/WAF layer for production.
- Add CSP and security headers before production deployment.
- Add a production CSP after testing all wallet, LiveKit, Uploadthing, and Arc RPC flows.
- Multi-wallet auth now replaces Clerk. Continue hardening wallet sessions and signature verification before production.
- Deploy and verify the Arc Testnet access-pass contract, then enforce access-pass gating in the app.
- Create a production PostgreSQL migration workflow and backup policy before handling real payments or identity data.
