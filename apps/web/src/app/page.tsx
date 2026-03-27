export default function HomePage() {
  return (
    <main className="landing">
      <header className="hero">
        <nav className="nav">
          <p className="brand">BudgetDesk</p>
          <a className="nav-link" href="#features">
            Features
          </a>
        </nav>

        <section className="hero-content">
          <p className="eyebrow">Built for focused monthly planning</p>
          <h1>See your money clearly before the month starts.</h1>
          <p className="hero-copy">
            BudgetDesk is a privacy-first money workspace that helps you direct cash flow, track spending in real time,
            and stay ahead of recurring bills.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/index.html">
              Open BudgetDesk
            </a>
            <a className="btn btn-ghost" href="#why-budgetdesk">
              Why BudgetDesk
            </a>
          </div>
          <p className="hero-note">No account needed. Your budget stays on your device.</p>
          <p className="hero-note">Security by design: your budget data is stored locally in your browser, not on our servers.</p>
        </section>
      </header>

      <section id="features" className="section">
        <div className="section-head">
          <p className="eyebrow">Everything in one place</p>
          <h2>Plan, track, and adjust without spreadsheet friction</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <h3>Zero-Based Budgeting</h3>
            <p>Assign incoming cash to categories so you always know what is left to spend.</p>
          </article>
          <article className="feature-card">
            <h3>Recurring Transactions</h3>
            <p>Apply scheduled bills and subscriptions with one click every month.</p>
          </article>
          <article className="feature-card">
            <h3>Fast Category Management</h3>
            <p>Create and organize groups instantly as your financial priorities change.</p>
          </article>
          <article className="feature-card">
            <h3>Privacy by Default</h3>
            <p>Your budget data can live locally in the browser with no required sign-in.</p>
          </article>
        </div>
      </section>

      <section id="why-budgetdesk" className="section highlight">
        <div className="section-head">
          <p className="eyebrow">Why people use BudgetDesk</p>
          <h2>Built for calm decisions, not financial anxiety</h2>
        </div>
        <ul className="value-list">
          <li>See how much is truly available before you spend.</li>
          <li>Keep monthly planning and transaction tracking in one workflow.</li>
          <li>Recover quickly when priorities shift mid-month.</li>
          <li>Own your data with export and local-first storage options.</li>
        </ul>
      </section>

      <section className="section cta">
        <h2>Ready to start this month with a clear plan?</h2>
        <p>Launch the app and create your budget in minutes.</p>
        <a className="btn btn-primary" href="/index.html">
          Go to BudgetDesk Workspace
        </a>
      </section>
    </main>
  );
}
