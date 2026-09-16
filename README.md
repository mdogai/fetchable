# fetchable

**A token is fetchable when every claim it makes ships with the RPC call that proves it.**

The buyers that matter next are agents, and agents can only score what they can read. "Liquidity locked" and "team holds nothing" are prose: promises a machine cannot check and a human rarely does. Fetchable turns each claim into a statement plus an `eth_call` plus the expected result, verifiable by anyone in one round trip per claim.

- **[SPEC.md](SPEC.md)**: the fetchable/0.1 spec. Small on purpose.
- **[verify/](verify/)**: zero-dependency reference verifier (Node 18+).
- **[skill/](skill/)**: an agent skill so AI agents can verify tokens themselves.
- **[examples/](examples/)**: MDOG's live document, reference implementation #1.

## Verify a token in one command

```
node verify/fetch-verify.mjs https://mdog.ai/fetch.json
```

```
fetchable verify :: MDOG :: chain 5042
PASS  supply-fixed    :: Total supply is 1,000,000,000 MDOG, fixed, 18 decimals.
PASS  dev-holds-zero  :: The deployer wallet holds zero MDOG. ...
PASS  lp-burned       :: The Uniswap v4 liquidity position (NFT 27155) is owned by the dead address. ...
3 pass, 0 fail, 0 error, 0 skipped.
```

Distrust the token's listed RPC? Use your own: `--rpc <url>`.

## Publish your own

Write a `fetch.json` per [SPEC.md](SPEC.md), serve it at your token site with open CORS, and only claim what your proofs prove. The spec's honesty rule is the whole point: a claim without a proof does not belong in the document.

## Get listed in the registry

[registry.json](registry.json) maps Arc contract addresses to their published fetch.json, so verifiers (including the live checker at [mdog.ai](https://mdog.ai)) can find and run a token's receipts from its address alone. To list your token: publish your fetch.json, verify it passes (`node verify/fetch-verify.mjs <your-url>`), then open a PR adding your address. Documents that fail verification will not be merged. Listing is not an endorsement; the receipts prove themselves or they don't.

## What this is not

Not a score, not an endorsement, not a rug guarantee. Three honest claims can still be a bad trade. Fetchable proves exactly one thing: whether a token's published claims match chain state right now.

Not affiliated with any chain, launchpad, or platform.

## Who

Maintained by [MDOG](https://mdog.ai), the first token launched on Minara on Arc. We wrote the standard because we wanted to be held to it. Fetch or be fetched.

MIT licensed.
