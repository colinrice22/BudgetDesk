import React, { useEffect, useRef, useState } from "react";

export default function HomePage() {
  // PWA install prompt logic
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const installBtnRef = useRef(null);

  useEffect(() => {
    // Detect mobile
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));

    // Listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShowInstall(false);
    }
  };

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
            {showInstall && (
              <button
                className="btn btn-accent"
                ref={installBtnRef}
                onClick={handleInstall}
                style={{ marginLeft: 8 }}
              >
                {isMobile ? "Add to Home Screen" : "Add to Desktop"}
              </button>
            )}
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
            <p>
              Every dollar gets a job. With zero-based budgeting, you assign every bit of income to a category—spending, saving, or investing—until nothing is left unallocated. This method gives you total clarity and control, so you always know exactly where your money is going and what’s left to spend. It’s the antidote to vague, stressful budgeting and helps you make calm, confident decisions each month.
            </p>
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
          <li>Zero-based budgeting means you always know what’s left to spend—no more guessing or overspending.</li>
          <li>Monthly planning and transaction tracking are unified, so you can adjust quickly when life changes.</li>
          <li>Recover fast when priorities shift mid-month—move money between categories with a click.</li>
          <li>Own your data: export anytime, and keep your budget local for maximum privacy.</li>
          <li>Designed for clarity, not overwhelm—BudgetDesk helps you focus on what matters most.</li>
        </ul>
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <strong>Why zero-based budgeting?</strong>
          <p style={{ maxWidth: 600, margin: "12px auto 0" }}>
            Most budgets fail because they’re too vague or too rigid. Zero-based budgeting is different: it’s flexible, precise, and puts you in control. By giving every dollar a job, you avoid the trap of “leftover” money disappearing, and you can adapt your plan as life changes. It’s budgeting for real people, not spreadsheets.
          </p>
        </div>
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
