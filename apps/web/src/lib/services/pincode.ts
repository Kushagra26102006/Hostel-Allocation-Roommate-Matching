import { Redis } from "ioredis";

export interface PincodeDetails {
  pincode: string;
  district: string;
  state: string;
  country: string;
  postOffices: Array<{
    name: string;
    branchType: string;
    deliveryStatus: string;
  }>;
  source: "cache" | "live" | "fallback";
}

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const redisUrl = process.env["REDIS_URL"];
  if (!redisUrl) return null;
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });
    return redisClient;
  } catch {
    return null;
  }
}

export async function lookupPincode(code: string): Promise<PincodeDetails | null> {
  const cleanCode = code.trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    return null;
  }

  const cacheKey = `pincode:${cleanCode}`;
  const redis = getRedis();

  // 1. Try Redis cache
  if (redis) {
    try {
      if (redis.status !== "ready" && redis.status !== "connecting") {
        await redis.connect().catch(() => {});
      }
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as PincodeDetails;
        return { ...parsed, source: "cache" };
      }
    } catch {
      // Ignore cache failure and proceed to live fetch
    }
  }

  // 2. Fetch live from api.postalpincode.in with 2s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanCode}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as Array<{
      Status: string;
      PostOffice: Array<{
        Name: string;
        BranchType: string;
        DeliveryStatus: string;
        District: string;
        State: string;
        Country: string;
      }> | null;
    }>;

    if (!data || !data[0] || data[0].Status !== "Success" || !data[0].PostOffice) {
      return null;
    }

    const poList = data[0].PostOffice;
    const primary = poList[0];
    if (!primary) return null;

    const result: PincodeDetails = {
      pincode: cleanCode,
      district: primary.District,
      state: primary.State,
      country: primary.Country,
      postOffices: poList.map((po) => ({
        name: po.Name,
        branchType: po.BranchType,
        deliveryStatus: po.DeliveryStatus,
      })),
      source: "live",
    };

    // Cache in Redis for 24 hours (86400 seconds)
    if (redis) {
      redis.set(cacheKey, JSON.stringify(result), "EX", 86400).catch(() => {});
    }

    return result;
  } catch {
    // Graceful fallback to null (client enters manually)
    return null;
  }
}
