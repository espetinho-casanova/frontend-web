# Frontend Web - Espetinho Casanova

Frontend web desenvolvido com Next.js para o sistema de gestão do restaurante Espetinho Casanova.

## 🚀 Tecnologias

- **Next.js 13.4.4** - Framework React com SSR
- **React 18.2.0** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **SASS/SCSS** - Estilização com módulos CSS
- **Axios** - Cliente HTTP
- **React Query (@tanstack/react-query)** - Gerenciamento de estado do servidor
- **DnD Kit** - Drag and drop para dashboard
- **Material-UI** - Componentes UI
- **React Toastify** - Notificações
- **Zod** - Validação de schemas
- **Jest** - Testes unitários
- **Testing Library** - Testes de componentes

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Backend da aplicação rodando (ver [backend README](../backend/README.md))

## 🔧 Instalação

1. Clone o repositório:

```bash
git clone <repository-url>
cd espetinho-casanova/frontend-web
```

2. Instale as dependências:

```bash
npm install
# ou
yarn install
```

3. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

4. Edite o arquivo `.env` com suas configurações:

```env
NEXT_PUBLIC_API_URL=http://localhost:3333
NEXT_PUBLIC_COOKIE_NAME=@es-casanova.token
NEXT_PUBLIC_COOKIE_MAX_AGE=2592000
```

## 🎯 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento na porta 3000

# Produção
npm run build        # Cria build de produção
npm start            # Inicia servidor de produção

# Testes
npm test             # Executa testes
npm run test:watch   # Executa testes em modo watch
npm run test:coverage # Executa testes com cobertura

# Linting
npm run lint         # Executa ESLint
```

## 📁 Estrutura do Projeto

```text
frontend-web/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── Header/          # Cabeçalho da aplicação
│   │   ├── ModalCreateOrder/ # Modal de criação de pedidos
│   │   ├── ModalOrder/      # Modal de visualização de pedidos
│   │   └── ui/              # Componentes UI base (Input, Checkbox, etc)
│   ├── config/              # Configurações
│   │   └── env.ts           # Validação de variáveis de ambiente
│   ├── contexts/            # Contextos React
│   │   └── AuthContext.tsx  # Contexto de autenticação
│   ├── hooks/               # Custom hooks
│   │   ├── useAddons.ts
│   │   ├── useCategories.ts
│   │   ├── useIngredients.ts
│   │   └── useProducts.ts
│   ├── pages/               # Páginas Next.js
│   │   ├── _app.tsx         # App principal
│   │   ├── dashboard/       # Dashboard de pedidos
│   │   ├── pdv/             # Ponto de venda
│   │   ├── product/         # Gestão de produtos
│   │   ├── category/        # Gestão de categorias
│   │   ├── users/           # Gestão de usuários
│   │   ├── roles/           # Gestão de roles e permissões
│   │   └── ...
│   ├── services/            # Serviços
│   │   ├── api.ts           # Cliente API
│   │   ├── apiClient.ts     # Cliente HTTP configurado
│   │   └── errors/          # Tratamento de erros
│   ├── styles/              # Estilos globais
│   ├── types/               # Tipos TypeScript
│   ├── utils/               # Utilitários
│   │   ├── canSSRAuth.ts   # HOC para autenticação SSR
│   │   ├── canSSRGuest.ts  # HOC para rotas públicas
│   │   ├── constants.ts    # Constantes da aplicação
│   │   └── imageUrl.ts     # Utilitário de URLs de imagens
│   └── validations/         # Schemas de validação Zod
├── public/                  # Arquivos estáticos
├── .env.example            # Template de variáveis de ambiente
├── .gitignore              # Arquivos ignorados pelo Git
├── next.config.js          # Configuração do Next.js
├── package.json            # Dependências e scripts
└── tsconfig.json           # Configuração TypeScript
```

## 🎨 Funcionalidades Principais

### Dashboard de Pedidos

- Visualização de pedidos em tempo real (SSE)
- Drag and drop para mover pedidos entre colunas
- Filtros por status (Em Preparação, Pronto, Finalizado)
- Edição de pedidos em andamento
- Histórico de pedidos finalizados
- Fila de espera

### Ponto de Venda (PDV)

- Interface de vendas simplificada
- Seleção de produtos por categoria/subcategoria
- Carrinho de compras
- Criação e edição de pedidos
- Personalização de produtos (adicionais, remoções, observações)

### Gestão de Produtos

- CRUD completo de produtos
- Gestão de categorias e subcategorias
- Controle de estoque
- Ativação/desativação de produtos
- Upload de imagens

### Gestão de Usuários e Permissões

- CRUD de usuários
- Sistema de roles e permissões
- Controle de acesso baseado em permissões

### Autenticação

- Login e registro
- Autenticação via JWT
- Proteção de rotas (SSR)
- Gerenciamento de sessão com cookies

## 🔐 Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `NEXT_PUBLIC_API_URL` | URL da API backend | `http://localhost:3333` |
| `NEXT_PUBLIC_COOKIE_NAME` | Nome do cookie de autenticação | `@es-casanova.token` |
| `NEXT_PUBLIC_COOKIE_MAX_AGE` | Tempo de expiração do cookie (segundos) | `2592000` (30 dias) |

## 🧪 Testes

O projeto utiliza Jest e Testing Library para testes:

```bash
# Executar todos os testes
npm test

# Executar em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

## 🚀 Deploy

### Build de Produção

```bash
npm run build
npm start
```

### Variáveis de Ambiente em Produção

Certifique-se de configurar as variáveis de ambiente no ambiente de produção:

- `NEXT_PUBLIC_API_URL` - URL da API em produção
- `NEXT_PUBLIC_COOKIE_NAME` - Nome do cookie (pode manter o padrão)
- `NEXT_PUBLIC_COOKIE_MAX_AGE` - Tempo de expiração do cookie

## 📝 Notas Importantes

- O projeto utiliza **Server-Side Rendering (SSR)** para melhor performance e SEO
- Rotas protegidas são verificadas no servidor antes de renderizar
- A autenticação é gerenciada via cookies HTTP-only
- O dashboard utiliza **Server-Sent Events (SSE)** para atualizações em tempo real
- Todas as variáveis de ambiente são validadas no startup usando Zod

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
2. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
3. Push para a branch (`git push origin feature/AmazingFeature`)
4. Abra um Pull Request

## 📄 Licença

Este projeto é privado e proprietário.
