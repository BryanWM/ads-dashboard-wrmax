# Módulo de segurança

Correções da revisão de segurança (16/10/2026, OWASP Top 10 2025 · NIST 800-63B rev. 4).
Base: [relatório da Fase 8](validacao-fase-8.md), ADR-015 (cabeçalhos) e ADR-016 (MFA
adiado). Este documento tem três partes: o que o código já faz, **o que precisa ser feito
à mão** (painéis da Supabase, Vercel e GitHub) e os procedimentos de operação.

## 1. O que o código já resolve

| Risco da revisão                                | Correção                                                                                                                                | Onde                                                   | Validado                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| Senha fraca para login de fator único           | Senhas novas com **8+** caracteres, letra maiúscula, minúscula, número e símbolo (escolha da agência; a NIST preferiria 15+ sem regras) | `src/lib/admin/schemas.ts`, tela `/acesso`             | teste unitário                               |
| Cookie de sessão legível por JavaScript         | `HttpOnly` + `Secure` (produção) + `SameSite=Lax`                                                                                       | `src/lib/supabase/config.ts`, proxy e cliente servidor | typecheck; conferir no navegador (checklist) |
| Token Meta sem vínculo com a conexão (L4)       | AAD = id da conexão; token copiado para outra conexão não abre                                                                          | `src/lib/crypto/token-cipher.ts`                       | teste unitário                               |
| Rotação de chave exigia reconectar a Meta       | Chaveiro com versão atual + anterior; cada token é recifrado com a chave nova na próxima leitura                                        | `src/server/crypto/tokens.ts`                          | teste unitário                               |
| Sem registro de eventos para alertas            | Linha JSON `{"tag":"security"}` em login (falha/sucesso/limite), link de acesso e cron não autorizado; e-mail só como impressão digital | `src/server/security/log.ts`                           | teste unitário                               |
| Sem análise de dependências e de segredos no CI | Job `security`: `pnpm audit --prod --audit-level=high` + gitleaks no histórico inteiro (binário oficial com checksum)                   | `.github/workflows/ci.yml`                             | roda no próximo push                         |
| Actions do CI por tag                           | Fixadas por **SHA** de commit; token do workflow só leitura                                                                             | `.github/workflows/ci.yml`                             | —                                            |
| Sem atualização automática de dependências      | Dependabot semanal (npm + GitHub Actions)                                                                                               | `.github/dependabot.yml`                               | —                                            |

Já resolvidos na Fase 8: cabeçalhos (CSP, HSTS, frame-ancestors), demonstração bloqueada em
produção, paginação da Meta presa ao host da Graph API, tag GCM de 16 bytes, mensagens
neutras, `server-only` nas actions.

**Risco aceito — MFA do admin (ADR-016).** O segundo fator foi retirado a pedido para manter
o acesso simples no início. A senha do admin é a única barreira para os dados de todos os
clientes: por isso os passos 1, 4 e 9 do checklist (cadastro fechado, limite de tentativas,
alertas) deixam de ser "recomendados" e passam a ser **obrigatórios** antes de produção.

### Situação por categoria depois do módulo

| Categoria       | Antes       | Depois do código            | Depois do checklist manual   |
| --------------- | ----------- | --------------------------- | ---------------------------- |
| Autenticação    | risco médio | risco médio (sem MFA)       | risco médio aceito (ADR-016) |
| Autorização     | ok          | ok                          | ok                           |
| Entrada/saída   | ok          | ok                          | ok                           |
| Sessão          | risco médio | ok (HttpOnly/Secure)        | ok + token de 15 min         |
| Criptografia    | risco médio | ok (AAD, rotação)           | ok                           |
| Segredos        | risco médio | risco médio                 | ok (escopo das variáveis)    |
| Configuração    | ok          | ok                          | ok                           |
| Dependências    | risco médio | ok (SCA + Dependabot + SHA) | ok                           |
| Logs e detecção | risco alto  | risco médio (eventos)       | ok (drain + alertas)         |
| LGPD            | risco médio | risco médio                 | ok (documentos + DPAs)       |

## 2. Checklist manual

Marque na ordem. **A** é para fazer agora, no projeto de testes. **B** é para a virada
para a conta da empresa (junto com `go-live.md`). **C** é rotina.

### A. Agora (projeto de testes)

1. **Supabase → Authentication → Sign In / Providers**:
   - desligar **Allow new users to sign up** e **Anonymous sign-ins**;
   - provedor **Email** → **Minimum password length: 8** e **Password requirements:
     Lowercase, uppercase letters, digits and symbols** (igual à regra do app);
   - **Leaked password protection**: ligar (exige plano Pro; anotar se não houver).
2. **Supabase → sessões/JWT**: _access token expiry_ (JWT expiry) = **900 segundos**. Se o
   plano permitir: _inactivity timeout_ 7 dias e _time-box_ 30 dias.
3. **Vercel → Settings → Environment Variables**: deixar `SUPABASE_SECRET_KEY`,
   `TOKEN_ENCRYPTION_KEY`, `META_APP_SECRET` e `CRON_SECRET` **só em Production** (desmarcar
   Preview e Development). **Settings → Deployment Protection**: ligar para as prévias.
4. **Vercel → Firewall → Rules**: regra _Rate limit_ para `POST` em `/login` e `/acesso`:
   **10 por minuto por IP**, ação _Deny_. Se o plano não tiver, anotar o risco.
5. **GitHub → Settings → Code security**: ligar **Dependabot alerts** e **security
   updates**; **Secret scanning + push protection** se disponível para o repositório.
   **Settings → Branches**: proteger `main` exigindo os jobs `check` e `security`.
6. Depois do push, conferir na aba **Actions** que o job `security` passou. Se o gitleaks
   acusar algo, **não apague o aviso**: me mande o nome da regra e o arquivo (não o valor).
7. Entrar no site e, nas ferramentas do navegador (Application → Cookies), conferir que os
   cookies `sb-…` estão com **HttpOnly** marcado.

### B. Na virada para a conta da empresa

8. Supabase **Pro** (backup PITR, proteção de senha vazada, logs por 7 dias) e região
   **São Paulo (`sa-east-1`)**. **Database → Network restrictions**: liberar só os IPs
   necessários (ou nenhum, se ninguém conecta direto no Postgres).
9. Vercel **Pro** (o plano Hobby não permite uso comercial; traz Firewall e retenção de
   logs). Repetir os passos 1–5 no projeto de produção. **Log drain** (Vercel →
   Integrations: Better Stack, Axiom ou Datadog) com retenção de 90 dias e os alertas da
   seção 4 — sem MFA, é o alerta de tentativas que avisa de um ataque à senha do admin.
10. Senhas de admin longas (recomendado 15+, mesmo com o mínimo de 8), guardadas no gerenciador de senhas da empresa;
    cada pessoa com o próprio login (nunca login compartilhado).
11. LGPD (seção 5): aviso de privacidade e termos revisados por advogado, DPAs da Supabase
    e da Vercel aceitos, cláusula de operador no contrato com os clientes.
12. Revogar o token Meta de testes; gerar o de produção só no site de produção.

### C. Rotina

| Quando            | O quê                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Toda semana       | Triar PRs do Dependabot. Crítica/alta: corrigir em até **7 dias**; demais, no mês.              |
| Todo mês          | Ler Administração → Auditoria e os alertas do mês.                                              |
| A cada 3 meses    | Testar restauração de backup (PITR) num projeto descartável.                                    |
| A cada 6–12 meses | Girar `TOKEN_ENCRYPTION_KEY` (procedimento abaixo), o token Meta e a chave secreta do Supabase. |
| Saída de pessoa   | Remover o acesso dela, girar as chaves que ela viu (`go-live.md`).                              |
| Ao crescer        | Reavaliar o MFA de admin (ADR-016) ao passar de 2 admins ou de ~10 clientes.                    |

## 3. Procedimentos

### Rotação da chave de criptografia (sem reconectar a Meta)

1. Gerar a nova: `openssl rand -base64 32`.
2. Na Vercel (Production): `TOKEN_ENCRYPTION_KEY_PREVIOUS` = chave atual,
   `TOKEN_ENCRYPTION_KEY_PREVIOUS_VERSION` = versão atual, `TOKEN_ENCRYPTION_KEY` = nova,
   `TOKEN_ENCRYPTION_KEY_VERSION` = versão atual + 1. Redeploy.
3. Esperar a sincronização diária (cada token é recifrado quando é lido) ou clicar
   "Buscar dados" em uma conta de cada conexão.
4. Conferir no SQL Editor:
   `select key_version, count(*) from private.platform_credentials group by 1;` — todos
   na versão nova.
5. Apagar as duas variáveis `…_PREVIOUS` e fazer redeploy.

### Incidente: suspeita de vazamento

| Suspeita                   | Primeira hora                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| Token Meta                 | Business Manager → Usuários do sistema → **Revogar tokens**; gerar outro e reconectar.        |
| Chave secreta do Supabase  | Supabase → API Keys → girar a secret key; atualizar na Vercel; redeploy.                      |
| `TOKEN_ENCRYPTION_KEY`     | Revogar o token Meta (acima) e girar a chave (procedimento acima).                            |
| Conta de admin             | Trocar a senha (Supabase → Users → enviar recuperação); revisar a Auditoria das últimas 72 h. |
| Dados de clientes expostos | Avaliar comunicação à ANPD e aos titulares (LGPD art. 48) com o jurídico.                     |

## 4. Alertas recomendados (log drain)

Filtro base: linhas com `"tag":"security"`.

| Alerta                       | Condição                                                   | Gravidade |
| ---------------------------- | ---------------------------------------------------------- | --------- |
| Tentativas de senha em massa | ≥ 20 `login.failed` em 5 min (ou ≥ 5 para a mesma `email`) | Alta      |
| Cron chamado sem a chave     | qualquer `cron.unauthorized`                               | Média     |
| Sincronização parada         | nenhuma linha `[cron] sync` com `"synced"` > 0 em 36 h     | Média     |
| Links de acesso rejeitados   | ≥ 10 `access.link_rejected` em 1 h                         | Baixa     |

## 5. LGPD — mapa de dados

| Dado                                 | Titular                       | Finalidade                      | Base legal                        | Onde                      | Retenção sugerida                             |
| ------------------------------------ | ----------------------------- | ------------------------------- | --------------------------------- | ------------------------- | --------------------------------------------- |
| Nome, e-mail, último acesso          | Usuários (agência e clientes) | Login e controle de acesso      | Execução de contrato              | Supabase Auth, `profiles` | Enquanto o acesso existir; apagado ao remover |
| Registro de auditoria (autor, ação)  | Usuários da agência           | Segurança e prestação de contas | Legítimo interesse                | `audit_logs`              | 5 anos                                        |
| Impressão digital do e-mail nos logs | Quem tenta entrar             | Detectar ataques                | Legítimo interesse                | Log drain                 | 90 dias                                       |
| Métricas de anúncios (agregadas)     | — (empresa anunciante)        | Relatórios ao cliente           | Contrato com o cliente (operador) | Supabase                  | Duração do contrato + 90 dias                 |

Pendências: aviso de privacidade e termos de uso (advogado), encarregado (DPO) nomeado,
DPAs aceitos (Supabase, Vercel), cláusula de operador no contrato com os clientes, rotina
de exclusão de dados de cliente desligado. **Nunca importar formulários de lead da Meta
sem uma nova avaliação** (dados pessoais e, em clientes de saúde, sensíveis — art. 11).

## 6. Backlog técnico (não feito neste módulo)

- **MFA de admin** (ADR-016) — implementação de referência no commit `3cd7b45`.
- Auditoria **antes** da alteração (L5) — hoje grava depois; baixo risco.
- Permissões por coluna para usuários de cliente (I2) — nada atravessa clientes hoje.
- CSP sem `'unsafe-inline'` — incompatível com o Partial Prerendering (ADR-015).
- Chave de criptografia no Supabase Vault/KMS em vez de variável de ambiente.
- Varredura dinâmica (OWASP ZAP baseline) contra as prévias no CI.
