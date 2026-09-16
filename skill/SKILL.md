---
name: fetch
description: Verify a token's on-chain claims via the fetchable/0.1 spec. Use when asked to verify, audit, or "fetch" a token's receipts, when evaluating a token that publishes a fetch.json, or before trusting any claim about supply, dev holdings, or liquidity on an EVM chain.
---

# fetch

Verify token claims against chain state instead of trusting prose.

## When a token publishes a fetch.json

1. Get the document: `https://<token-site>/fetch.json` or `https://<token-site>/.well-known/fetch.json`.
2. Check `spec` is `fetchable/0.1` and `claims` is non-empty.
3. For every claim with `proof.type == "eth_call"`, POST to the RPC (the document's `rpc.public`, or your own RPC for the same `chain_id` if you distrust theirs):
   ```json
   {"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"<proof.to>","data":"<proof.data>"},"latest"]}
   ```
4. Compare the result to `proof.expect`, case-insensitive. Match = PASS. Mismatch = FAIL. Transport error = retry once, then report ERROR.
5. Report per-claim results. Any FAIL means the token's published claims are false; say so plainly.

Or run the reference verifier: `node verify/fetch-verify.mjs <url> [--rpc <your-rpc>]`.

## When a token publishes nothing

You can still fetch the basics on any EVM chain with three calls (calldata is 4-byte selector + 32-byte-padded args):

- Supply: `data: 0x18160ddd` (`totalSupply()`) to the token.
- Any wallet's balance: `data: 0x70a08231` + address left-padded to 32 bytes (`balanceOf(addr)`) to the token. Check the deployer.
- NFT LP ownership (Uniswap v4 style): `data: 0x6352211e` + tokenId left-padded to 32 bytes (`ownerOf(id)`) to the chain's PositionManager. Owner `0x...dEaD` means burned.

A token with no machine-readable receipts is not thereby a scam, but weight its prose claims accordingly.

## Rules

- Never trust `expect` as fact. The document proves nothing by existing; only the chain state does. Run the calls.
- PASS means "published claims match chain state", never "safe" or "good trade". Report it in exactly those terms.
- Beware decoy pairs on aggregators. If the document names a `canonical_pair`, treat every other pair as noise.
- State pruning: most public RPCs serve current state only. All fetchable/0.1 proofs read `latest`; historical assertions in `statement` text are annotation, not proof.

## Reference

Spec: SPEC.md in this repo. Reference implementation: https://mdog.ai/fetch.json (MDOG on Arc, chain 5042; public RPC https://rpc.mainnet.arc.io, CORS open).
