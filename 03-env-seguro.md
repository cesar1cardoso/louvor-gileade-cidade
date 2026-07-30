# Prompt — Correção 3: Variáveis Sensíveis em Arquivo .env

## Objetivo
Remover senhas, segredos e credenciais do `docker-compose.yml` e centralizá-los
em um arquivo `.env` na raiz do projeto, que **jamais deve entrar no repositório Git**.

## Tarefa para o Claude Code

Trabalhe dentro de `C:\louvor-casa-viva`.

---

### Passo 1 — Identificar variáveis sensíveis no `docker-compose.yml`

Leia o `docker-compose.yml` e liste **todos** os valores que são segredos ou
configurações de ambiente que variam por instalação, como:

- `POSTGRES_PASSWORD`
- `POSTGRES_USER`
- `POSTGRES_DB`
- `JWT_SECRET`
- Qualquer outra variável de autenticação, chave de API ou URL com credencial

---

### Passo 2 — Criar o arquivo `.env`

Crie o arquivo `.env` na raiz (`C:\louvor-casa-viva\.env`) com **todas** as
variáveis identificadas, preenchidas com os valores que estavam no
`docker-compose.yml`. Exemplo de estrutura:

```dotenv
# Banco de dados
POSTGRES_USER=louvor_user
POSTGRES_PASSWORD=COLOQUE_AQUI_A_SENHA_REAL
POSTGRES_DB=louvor_db

# Autenticação
JWT_SECRET=COLOQUE_AQUI_O_SECRET_REAL

# Aplicação
NODE_ENV=production
```

---

### Passo 3 — Criar o arquivo `.env.example`

Crie também `.env.example` com as **mesmas chaves**, mas com valores de
placeholder (sem dados reais). Esse arquivo **pode e deve** ir para o repositório
como documentação para outros desenvolvedores:

```dotenv
# Banco de dados
POSTGRES_USER=louvor_user
POSTGRES_PASSWORD=sua_senha_aqui
POSTGRES_DB=louvor_db

# Autenticação
JWT_SECRET=gere_um_secret_forte_aqui

# Aplicação
NODE_ENV=production
```

---

### Passo 4 — Atualizar o `docker-compose.yml`

Substitua todos os valores literais sensíveis pela sintaxe de referência ao `.env`:

```yaml
# ANTES
environment:
  POSTGRES_PASSWORD: minha_senha_123
  JWT_SECRET: abc123segredo

# DEPOIS
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  JWT_SECRET: ${JWT_SECRET}
```

O Docker Compose lê automaticamente o `.env` da raiz do projeto.

---

### Passo 5 — Atualizar o `.gitignore`

Abra (ou crie) `.gitignore` na raiz do projeto e certifique-se de que as
seguintes entradas estão presentes:

```gitignore
# Variáveis de ambiente — NUNCA versionar
.env
.env.local
.env.production
```

**Não adicione** `.env.example` ao `.gitignore` — ele deve ir para o repo.

---

### Passo 6 — Verificar o backend (Node.js/Express)

Abra `backend/` e verifique se o `server.js` (ou `app.js`, ou `index.js`) já
carrega o `dotenv`:

```javascript
require('dotenv').config();
```

Se não estiver presente, adicione essa linha **no topo** do arquivo de entrada
do backend.

Verifique também se `dotenv` está listado em `backend/package.json` nas
`dependencies` (não em `devDependencies`). Se não estiver, adicione:

```bash
# No contexto do container ou localmente:
cd backend && npm install dotenv --save
```

---

## Validação após todas as edições

```bash
# 1. Confirme que .env existe e não está no git
git status

# 2. Confirme que .env.example está rastreado
git status .env.example

# 3. Suba os containers para garantir que as variáveis são lidas corretamente
docker compose down
docker compose up -d

# 4. Inspecione as variáveis dentro do container da API
docker exec louvor_api printenv | grep -E "JWT_SECRET|POSTGRES|NODE_ENV"
```

As variáveis devem aparecer com os valores corretos do `.env`. O `JWT_SECRET`
**não deve** aparecer em texto no `docker-compose.yml` quando você abrir o arquivo.

---

## Aviso de segurança

Caso o `.env` tenha sido acidentalmente comitado em algum momento, rode:

```bash
git rm --cached .env
git commit -m "chore: remove .env do rastreamento git"
```

E considere **rotacionar** o `JWT_SECRET` e a senha do banco, pois credenciais
expostas em repositório devem ser tratadas como comprometidas.
