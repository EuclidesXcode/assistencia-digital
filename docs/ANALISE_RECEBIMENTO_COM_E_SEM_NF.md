# Analise profunda do recebimento com NF e sem NF

## Escopo analisado

- `app/home/recebimento/com-nf/page.tsx`
- `app/home/recebimento/sem-nf/page.tsx`
- `app/home/recebimento/_components/RecebimentoWizardEtiquetas.tsx`
- `backend/services/recebimentoService.ts`
- `backend/models/Recebimento.ts`
- `backend/database/schema.sql`
- `components/GlobalSearch.tsx`
- `backend/services/dashboardService.ts`
- `app/home/page.tsx`

## Resumo executivo

Conclusao direta:

1. As telas `com-nf` e `sem-nf` usam o mesmo componente React.
2. Hoje essas telas nao salvam nada no banco de dados.
3. Portanto, elas nao usam de fato nenhuma tabela/coluna do banco durante o fluxo principal de recebimento.
4. Existe uma tabela `public.recebimentos`, mas ela esta desacoplada da UI atual.
5. A maior parte dos botoes funciona apenas em memoria local da pagina.
6. A funcionalidade de foto usa `input type="file"` com `capture="environment"`. Em celular compativel, pode abrir camera traseira; em desktop ou browser sem suporte, abre seletor de arquivo.
7. O fluxo visual compila e abre, mas nao pode ser considerado "funcionando de ponta a ponta" porque nao persiste, nao integra com a tabela `recebimentos` e nao atualiza dashboard/busca a partir da UI.

## Confirmacao do schema real em uso

O schema enviado por voce para a tabela `public.recebimentos` confirma o mesmo desenho encontrado no projeto:

- `id`
- `data`
- `analisado_por`
- `codigo_nf`
- `modelo_fabricante`
- `ean`
- `nf`
- `status`
- `data_recebimento`
- `created_at`
- `updated_at`

Isso reforca 3 pontos:

1. a tabela existe de fato no banco em producao
2. ela esta alinhada com o `schema.sql` do projeto
3. ela continua insuficiente para o wizard atual de recebimento

## Como as duas paginas funcionam hoje

### 1. Estrutura das rotas

- `app/home/recebimento/com-nf/page.tsx` renderiza:
  - `RecebimentoWizardEtiquetas` com `withNf`
- `app/home/recebimento/sem-nf/page.tsx` renderiza:
  - `RecebimentoWizardEtiquetas` com `withNf={false}`

Na pratica:

- `com-nf` e `sem-nf` sao o mesmo fluxo.
- A diferenca real esta no booleano `withNf`.

## Diferencas reais entre com NF e sem NF

Dentro de `RecebimentoWizardEtiquetas.tsx`:

- `withNf=true`
  - exige preenchimento de `codigo NF`
  - mostra coluna `MODELO REFERENCIA`
  - tenta descobrir modelo por um mapa fixo em memoria (`CAD_NF`)
- `withNf=false`
  - nao exige `codigo NF`
  - grava na linha local o texto `SEM NF`
  - esconde campos/colunas relacionados a NF

Ou seja:

- o comportamento "com NF" e "sem NF" esta correto no nivel de interface
- mas a origem do modelo por NF nao vem do banco, vem de um mapa hardcoded dentro do componente

## O fluxo principal usa banco de dados?

### Resposta curta

Nao.

### Evidencia

No componente `RecebimentoWizardEtiquetas.tsx`:

- os recebimentos ficam em `useState`
- as fotos ficam em `useState`
- o lote fica em `useState`
- apenas a sequencia do lote vai para `localStorage`

O componente faz:

- `setRows(...)`
- `setEdit(...)`
- `setFotoModal(...)`
- `localStorage.setItem(...)`

O componente nao faz:

- `fetch(...)`
- `supabase.from(...)`
- `RecebimentoService.getRegistros(...)`
- `RecebimentoService.efetuarRecebimento(...)`

Conclusao:

- salvar, alterar, excluir, finalizar lote e trocar foto acontecem somente na memoria do navegador
- ao recarregar a pagina, os recebimentos somem
- as fotos tambem somem

## O que realmente existe no banco

### Tabela existente

No schema existe:

- `public.recebimentos`

Colunas atuais:

- `id`
- `data`
- `analisado_por`
- `codigo_nf`
- `modelo_fabricante`
- `ean`
- `nf`
- `status`
- `data_recebimento`
- `created_at`
- `updated_at`

### Problema principal

A UI atual do recebimento trabalha com dados que nao cabem nessa tabela:

- `loteId`
- `loteStatus` (`ABERTO` / `FINALIZADO`)
- `numero` do recebimento dentro do lote
- `codigoUnico`
- `ns` (numero de serie)
- `fotos`
- marcacao de foto ausente (`missing`)
- pendencias por etiqueta
- usuario do recebimento no formato atual

Entao hoje existe um gap estrutural:

- a tela coleta dados de recebimento ricos
- a tabela `recebimentos` guarda outro modelo, bem mais simples

## Com e sem NF usam a mesma tabela e colunas?

### Resposta objetiva

Hoje, nao usam tabela nenhuma no fluxo principal.

### Se a pergunta for "deveriam usar a mesma tabela?"

Sim, pode ser boa pratica usar uma unica tabela para os dois fluxos, desde que:

1. ambos representem o mesmo agregado de negocio: `recebimento`
2. exista um discriminador claro, por exemplo:
   - `tipo_recebimento = 'com_nf' | 'sem_nf'`
   - ou `possui_nf boolean`
3. existam regras de consistencia:
   - `codigo_nf` obrigatorio quando `tipo_recebimento = 'com_nf'`
   - `codigo_nf` nulo quando `tipo_recebimento = 'sem_nf'`
4. fotos e pendencias sejam modeladas de forma consistente
5. lote tenha colunas proprias na mesma tabela, se a decisao for nao abrir outra estrutura

### No estado atual, seria boa pratica usar a tabela atual para os dois?

Nao.

Motivos:

1. A tabela atual nao representa os dados do fluxo real.
2. Nao existe coluna que diferencie claramente `com_nf` de `sem_nf`.
3. Nao existe modelagem para lote.
4. Nao existe modelagem para fotos.
5. Nao existe campo para `codigoUnico`.
6. Nao existe campo para `ns`.

## Analise funcional da tela

### O que funciona no front-end local

Funciona em memoria local:

1. iniciar novo lote
2. avancar e voltar nas etapas
3. marcar etiqueta como nao disponivel
4. abrir seletor de imagem/camera via input file
5. visualizar preview da foto
6. salvar um recebimento na grade local
7. editar um recebimento salvo na grade local
8. excluir um recebimento salvo na grade local
9. abrir modal da foto e alterar/excluir
10. finalizar lote localmente
11. bloquear alteracao/exclusao apos finalizar lote

### O que nao funciona como fluxo completo de negocio

Nao funciona de ponta a ponta:

1. persistencia em banco
2. reabertura de recebimentos apos refresh
3. persistencia de fotos
4. integracao real com cadastro de produtos/NF
5. sincronizacao com dashboard
6. sincronizacao com busca global a partir do que foi feito nessa tela

## Auditoria dos botoes

### Botoes da tela inicial

- `Efetuar Recebimento`
  - funcional
  - apenas muda `step` para 1
- `Novo Lote`
  - funcional
  - reseta estado local e incrementa contador no `localStorage`

### Botoes das etapas de etiqueta

- `Abrir Camera`
  - funcional no sentido de disparar o `input file`
  - depende do browser/dispositivo para abrir camera de fato
- `Etiqueta nao disponivel`
  - funcional
  - marca pendencia e seta `missing`
- `Voltar`
  - funcional
- `Avancar` / `Ir para Recebimento`
  - funcional

### Botoes da etapa de recebimento

- `Voltar`
  - funcional
- `Simular`
  - funcional
  - apenas preenche dados fake locais
- `Salvar e Finalizar Recebimento`
  - parcialmente funcional
  - ele salva a linha local
  - ele nao finaliza o lote
  - o nome do botao esta enganoso

### Botoes da grade/lista

- `Finalizar Lote`
  - funcional localmente
  - apenas troca `loteStatus` para `FINALIZADO`
- `Novo Lote`
  - funcional localmente
- `Alt`
  - funcional localmente
- `Del`
  - funcional localmente
- botoes miniatura de foto
  - funcionais localmente
  - abrem modal de foto

### Botoes dos modais

- `Fechar`
  - funcional
- `Excluir` foto
  - funcional localmente
- `Incluir` / `Alterar` foto
  - funcional localmente
- `Cancelar`
  - funcional
- `Salvar alteracoes`
  - funcional localmente

### Conclusao sobre botoes

Nao encontrei botoes mortos dentro do componente.

Mas ha uma diferenca importante:

- funcional no front local: sim
- funcional no processo real com banco: nao

## Analise da foto e camera

### Implementacao atual

A tela usa:

- `input type="file"`
- `accept="image/*"`
- `capture="environment"`

Isso aparece:

- nas etapas de etiqueta
- no modal de alteracao da foto

### O que isso significa na pratica

1. Em muitos celulares, o browser pode sugerir abrir a camera traseira.
2. Em desktop, normalmente abre o seletor de arquivo.
3. Em alguns browsers mobile, pode aparecer escolha entre camera e galeria.
4. Nao ha garantia universal de abrir camera em todo dispositivo.

### O que a tela nao faz

Ela nao usa:

- `navigator.mediaDevices.getUserMedia`
- controle explicito de permissao de camera
- preview de camera ao vivo
- captura programatica

### Persistencia da foto

As fotos sao convertidas para Data URL com `FileReader` e ficam em memoria.

Consequencias:

1. funcionam na sessao atual
2. somem ao recarregar a pagina
3. nao vao para storage
4. nao vao para banco

Conclusao:

- a parte visual de foto funciona localmente
- a parte de camera depende do browser
- a parte de persistencia nao existe

## Integracao com produtos e NF

### Como esta hoje

O modelo referencia na tela `com-nf` vem de `CAD_NF`, um `Map` hardcoded dentro do componente.

Logo:

1. nao consulta `produtos`
2. nao consulta `produtos.nfs_data`
3. nao consulta `recebimentos`
4. nao consulta API

### Impacto

- se o usuario cadastrar um novo codigo NF em Produtos, essa tela nao aprende isso automaticamente
- o comportamento do recebimento pode divergir do cadastro real

## Inconsistencias tecnicas encontradas

### 1. A tela nao grava em `recebimentos`

Este e o problema mais importante.

Existe:

- tabela `recebimentos`
- service `RecebimentoService`

Mas o componente de recebimento nao usa nenhum deles.

### 2. A rota `/home/recebimento` nao existe

O build lista:

- `/home/recebimento/com-nf`
- `/home/recebimento/sem-nf`

Mas nao existe:

- `/home/recebimento`

Mesmo assim, a home aponta para:

- `href="/home/recebimento"`

Resultado:

- o atalho "Recebimento" da home tende a levar para uma rota inexistente

### 3. O service/backend de recebimento esta desalinhado da UI

O service usa `public.recebimentos`, mas a UI nao.

### 4. O model TypeScript esta desalinhado do schema

`backend/models/Recebimento.ts` usa campos camelCase:

- `analisadoPor`
- `codigoNF`
- `modeloFabricante`

O banco usa snake_case:

- `analisado_por`
- `codigo_nf`
- `modelo_fabricante`

Nao existe mapper no `RecebimentoService`.

Impacto:

- `RecebimentoService.getRegistros()` devolve linha crua do banco
- consumidores que esperam camelCase podem falhar ou perder dados

### 5. O status tambem esta inconsistente

No model:

- `aguardando`
- `em_processo`
- `concluido`

No schema:

- `aguardando`
- `em_processo`
- `concluido`
- `recebido`

No service:

- `efetuarRecebimento()` grava `status = 'recebido'`

Impacto:

- o proprio service grava um valor que o tipo TS nao preve

### 6. A busca global parece desalinhada com o retorno real

`GlobalSearch.tsx` procura:

- `codigoNF`
- `modeloFabricante`
- `analisadoPor`
- `fornecedor`

Mas a tabela/servico atual trabalham com:

- `codigo_nf`
- `modelo_fabricante`
- `analisado_por`

e a tabela `recebimentos` atual nao possui `fornecedor`.

Impacto:

- a busca global de recebimentos pode nao funcionar corretamente mesmo que haja dados no banco

### 7. O botao "Salvar e Finalizar Recebimento" esta com nome incorreto

Ele apenas adiciona uma linha local ao lote.

Quem fecha o lote de verdade e:

- `Finalizar Lote`

Impacto:

- comportamento funcional existe
- semantica de UX esta incorreta

### 8. Sanitizacao remove zeros a esquerda

A funcao `sanitize()` faz:

- `replace(/^0+/, "")`

Isso afeta:

- `CODIGO_UNICO`
- `CODIGO_NF`
- `NS`

Impacto:

- codigos com zero a esquerda podem ser alterados indevidamente
- para NF isso pode ser especialmente perigoso

### 9. Nao ha prevencao de duplicidade

Nao vi validacao para impedir duplicidade de:

- `codigoUnico`
- `codigoNf`
- `ns`

nem no lote, nem globalmente.

### 10. O teste automatizado de recebimento nao esta confiavel

Ao rodar o teste:

- o Jest falhou por configuracao de transform

Além disso, o teste atual espera `console.log`, mas o service nao faz `console.log`.

Entao hoje:

- o teste nao valida o fluxo real
- a esteira automatizada de recebimento nao e evidência de funcionamento

## Isso esta funcionando?

### Sim, no sentido abaixo

- a pagina compila
- as telas abrem
- o wizard navega
- os botoes do componente disparam acao local
- a selecao de arquivo/camera e acionada
- a grade local de recebimentos funciona durante a sessao

### Nao, no sentido abaixo

- nao salva no banco
- nao recupera dados salvos
- nao persiste fotos
- nao integra de verdade com produtos/NF
- nao garante consistencia entre com-NF e sem-NF no banco
- nao alimenta corretamente o dominio `recebimentos`

Conclusao objetiva:

- funciona como prototipo/front local
- nao funciona como modulo de recebimento integrado ao sistema

## Avaliacao de boa pratica

### O que seria boa pratica aqui

Usar uma unica tabela `recebimentos` para os dois fluxos pode ser uma boa pratica, desde que:

1. exista uma modelagem unica e clara
2. haja coluna discriminadora do tipo de recebimento
3. as regras de obrigatoriedade sejam garantidas por banco e backend
4. fotos/anexos sejam modelados corretamente, inclusive via JSONB se a decisao for manter tudo na mesma tabela
5. lote seja modelado corretamente
6. UI, service, model e schema usem os mesmos nomes e tipos

### O que nao e boa pratica no estado atual

1. UI desconectada do banco
2. mapa hardcoded de NF para modelo
3. rota raiz de recebimento ausente
4. service/model/schema inconsistentes entre si
5. fotos apenas em memoria
6. botao com rotulo enganoso

## Recomendacao tecnica objetiva

### Se quiser manter uma unica tabela

O caminho mais coerente seria:

1. manter `recebimentos` como tabela central
2. adicionar colunas como:
   - `tipo_recebimento`
   - `lote_numero`
   - `lote_status`
   - `codigo_unico`
   - `numero_serie`
   - `recebido_por`
   - `finalizado_em`
3. adicionar JSONB na propria `recebimentos` para:
   - `fotos_etiquetas`
   - `etiquetas_missing`
   - `pendencias`
4. integrar a tela ao backend/service
5. substituir `CAD_NF` por consulta real ao cadastro de produtos/NF
6. alinhar model TS, service e schema

### Se quiser separar tabelas

Eu nao recomendaria separar `com_nf` e `sem_nf` em tabelas diferentes, a menos que:

- os fluxos de negocio sejam realmente diferentes
- as colunas sejam muito diferentes

Pelo codigo atual, eles parecem variantes do mesmo processo. Logo, uma tabela central com discriminador tende a ser melhor.

## Arquivos adicionais gerados nesta etapa

- `MODELO_BANCO_RECEBIMENTO_RECOMENDADO.md`
  - descreve a estrutura recomendada reaproveitando apenas `recebimentos`
- `scripts/update_recebimentos_schema_for_wizard.sql`
  - migracao SQL aditiva para preparar a tabela `recebimentos` para o recebimento completo

Importante:

- essa migracao prepara o banco
- ela nao conecta automaticamente a tela ao banco
- a aplicacao ainda precisara ser adaptada para gravar/ler dessas estruturas

## Validacoes executadas nesta analise

- leitura estatica completa das telas `com-nf` e `sem-nf`
- leitura do componente compartilhado
- leitura do schema da tabela `recebimentos`
- leitura do service/model de recebimento
- leitura do uso de recebimentos em busca global e dashboard
- `npm run build`: OK
- `jest` do recebimento: falhou por configuracao de transform, logo os testes atuais nao servem como prova de funcionamento

## Veredito final

### Com NF e sem NF estao corretos?

Parcialmente.

- corretos como UI/variacao visual do mesmo fluxo: sim
- corretos como processo real integrado ao sistema: nao

### Usam a mesma tabela e colunas no banco?

Hoje, na pratica, nao usam nenhuma no fluxo principal.

Existe uma tabela `recebimentos`, mas ela esta fora do fluxo da tela atual.

### Isso e boa pratica?

No estado atual, nao.

### A camera abre no dispositivo?

- pode abrir em dispositivos e browsers que suportem `capture="environment"`
- nao ha garantia universal
- em muitos cenarios vai abrir apenas o seletor de arquivo

### Todos os botoes sao funcionais?

- no nivel de front local: sim, em geral
- no nivel de persistencia e integracao com banco: nao
