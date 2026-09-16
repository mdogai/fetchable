# fetchable/0.1

A token is **fetchable** when every claim it makes ships with the exact RPC call that proves it.

Agents can only score what they can read. Most token claims ("liquidity locked", "team holds nothing") are prose: a human promise, unreadable by machines and unfalsifiable without real work. Fetchable replaces the promise with a proof: a claim is a statement plus an `eth_call` plus the expected result. Any agent, script, or human can verify the whole document in one round trip per claim.

## Document location

Serve a JSON document at either:

- `https://<token-site>/fetch.json` (recommended), or
- `https://<token-site>/.well-known/fetch.json`

Serve it with `Content-Type: application/json` and `Access-Control-Allow-Origin: *` so browser-based agents can read it cross-origin.

## Document shape

```json
{
  "spec": "fetchable/0.1",
  "token": {
    "name": "...", "symbol": "...",
    "contract": "0x...", "chain_id": 5042, "decimals": 18,
    "canonical_pair": "0x..."
  },
  "rpc": { "public": "https://..." },
  "claims": [
    {
      "id": "kebab-case-id",
      "statement": "Human-readable claim.",
      "proof": {
        "type": "eth_call",
        "to": "0x...",
        "data": "0x...",
        "signature": "balanceOf(0x...)",
        "expect": "0x...",
        "expect_meaning": "zero"
      }
    }
  ],
  "not_claimed": ["Things explicitly NOT claimed."]
}
```

## Field rules

- `spec` (required): the literal string `fetchable/0.1`.
- `token.contract`, `token.chain_id` (required): where the token lives.
- `rpc.public` (required): a public RPC endpoint any verifier can use. It should allow CORS if browser agents matter to you.
- `claims[]` (required, at least one):
  - `id`: stable kebab-case identifier.
  - `statement`: the claim in plain language. Say only what the proof proves.
  - `proof.type`: `eth_call` is the only type in 0.1. Verifiers must ignore claims whose proof type they do not recognise.
  - `proof.to` and `proof.data`: the exact call. Pre-encoded calldata, no ABI needed.
  - `proof.expect`: the exact 32-byte-aligned hex the call must return, compared case-insensitively. If the current chain state does not return this value, the claim FAILS.
  - `proof.signature` and `expect_meaning`: human-readable annotations, not used by verifiers.
- `not_claimed` (optional but encouraged): scope honesty. State what you are not saying.
- `canonical_pair` (encouraged): the one real market. Kills decoy-pair confusion on aggregators.

## Verifier behaviour

1. Fetch the document. Reject if `spec` is not `fetchable/0.1` or `claims` is empty.
2. For each claim with `proof.type == "eth_call"`: POST `eth_call` with `{to, data}` at `latest` to `rpc.public` (or any RPC for the same `chain_id`; a verifier that distrusts the listed RPC should use its own).
3. Compare the result to `expect`, case-insensitive. Match = PASS, mismatch = FAIL, transport error = ERROR (retry before reporting).
4. A document's verdict is the worst of its claims: any FAIL means the token's claims are false as published. Report per-claim results, never a bare summary.

## What fetchable is not

- Not an endorsement, a score, or a rug guarantee. A token can publish three honest claims and still be a bad trade.
- Not self-attestation. The document proves nothing by existing; only the chain state it points at does. Verifiers must run the calls, never trust `expect` as fact.
- Not affiliated with any chain, launchpad, or platform.

## Versioning

Breaking changes bump the minor version (`fetchable/0.2`). Verifiers must ignore unknown top-level fields.

## Reference implementation

MDOG on Arc (chain 5042): https://mdog.ai/fetch.json, rendered live at https://mdog.ai.
