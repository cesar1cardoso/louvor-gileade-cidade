# Prompt — Segurança: Remover Senha em Texto Claro dos Logs da API

## Problema
A API exibe a senha do admin em texto claro nos logs do Docker ao criar o
usuário automaticamente, como no bloco abaixo:

```
╔══════════════════════════════════════╗
║   ADMIN CRIADO AUTOMATICAMENTE       ║
║   E-mail : admin@casaviva.com        ║
║   Senha  : Admin@2024                ║
╚══════════════════════════════════════╝
```

Isso é um risco de segurança grave — qualquer pessoa com acesso aos logs do
servidor consegue ver a senha em texto claro.

## Tarefa para o Claude Code

### Passo 1 — Localizar o trecho responsável

Busque nos arquivos do backend (pasta `backend/src` ou `backend/`) o trecho
que imprime esse bloco. Procure por strings como:
- `ADMIN CRIADO AUTOMATICAMENTE`
- `Senha  :`
- `╔` ou `║`

### Passo 2 — Substituir a mensagem

Substitua o bloco que exibe a senha por uma mensagem segura que **não revela
a senha**, apenas informa que o admin foi criado e orienta onde encontrar
as credenciais:

```javascript
// ANTES (exemplo)
console.log(`╔══════════════════════════════════════╗`);
console.log(`║   ADMIN CRIADO AUTOMATICAMENTE       ║`);
console.log(`║   E-mail : ${email}        ║`);
console.log(`║   Senha  : ${senha}             ║`);
console.log(`╚══════════════════════════════════════╝`);

// DEPOIS
console.log('======================================');
console.log('  Admin padrão criado com sucesso.');
console.log('  Consulte o arquivo .env para as');
console.log('  credenciais iniciais de acesso.');
console.log('  Troque a senha após o primeiro login.');
console.log('======================================');
```

### Passo 3 — Mover a senha padrão para o .env

Se a senha `Admin@2024` estiver **hardcoded** no código, extraia-a para o `.env`:

**No `.env`:**
```dotenv
ADMIN_DEFAULT_PASSWORD=Admin@2024
```

**No `.env.example`:**
```dotenv
ADMIN_DEFAULT_PASSWORD=troque_esta_senha_apos_primeiro_login
```

**No código do backend**, substitua o valor literal pela variável de ambiente:
```javascript
const senhaAdmin = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2024';
```

### Passo 4 — Verificar se a senha está hardcoded em outros lugares

Busque em todos os arquivos do backend por ocorrências de `Admin@2024`:

```bash
grep -r "Admin@2024" backend/
```

Se encontrar em outros lugares (seeds, testes, migrations), substitua pela
referência à variável de ambiente ou por um placeholder.

## Validação após a edição

Reconstrua e reinicie a API:

```bash
docker compose build louvor_api
docker compose up -d louvor_api
docker logs louvor_api --tail=30
```

Os logs **não devem** conter nenhuma senha em texto claro.
Confirme que o login ainda funciona normalmente no sistema.
