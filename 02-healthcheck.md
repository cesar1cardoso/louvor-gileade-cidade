# Prompt — Correção 2: Healthcheck e Dependência com Condição

## Objetivo
Garantir que `louvor_api` só inicie **depois que `louvor_postgres` estiver
genuinamente pronto para aceitar conexões**, usando `healthcheck` no serviço
do banco e `depends_on` com `condition: service_healthy` na API.

## Tarefa para o Claude Code

Abra `docker-compose.yml` na raiz de `C:\louvor-casa-viva`.

### Passo 1 — Adicionar healthcheck ao serviço `louvor_postgres`

Dentro do serviço `louvor_postgres`, adicione o bloco `healthcheck` logo após
as variáveis de ambiente (`environment`):

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-louvor_user} -d ${POSTGRES_DB:-louvor_db}"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 20s
```

> **Atenção:** use as mesmas variáveis de usuário e banco que já existem no
> serviço. Se estiverem com valores literais (ex.: `POSTGRES_USER: louvor_user`),
> substitua pela referência `${POSTGRES_USER:-louvor_user}` ou use o valor literal
> diretamente no `pg_isready -U louvor_user -d louvor_db`.

### Passo 2 — Atualizar `depends_on` em `louvor_api`

Substitua o `depends_on` simples existente em `louvor_api` pela forma expandida:

```yaml
depends_on:
  louvor_postgres:
    condition: service_healthy
```

### Resultado esperado (estrutura simplificada)

```yaml
services:
  louvor_postgres:
    container_name: louvor_postgres
    restart: unless-stopped
    image: postgres:16
    environment:
      POSTGRES_USER: louvor_user
      POSTGRES_PASSWORD: ...
      POSTGRES_DB: louvor_db
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U louvor_user -d louvor_db"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  louvor_api:
    container_name: louvor_api
    restart: unless-stopped
    build: ./backend
    depends_on:
      louvor_postgres:
        condition: service_healthy
    # ... demais propriedades
```

## Validação após a edição

Suba os containers do zero para testar a sequência:

```bash
docker compose down -v
docker compose up -d
```

Monitore o status do healthcheck enquanto sobe:

```bash
docker inspect louvor_postgres --format "{{.State.Health.Status}}"
```

Aguarde retornar `healthy`. Só então o `louvor_api` deve iniciar. Verifique:

```bash
docker compose ps
```

A coluna `Status` do `louvor_api` deve mostrar `running` **somente após**
`louvor_postgres` estar `healthy`.

## Por que isso importa

`depends_on` simples (sem `condition`) só espera o container **existir**,
não que o PostgreSQL esteja pronto para queries. Sem o healthcheck, a API
pode tentar conectar antes do banco estar disponível e morrer no startup.
