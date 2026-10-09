import { BrandMark } from './components/BrandMark.tsx'
import { brand } from './theme.ts'

/** Public landing page, rebuilt from cbtc-collateral-desk-ui-design/landing. */
export function Landing() {
  return (
    <div className="landing">
      <header className="nav">
        <a className="brand" href="#/">
          <BrandMark />
          <span>{brand.nameUpper}</span>
        </a>
        <nav>
          <a className="active" href="#top">
            Home
          </a>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#about">About</a>
        </nav>
        <div className="nav-actions">
          <span className="status">
            <i /> Canton
          </span>
          <a className="button primary small" href="#/desk">
            Launch the Desk
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">BILATERAL LENDING / CANTON</p>
            <h1>
              Private CBTC Credit,
              <br />
              <span>Built for Bilateral Lending</span>
            </h1>
            <p className="lede">
              A secure and governed workspace for private CBTC-backed USDCx
              credit. Named counterparties. Controlled collateral custody.
              Governed settlement on Canton.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#/desk">
                Launch the Desk <b>→</b>
              </a>
              <a className="button ghost" href="#how">
                ▷ &nbsp; See how it works
              </a>
            </div>
          </div>

          <div className="flow-card">
            <div className="governed">▣ &nbsp; GOVERNED BY DECMAN</div>
            <div className="flow">
              <div className="node">
                <b>♙</b>
                <small>Borrower</small>
                <span>Requests credit</span>
              </div>
              <div className="arrow">→</div>
              <div className="node">
                <b>₿</b>
                <small>CBTC collateral</small>
                <span>Locked in custody</span>
              </div>
              <div className="arrow">→</div>
              <div className="node accent">
                <b>♢</b>
                <small>Desk custody</small>
                <span>Controlled &amp; enforced</span>
              </div>
              <div className="arrow">→</div>
              <div className="node">
                <b>♙</b>
                <small>Named lender</small>
                <span>Provides USDCx</span>
              </div>
              <div className="arrow">→</div>
              <div className="node">
                <b>$</b>
                <small>USDCx</small>
                <span>Disbursed</span>
              </div>
            </div>
          </div>
        </section>

        <section className="stats" aria-label="Product facts">
          <div className="stat">
            <b>Bilateral</b>
            <span>Named lender · named borrower</span>
          </div>
          <div className="stat">
            <b>1 / loan</b>
            <span>Per-loan agreed terms, no pools</span>
          </div>
          <div className="stat">
            <b>Desk custody</b>
            <span>CBTC locked, borrower claim</span>
          </div>
          <div className="stat">
            <b>Canton</b>
            <span>Party-scoped privacy</span>
          </div>
        </section>

        <section className="feature-grid" id="features">
          <article>
            <div className="icon">▤</div>
            <h3>Bilateral loan terms</h3>
            <p>
              Each loan has agreed terms between a named borrower and lender — no
              pools, no markets.
            </p>
          </article>
          <article>
            <div className="icon">♢</div>
            <h3>Controlled collateral custody</h3>
            <p>
              CBTC is transferred into Desk-controlled custody with per-position
              borrower claims.
            </p>
          </article>
          <article>
            <div className="icon">⌘</div>
            <h3>Governed settlement</h3>
            <p>
              Powered by DecMan and Grofty for secure approvals and borrower
              transactions.
            </p>
          </article>
          <article>
            <div className="icon">◉</div>
            <h3>Private positions</h3>
            <p>
              Keep counterparties and positions scoped to the parties that should
              see them on Canton.
            </p>
          </article>
        </section>

        <section className="how" id="how">
          <div className="section-head">
            <p className="eyebrow">THE WORKFLOW</p>
            <h2>How a loan moves</h2>
            <p>
              From proposal to settlement, every step is governed, transparent and
              secure.
            </p>
          </div>
          <div className="steps">
            <div className="step">
              <b>1</b>
              <h3>Propose &amp; Approve</h3>
              <p>Credit officer reviews terms, assesses risk and gets approval.</p>
            </div>
            <div className="step">
              <b>2</b>
              <h3>Lock &amp; Fund</h3>
              <p>
                CBTC is locked in custody and lender USDCx is disbursed to the
                borrower.
              </p>
            </div>
            <div className="step">
              <b>3</b>
              <h3>Monitor</h3>
              <p>Track position, health and covenants in real time.</p>
            </div>
            <div className="step">
              <b>4</b>
              <h3>Repay or Liquidate</h3>
              <p>
                Repay to release collateral or trigger governed liquidation if
                needed.
              </p>
            </div>
          </div>
        </section>

        <section className="about" id="about">
          <div className="section-head">
            <p className="eyebrow">ABOUT</p>
            <h2>Built for the desk, not the pool</h2>
            <p>
              {brand.name} is a private loan-origination and collateral-control
              workspace for bilateral CBTC lending on Canton.
            </p>
          </div>
          <div className="about-grid">
            <article className="about-card">
              <h3>What it is</h3>
              <p>
                A credit-officer workspace to agree terms, move CBTC into
                desk-controlled custody, disburse lender USDCx, and close the loan
                by repayment or governed liquidation.
              </p>
            </article>
            <article className="about-card">
              <h3>How it differs</h3>
              <p>
                Unlike pooled money markets, a named lender funds a specific
                borrower under per-loan terms. Collateral authority is scoped to
                that agreement — not shared liquidity.
              </p>
            </article>
            <article className="about-card">
              <h3>The stack</h3>
              <p>
                Canton for private, party-scoped settlement; Grofty (CIP-0103) for
                borrower, lender and liquidator authorization; the Decentralization
                Manager for governed custody and enforcement.
              </p>
            </article>
            <article className="about-card">
              <h3>Honest status</h3>
              <p>
                LocalNet / mock ledger and mock Grofty work today. Live Grofty,
                live DecMan and CIP-0112 mainnet pins require external onboarding —
                we do not fake them.
              </p>
            </article>
          </div>
        </section>

        <section className="cta">
          <p className="eyebrow">CANTON ECOSYSTEM</p>
          <h2>Secure. Governed. Institutional.</h2>
          <p>
            {brand.name} brings together Canton, DecMan and Grofty to enable
            private, bilateral lending with full control.
          </p>
          <div>
            <a className="button primary" href="#/desk">
              Launch the Desk →
            </a>
            <a className="text-link" href="#how">
              ⌘ &nbsp; Explore the architecture
            </a>
          </div>
        </section>
      </main>

      <footer>
        <span className="footer-brand">
          <BrandMark /> {brand.nameUpper}
          <br />
          <small>{brand.tagline}</small>
        </span>
        <span>{brand.footerNote}</span>
      </footer>
    </div>
  )
}
