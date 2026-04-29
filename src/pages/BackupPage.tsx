import { useRef, useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { exportBackup, readBackupPayload } from '@/storage/appStorage';
import { Button, Card, Notice, SectionTitle } from '@/components/ui';
import { formatNumberBR } from '@/utils/units';

export function BackupPage({ navigate }: { navigate: (path: string) => void }) {
  const { state, replaceState, clearAll } = useAppData();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState('');

  const onExport = () => {
    const payload = exportBackup(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cakecost-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('Backup exportado com sucesso.');
  };

  return (
    <Card>
      <SectionTitle
        title="Backup e portabilidade"
        subtitle="Exporte, importe e limpe tudo localmente sem depender de servidor."
        action={<Button variant="secondary" onClick={() => navigate('/configuracoes')}>Voltar</Button>}
      />

      {message ? <Notice tone="success">{message}</Notice> : null}

      <div className="stat-grid stat-grid--compact">
        <div className="mini-metric">
          <span>Insumos</span>
          <strong>{formatNumberBR(state.insumos.length, 0)}</strong>
        </div>
        <div className="mini-metric">
          <span>Receitas</span>
          <strong>{formatNumberBR(state.receitas.length, 0)}</strong>
        </div>
        <div className="mini-metric">
          <span>Última atualização</span>
          <strong>{new Date(state.updatedAt).toLocaleString('pt-BR')}</strong>
        </div>
      </div>

      <div className="button-row">
        <Button onClick={onExport}>Exportar JSON</Button>
        <Button variant="secondary" onClick={() => fileInput.current?.click()}>
          Importar JSON
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (window.confirm('Isso vai apagar todos os dados locais. Deseja continuar?')) {
              clearAll();
              setMessage('Dados limpos com sucesso.');
            }
          }}
        >
          Limpar dados
        </Button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }

          try {
            const text = await file.text();
            const parsed = readBackupPayload(text);
            if (!window.confirm(`Importar backup com ${parsed.state.insumos.length} insumos e ${parsed.state.receitas.length} receitas? Isso substituirá os dados atuais.`)) {
              return;
            }
            replaceState(parsed.state);
            setMessage('Backup importado com sucesso.');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Falha ao importar backup.');
          } finally {
            event.currentTarget.value = '';
          }
        }}
      />

      <Card className="panel panel-soft">
        <SectionTitle title="O que é salvo" />
        <p className="copy-block">Insumos, conversões, receitas, custos indiretos e preferências de precificação.</p>
        <p className="copy-block">O formato JSON permite levar seus dados entre dispositivos sem depender de backend.</p>
      </Card>
    </Card>
  );
}
