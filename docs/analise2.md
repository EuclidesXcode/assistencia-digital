# ANALISE 2 - Auditoria Estrutural Cadastro vs Pré-Análise

---

## 1. Auditoria da Tela de Cadastro

### 1.1 Integridade Estrutural
- A estrutura de `produtos` é fortemente desnormalizada. A tabela concentra `nfs_data`, `modelos_data`, `embalagem`, `acessorios`, `estetica`, `funcional` e `funcionalidade` em JSONB, o que reduz integridade relacional, dificulta validação por chave e amplia risco de inconsistência semântica.
- A dependência entre EAN, Modelo e Código NF não é rigidamente assegurada. O EAN é tratado no contexto operacional como identificador mestre, porém o schema permite múltiplos registros com o mesmo EAN e a API de lookup retorna apenas o cadastro mais recente.
- O Código NF não possui vínculo estrutural com cliente/revenda por chave estrangeira. No fluxo auditado, `nfs_data` armazena apenas `{ codigo, revenda }`, convertendo uma relação de negócio em texto livre.
- Embalagem e Acessórios permanecem vinculados ao cadastro do EAN no produto, porém Estética e Funcional são vinculados ao `modeloSelecionadoId` apenas no estado da tela. Essa associação não é preservada por chave persistente, porque os modelos recebem IDs sintéticos locais a cada carregamento.
- Há redundância de conceito entre `marca`, `fabricante` e `modelo_fabricante`, inclusive com lógica de fallback para schema divergente na API. Isso indica falta de modelo canônico estável.
- A regra de negócio informada para Funcionalidade não está estruturalmente consistente. O domínio contém `ModeloFabricante.funcionalidades`, mas o save do cadastro zera esse campo por modelo e grava `funcionalidade` no nível raiz do produto.
- O cadastro técnico de anexos é parcial. `vistaExplodida`, `boletimTecnico` e `manualTecnico` são persistidos em `modelos_data`, porém `etiquetaProcel` e `kitAcessorio` permanecem no estado da tela e não são enviados ao payload final.

### 1.2 Riscos de Governança
- Existe risco elevado de duplicidade lógica. O texto operacional afirma que EAN/GTIN é único por produto, mas o schema atual permite duplicidade e o fluxo de carregamento usa o último registro criado como base.
- Falta chave lógica forte para separar “cadastro-base” de “novo cadastro derivado”. O sistema diferencia isso por comportamento de tela (`allowSaveIntoCurrentRecord`) e não por relacionamento formal, versão ou linhagem de registro.
- O cadastro mínimo do modal `Selecionar EAN/GTIN` cria produto incompleto no banco antes da conclusão do cadastro completo. Isso gera risco de registros órfãos, incompletos e sem fechamento operacional.
- Não há validação estrutural de completude antes da gravação. O save principal exige essencialmente `EAN`, `modeloReferencia` e `fabricante`; os demais blocos críticos do processo ficam opcionais.
- A atribuição de autoria depende de `localStorage`, sem garantia de identidade corporativa forte ou trilha confiável para auditoria formal.
- A API de produtos contém mecanismos extensos de adaptação a schema divergente, colunas ausentes e tipos incompatíveis. Isso aumenta resiliência técnica de curto prazo, mas enfraquece governança de dados e controle de configuração.

### 1.3 Rastreabilidade
- Não existe garantia estrutural de que a Pré-Análise receba dados corretos do Cadastro, porque o Cadastro grava em `produtos` e a Pré-Análise consome `pre_analise`.
- Não foi identificada rotina de integração, trigger, fila, serviço de sincronização ou processo transacional que alimente `pre_analise` a partir de `produtos`.
- O vínculo entre cadastro e pré-análise, no estado atual, é apenas implícito no discurso da interface. No código e no banco não existe `produto_id`, chave cruzada ou herança automática entre essas duas camadas.
- Anexos técnicos prometidos como apoio à Pré-Análise não são consumidos pela tela de Pré-Análise auditada.

### 1.4 Pontos Críticos Identificados
- Ausência de vínculo estrutural entre `produtos` e `pre_analise`.
- EAN com regra de negócio ambígua: único no processo, não único no schema.
- Código NF armazenado sem chave de cliente/revenda.
- IDs de subitens e modelos recriados localmente a cada carga, quebrando identidade persistente.
- Funcionalidade salva em nível diferente do definido no modelo de domínio.
- Criação de cadastro mínimo incompleto antes da finalização do produto.
- Anexos de apoio operacional parcialmente não persistidos.
- Dependência de identidade em `localStorage`, sem trilha formal de auditoria.

---

## 2. Auditoria da Tela de Pré-Análise

### 2.1 Dependência do Cadastro
- A tela não depende corretamente da base de Cadastro de Produto. Ela consulta exclusivamente `pre_analise` e não realiza composição com `produtos`.
- Dados que deveriam ser herdados automaticamente do cadastro não são herdados no fluxo auditado: anexos técnicos, estrutura de embalagem, acessórios, peças estéticas/funcionais e funcionalidade.
- A tela assume que as informações necessárias já existem em `pre_analise`, mas essa tabela não contém vínculo nem mecanismo de sincronização com `produtos`.
- O campo exibido como “ID Produto” não é comprovadamente o identificador do produto cadastrado. Na estrutura atual, trata-se do `id` da própria linha de `pre_analise`.

### 2.2 Risco Operacional
- O método operacional central da tela, `efetuarPreAnalise`, não está implementado no backend. A ação principal da etapa existe na interface, mas falha por desenho.
- A fila é apresentada como FIFO, porém as consultas em `pre_analise` não possuem ordenação explícita. O “próximo da fila” é tecnicamente indeterminado.
- Há forte possibilidade de erro humano pela ausência de herança automática dos dados do Cadastro. O operador de Pré-Análise depende de informação repetida, paralela ou presumida.
- Os dados exibidos são estruturalmente frágeis porque o contrato TypeScript da tela usa camelCase, enquanto a tabela e o service operam com snake_case. Isso compromete consistência de leitura, filtros e confiabilidade do front.
- A busca textual pressupõe que campos como `codigoNF`, `modeloRef`, `recebidoPor` e `nfReceb` estejam preenchidos no objeto da tela. Sem mapeamento explícito, há risco de campos vazios, inconsistentes ou erro em execução.

### 2.3 Consistência com Regras de Negócio
- A regra “itens cadastrados devem alimentar automaticamente a Pré-Análise” não está atendida.
- A regra “anexos técnicos auxiliam Pré-Análise” não está atendida na tela auditada.
- A regra de dependência entre EAN, cliente/revenda e Código NF não é garantida em `pre_analise`, que replica campos textuais sem chave relacional.
- A regra operacional de fila controlada não está tecnicamente assegurada.

### 2.4 Fragilidade Estrutural Identificada
- Serviço central incompleto (`efetuarPreAnalise` não implementado).
- Contrato de dados inconsistente entre interface, model e banco.
- Ausência de join lógico com `produtos`.
- Ausência de anexos e dados técnicos do cadastro na Pré-Análise.
- Sem vínculo persistente entre item analisado e cadastro de origem.
- Histórico e pendências sem ordenação técnica determinística.

---

## 3. Auditoria do Fluxo Cadastro → Pré-Análise

### 3.1 Coerência de Processo
- O fluxo prometido pela operação não está implementado de ponta a ponta. O Cadastro de Produto é tratado como base central, mas a Pré-Análise não consome essa base.
- O processo real está fragmentado em dois repositórios funcionais independentes: `produtos` e `pre_analise`.
- O carregamento por EAN na tela de Cadastro permite reutilizar um cadastro anterior como base, mas essa herança é feita por convenção de tela e pelo “último registro do EAN”, não por versionamento, baseline ou clonagem controlada.

### 3.2 Lacunas de Integração
- Não existe integração automática de `produtos` para `pre_analise`.
- Não existe FK `pre_analise.produto_id`.
- Não existe chave de integração por NF + cliente/revenda.
- Não existe sincronização de anexos técnicos do cadastro com a etapa seguinte.
- Não existe trilha formal de auditoria aplicada ao fluxo Cadastro → Pré-Análise, apesar de a aplicação possuir infraestrutura de `audit_logs`.

### 3.3 Pontos de Quebra Potencial
- Lookup por EAN seleciona apenas o cadastro mais recente, o que pode herdar dados indevidos quando há múltiplos registros do mesmo EAN.
- Update por `originalEan`, quando usado sem `id`, pode atingir mais de um registro se houver duplicidade do EAN.
- Delete por EAN, sem `id`, pode excluir múltiplos registros associados ao mesmo identificador.
- O modal de inclusão de EAN cria cadastro incompleto no banco antes da conclusão do processo, gerando lixo operacional e retrabalho.
- IDs sintéticos locais para NFs e modelos quebram rastreabilidade persistente entre carregamentos, edições e possíveis correções posteriores.

### 3.4 Risco de Dados Inconsistentes
- Alto risco de herança indevida de cadastro-base para novo cadastro.
- Alto risco de divergência entre regra de negócio e persistência física do EAN.
- Alto risco de perda de contexto entre cliente/revenda e Código NF, pois o relacionamento fica textual.
- Alto risco de divergência entre o que é mostrado como dado técnico de produto e o que de fato está disponível para Pré-Análise.
- Alto risco de inconsistência semântica em funcionalidades, porque o domínio as define por modelo, mas o save as grava no nível do produto.

### 3.5 Grau de Dependência Manual
- Muito alto.
- O processo depende de decisão manual para definir se o cadastro será novo ou atualização.
- A coerência entre EAN, NF, revenda/cliente e cadastro-base depende de interpretação do usuário.
- A Pré-Análise depende de preenchimento e disponibilidade manual de dados que deveriam ser herdados automaticamente.
- O controle de autoria e contexto operacional depende de informação local do navegador.

---

## 4. Avaliação de Maturidade (Estimativa CMMI)

Classificação estimada: **Nível 1 (Inicial)**.

Justificativa técnica:
- O processo não está plenamente definido de ponta a ponta. Há intenção de fluxo, porém a integração estrutural entre Cadastro e Pré-Análise não foi implementada.
- A execução depende fortemente de pessoas, memória operacional e interpretação manual das regras.
- Há inconsistências entre regra declarada, modelagem de dados, persistência e consumo na etapa seguinte.
- O processo não apresenta controle robusto de rastreabilidade, versionamento lógico, vínculo transacional nem governança de identidade para auditoria formal.
- A ação principal da Pré-Análise não está operacionalizada no backend, o que caracteriza maturidade processual baixa.
- Existem artefatos isolados de gestão, como schema, serviços e infraestrutura de auditoria, mas eles não se convertem em processo gerenciado e rastreável no fluxo auditado.

---

## 5. Lista Objetiva de Falhas Críticas

- [CRÍTICO] Não existe integração estrutural entre `produtos` e `pre_analise`, inviabilizando a herança automática exigida pelo processo.
- [CRÍTICO] `efetuarPreAnalise` não está implementado no backend, interrompendo a etapa central da Pré-Análise.
- [CRÍTICO] O vínculo entre cadastro e análise é apenas implícito; não há `produto_id`, chave cruzada ou trilha formal de origem.
- [CRÍTICO] A tela de Pré-Análise usa contrato camelCase incompatível com o schema/service em snake_case, fragilizando leitura, filtro e confiabilidade operacional.
- [ALTO] EAN possui regra de negócio contraditória: declarado como único no processo, permitido como duplicado no banco e resolvido por “último registro” no lookup.
- [ALTO] `Código NF` é armazenado como texto livre com `revenda`, sem chave estrangeira para cliente/filial.
- [ALTO] Inclusão de EAN pode criar produto mínimo incompleto antes da conclusão do cadastro final.
- [ALTO] Update e delete por EAN, sem `id`, podem afetar múltiplos registros quando o EAN é duplicado.
- [ALTO] Funcionalidade está modelada por `ModeloFabricante`, mas é persistida no nível raiz do produto, comprometendo consistência semântica.
- [ALTO] Anexos técnicos prometidos para suporte à Pré-Análise não são consumidos pela etapa auditada.
- [ALTO] `etiquetaProcel` e `kitAcessorio` não são persistidos no payload final, apesar de participarem do processo operacional.
- [MÉDIO] IDs de NFs e modelos são recriados localmente com `Date.now()`, prejudicando rastreabilidade e reedição consistente.
- [MÉDIO] A fila é apresentada como FIFO, porém sem ordenação explícita nas consultas.
- [MÉDIO] Não há validação forte de completude do cadastro antes da gravação.
- [MÉDIO] A autoria do cadastro depende de `localStorage`, sem identidade forte de governança.
- [BAIXO] A API contém múltiplos mecanismos de adaptação a schema divergente, sinalizando baixa disciplina de configuração e manutenção corretiva permanente.
- [BAIXO] A existência de infraestrutura de auditoria sem uso efetivo no fluxo indica governança parcial e não operacionalizada.

---

## 6. Conclusão Executiva

O fluxo auditado não suporta escala de forma confiável no estado atual. A modelagem aceita expansão volumétrica em termos técnicos, mas não assegura integridade, rastreabilidade nem previsibilidade operacional quando o volume de cadastros e análises crescer.

O processo também não está adequadamente preparado para múltiplos clientes. O Código NF é contextual ao cliente/revenda na regra de negócio, porém essa relação não está formalizada por chave; permanece textual e sujeita a ambiguidade, duplicidade e erro humano.

O fluxo não suporta auditoria externa com robustez. Faltam vínculo formal entre origem e destino dos dados, trilha consistente de autoria, rastreamento de herança, comprovação de completude e mecanismo auditável de transição entre Cadastro e Pré-Análise.

Há risco elevado de inconsistência estrutural. As principais fontes são: duplicidade lógica de EAN, ausência de integração entre as tabelas de processo, herança baseada no último registro, divergência entre domínio e persistência de funcionalidades, e fragilidade no contrato de dados da Pré-Análise.

O processo, no estado atual, não é sustentável sob ótica de qualidade e governança. Ele depende excessivamente de operação manual, interpretações locais, disciplina individual do usuário e adaptações defensivas no código, em vez de depender de regras estruturais enforceáveis pelo modelo de dados e pelo fluxo transacional.
