# Sistema de Assistência Digital

Sistema web para gestão de assistência técnica com controle de orçamentos, recebimentos, notas fiscais e gerenciamento de usuários.

## 🚀 Tecnologias

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

## ✨ Funcionalidades

### Dashboard
Visão geral com estatísticas e atividades recentes do sistema.

### Notificações
Sistema de notificações com indicador visual e contador de não lidas.

### Gerenciamento de Usuários
Controle completo de usuários, permissões e histórico de atividades (apenas administradores).

### Orçamentos
Listagem e gestão de produtos aguardando elaboração de orçamento.

### Recebimento
Controle de recebimento de produtos com fluxo guiado em etapas.

### NF-e (XML)
Upload e processamento de arquivos XML de notas fiscais eletrônicas.

### Pré-Análise
Gerenciamento de fila de produtos para pré-análise técnica.

### Cadastro de Produtos
Formulário para cadastro de novos produtos no sistema.

### Configurações
Gerenciamento de perfil e configurações do usuário.

## 🔐 Sistema de Permissões

O sistema possui controle de acesso baseado em roles e permissões específicas para cada módulo.

## 🚦 Como Executar

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev
```

## Environment setup

Antes de rodar `npm run dev`, crie um arquivo `.env.local` na raiz do projeto com base no `.env.example`.

Variaveis obrigatorias para rotas de API:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Variaveis obrigatorias para cliente:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Depois de criar ou editar o `.env.local`, reinicie o servidor Next.js.

Acesse `http://localhost:3000`

## 📱 Responsividade

Interface totalmente responsiva com suporte para desktop, tablet e mobile.

---

Desenvolvido para otimizar a gestão de assistência técnica.
