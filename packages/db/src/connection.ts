import mongoose, {
  type ConnectOptions,
  type ClientSession,
  type Connection,
} from "mongoose";

export interface DatabaseConfig {
  uri: string;
  options?: ConnectOptions;
}

const DEFAULT_OPTIONS: ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

declare global {
  var __hostelhub_mongoose_conn: Promise<typeof mongoose> | null;
}

if (!globalThis.__hostelhub_mongoose_conn) {
  globalThis.__hostelhub_mongoose_conn = null;
}

/**
 * Connect to MongoDB with connection pooling and singleton caching.
 */
export async function connectDb(
  uri = process.env["MONGODB_URI"] ?? "mongodb://localhost:27017/hostelhub",
  options: ConnectOptions = {},
): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!globalThis.__hostelhub_mongoose_conn) {
    const opts: ConnectOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    globalThis.__hostelhub_mongoose_conn = mongoose.connect(uri, opts);
  }

  try {
    await globalThis.__hostelhub_mongoose_conn;
    return mongoose;
  } catch (error) {
    globalThis.__hostelhub_mongoose_conn = null;
    throw error;
  }
}

/**
 * Disconnect from MongoDB and close connection pools cleanly.
 */
export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    globalThis.__hostelhub_mongoose_conn = null;
  }
}

/**
 * Get active connection instance.
 */
export function getConnection(): Connection {
  return mongoose.connection;
}

/**
 * Execute a unit of work inside a MongoDB transaction session.
 * Supports nesting (reuses an existing active session).
 * Works reliably across Web and Worker runtimes.
 */
export async function runInTransaction<T>(
  fn: (session: ClientSession) => Promise<T>,
  existingSession?: ClientSession,
): Promise<T> {
  if (existingSession && existingSession.inTransaction()) {
    return fn(existingSession);
  }

  const session = existingSession ?? (await mongoose.startSession());
  const shouldEndSession = !existingSession;

  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    // @ts-expect-error result is assigned inside withTransaction
    return result;
  } finally {
    if (shouldEndSession) {
      await session.endSession();
    }
  }
}

// Graceful shutdown listeners
if (typeof process !== "undefined") {
  const handleShutdown = async (_signal: string) => {
    try {
      await disconnectDb();
    } catch {
      // Ignore disconnect errors during exit
    }
  };

  process.once("SIGINT", () => handleShutdown("SIGINT"));
  process.once("SIGTERM", () => handleShutdown("SIGTERM"));
}
