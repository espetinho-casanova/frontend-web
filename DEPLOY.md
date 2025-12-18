# Deploy no Vercel

Guia completo para fazer deploy do frontend no Vercel.

## 📋 Pré-requisitos

- Conta no [Vercel](https://vercel.com)
- Repositório no GitHub (já configurado)
- Backend rodando e acessível (URL da API)

## 🚀 Opção 1: Deploy via Dashboard do Vercel (Recomendado)

### Passo 1: Conectar Repositório

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New Project"**
3. Importe o repositório `espetinho-casanova/frontend-web`
4. Se não aparecer, clique em **"Adjust GitHub App Permissions"** e autorize o acesso

### Passo 2: Configurar o Projeto

1. **Framework Preset**: Next.js (deve detectar automaticamente)
2. **Root Directory**: `frontend-web` (se o repositório for monorepo) ou deixe vazio
3. **Build Command**: `npm run build` (padrão do Next.js)
4. **Output Directory**: `.next` (padrão do Next.js)
5. **Install Command**: `npm install` ou `yarn install`

### Passo 3: Configurar Variáveis de Ambiente

Adicione as seguintes variáveis de ambiente no Vercel:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `NEXT_PUBLIC_API_URL` | `https://sua-api.com` | URL da API em produção |
| `NEXT_PUBLIC_COOKIE_NAME` | `@es-casanova.token` | Nome do cookie (pode manter padrão) |
| `NEXT_PUBLIC_COOKIE_MAX_AGE` | `2592000` | Tempo de expiração do cookie (30 dias) |

**Como adicionar:**
- Na página de configuração do projeto, vá em **"Environment Variables"**
- Adicione cada variável clicando em **"Add"**
- Selecione os ambientes: **Production**, **Preview** e **Development**

### Passo 4: Configurar Branch de Produção (Opcional)

Se quiser usar a branch `develop` como produção:

1. Após o primeiro deploy, vá em **Settings** → **Git**
2. Em **Production Branch**, selecione `develop`
3. Salve as alterações

### Passo 5: Deploy

1. Clique em **"Deploy"**
2. Aguarde o build completar (geralmente 2-5 minutos)
3. Após o sucesso, você receberá uma URL: `https://seu-projeto.vercel.app`

## 🔧 Opção 2: Deploy via CLI

### Passo 1: Instalar Vercel CLI

```bash
npm i -g vercel
```

### Passo 2: Login

```bash
vercel login
```

### Passo 3: Deploy

```bash
cd frontend-web
vercel
```

Siga as instruções:
- **Set up and deploy?** → Yes
- **Which scope?** → Seu usuário/organização
- **Link to existing project?** → No (primeira vez) ou Yes (se já existir)
- **Project name?** → `frontend-web` ou deixe o padrão
- **Directory?** → `./` (raiz do frontend-web)

### Passo 4: Configurar Variáveis de Ambiente

```bash
vercel env add NEXT_PUBLIC_API_URL
# Cole o valor quando solicitado

vercel env add NEXT_PUBLIC_COOKIE_NAME
# Valor: @es-casanova.token

vercel env add NEXT_PUBLIC_COOKIE_MAX_AGE
# Valor: 2592000
```

### Passo 5: Deploy de Produção

```bash
vercel --prod
```

## 🔄 Deploy Automático (Git Integration)

Após conectar o repositório, o Vercel faz deploy automático:

- **Push para `main` ou `master`** → Deploy de produção (padrão)
- **Push para outras branches** → Deploy de preview
- **Pull Requests** → Deploy de preview com URL única

## 🌿 Usar Branch `develop` como Produção

Para usar a branch `develop` como branch de produção no Vercel:

### Via Dashboard:

1. Acesse o projeto no Vercel
2. Vá em **Settings** → **Git**
3. Na seção **Production Branch**, clique em **Edit**
4. Selecione ou digite `develop`
5. Clique em **Save**

Agora:
- **Push para `develop`** → Deploy de produção
- **Push para outras branches** (incluindo `main`) → Deploy de preview

### Via CLI:

```bash
# Configurar branch de produção
vercel --prod --branch develop
```

Ou configure no arquivo `vercel.json`:

```json
{
  "git": {
    "deploymentEnabled": {
      "develop": true
    }
  }
}
```

## ⚙️ Configurações Avançadas

### Arquivo `vercel.json` (Opcional)

Crie um arquivo `vercel.json` na raiz do `frontend-web` se precisar de configurações customizadas:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["gru1"]
}
```

**Nota:** O Vercel detecta Next.js automaticamente, então este arquivo geralmente não é necessário.

### Domínio Customizado

1. No dashboard do Vercel, vá em **Settings** → **Domains**
2. Adicione seu domínio
3. Configure os registros DNS conforme instruções do Vercel

## 🐛 Troubleshooting

### Build Fails

- Verifique se todas as variáveis de ambiente estão configuradas
- Confira os logs de build no dashboard do Vercel
- Teste o build localmente: `npm run build`

### Erro de Variáveis de Ambiente

- Certifique-se de que todas as variáveis `NEXT_PUBLIC_*` estão configuradas
- Variáveis sem `NEXT_PUBLIC_` não são expostas ao cliente

### Erro de CORS

- Configure o CORS no backend para aceitar requisições do domínio do Vercel
- Adicione `https://seu-projeto.vercel.app` nas origens permitidas

### Erro de API Connection

- Verifique se a URL da API está correta
- Confirme que o backend está acessível publicamente
- Teste a conexão: `curl https://sua-api.com/health`

## 📝 Checklist de Deploy

- [ ] Repositório conectado ao Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Build local funcionando (`npm run build`)
- [ ] Backend acessível e configurado
- [ ] CORS configurado no backend
- [ ] Primeiro deploy realizado
- [ ] URL de produção testada
- [ ] Domínio customizado configurado (opcional)

## 🔗 Links Úteis

- [Documentação do Vercel](https://vercel.com/docs)
- [Next.js no Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

