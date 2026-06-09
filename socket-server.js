const { createHmac, timingSafeEqual } = require("crypto");
const { createServer } = require("http");
const { Server } = require("socket.io");

try {
  require("dotenv").config();
} catch (_) {}

const port = Number(process.env.PORT || process.env.SOCKET_PORT || 3001);
const socketTokenSecret =
  process.env.SOCKET_TOKEN_SECRET ||
  process.env.CLERK_SECRET_KEY ||
  "dogecord-local-socket-secret";
const serverSecret = process.env.SOCKET_SERVER_SECRET;
const corsOrigin = process.env.SOCKET_CORS_ORIGIN
  ? process.env.SOCKET_CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

if (process.env.NODE_ENV === "production" && !process.env.SOCKET_TOKEN_SECRET) {
  throw new Error("SOCKET_TOKEN_SECRET is required in production");
}

if (process.env.NODE_ENV === "production" && !serverSecret) {
  throw new Error("SOCKET_SERVER_SECRET is required in production");
}

if (process.env.NODE_ENV === "production" && !process.env.SOCKET_CORS_ORIGIN) {
  throw new Error("SOCKET_CORS_ORIGIN is required in production");
}

const base64UrlEncode = (value) => {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64");
};

const sign = (body) => {
  return base64UrlEncode(createHmac("sha256", socketTokenSecret).update(body).digest());
};

const socketChatRoom = (chatId) => {
  return `chat-room:${chatId}`;
};

const isAllowedChatEvent = (chatId, event) => {
  return event === `chat:${chatId}:messages` || event === `chat:${chatId}:messages:update`;
};

const verifySocketRoomToken = (token, chatId) => {
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

  const payload = JSON.parse(base64UrlDecode(body).toString("utf8"));

  if (payload.chatId !== chatId || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
};

const readJson = (req) => {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
};

const isAuthorizedPublish = (req) => {
  if (!serverSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(serverSecret);

  return (
    tokenBuffer.length === secretBuffer.length &&
    timingSafeEqual(tokenBuffer, secretBuffer)
  );
};

const httpServer = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method !== "POST" || req.url !== "/publish") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  if (!isAuthorizedPublish(req)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    const { chatId, event, payload } = await readJson(req);

    if (typeof chatId !== "string" || typeof event !== "string" || !isAllowedChatEvent(chatId, event)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid publish payload" }));
      return;
    }

    io.to(socketChatRoom(chatId)).emit(event, payload);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    console.error("[SOCKET_PUBLISH]", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal error" }));
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("chat:join", ({ chatId, token }, callback) => {
    if (typeof chatId !== "string" || typeof token !== "string") {
      callback?.({ ok: false, error: "Invalid room request" });
      return;
    }

    const payload = verifySocketRoomToken(token, chatId);

    if (!payload) {
      callback?.({ ok: false, error: "Unauthorized room" });
      return;
    }

    socket.join(socketChatRoom(chatId));
    callback?.({ ok: true });
  });

  socket.on("chat:leave", ({ chatId }) => {
    if (typeof chatId !== "string") {
      return;
    }

    socket.leave(socketChatRoom(chatId));
  });
});

httpServer.listen(port, () => {
  console.log(`> Socket server ready on http://localhost:${port}`);
});
