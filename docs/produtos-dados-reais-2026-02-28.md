# Produtos: dados reais e pendencias de banco

## O que foi feito

- A tela [app/home/produtos/page.tsx](/c:/Users/Giovane%20ines/Desktop/kaspper/assistencia-digital/app/home/produtos/page.tsx) deixou de usar listas mockadas de `revenda/cliente`.
- `revenda/cliente` agora carrega dados reais das tabelas `clients` e `branches`.
- A sugestao de fabricante agora usa dados reais de `entities` com `entity_type = 'MANUFACTURER'` e fabricantes ja existentes em produtos.
- As sugestoes de embalagem, acessorios, estetica, funcional e funcionalidade agora saem dos produtos reais carregados, nao de arrays fixos.
- O usuario fixo foi removido. O `createdBy` agora usa o usuario salvo em `localStorage.user`.
- O save passou a fazer upload real para o storage antes de persistir o produto.
- `fotoProduto` agora salva URL real em `produtos.fotos`.
- `manualUsuario` agora salva URL real em `produtos.manual_url`.
- `vistaExplodida`, `boletimTecnico` e `manualTecnico` agora entram em `modelos_data`.
- Fotos de itens vinculados agora salvam URL real dentro do JSON de itens.
- Ao recarregar produto do banco, a tela volta a montar os anexos salvos em memoria para exibicao.
- Validacao: `npm run build` passou em 2026-02-28.

## Banco: o que ja atende

- `clients`: atende o lookup de cliente.
- `branches`: atende o lookup de filial/revenda.
- `entities`: atende fabricantes reais.
- `produtos.fotos`: atende foto do produto.
- `produtos.manual_url`: atende manual do usuario.
- `produtos.modelos_data`: atende anexos por modelo e fotos de itens dentro do JSON.

## Banco: o que ainda falta se quiser persistir tudo

Hoje ainda nao existe coluna dedicada para persistir estes anexos de produto:

- `etiquetaProcel`
- `kitAcessorio`

Sem isso, esses dois arquivos continuam existindo so no estado local da tela durante a sessao.

## Recomendacao de banco

Opcao minima:

```sql
alter table public.produtos
  add column if not exists assets_data jsonb not null default '{}'::jsonb;
```

Exemplo de estrutura para `assets_data`:

```json
{
  "fotoProduto": ["https://..."],
  "etiquetaProcel": ["https://..."],
  "kitAcessorio": ["https://..."],
  "manualUsuario": ["https://..."]
}
```

Opcao melhor se quiser auditoria por arquivo:

- criar tabela `product_assets`
- colunas sugeridas: `id`, `product_id`, `scope`, `asset_type`, `url`, `path`, `file_name`, `mime_type`, `uploaded_by`, `uploaded_at`

## Resumo pratico

- Para `clients`, `branches`, `entities` e os anexos ja cobertos por `fotos`, `manual_url` e `modelos_data`, nao precisa mexer no banco.
- Para `etiquetaProcel` e `kitAcessorio`, precisa adicionar estrutura no banco se quiser persistencia real.
