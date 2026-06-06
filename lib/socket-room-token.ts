import { createHmac, timingSafeEqual } from "crypto";

type SocketRoomTokenPayload = {
  chatId: string;
  profileId: string;
  exp: number;
};

const TOKEN_TTL_SECONDS = 60 * 10;

const base64UrlEncode = (value: Buffer | string) => {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");

  return Buffer.from(padded, "base64");
};

const getSocketTokenSecret = () => {
  const secret = process.env.SOCKET_TOKEN_SECRET || process.env.CLERK_SECRET_KEY;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SOCKET_TOKEN_SECRET or CLERK_SECRET_KEY is required");
  }

  return secret || "dogecord-local-socket-secret";
};

const sign = (body: string) => {
  return base64UrlEncode(createHmac("sha256", getSocketTokenSecret()).update(body).digest());
};

export const socketChatRoom = (chatId: string) => {
  return `chat-room:${chatId}`;
};

export const createSocketRoomToken = ({
  chatId,
  profileId,
}: {
  chatId: string;
  profileId: string;
}) => {
  const payload: SocketRoomTokenPayload = {
    chatId,
    profileId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = base64UrlEncode(JSON.stringify(payload));

  return `${body}.${sign(body)}`;
};

export const verifySocketRoomToken = (token: string, chatId: string) => {
  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expectedSignature = sign(body);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(body).toString("utf8")) as SocketRoomTokenPayload;

  if (payload.chatId !== chatId || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
};
