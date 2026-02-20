# Cadastro de Produtos - Documentacao Tecnica

## 1. Visao geral

O cadastro de produtos no projeto funciona pelo fluxo:

1. Usuario preenche a tela `/home/produtos`.
2. A tela monta um `CreateProductDTO`.
3. O frontend chama `POST /api/products`.
4. A API valida, adapta payload para schemas diferentes e grava no Supabase (`produtos`).
5. A tela exibe sucesso/erro e atualiza estado local.

---

## 2. Paginas, rotas e arquivos envolvidos

### 2.1 Pagina principal de cadastro

- **Rota:** `/home/produtos`
- **Arquivo:** `app/home/produtos/page.tsx`
- **Responsabilidades:**
  - Formulario completo (EAN, modelo referencia, fabricante, NFs, modelos, pecas, funcionalidades, anexos).
  - Validacoes antes de salvar.
  - Montagem do `CreateProductDTO`.
  - Chamada de `ProductApiService.createProduct(dto)`.
  - Feedback para usuario (`Salvando...`, sucesso, erro).

### 2.2 Layout e permissao de acesso

- **Arquivo:** `app/home/layout.tsx`
- **Responsabilidades:**
  - Mapeia `cadastro_produtos` para `/home/produtos`.
  - Exige permissao `cadastro` para esse modulo.

- **Arquivo:** `lib/permissions.ts`
- **Responsabilidades:**
  - Regra de permissao por role/permissao.
  - `admin/administrador` tem acesso total.

- **Arquivo:** `app/home/usuarios/page.tsx`
- **Responsabilidades:**
  - Tela de usuarios onde a permissao `cadastro` pode ser atribuida.

### 2.3 API principal de produtos

- **Rota:** `GET/POST /api/products`
- **Arquivo:** `app/api/products/route.ts`
- **Responsabilidades:**
  - `POST`: salvar produto no banco.
  - `GET`: listar ultimos produtos e pesquisar com paginacao.
  - Tratar incompatibilidades de schema (nomes de colunas diferentes entre ambientes).
  - Tratar erro de duplicidade de EAN (409) quando existir constraint unica.

### 2.4 API de lookup por EAN

- **Rota:** `GET /api/products/lookup?ean=...`
- **Arquivo:** `app/api/products/lookup/route.ts`
- **Responsabilidades:**
  - Buscar o produto mais recente por EAN.
  - Retornar objeto mapeado em formato de dominio.

### 2.5 Cliente HTTP do frontend

- **Arquivo:** `lib/productApiService.ts`
- **Responsabilidades:**
  - Encapsula chamadas para `/api/products`.
  - Parse robusto de erro (JSON, texto, HTML de erro do Next).
  - Metodos:
    - `createProduct`
    - `searchProducts`
    - `getLatestProducts`

### 2.6 Busca global e modal de busca de produto

- **Arquivo:** `components/GlobalSearch.tsx`
- **Responsabilidades:**
  - Usa `ProductApiService.searchProducts`.
  - Exibe resultados de produtos junto com outros modulos.

- **Arquivo:** `app/home/produtos/components/DomainModals.tsx`
- **Responsabilidades:**
  - `ModalBuscaProduto` tambem usa `searchProducts` e `getLatestProducts`.
  - Observacao: hoje a pagina `app/home/produtos/page.tsx` tem seus proprios modais internos e nao importa esse arquivo diretamente.

### 2.7 Servico legado de produto

- **Arquivo:** `backend/services/productService.ts`
- **Status atual:**
  - Mantido por compatibilidade/testes.
  - Nao esta sendo importado diretamente pelas telas atuais de produto (uso principal em testes).
  - Tambem recebeu logica de compatibilidade de colunas.

---

## 3. Fluxo tecnico do cadastro (passo a passo)

### 3.1 Frontend (`/home/produtos`)

1. Usuario clica em **SALVAR**.
2. Funcao `salvar` valida:
   - `masterPreenchido`
   - `fabricante`
3. A tela transforma estados locais em `CreateProductDTO`:
   - `ean`, `modeloRef`, `marca`
   - `nfs`, `modelos`
   - `embalagem`, `acessorios`, `estetica`, `funcional`, `funcionalidade`
   - `fotos`, `manualUrl`
4. Chama `ProductApiService.createProduct(dto)`.
5. Em sucesso:
   - Mostra "Produto salvo com sucesso!".
   - Adiciona payload em `registros` local.
6. Em erro:
   - Mostra mensagem detalhada retornada pela API.

### 3.2 Backend (`POST /api/products`)

1. Valida configuracao de Supabase admin.
2. Valida campos obrigatorios (`ean`, `modeloRef`, `marca`).
3. Monta payload inicial com campos esperados.
4. Tenta inserir.
5. Se vier erro de coluna inexistente:
   - Extrai nome da coluna faltante.
   - Renomeia/remove no payload conforme aliases.
   - Tenta novamente (loop de tentativas).
6. Se erro for EAN duplicado (`23505`):
   - Retorna `409`.
7. Se sucesso:
   - Retorna `{ ok: true, id }`.

---

## 4. Contrato de dados do produto

- **Arquivo:** `backend/models/Product.ts`
- **Interface de entrada para cadastro:** `CreateProductDTO`

Campos principais:

- `ean`
- `modeloRef`
- `marca`
- `nfs` (`ProdutoNF[]`)
- `modelos` (`ModeloFabricante[]`)
- `embalagem`, `acessorios`, `estetica`, `funcional`, `funcionalidade`
- `fotos`
- `manualUrl`

---

## 5. Banco de dados (tabelas e migracoes)

### 5.1 Tabela principal: `produtos`

### Criacao base

- **Arquivo:** `backend/database/migrations/V4__create_products.sql`
- Colunas base:
  - `id`
  - `ean`
  - `modelo_ref`
  - `marca`
  - `nfs_data` (JSONB)
  - `modelos_data` (JSONB)
  - `fotos` (TEXT[])
  - `manual_url`
  - `embalagem` (JSONB)
  - `acessorios` (JSONB)
  - `estoque_atual`
  - `created_at`
  - `updated_at`

### Ajustes de schema

- **Arquivo:** `backend/database/fix_schema_products.sql`
- Acrescenta (se faltarem):
  - `embalagem`
  - `acessorios`
  - `nfs_data`
  - `estetica`
  - `funcional`
  - `funcionalidade`
- Adiciona constraint:
  - `produtos_ean_key` (UNIQUE em `ean`)

- **Arquivo:** `backend/database/migrations/V9__add_funcionalidade_column.sql`
- Garante `funcionalidade` com `DEFAULT []`.

### Script consolidado

- **Arquivo:** `backend/database/init_complete_db.sql`
- Tambem define `produtos` e policies de forma consolidada.

### 5.2 Policies/RLS de `produtos`

Definidas em `V4__create_products.sql` e `init_complete_db.sql`:

- `ALTER TABLE produtos ENABLE ROW LEVEL SECURITY`
- Policy de leitura para `authenticated`
- Policy de insert para `authenticated`
- Policy de update para `authenticated`

Observacao pratica:

- As rotas server (`/api/products`) usam `SUPABASE_SERVICE_ROLE_KEY`, ou seja, operam com privilegio administrativo no backend.

---

## 6. Compatibilidade de schema implementada

Como existem ambientes com nomes diferentes de coluna, a API de produtos foi preparada para se adaptar.

### 6.1 Escrita (insert)

Aliases aplicados dinamicamente:

- `marca` -> `fabricante` ou `modelo_fabricante`
- `modelos_data` -> `modelos`
- `nfs_data` -> `nfs`
- `manual_url` -> `manual`
- `estoque_atual` -> `estoque`

### 6.2 Leitura (mapa de retorno)

A API tambem aceita variacoes na leitura:

- Marca: `marca`/`fabricante`/`modelo_fabricante`
- Modelo: `modelo_ref`/`modelo`/`modelo_fabricante`
- NFs: `nfs_data`/`nfs`
- Modelos: `modelos_data`/`modelos`
- Manual: `manual_url`/`manual`
- Estoque: `estoque_atual`/`estoque`

---

## 7. Variaveis de ambiente obrigatorias

- **Arquivo de exemplo:** `.env.example`

Obrigatorias para API server:

- `SUPABASE_URL` (ou `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

Obrigatorias para cliente:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Sem `SUPABASE_SERVICE_ROLE_KEY`, o cadastro via `/api/products` nao funciona.

---

## 8. Pontos de atencao atuais

1. A tela de produtos hoje salva nomes de arquivos em `fotos/manualUrl`, mas upload real ainda esta como TODO na pagina (`page.tsx`). Existe utilitario pronto em `lib/storage.ts`.
2. Existem componentes de modal em `app/home/produtos/components/`, mas a pagina principal ainda usa implementacao inline propria.
3. `backend/services/productService.ts` e legado (mantido principalmente para compatibilidade e testes).
4. Se a constraint `produtos_ean_key` estiver ativa, EAN duplicado retorna `409` na API.
5. Em `components/GlobalSearch.tsx`, o `href` de "Cadastro" esta como `/home/cadastro`, enquanto a tela real de produtos esta em `/home/produtos`.

---

## 9. Checklist rapido para validar cadastro funcionando

1. Preencher `.env.local` com credenciais corretas do Supabase.
2. Garantir tabela `produtos` criada e com colunas necessarias (ou aliases aceitos).
3. Iniciar app (`npm run dev`).
4. Ir para `/home/produtos`.
5. Preencher EAN, modelo referencia e fabricante.
6. Clicar em **SALVAR**.
7. Confirmar retorno de sucesso e registro salvo.

---

## 10. Arquivos-chave (resumo)

- `app/home/produtos/page.tsx`
- `lib/productApiService.ts`
- `app/api/products/route.ts`
- `app/api/products/lookup/route.ts`
- `backend/models/Product.ts`
- `backend/database/migrations/V4__create_products.sql`
- `backend/database/fix_schema_products.sql`
- `backend/database/migrations/V9__add_funcionalidade_column.sql`
- `lib/supabaseAdmin.ts`
- `.env.example`
