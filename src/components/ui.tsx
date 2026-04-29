import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { AppRoute } from '@/hooks/useHashRoute';
import { formatBRL, formatNumberBR } from '@/utils/units';

export function Icon({
  name,
  className = '',
}: {
  name: 'home' | 'flour' | 'cake' | 'calculator' | 'gear' | 'arrow-left' | 'plus' | 'trash' | 'pencil' | 'download' | 'upload' | 'spark' | 'warning' | 'leaf' | 'receipt' | 'shield' | 'flame';
  className?: string;
}) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M4 11.5 12 4l8 7.5" />
          <path {...common} d="M6 10.5V20h12v-9.5" />
        </svg>
      );
    case 'flour':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M7 4h10v4H7z" />
          <path {...common} d="M6 8h12l-1 12H7L6 8Z" />
          <path {...common} d="M9 12h6" />
        </svg>
      );
    case 'cake':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M6 12h12v8H6z" />
          <path {...common} d="M8 12c0-3 1.6-5 4-5s4 2 4 5" />
          <path {...common} d="M12 2v5" />
          <path {...common} d="M9.5 5.5 12 2l2.5 3.5" />
        </svg>
      );
    case 'calculator':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect {...common} x="5" y="3" width="14" height="18" rx="2" />
          <path {...common} d="M8 7h8" />
          <path {...common} d="M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 19h2M12 19h2" />
        </svg>
      );
    case 'gear':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" />
          <path {...common} d="M4 12h2m12 0h2M12 4v2m0 12v2M6.5 6.5l1.4 1.4m8.2 8.2 1.4 1.4M17.5 6.5l-1.4 1.4M8.9 15.9l-1.4 1.4" />
        </svg>
      );
    case 'arrow-left':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M14 6 8 12l6 6" />
          <path {...common} d="M9 12h8" />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'trash':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M5 7h14" />
          <path {...common} d="M9 7V5h6v2" />
          <path {...common} d="M8 7l1 12h6l1-12" />
        </svg>
      );
    case 'pencil':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M4 20h4l11-11-4-4L4 16z" />
          <path {...common} d="M14 6l4 4" />
        </svg>
      );
    case 'download':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M12 3v10" />
          <path {...common} d="M8 9l4 4 4-4" />
          <path {...common} d="M5 19h14" />
        </svg>
      );
    case 'upload':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M12 21V11" />
          <path {...common} d="M8 15l4-4 4 4" />
          <path {...common} d="M5 5h14" />
        </svg>
      );
    case 'spark':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" />
        </svg>
      );
    case 'warning':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M12 4 3.8 18h16.4L12 4Z" />
          <path {...common} d="M12 9v4" />
          <path {...common} d="M12 16.5h.01" />
        </svg>
      );
    case 'leaf':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M20 4c-7.5.5-12.5 4.5-14 12 7.5-.4 11.5-5 14-12Z" />
          <path {...common} d="M6 18c2.4-4 5.8-6.6 10-8" />
        </svg>
      );
    case 'receipt':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M6 4h12v16l-2-1.2L14 20l-2-1.2L10 20l-2-1.2L6 20z" />
          <path {...common} d="M8 8h8M8 12h8M8 16h4" />
        </svg>
      );
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M12 4 19 7v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V7z" />
          <path {...common} d="m9.5 12 1.8 1.8L15 10.2" />
        </svg>
      );
    case 'flame':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...common} d="M12 3c1 3-1 4.5-1 7 0 1.8 1.3 3 3 3 2 0 3-1.3 3-3 0-2.6-2.3-4.5-2-7 2.7 1.7 5 5.1 5 8.7 0 4.1-3.4 7.3-8 7.3s-8-3.2-8-7.3c0-2.5 1.3-4.6 3-6.4.2 2.1 1.4 3.5 3 4.4.5-3 .9-4.7 2-6.7Z" />
        </svg>
      );
  }

  return null;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function InputField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; error?: string }) {
  const { label, hint, error, children, ...rest } = props;
  return (
    <InputField label={label} hint={hint} error={error}>
      <select {...rest} className="input">
        {children}
      </select>
    </InputField>
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const { label, hint, error, ...rest } = props;
  return (
    <InputField label={label} hint={hint} error={error}>
      <input {...rest} className="input" />
    </InputField>
  );
}

export function TextAreaField(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const { label, hint, error, ...rest } = props;
  return (
    <InputField label={label} hint={hint} error={error}>
      <textarea {...rest} className="input input-textarea" />
    </InputField>
  );
}

export function StatCard({
  label,
  value,
  meta,
  icon,
}: {
  label: string;
  value: string;
  meta?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__body">
        <span className="stat-card__label">{label}</span>
        <strong className="stat-card__value">{value}</strong>
        {meta ? <span className="stat-card__meta">{meta}</span> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__symbol">
        <Icon name="spark" className="icon icon-lg" />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'success' | 'danger';
  children: ReactNode;
}) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function AppHeader({
  title,
  subtitle,
  backLabel = 'Voltar',
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="app-header">
      <div className="app-header__left">
        {onBack ? (
          <button className="icon-button" onClick={onBack} type="button" aria-label={backLabel}>
            <Icon name="arrow-left" className="icon" />
          </button>
        ) : null}
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="app-header__action">{action}</div> : null}
    </header>
  );
}

export function AppShell({
  children,
  route,
}: {
  children: ReactNode;
  route: AppRoute;
}) {
  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
      <BottomNav currentSection={sectionFromRoute(route)} />
    </div>
  );
}

function sectionFromRoute(route: AppRoute): 'inicio' | 'insumos' | 'receitas' | 'calculadora' | 'configuracoes' {
  if (route.path.startsWith('/insumos')) return 'insumos';
  if (route.path.startsWith('/receitas')) return 'receitas';
  if (route.path.startsWith('/calculadora')) return 'calculadora';
  if (route.path.startsWith('/configuracoes') || route.path.startsWith('/backup')) return 'configuracoes';
  return 'inicio';
}

export function BottomNav({
  currentSection,
}: {
  currentSection: 'inicio' | 'insumos' | 'receitas' | 'calculadora' | 'configuracoes';
}) {
  const items: { label: string; path: string; icon: Parameters<typeof Icon>[0]['name']; key: typeof currentSection }[] = [
    { label: 'Início', path: '/inicio', icon: 'home', key: 'inicio' },
    { label: 'Insumos', path: '/insumos', icon: 'flour', key: 'insumos' },
    { label: 'Receitas', path: '/receitas', icon: 'cake', key: 'receitas' },
    { label: 'Calculadora', path: '/calculadora', icon: 'calculator', key: 'calculadora' },
    { label: 'Configurações', path: '/configuracoes', icon: 'gear', key: 'configuracoes' },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {items.map((item) => (
        <a key={item.key} className={`bottom-nav__item ${currentSection === item.key ? 'is-active' : ''}`} href={`#${item.path}`}>
          <Icon name={item.icon} className="icon" />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

export function MoneyStat({ value }: { value: number }) {
  return <strong>{formatBRL(value)}</strong>;
}

export function NumberStat({ value }: { value: number }) {
  return <strong>{formatNumberBR(value)}</strong>;
}
