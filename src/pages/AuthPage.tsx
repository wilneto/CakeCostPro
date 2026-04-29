import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Card, Notice, TextField } from '@/components/ui';

export function AuthPage({
  onLogin,
  onRegister,
}: {
  onLogin(email: string, password: string): Promise<void>;
  onRegister(email: string, password: string): Promise<void>;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'register') {
        await onRegister(email.trim(), password);
        setMessage('Conta criada e sessão iniciada com sucesso.');
      } else {
        await onLogin(email.trim(), password);
        setMessage('Sessão iniciada com sucesso.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <Card className="auth-card">
        <div className="brand-pill">
          <span>CakeCost Pro</span>
        </div>
        <h1>Seu espaço pessoal para calcular custos com segurança.</h1>
        <p>
          Cada e-mail recebe um espaço isolado. Seus insumos, receitas e configurações não aparecem para outras
          contas.
        </p>

        <div className="toggle-row auth-toggle">
          <button className={`toggle ${mode === 'register' ? 'is-active' : ''}`} type="button" onClick={() => setMode('register')}>
            Criar conta
          </button>
          <button className={`toggle ${mode === 'login' ? 'is-active' : ''}`} type="button" onClick={() => setMode('login')}>
            Entrar
          </button>
        </div>

        <form className="form-grid" onSubmit={submit}>
          <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            label="Senha"
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Use uma senha forte para proteger seus dados."
          />

          {error ? <Notice tone="danger">{error}</Notice> : null}
          {message ? <Notice tone="success">{message}</Notice> : null}

          <Button type="submit" disabled={busy || !email.trim() || password.length < 6}>
            {busy ? 'Aguarde...' : mode === 'register' ? 'Criar conta' : 'Entrar'}
          </Button>
        </form>

        <p className="auth-note">
          Ao entrar com outro e-mail, o app abre outro conjunto de dados completamente separado.
        </p>
      </Card>
    </div>
  );
}
