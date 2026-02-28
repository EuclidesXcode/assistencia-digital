# Analise de paginas x banco de dados

## Escopo
- Analise estatica do codigo (sem executar queries reais no banco).
- Mapeamento de todas as paginas `app/**/page.tsx` e suas integracoes com banco.
- Identificacao das tabelas usadas por rota/tela.

## Resumo executivo
- Total de paginas analisadas: 22.
- Paginas com integracao de banco (direta ou via API): 9.
- Paginas sem integracao de banco (placeholder/local): 13.
- Existe integracao global no layout de `/home` (notificacoes + busca global), que impacta varias telas mesmo quando a pagina em si nao consulta banco.

## Dependencias globais (Home Layout)
Arquivo: `app/home/layout.tsx`
- Carrega contador de notificacoes nao lidas via `NotificationService.getUnreadCount`.
- Renderiza `GlobalSearch`, que consulta varios modulos/tabelas.

Arquivo: `components/GlobalSearch.tsx`
- Consulta produtos -> tabela `produtos`.
- Consulta recebimento -> tabela `recebimentos`.
- Consulta NF-e -> tabela `nfe_xmls`.
- Consulta notificacoes -> tabela `notifications`.
- Consulta orcamentos -> tabela `orcamentos`.
- Consulta pre-analise -> tabela `pre_analise`.

## Matriz por pagina

### 1) `/`
Arquivo: `app/page.tsx` + `components/Login.tsx`
- Usa banco: Sim (via API).
- Fluxo: `login()` -> `/api/auth/login`; `createAuditLog()` -> `/api/audit`.
- Tabelas: `users`, `profiles`, `audit_logs`.
- Status funcional: **Parcialmente ok** (depende de configuracao Supabase server-side).

### 2) `/register`
Arquivo: `app/register/page.tsx`
- Usa banco: Sim (via API).
- Fluxo: `registerUser()` -> `/api/auth/register`.
- Tabelas: `branches`, `users`, `profiles`.
- Status funcional: **Parcialmente ok** (depende de configuracao Supabase server-side).

### 3) `/esqueci-senha`
Arquivo: `app/esqueci-senha/page.tsx`
- Usa banco: Nao.
- Fluxo: simulacao com `setTimeout`.
- Tabelas: nenhuma.
- Status funcional: **Sem integracao real de recuperacao de senha**.

### 4) `/home`
Arquivo: `app/home/page.tsx` + `backend/services/dashboardService.ts`
- Usa banco: Sim (cliente Supabase direto no service).
- Tabelas: `orcamentos`, `pre_analise`, `recebimentos`, `nfe_xmls`, `audit_logs`.
- Status funcional: **Ok**, com indicadores baseados em contagem.

### 5) `/home/usuarios`
Arquivo: `app/home/usuarios/page.tsx` + `backend/services/userManagementService.ts` + `/api/admin/users*`
- Usa banco: Sim (via API admin).
- Tabelas: `profiles`, `users`, `branches`, `audit_logs`.
- Tambem usa RPC: `create_app_user`, `update_app_user_password`.
- Status funcional: **Ok**, sujeito a permissoes e configuracao `SUPABASE_SERVICE_ROLE_KEY`.

### 6) `/home/produtos`
Arquivo: `app/home/produtos/page.tsx` + `lib/productApiService.ts` + `/api/products*`
- Usa banco: Sim (via API de produtos).
- Tabela: `produtos`.
- Operacoes: listar, buscar, lookup por EAN, criar, alterar, excluir.
- Status funcional: **Ok**, com fallback para diferencas de schema no backend.

### 7) `/home/nfe-xml`
Arquivo: `app/home/nfe-xml/page.tsx` + `backend/services/nfeService.ts`
- Usa banco: Sim.
- Tabela: `nfe_xmls`.
- Operacoes prontas: listar, importar XML.
- Operacoes faltando no service: `deleteNota`, `enviarParaPreAnalise`.
- Status funcional: **Parcial** (acoes de excluir/enviar pre-analise nao implementadas no backend).

### 8) `/home/pre-analise`
Arquivo: `app/home/pre-analise/page.tsx` + `backend/services/preAnaliseService.ts`
- Usa banco: Sim.
- Tabela: `pre_analise`.
- Operacoes prontas: listar pendentes e resultados.
- Operacao faltando: `efetuarPreAnalise` lanca erro de nao implementado.
- Status funcional: **Parcial** (acao principal de processamento nao implementada).

### 9) `/home/orcamentos`
Arquivo: `app/home/orcamentos/page.tsx` + `backend/services/orcamentoService.ts`
- Usa banco: Sim.
- Tabela: `orcamentos`.
- Status funcional: **Parcial**.
- Observacao: service retorna `select('*')` sem mapper para camelCase, enquanto a pagina espera campos camelCase (`codigoNF`, `modeloFabricante`, etc.). Com query (`q`) essa discrepancia pode causar erro em `toLowerCase()` se campos vierem `undefined`.

### 10) `/home/notificacoes`
Arquivo: `app/home/notificacoes/page.tsx` + `backend/services/notificationService.ts` + `/api/notifications*`
- Usa banco: Sim.
- Tabela: `notifications`.
- Status funcional: **Parcial**.
- Observacao: API retorna shape de banco (ex.: `created_at`) e a tela espera `timestamp`; pode ficar sem horario exibido.

### 11) `/home/recebimento/com-nf`
Arquivo: `app/home/recebimento/com-nf/page.tsx` + `_components/RecebimentoWizardEtiquetas.tsx`
- Usa banco: Nao.
- Fluxo atual: estado local + `localStorage`.
- Tabelas: nenhuma (apesar de existir tabela `recebimentos` no schema).
- Status funcional: **Sem persistencia em banco**.

### 12) `/home/recebimento/sem-nf`
Arquivo: `app/home/recebimento/sem-nf/page.tsx` + `_components/RecebimentoWizardEtiquetas.tsx`
- Usa banco: Nao.
- Fluxo atual: estado local + `localStorage`.
- Tabelas: nenhuma.
- Status funcional: **Sem persistencia em banco**.

### 13) `/home/configuracoes`
Arquivo: `app/home/configuracoes/page.tsx`
- Usa banco: Nao.
- Fluxo atual: leitura/escrita em `localStorage`.
- Tabelas: nenhuma.
- Status funcional: **Sem persistencia em banco**.

### 14) `/home/analise-tecnica`
### 15) `/home/cadastro-clientes`
### 16) `/home/cadastro-empresas`
### 17) `/home/conserto`
### 18) `/home/embalagem`
### 19) `/home/endereco`
### 20) `/home/expedicao`
### 21) `/home/qualidade`
### 22) `/home/verificar-disponibilidade`
Arquivos: paginas com `PagePlaceholder`
- Usa banco: Nao.
- Tabelas: nenhuma.
- Status funcional: **Tela placeholder (sem integracao de dominio)**.

## Tabelas usadas (consolidado)
- `users` (login, cadastro, usuarios admin)
- `profiles` (login, cadastro, usuarios admin)
- `branches` (cadastro, usuarios admin)
- `audit_logs` (login/auditoria, dashboard, usuarios admin)
- `produtos` (modulo produtos)
- `nfe_xmls` (NF-e e dashboard)
- `pre_analise` (pre-analise e dashboard)
- `orcamentos` (orcamentos e dashboard)
- `recebimentos` (dashboard e busca global)
- `notifications` (notificacoes e contador no layout)

## Pontos criticos encontrados
1. `PreAnaliseService.efetuarPreAnalise` nao implementado.
   - Arquivo: `backend/services/preAnaliseService.ts`.
   - Impacto: botao principal da tela de pre-analise nao conclui fluxo.

2. `NfeService` sem `deleteNota` e `enviarParaPreAnalise`.
   - Arquivo: `backend/services/nfeService.ts`.
   - Impacto: acoes de exclusao e envio para pre-analise ficam indisponiveis na tela NF-e.

3. Possivel mismatch de shape (snake_case x camelCase) em Orcamentos/Pre-analise/Recebimento.
   - Services retornam `select('*')` cru do banco.
   - Telas esperam propriedades camelCase.
   - Impacto: campos vazios e risco de erro ao filtrar com texto.

4. `GlobalSearch` aponta para rotas que nao existem no app router atual:
   - `/home/cadastro`
   - `/home/recebimento`
   - Arquivo: `components/GlobalSearch.tsx`.
   - Impacto: resultados podem levar a 404.

## Conclusao
- O projeto tem base de integracao com banco bem distribuida, principalmente em autenticacao, dashboard, usuarios, produtos, notificacoes, NF-e e pre-analise.
- Parte relevante do sistema ainda esta em modo parcial (metodos nao implementados) ou placeholder sem persistencia.
- Para uso produtivo pleno, os principais gaps estao em: completar metodos faltantes (NF-e e pre-analise), normalizar mapeamentos de campos do banco para o frontend, e ajustar links/fluxos da busca global.
