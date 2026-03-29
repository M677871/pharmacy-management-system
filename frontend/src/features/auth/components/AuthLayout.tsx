import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="auth-screen">
      <section className="auth-brand-panel">
        <div className="auth-brand-mark">
          <span />
          <strong>PharmaFlow</strong>
        </div>
        <div className="auth-brand-copy">
          <h2>Pharmacy ERP System</h2>
          <p>
            Secure inventory, sales, purchasing, and reporting workflows for
            modern pharmacy teams.
          </p>
        </div>
        <div className="auth-brand-glow auth-brand-glow-top" />
        <div className="auth-brand-glow auth-brand-glow-bottom" />
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
