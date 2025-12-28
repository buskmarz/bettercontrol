const { getStore } = require("@netlify/blobs");

const AUTH_USER = process.env.BMC_USER || "";
const AUTH_PASS = process.env.BMC_PASS || "";
const STORE_NAME = "bmc-control";
const STORE_KEY = "app-state";

function jsonResponse(statusCode, payload, extraHeaders) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(extraHeaders || {}),
    },
    body: JSON.stringify(payload),
  };
}

function decodeBody(event) {
  if (!event || event.body == null) return "";
  if (typeof event.body !== "string") return event.body;
  if (event.isBase64Encoded) {
    try {
      return Buffer.from(event.body, "base64").toString("utf8");
    } catch (_) {
      return "";
    }
  }
  return event.body;
}

function parseJsonBody(event) {
  const raw = decodeBody(event);
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed);
}

function isAuthorized(event) {
  if (!AUTH_USER || !AUTH_PASS) return false;
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  if (!header.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch (_) {
    return false;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  return user === AUTH_USER && pass === AUTH_PASS;
}

async function safeGetPayload(store) {
  let raw;
  try {
    raw = await store.get(STORE_KEY, { type: "text" });
  } catch (_) {
    try {
      raw = await store.get(STORE_KEY);
    } catch (_) {
      return null;
    }
  }
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === "[object Object]") return null;
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    return null;
  }
}

async function safeSetPayload(store, payload) {
  let serialized = "";
  try {
    serialized = JSON.stringify(payload);
  } catch (err) {
    return err;
  }
  try {
    await store.set(STORE_KEY, serialized);
    return null;
  } catch (err) {
    return err;
  }
}

function getStoreSafe() {
  const siteID =
    process.env.BMC_BLOBS_SITE_ID ||
    process.env.NETLIFY_BLOBS_SITE_ID ||
    process.env.NETLIFY_SITE_ID ||
    "";
  const token =
    process.env.BMC_BLOBS_TOKEN ||
    process.env.NETLIFY_BLOBS_TOKEN ||
    "";
  const opts = siteID && token ? { siteID, token } : null;
  try {
    return opts ? getStore(STORE_NAME, opts) : getStore(STORE_NAME);
  } catch (err) {
    if (opts) {
      return getStore({ name: STORE_NAME, ...opts });
    }
    throw err;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      },
      body: "",
    };
  }

  if (!isAuthorized(event)) {
    return jsonResponse(401, { ok: false, error: "unauthorized" }, {
      "WWW-Authenticate": "Basic realm=\"BMC\"",
      "Access-Control-Allow-Origin": "*",
    });
  }

  let store;
  try {
    store = getStoreSafe();
  } catch (err) {
    const name = err && err.name ? err.name : "blobs_error";
    const detail = err && err.message ? err.message : "Blobs not configured";
    return jsonResponse(500, { ok: false, error: name, detail }, {
      "Access-Control-Allow-Origin": "*",
    });
  }

  if (event.httpMethod === "GET") {
    const payload = await safeGetPayload(store);
    if (!payload) {
      return jsonResponse(200, { ok: true, data: {}, updatedAt: 0 }, {
        "Access-Control-Allow-Origin": "*",
      });
    }
    const safe = payload && typeof payload === "object" ? payload : {};
    const data = safe.data && typeof safe.data === "object" ? safe.data : {};
    const updatedAt = Number(safe.updatedAt || 0) || 0;
    const savedAt = Number(safe.savedAt || 0) || 0;
    return jsonResponse(200, { ok: true, data, updatedAt, savedAt }, {
      "Access-Control-Allow-Origin": "*",
    });
  }

  if (event.httpMethod === "POST" || event.httpMethod === "PUT") {
    let body = {};
    try {
      body = parseJsonBody(event);
    } catch (err) {
      return jsonResponse(400, { ok: false, error: "invalid_json", detail: err.message }, {
        "Access-Control-Allow-Origin": "*",
      });
    }
    const data = body && typeof body.data === "object" ? body.data : {};
    const now = Date.now();
    const payload = { data, updatedAt: now, savedAt: now };
    const writeErr = await safeSetPayload(store, payload);
    if (writeErr) {
      return jsonResponse(500, { ok: false, error: "store_write_failed", detail: writeErr.message }, {
        "Access-Control-Allow-Origin": "*",
      });
    }
    return jsonResponse(200, { ok: true, updatedAt: payload.updatedAt, savedAt: payload.savedAt }, {
      "Access-Control-Allow-Origin": "*",
    });
  }

  return jsonResponse(405, { ok: false, error: "method_not_allowed" }, {
    "Access-Control-Allow-Origin": "*",
  });
};
