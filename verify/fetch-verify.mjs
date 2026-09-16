#!/usr/bin/env node
// fetchable verifier (fetchable/0.1). Zero dependencies, Node 18+.
// Usage:
//   node fetch-verify.mjs https://mdog.ai/fetch.json
//   node fetch-verify.mjs ./examples/mdog.fetch.json
//   node fetch-verify.mjs <url-or-file> --rpc https://your-own-rpc   (distrust the listed RPC)

import { readFile } from "node:fs/promises";

const argv = process.argv.slice(2);
const target = argv.find((a) => !a.startsWith("--"));
const rpcFlag = argv.includes("--rpc") ? argv[argv.indexOf("--rpc") + 1] : null;

if (!target) {
  console.error("usage: fetch-verify <fetch.json url or file> [--rpc <url>]");
  process.exit(2);
}

async function loadDoc(t) {
  if (/^https?:\/\//.test(t)) {
    const r = await fetch(t, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${t}`);
    return r.json();
  }
  return JSON.parse(await readFile(t, "utf8"));
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

const doc = await loadDoc(target);

if (doc.spec !== "fetchable/0.1") {
  console.error(`not a fetchable/0.1 document (spec: ${doc.spec ?? "missing"})`);
  process.exit(2);
}
if (!Array.isArray(doc.claims) || doc.claims.length === 0) {
  console.error("document has no claims");
  process.exit(2);
}

const rpc = rpcFlag || doc.rpc?.public;
if (!rpc) {
  console.error("no RPC: document lists none and --rpc not given");
  process.exit(2);
}

const tok = doc.token || {};
console.log(`fetchable verify :: ${tok.symbol || tok.name || "unknown token"} :: chain ${tok.chain_id ?? "?"}`);
console.log(`rpc: ${rpc}${rpcFlag ? " (override)" : ""}\n`);

let pass = 0, fail = 0, skip = 0, error = 0;

for (const c of doc.claims) {
  const label = c.id || "(no id)";
  if (c.proof?.type !== "eth_call") {
    console.log(`SKIP  ${label} :: unknown proof type ${c.proof?.type}`);
    skip++;
    continue;
  }
  try {
    const res = await ethCall(rpc, c.proof.to, c.proof.data);
    if (typeof res === "string" && res.toLowerCase() === String(c.proof.expect).toLowerCase()) {
      console.log(`PASS  ${label} :: ${c.statement}`);
      pass++;
    } else {
      console.log(`FAIL  ${label} :: expected ${c.proof.expect}, chain returned ${res}`);
      fail++;
    }
  } catch (e) {
    console.log(`ERROR ${label} :: ${e.message} (rate limited? retry)`);
    error++;
  }
}

console.log(`\n${pass} pass, ${fail} fail, ${error} error, ${skip} skipped.`);
if (fail > 0) {
  console.log("verdict: FAIL. at least one published claim does not match chain state.");
  process.exit(1);
}
if (error > 0) {
  console.log("verdict: INCONCLUSIVE. retry the errored calls before concluding anything.");
  process.exit(1);
}
console.log("verdict: all published claims match chain state. that is all this proves.");
