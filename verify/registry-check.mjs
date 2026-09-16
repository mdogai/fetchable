#!/usr/bin/env node
// CI gate: verify every entry in registry.json against its published receipts.
// Exits non-zero if any entry's document is unreachable, malformed, or fails verification.

import { readFile } from "node:fs/promises";

const reg = JSON.parse(await readFile(new URL("../registry.json", import.meta.url), "utf8"));

if (reg.spec !== "fetchable-registry/0.1") {
  console.error(`registry spec must be fetchable-registry/0.1, got ${reg.spec}`);
  process.exit(2);
}

async function ethCall(rpc, to, data) {
  const r = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || "rpc error");
  return j.result;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;

for (const [addr, entry] of Object.entries(reg.tokens || {})) {
  if (!/^0x[0-9a-f]{40}$/.test(addr)) {
    console.log(`FAIL ${addr} :: address must be lowercase 0x + 40 hex`);
    failures++;
    continue;
  }
  if (!entry.fetch_json || !/^https:\/\//.test(entry.fetch_json)) {
    console.log(`FAIL ${addr} :: fetch_json must be an https URL`);
    failures++;
    continue;
  }
  let doc;
  try {
    const r = await fetch(entry.fetch_json, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    doc = await r.json();
  } catch (e) {
    console.log(`FAIL ${addr} :: cannot fetch ${entry.fetch_json} (${e.message})`);
    failures++;
    continue;
  }
  if (doc.spec !== "fetchable/0.1" || !Array.isArray(doc.claims) || doc.claims.length === 0) {
    console.log(`FAIL ${addr} :: document is not a valid fetchable/0.1 with claims`);
    failures++;
    continue;
  }
  const docAddr = (doc.token?.contract || "").toLowerCase();
  if (docAddr !== addr) {
    console.log(`FAIL ${addr} :: document token.contract is ${docAddr || "missing"}, not the registry address`);
    failures++;
    continue;
  }
  const rpc = doc.rpc?.public;
  if (!rpc) {
    console.log(`FAIL ${addr} :: document lists no public RPC`);
    failures++;
    continue;
  }
  let entryFailed = false;
  for (const c of doc.claims) {
    if (c.proof?.type !== "eth_call") continue;
    let res = null, lastErr = null;
    for (let attempt = 0; attempt < 3 && res === null; attempt++) {
      try {
        res = await ethCall(rpc, c.proof.to, c.proof.data);
      } catch (e) {
        lastErr = e;
        await sleep(1500);
      }
    }
    if (res === null) {
      console.log(`FAIL ${addr} :: ${c.id || "claim"} errored after retries (${lastErr?.message})`);
      entryFailed = true;
      continue;
    }
    if (res.toLowerCase() === String(c.proof.expect).toLowerCase()) {
      console.log(`PASS ${addr} :: ${c.id}`);
    } else {
      console.log(`FAIL ${addr} :: ${c.id} does not match chain state`);
      entryFailed = true;
    }
    await sleep(500);
  }
  if (entryFailed) failures++;
}

if (failures > 0) {
  console.log(`\n${failures} registry entr${failures === 1 ? "y" : "ies"} failed. Not mergeable.`);
  process.exit(1);
}
console.log("\nAll registry entries verify against chain state.");
