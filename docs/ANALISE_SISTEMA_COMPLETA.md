# 📊 Análise Completa do Sistema - Assistência Digital (Gromit.Control)

**Desenvolvedor Senior:** Análise End-to-End  
**Data:** 11/02/2026  
**Stack:** Next.js 16 + Supabase + TypeScript

---

## 🎯 VISÃO GERAL DO SISTEMA

### Propósito
Sistema web completo para gestão de assistência técnica de produtos eletrônicos, com foco em controle de processos de recebimento, análise, conserto, embalagem e expedição de produtos.

### Nome do Sistema
- **Nome Comercial:** Gromit
- **Nome Técnico:** Gromit.Control
- **Domínio:** Assistência Técnica / Service Management

---

## 🏗️ ARQUITETURA TÉCNICA

### Stack Principal
```
Frontend: Next.js 16 (App Router) + React 19
Backend: Next.js API Routes + Supabase
Database: PostgreSQL (via Supabase)
Styling: Tailwind CSS 4
Auth: Custom JWT + Supabase Auth
Language: TypeScript 5
```

### Estrutura de Diretórios
```
assistencia-digital/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── admin/               # Admin endpoints
│   │   ├── auth/                # Authentication
│   │   ├── notifications/       # Notificações
│   │   └── products/            # Produtos
│   ├── home/                     # Área autenticada
│   │   ├── analise-tecnica/
│   │   ├── cadastro-clientes/
│   │   ├── cadastro-empresas/
│   │   ├── conserto/
│   │   ├── embalagem/
│   │   ├── endereco/
│   │   ├── expedicao/
│   │   ├── nfe-xml/
│   │   ├── notificacoes/
│   │   ├── orcamentos/
│   │   ├── pre-analise/
│   │   ├── produtos/
│   │   ├── qualidade/
│   │   ├── recebimento/
│   │   ├── usuarios/
│   │   └── verificar-disponibilidade/
│   ├── register/                 # Cadastro
│   └── esqueci-senha/           # Recuperação
├── backend/
│   ├── database/                # SQL Scripts
│   ├── models/                  # TypeScript Models
│   ├── services/                # Business Logic
│   ├── tests/                   # Unit Tests
│   └── utils/                   # Utilities
├── components/                   # React Components
├── context/                      # React Context
├── lib/                         # Utilities & Config
└── types/                       # TypeScript Types
```

---

## 🗄️ MODELO DE DADOS (DATABASE SCHEMA)

### Tabelas Principais

#### 1. **Autenticação e Usuários**
```sql
app_users (Custom Auth)
├── id (UUID, PK)
├── matriz_filial (TEXT)
├── email (TEXT, UNIQUE)
├── password_hash (TEXT)
├── ativo (BOOLEAN)
└── timestamps

profiles (Perfis de Usuário)
├── id (UUID, PK, FK → app_users)
├── full_name (TEXT)
├── email (TEXT)
├── avatar_url (TEXT)
├── branch_id (UUID, FK → branches)
├── role (TEXT: 'user' | 'admin')
├── permissions (TEXT[])
├── is_active (BOOLEAN)
└── last_login (TIMESTAMPTZ)
```

#### 2. **Entidades Corporativas**
```sql
owners (Proprietários)
├── id (UUID, PK)
├── full_name (TEXT)
├── cpf (VARCHAR(14), UNIQUE)
├── rg, birth_date
└── address_id (FK)

companies (Empresas)
├── id (UUID, PK)
├── owner_id (FK → owners)
├── legal_name, trade_name
├── cnpj (VARCHAR(18), UNIQUE)
├── state_registration, municipal_registration
└── address_id (FK)

branches (Filiais)
├── id (UUID, PK)
├── company_id (FK → companies)
├── client_id (FK → clients)
├── branch_name, branch_code
├── cnpj
└── is_headquarters (BOOLEAN)

clients (Clientes)
├── id (UUID, PK)
├── owner_id (FK)
├── person_type ('INDIVIDUAL' | 'COMPANY')
├── Campos PF: full_name, cpf, rg, birth_date
├── Campos PJ: legal_name, trade_name, cnpj
└── address_id (FK)

entities (Fabricantes/Fornecedores)
├── id (UUID, PK)
├── entity_type (TEXT)
├── name, legal_name
├── cnpj, website
└── address_id (FK)
```

#### 3. **Produtos**
```sql
produtos
├── id (UUID, PK)
├── ean (TEXT)                    # Código de barras
├── modelo_ref (TEXT)             # Modelo de referência
├── marca (TEXT)                  # Fabricante
├── nfs_data (JSONB)             # Array de códigos NF
├── modelos_data (JSONB)         # Array de modelos do fabricante
├── fotos (TEXT[])               # URLs de fotos
├── manual_url (TEXT)
├── embalagem (JSONB)            # Itens de embalagem
├── acessorios (JSONB)           # Acessórios
├── estoque_atual (INTEGER)
└── timestamps

Estrutura JSONB:
- nfs_data: [{ codigo, revenda }]
- modelos_data: [{ id, nome, categoria, codigoTipo, linha, 
                   vistaExplodida[], boletimTecnico[], manualTecnico[],
                   estetica[], funcional[], funcionalidades[] }]
- embalagem/acessorios: [{ tipo, nome, codigo, quantidade, fotos[] }]
```

#### 4. **Processos Operacionais**
```sql
orcamentos (Orçamentos)
├── id (UUID, PK)
├── data (TIMESTAMPTZ)
├── analisado_por (TEXT)
├── codigo_nf, modelo_fabricante, ean, nf, marca
├── status ('pendente' | 'em_analise' | 'concluido')
└── timestamps

pre_analise (Pré-Análise)
├── id (UUID, PK)
├── codigo, modelo, ean
├── status ('pendente' | 'em_analise' | 'aprovado' | 'reprovado')
├── analisado_por
├── data_analise
├── recebido_por, codigo_nf, modelo_ref, gtin, nf_receb
└── timestamps

recebimentos (Recebimentos)
├── id (UUID, PK)
├── data (TIMESTAMPTZ)
├── analisado_por
├── codigo_nf, modelo_fabricante, ean, nf
├── status ('aguardando' | 'em_processo' | 'concluido' | 'recebido')
├── data_recebimento
└── timestamps

nfe_xmls (Notas Fiscais Eletrônicas)
├── id (UUID, PK)
├── chave (TEXT, UNIQUE)
├── numero, emissao
├── itens (INTEGER)
├── status ('PENDENTE' | 'PARCIAL' | 'DIVERGENTE' | 'CONFERIDA' | 'processada' | 'erro')
├── xml_data (TEXT)
└── timestamps
```

#### 5. **Sistema**
```sql
notifications (Notificações)
├── id (UUID, PK)
├── user_id (FK → app_users)
├── global (BOOLEAN)
├── type ('orcamento' | 'recebimento' | 'pre-analise' | 'nfe' | 'alerta' | 'sucesso' | 'cadastro')
├── title, message, link
├── permission (TEXT)
├── read (BOOLEAN)
└── created_at

audit_logs (Logs de Auditoria)
├── id (UUID, PK)
├── user_id (FK → app_users)
├── action, resource, resource_id
├── details (JSONB)
├── ip_address (INET)
├── user_agent (TEXT)
└── created_at

addresses (Endereços)
├── id (UUID, PK)
├── zip_code, street, number, complement
├── district, city, state
├── main_email, main_mobile, main_phone
└── timestamps
```

---

## 🔐 SISTEMA DE AUTENTICAÇÃO

### Implementação Atual
**Tipo:** Custom Authentication (não usa Supabase Auth nativo)

### Fluxo de Login
```typescript
1. POST /api/auth/login
   ├── Busca usuário na tabela 'users' (email/username)
   ├── Valida senha com bcrypt
   ├── Busca perfil na tabela 'profiles'
   ├── Gera JWT token
   └── Retorna { user, token }

2. Funções Supabase (SECURITY DEFINER)
   ├── login_user(email, password)
   ├── create_app_user(...)
   └── update_app_user_password(...)
```

### Problemas Identificados ⚠️

#### 1. **Tabela 'users' não existe no schema**
```sql
-- O código busca em 'users', mas o schema define 'app_users'
const usersUrl = `${SUPABASE_URL}/rest/v1/users?...`  // ❌ ERRO
// Deveria ser:
const usersUrl = `${SUPABASE_URL}/rest/v1/app_users?...`  // ✅
```

#### 2. **Inconsistência de campos**
```typescript
// Login busca 'username', mas app_users não tem esse campo
or=(email.eq.${login},username.eq.${login})  // ❌

// app_users tem apenas: id, matriz_filial, email, password_hash, ativo
```

#### 3. **Service Role Key exposta**
```typescript
// .env.local tem a chave de serviço (não deveria estar no frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Recomendações de Correção

```typescript
// ✅ CORREÇÃO SUGERIDA para /api/auth/login/route.ts

// 1. Usar função Supabase ao invés de fetch direto
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  
  // Usar a função login_user do banco
  const { data, error } = await supabase.rpc('login_user', {
    p_email: email,
    p_password: password
  });
  
  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  }
  
  const user = data[0];
  
  // Gerar JWT
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  
  return NextResponse.json({ 
    user: {
      id: user.id,
      name: user.full_name,
      email: user.email,
      branchId: user.matriz_filial,
      role: user.role,
      permissions: user.permissions,
      token
    }
  });
}
```

---

## 🔑 SISTEMA DE PERMISSÕES

### Estrutura
```typescript
// Permissões definidas no layout
const SCREEN_PERMISSIONS: Partial<Record<ScreenKey, string>> = {
  recebimento: 'recebimento',
  pre_analise: 'pre-analise',
  analise_tecnica: 'recebimento',
  endereco: 'recebimento',
  conserto: 'recebimento',
  qualidade: 'recebimento',
  embalagem: 'recebimento',
  expedicao: 'recebimento',
  cadastro_produtos: 'cadastro',
  orcamento: 'orcamentos',
  verificar_disponibilidade: 'orcamentos',
  cadastro_empresas: 'cadastro',
  cadastro_clientes: 'cadastro',
  cadastro_usuario: 'admin',
};
```

### Status Atual
```typescript
// ⚠️ TEMPORARIAMENTE DESABILITADO
const can = (key: ScreenKey) => {
  return true; // Libera todo o menu
};
```

### Implementação Correta
```typescript
// lib/permissions.ts
export function hasPermission(user: User, permission: string): boolean {
  if (!user || !user.permissions) return false;
  if (user.role === 'admin') return true;
  return user.permissions.includes(permission);
}

// Uso no layout
const can = (key: ScreenKey) => {
  if (!user) return false;
  if (key === 'dashboard') return true;
  const perm = SCREEN_PERMISSIONS[key];
  if (!perm) return true;
  return hasPermission(user, perm);
};
```

---

## 📦 MÓDULOS DO SISTEMA

### 1. Dashboard (`/home`)
**Funcionalidade:** Visão geral do sistema
- Estatísticas de processos
- Atividades recentes
- Indicadores de performance

### 2. Recebimento (`/home/recebimento`)
**Funcionalidade:** Controle de entrada de produtos
- **Com NF:** Recebimento com nota fiscal
- **Sem NF:** Recebimento sem nota fiscal
- Status: aguardando, em_processo, concluido, recebido

### 3. Pré-Análise (`/home/pre-analise`)
**Funcionalidade:** Triagem inicial de produtos
- Status: pendente, em_analise, aprovado, reprovado
- Campos: codigo, modelo, ean, analisado_por

### 4. Análise Técnica (`/home/analise-tecnica`)
**Funcionalidade:** Análise técnica detalhada
- Diagnóstico de defeitos
- Orçamentação de peças

### 5. Cadastro de Produtos (`/home/produtos`)
**Funcionalidade:** Registro completo de produtos
- **Campos principais:**
  - EAN/GTIN (código de barras)
  - Modelo de Referência
  - Fabricante/Marca
  
- **Códigos NF:** Múltiplos códigos por revenda
- **Modelos do Fabricante:** Variações do produto
- **Embalagem:** Itens da embalagem original
- **Acessórios:** Itens que acompanham o produto
- **Funcionalidades:** Características técnicas
- **Anexos:**
  - Fotos do produto
  - Manual do usuário
  - Vista explodida
  - Boletim técnico

**Arquivo:** `app/home/produtos/page.tsx` (2621 linhas)
- Interface complexa com múltiplos modais
- Simulação de dados (SIMULACAO_GROMIT)
- Mock de peças cadastradas

### 6. Orçamentos (`/home/orcamentos`)
**Funcionalidade:** Gestão de orçamentos
- Status: pendente, em_analise, concluido
- Vinculação com produtos e NFs

### 7. NF-e XML (`/home/nfe-xml`)
**Funcionalidade:** Processamento de notas fiscais
- Upload de XML
- Parsing de dados
- Status: PENDENTE, PARCIAL, DIVERGENTE, CONFERIDA, processada, erro

### 8. Cadastro de Empresas (`/home/cadastro-empresas`)
**Funcionalidade:** Gestão de empresas
- Dados cadastrais (CNPJ, Razão Social, etc.)
- Vinculação com proprietários
- Filiais

### 9. Cadastro de Clientes (`/home/cadastro-clientes`)
**Funcionalidade:** Gestão de clientes
- Pessoa Física ou Jurídica
- Endereços
- Contatos

### 10. Gerenciamento de Usuários (`/home/usuarios`)
**Funcionalidade:** Admin de usuários (apenas admin)
- Criar/editar usuários
- Definir permissões
- Ativar/desativar
- Histórico de atividades (audit_logs)

### 11. Notificações (`/home/notificacoes`)
**Funcionalidade:** Central de notificações
- Tipos: orcamento, recebimento, pre-analise, nfe, alerta, sucesso, cadastro
- Notificações globais ou por usuário
- Contador de não lidas

### 12. Outros Módulos
- **Endereço:** Gestão de localização física
- **Conserto:** Processo de reparo
- **Qualidade:** Controle de qualidade
- **Embalagem:** Processo de embalagem
- **Expedição:** Envio de produtos
- **Verificar Disponibilidade:** Consulta de estoque

---

## 🔧 SERVICES (Backend Logic)

### Serviços Implementados
```
backend/services/
├── addressService.ts          # Gestão de endereços
├── branchService.ts           # Gestão de filiais
├── clientService.ts           # Gestão de clientes
├── companyService.ts          # Gestão de empresas
├── dashboardService.ts        # Dados do dashboard
├── entityService.ts           # Fabricantes/fornecedores
├── nfeService.ts              # Processamento de NF-e
├── notificationService.ts     # Sistema de notificações
├── orcamentoService.ts        # Orçamentos
├── ownerService.ts            # Proprietários
├── personService.ts           # Pessoas vinculadas
├── preAnaliseService.ts       # Pré-análise
├── productService.ts          # Produtos ⭐
├── recebimentoService.ts      # Recebimentos
└── userManagementService.ts   # Gestão de usuários
```

### ProductService (Destaque)
```typescript
class ProductService {
  // Criar produto (permite múltiplos com mesmo EAN)
  static async createProduct(data: CreateProductDTO): Promise<void>
  
  // Buscar por EAN (retorna o mais recente)
  static async findByEan(ean: string): Promise<any | null>
  
  // Pesquisar produtos (paginado)
  static async searchProducts(query: string, page: number, pageSize: number)
  
  // Listar produtos recentes
  static async getLatestProducts(): Promise<any[]>
}
```

**Observação:** O sistema permite múltiplos registros com o mesmo EAN, representando unidades diferentes do mesmo produto.

---

## 🎨 COMPONENTES FRONTEND

### Componentes Principais
```
components/
├── GlobalSearch.tsx           # Busca global
└── Sidebar.tsx                # Menu lateral
```

### Padrões de UI
- **Design System:** Tailwind CSS customizado
- **Cores:** Paleta slate/sky
- **Ícones:** lucide-react
- **Responsividade:** Mobile-first
- **Modais:** Sistema de overlay com backdrop

### Exemplo de Modal (produtos/page.tsx)
```typescript
<ModalShell>           # Container base
<ModalArquivos>        # Upload de arquivos
<ModalAjuda>           # Ajuda contextual
<ModalRevendasClientes> # Seleção de revendas
<ModalEanGtins>        # Gestão de EANs
```

---

## 🧪 TESTES

### Estrutura
```
backend/tests/
├── (20 arquivos de teste)
└── Cobertura esperada: 90%
```

### Configuração
```json
// jest.config.js
{
  "preset": "ts-jest",
  "testEnvironment": "node"
}
```

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **Autenticação Quebrada** 🔴 CRÍTICO
- Tabela 'users' não existe (deveria ser 'app_users')
- Campo 'username' não existe na tabela
- Service Role Key exposta no frontend

### 2. **Permissões Desabilitadas** 🟡 MÉDIO
- Sistema de permissões comentado
- Todos os usuários têm acesso total

### 3. **Dados Mockados** 🟡 MÉDIO
```typescript
// produtos/page.tsx
const EANS_CADASTRADOS_INICIAL: Master[] = [...]
const SIMULACAO_GROMIT = [...]
const PECAS_CADASTRADAS = [...]
```
- Dados hardcoded ao invés de vir do banco

### 4. **Inconsistências de Schema** 🟡 MÉDIO
```typescript
// ProductService mapeia campos que não existem
estetica: data.estetica || [],      // ❌ Não existe na tabela
funcional: data.funcional || [],    // ❌ Não existe na tabela
```

### 5. **Falta de Validação** 🟡 MÉDIO
- Sem validação de entrada em muitos endpoints
- Sem tratamento de erros consistente

### 6. **Performance** 🟢 BAIXO
- Sem índices em algumas queries frequentes
- Sem cache de dados

---

## ✅ PONTOS FORTES

### 1. **Arquitetura Bem Estruturada**
- Separação clara de responsabilidades
- Services isolados
- Modelos TypeScript bem definidos

### 2. **UI/UX Profissional**
- Interface moderna e responsiva
- Feedback visual consistente
- Navegação intuitiva

### 3. **Banco de Dados Robusto**
- Schema bem normalizado
- RLS (Row Level Security) implementado
- Triggers e funções SQL

### 4. **TypeScript**
- Tipagem forte em todo o projeto
- Interfaces bem definidas
- Menos erros em runtime

### 5. **Funcionalidades Completas**
- Sistema end-to-end de assistência técnica
- Múltiplos módulos integrados
- Auditoria e notificações

---

## 🎯 RECOMENDAÇÕES PRIORITÁRIAS

### 1. **URGENTE: Corrigir Autenticação** 🔴
```typescript
// Passos:
1. Atualizar /api/auth/login/route.ts para usar 'app_users'
2. Remover referências a 'username'
3. Usar função login_user() do Supabase
4. Mover SERVICE_ROLE_KEY para variável de ambiente server-side
```

### 2. **Reativar Sistema de Permissões** 🟡
```typescript
// app/home/layout.tsx
const can = (key: ScreenKey) => {
  if (!user) return false;
  if (key === 'dashboard') return true;
  const perm = SCREEN_PERMISSIONS[key];
  if (!perm) return true;
  return hasPermission(user, perm);
};
```

### 3. **Migrar Dados Mockados para Banco** 🟡
```typescript
// Criar seeds SQL para:
- EANS_CADASTRADOS
- PECAS_CADASTRADAS
- REVENDAS_CLIENTES_CADASTRADOS
```

### 4. **Adicionar Validação** 🟡
```typescript
// Usar biblioteca como Zod
import { z } from 'zod';

const CreateProductSchema = z.object({
  ean: z.string().min(8).max(14),
  modeloRef: z.string().min(1),
  marca: z.string().min(1),
  // ...
});
```

### 5. **Melhorar Performance** 🟢
```sql
-- Adicionar índices
CREATE INDEX idx_produtos_ean ON produtos(ean);
CREATE INDEX idx_produtos_marca ON produtos(marca);
CREATE INDEX idx_orcamentos_status ON orcamentos(status);
```

### 6. **Implementar Testes E2E** 🟢
```typescript
// Usar Playwright ou Cypress
describe('Login Flow', () => {
  it('should login successfully', async () => {
    // ...
  });
});
```

---

## 📊 MÉTRICAS DO PROJETO

### Tamanho do Código
- **Total de Arquivos:** ~150+
- **Linhas de Código:** ~15.000+
- **Maior Arquivo:** produtos/page.tsx (2621 linhas)

### Complexidade
- **Tabelas no Banco:** 16
- **Services:** 15
- **Rotas da Aplicação:** 18+
- **Componentes:** 10+

### Tecnologias
- **Linguagens:** TypeScript, SQL
- **Frameworks:** Next.js, React
- **Database:** PostgreSQL (Supabase)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

---

## 🔄 FLUXO DE DADOS TÍPICO

### Exemplo: Cadastro de Produto
```
1. Usuário acessa /home/produtos
   ↓
2. Preenche formulário (EAN, Modelo, Fabricante, etc.)
   ↓
3. Adiciona anexos (fotos, manuais)
   ↓
4. Clica em "Salvar"
   ↓
5. Frontend chama ProductService.createProduct()
   ↓
6. Service faz INSERT na tabela 'produtos'
   ↓
7. Supabase valida RLS policies
   ↓
8. Retorna sucesso/erro
   ↓
9. Frontend exibe feedback
```

---

## 🔐 SEGURANÇA

### Implementações Atuais
✅ Row Level Security (RLS) habilitado
✅ Passwords com bcrypt
✅ JWT para sessões
✅ HTTPS (via Supabase)

### Vulnerabilidades
❌ Service Role Key exposta
❌ Sem rate limiting
❌ Sem validação de input em alguns endpoints
❌ Sem proteção CSRF

---

## 📝 CONCLUSÃO

### Resumo Executivo
O sistema **Gromit.Control** é uma aplicação web robusta e bem arquitetada para gestão de assistência técnica. A base de código demonstra boas práticas de engenharia de software, com separação de responsabilidades, tipagem forte e UI moderna.

### Principais Desafios
1. **Autenticação quebrada** precisa de correção imediata
2. **Dados mockados** devem ser migrados para o banco
3. **Permissões desabilitadas** comprometem a segurança

### Potencial
Com as correções sugeridas, o sistema tem potencial para ser uma solução enterprise-grade para o mercado de assistência técnica.

### Próximos Passos Sugeridos
1. ✅ Corrigir autenticação (1-2 dias)
2. ✅ Reativar permissões (1 dia)
3. ✅ Migrar dados mockados (2-3 dias)
4. ✅ Adicionar validação (2-3 dias)
5. ✅ Implementar testes E2E (3-5 dias)
6. ✅ Otimizar performance (2-3 dias)

**Tempo estimado para produção:** 2-3 semanas

---

**Desenvolvido por:** Eduardo (euclideslione@gmail.com)  
**Última atualização:** 11/02/2026
