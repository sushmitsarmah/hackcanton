/**
 * Browser stub for @walletconnect/sign-client.
 *
 * @canton-network/dapp-sdk imports SignClient at module scope, but this desk
 * only uses the Grofty browser extension (ExtensionAdapter) and never the
 * WalletConnect adapter. Aliasing the import here avoids bundling the full
 * WalletConnect relay client (~1MB) into a static site, and fails loudly if
 * WalletConnect is ever actually exercised.
 */
function unavailable(): never {
  throw new Error(
    'WalletConnect is not enabled in this build. Use the Grofty browser extension.',
  )
}

const SignClient = {
  init: unavailable,
  get: unavailable,
}

export default SignClient
