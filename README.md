# CakeCost Pro

Aplicativo PWA mobile-first para calcular custo de produção de bolos, doces e derivados, com cadastro de insumos, conversões culinárias, receitas, custos indiretos e sugestão de preço de venda.

## Política De Layout

O layout e a identidade visual deste projeto estão congelados por padrão. Qualquer alteração de interface, navegação, tipografia, espaçamento, cores ou disposição dos elementos só pode acontecer com solicitação humana explícita.

A referência oficial dessa regra está em [AI_ORIENTACOES.md](/Users/wilsonlucena/Desktop/Mesa%20-%20WMEC-MK4WYG90DW/work/2026/app-preços-jussara/AI_ORIENTACOES.md).

## Requisitos

- Node.js 18+.
- npm.

## Instalação

```bash
npm install
```

## Como rodar

```bash
npm run dev
```

O comando sobe:

- o backend persistente em `http://127.0.0.1:8787`
- o frontend em `http://127.0.0.1:4173`

Abra a URL do frontend mostrada no terminal, normalmente `http://127.0.0.1:4173`.

## Como gerar build

```bash
npm run build
```

O resultado fica em `dist/` e pode ser hospedado em qualquer servidor estático.

## Como publicar com backend

Para servir frontend e API no mesmo servidor:

```bash
npm run build
npm start
```

O servidor HTTP do backend também entrega os arquivos estáticos de `dist/` quando eles existem. Em produção, o ideal é publicar esse processo atrás de um domínio fixo.

## Como usar no celular

1. Abra o app no navegador do celular.
2. Cadastre seus insumos.
3. Configure as conversões específicas de cada ingrediente.
4. Crie uma receita.
5. Veja custo total, custo por fatia e preço sugerido.
6. Exporte um backup JSON para levar os dados para outro aparelho.

## Como instalar como PWA no iPhone

1. Abra o site no Safari.
2. Toque no botão de compartilhar.
3. Escolha **Adicionar à Tela de Início**.
4. Confirme o nome e salve.

Observação: no iOS, o suporte a PWA é bom, mas algumas experiências do sistema podem variar entre versões do Safari.

## Como instalar como PWA no Android

1. Abra o site no Chrome ou navegador compatível.
2. Aguarde a sugestão de instalação, se aparecer.
3. Ou toque no menu do navegador e escolha **Instalar app** ou **Adicionar à tela inicial**.

## Funcionalidades entregues

- Dashboard com resumo.
- Cadastro e edição de insumos.
- Conversões personalizadas por insumo.
- Cadastro e edição de receitas.
- Detalhe completo da receita.
- Calculadora de preço por margem e markup.
- Configurações globais.
- Backup/exportação/importação JSON.
- Funcionamento offline via service worker.
- Persistência local no dispositivo com IndexedDB.
- Sincronização com backend persistente via API local.

## Limitações do MVP

- Sem autenticação multiusuário ainda.
- Sincronização é por último estado salvo, sem resolução avançada de conflitos.
- O service worker usa cache simples do app shell e dos recursos visitados.
- Algumas conversões muito específicas podem exigir cadastro manual.
- O suporte a ícones de instalação varia entre plataformas por conta do uso de SVG no MVP.

## Próximos passos recomendados

1. Adicionar autenticação e multiusuário.
2. Adicionar histórico de alterações por receita e por insumo.
3. Criar duplicação de receitas e insumos.
4. Criar gráficos de custo por categoria.
5. Melhorar ícones PWA com PNGs dedicados em múltiplos tamanhos.
6. Adicionar testes de interface para os fluxos principais.
