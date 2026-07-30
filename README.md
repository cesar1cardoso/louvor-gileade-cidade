# Louvor Casa Viva

Sistema de gestão de louvor para igrejas — repertório, escala, músicas e links de acesso temporário para visitantes.

**Stack:** React 18 + Vite · Node.js 20 + Express · PostgreSQL 16 · Docker

---

## Setup local (desenvolvimento)

### Pré-requisitos
- Docker Desktop instalado e rodando

### 1. Clone o repositório
```bash
git clone <url-do-repo>
cd louvor-casa-viva
```

### 2. Configure as variáveis de ambiente

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env` e defina pelo menos:
- `DB_PASSWORD` — senha do banco
- `JWT_SECRET` — string longa e aleatória
- `JWT_REFRESH_SECRET` — outra string longa e aleatória

> **Gerar secrets seguros:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 3. Suba os containers

```bash
docker compose up --build -d
```

### 4. Acesse

| Serviço | URL |
|---|---|
| Aplicação | http://localhost:3000 |
| API | http://localhost:3001 |
| PostgreSQL | localhost:5433 |

**Login inicial:** criado automaticamente pelo auto-seed (ver `backend/src/scripts/auto-seed.js`).

### Acesso pelo celular (mesma rede Wi-Fi)

Substitua `192.168.0.6` pelo IP da sua máquina e acesse `http://<IP>:3000`.

```bash
# Descobrir seu IP
ipconfig          # Windows
ip route get 1    # Linux
```

---

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Descrição | Obrigatória |
|---|---|---|
| `PORT` | Porta da API (padrão: 3001) | Não |
| `NODE_ENV` | `development` ou `production` | Não |
| `DB_HOST` | Host do PostgreSQL | Sim |
| `DB_PORT` | Porta do PostgreSQL (padrão: 5432) | Não |
| `DB_NAME` | Nome do banco | Sim |
| `DB_USER` | Usuário do banco | Sim |
| `DB_PASSWORD` | Senha do banco | Sim |
| `JWT_SECRET` | Secret dos tokens de acesso (4h) | **Sim** |
| `JWT_REFRESH_SECRET` | Secret dos refresh tokens (7d) | **Sim** |
| `FRONTEND_URL` | URL do frontend em produção | Produção |
| `CORS_ORIGINS` | Origens adicionais separadas por vírgula | Não |

### Frontend (`frontend/.env`)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL base da API. Deixe vazio para usar proxy Vite (padrão). |

---

## Perfis de acesso

| Perfil | Permissões |
|---|---|
| `admin` | Acesso total — usuários, configurações, tudo |
| `lider` | Músicas, escala, repertório, dados de membros, links de visitante |
| `membro` | Somente visualização |

---

## Deploy no Railway

### Backend
1. Crie um projeto no [Railway](https://railway.app) e adicione um serviço PostgreSQL
2. Conecte o repositório — o `railway.toml` configura o build automaticamente
3. Configure as variáveis de ambiente no painel:
   - `JWT_SECRET` e `JWT_REFRESH_SECRET`
   - `DB_*` (Railway preenche automaticamente com o PostgreSQL integrado)
   - `FRONTEND_URL` (URL do frontend deployado)
   - `NODE_ENV=production`

### Frontend
Recomendado: **Vercel** ou **Netlify**.

```bash
cd frontend
npm run build   # gera frontend/dist/
```

Configure `VITE_API_URL` apontando para a URL do backend no Railway.

### Docker Compose em VPS

```bash
# Crie as variáveis de produção
cp backend/.env.example .env.prod
# Edite .env.prod com valores reais de produção

# Suba
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

---

## Comandos úteis

```bash
# Desenvolvimento
docker compose up -d           # Subir
docker compose down            # Parar
docker compose logs -f         # Ver logs em tempo real
docker compose up --build -d   # Rebuild e subir

# Produção (VPS)
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml down

# Banco
docker compose exec louvor_postgres psql -U louvor_user -d louvor_casaviva

# Apagar dados do banco (CUIDADO)
docker compose down -v
```

---

## Estrutura do projeto

```
louvor-casa-viva/
├── docker-compose.yml          # Desenvolvimento local
├── docker-compose.prod.yml     # Produção
├── railway.toml                # Configuração de deploy Railway
├── .gitignore
├── README.md
├── backend/
│   ├── Dockerfile              # Dev
│   ├── Dockerfile.prod         # Produção (npm ci --only=production)
│   ├── .env.example
│   ├── .env.development        # Dev (commitável, sem segredos)
│   ├── server.js
│   └── src/
│       ├── config/database.js
│       ├── middleware/auth.js
│       ├── routes/             # auth, membros, louvores, cultos, repertorios, escalas, links-temporarios, backup, usuarios
│       ├── scripts/auto-seed.js
│       └── docker/init.sql
└── frontend/
    ├── Dockerfile              # Dev (Vite dev server)
    ├── Dockerfile.prod         # Produção (build + nginx)
    ├── nginx.conf
    ├── .env.example
    ├── .env.development
    ├── vite.config.js
    └── src/
        ├── components/
        ├── contexts/AuthContext.jsx
        ├── hooks/
        ├── pages/
        └── services/api.js
```
