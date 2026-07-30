# Prompt — Correção 1: Restart Policy nos Containers

## Objetivo
Adicionar `restart: unless-stopped` em todos os serviços do `docker-compose.yml`
para que os containers reiniciem automaticamente após falha ou reinício do sistema,
sem derrubar containers parados manualmente.

## Tarefa para o Claude Code

Abra o arquivo `docker-compose.yml` na raiz do projeto `C:\louvor-casa-viva`.

Localize os três serviços: `louvor_postgres`, `louvor_api` e `louvor_app`.

Para **cada um dos três serviços**, adicione a propriedade abaixo imediatamente
após a linha `container_name` (ou após `image`/`build`, se `container_name`
não existir):

```yaml
restart: unless-stopped
```

### Resultado esperado (estrutura simplificada)

```yaml
services:
  louvor_postgres:
    container_name: louvor_postgres
    restart: unless-stopped
    image: postgres:16
    # ... demais propriedades

  louvor_api:
    container_name: louvor_api
    restart: unless-stopped
    build: ./backend
    # ... demais propriedades

  louvor_app:
    container_name: louvor_app
    restart: unless-stopped
    build: ./frontend
    # ... demais propriedades
```

## Validação após a edição

Execute no terminal, dentro de `C:\louvor-casa-viva`:

```bash
docker compose config | grep -A2 "restart"
```

Todos os três serviços devem exibir `restart: unless-stopped`.

Se os containers já estiverem rodando, aplique a nova política sem derrubar tudo:

```bash
docker compose up -d --no-deps louvor_postgres louvor_api louvor_app
```

## Observação

`unless-stopped` é preferível a `always` porque respeita paradas manuais
(`docker compose stop`), evitando que o container volte sozinho quando você
precisar de manutenção.
