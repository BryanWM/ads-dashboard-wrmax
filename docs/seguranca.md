# Módulo de segurança

Correções da revisão de segurança (16/10/2026, OWASP Top 10 2025 · NIST 800-63B rev. 4).
Base: [relatório da Fase 8](validacao-fase-8.md), ADR-015 (cabeçalhos) e ADR-016 (MFA).
Este documento tem três partes: o que o código já faz, **o que precisa ser feito à mão**
(painéis da Supabase, Vercel e GitHub) e os procedimentos de operação.

## 1. O que o código já resolve

| Risco da revisão                                | Correção                                                                                                                                     | Onde                                                   | Validado                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| Admin só com senha (risco nº 1)                 | MFA TOTP obrigatório; sem `aal2` o banco não entrega nada ao admin                                                                           | `supabase/migrations/20261016…`, `/mfa`, `session.ts`  | PGlite: teste novo passa; sem a migração, o teste **falha** |
| Senha curta para login de fator único           | Mínimo de **15** caracteres em senhas novas, sem regra de composição, com dica de frase                                                      | `src/lib/admin/schemas.ts`, tela `/acesso`             | teste unitário                                              |
| Cookie de sessão legível por JavaScript         | `HttpOnly` + `Secure` (produção) + `SameSite=Lax`                                                                                            | `src/lib/supabase/config.ts`, proxy e cliente servidor | typecheck; conferir no navegador (checklist)                |
| Token Meta sem vínculo com a conexão (L4)       | AAD = id da conexão; token copiado para outra conexão não abre                                                                               | `src/lib/crypto/token-cipher.ts`                       | teste unitário                                              |
| Rotação de chave exigia reconectar a Meta       | Chaveiro com versão atual + anterior; cada token é recifrado com a chave nova na próxima leitura                                             | `src/server/crypto/tokens.ts`                          | teste unitário                                              |
| Sem registro de eventos para alertas            | Linha JSON `{"tag":"security"}` em login (falha/sucesso/limite), MFA, link de acesso e cron não autorizado; e-mail só como impressão digital | `src/server/security/log.ts`                           | teste unitário                                              |
| Sem análise de dependências e de segredos no CI | Job `security`: `pnpm audit --prod --audit-level=high` + gitleaks no histórico inteiro (binário oficial com checksum)                        | `.github/workflows/ci.yml`                             | roda no próximo push                                        |
| Actions do CI por tag                           | Fixadas por **SHA** de commit; token do workflow só leitura                                                                                  | `.github/workflows/ci.yml`                             | —                                                           |
| Sem atualização automática de dependências      | Dependabot semanal (npm + GitHub Actions)                                                                                                    | `.github/dependabot.yml`                               | —                                                           |

Já resolvidos na Fase 8: cabeçalhos (CSP, HSTS, frame-ancestors), demonstração bloqueada em
produção, paginação da Meta presa ao host da Graph API, tag GCM de 16 bytes, mensagens
neutras, `server-only` nas actions.

### Situação por categoria depois do módulo

| Categoria       | Antes       | Depois do código            | Depois do checklist manual |
| --------------- | ----------- | --------------------------- | -------------------------- |
| Autenticação    | risco médio | ok (MFA admin, senha 15)    | ok + limite por IP         |
| Autorização     | ok          | ok (aal2 no banco)          | ok                         |
| Entrada/saída   | ok          | ok                          | ok                         |
| Sessão          | risco médio | ok (HttpOnly/Secure)        | ok + token de 15 min       |
| Criptografia    | risco médio | ok (AAD, rotação)           | ok                         |
| Segredos        | risco médio | risco médio                 | ok (escopo das variáveis)  |
| Configuração    | ok          | ok                          | ok                         |
| Dependências    | risco médio | ok (SCA + Dependabot + SHA) | ok                         |
| Logs e detecção | risco alto  | risco médio (eventos)       | ok (drain + alertas)       |
| LGPD            | risco médio | risco médio                 | ok (documentos + DPAs)     |

## 2. Checklist manual

Marque na ordem. **A** é para fazer agora, no projeto de testes. **B** é para a virada
para a conta da empresa (junto com `go-live.md`). **C** é rotina.

### A. Agora (projeto de testes)

1. **Supabase → Authentication → Multi-Factor**: confirmar que **TOTP** está ligado
   (_enabled_). Sem isso a migração do passo 2 tranca o admin fora.
2. **SQL Editor**: rodar `supabase/migrations/20261016120000_admin_requires_mfa.sql` e
   depois `supabase/tests/rls_isolation.sql` → deve terminar com "OK".
3. Entrar no site com o admin → a tela **/mfa** abre → instalar Google Authenticator (ou
   Microsoft Authenticator / 1Password) → **Configurar aplicativo** → escanear → digitar o
   código. Sair e entrar de novo: deve pedir só o código.
4. **Supabase → Authentication → Sign In / Providers**:
   - desligar **Allow new users to sign up** e **Anonymous sign-ins**;
   - **Minimum password length: 15**, sem exigência de tipos de caractere;
   - **Leaked password protection**: ligar (exige plano Pro; anotar se não houver).
5. **Supabase → sessões/JWT**: _access token expiry_ (JWT expiry) = **900 segundos**. Se o
   plano permitir: _inactivity timeout_ 7 dias e _time-box_ 30 dias.
6. **Vercel → Settings → Environment Variables**: deixar `SUPABASE_SECRET_KEY`,
   `TOKEN_ENCRYPTION_KEY`, `META_APP_SECRET` e `CRON_SECRET` **só em Production** (desmarcar
   Preview e Development). **Settings → Deployment Protection**: ligar para as prévias.
7. **Vercel → Firewall → Rules**: regra _Rate limit_ para `POST` em `/login`, `/acesso` e
   `/mfa`: **10 por minuto por IP**, ação _Deny_. Se o plano não tiver, anotar o risco.
8. **GitHub → Settings → Code security**: ligar **Dependabot alerts** e **security
   updates**; **Secret scanning + push protection** se disponível para o repositório.
   **Settings → Branches**: proteger `main` exigindo os jobs `check` e `security`.
9. Depois do push, conferir na aba **Actions** que o job `security` passou. Se o gitleaks
   acusar algo, **não apague o aviso**: me mande o nome da regra e o arquivo (não o valor).

### B. Na virada para a conta da empresa

10. Supabase **Pro** (backup PITR, proteção de senha vazada, logs por 7 dias) e região
    **São Paulo (`sa-east-1`)**. **Database → Network restrictions**: liberar só os IPs
    necessários (ou nenhum, se ninguém conecta direto no Postgres).
11. Vercel **Pro** (o plano Hobby não permite uso comercial; traz Firewall e retenção de
    logs). Repetir os passos 4–8 no projeto de produção.
12. **Log drain** (Vercel → Integrations: Better Stack, Axiom ou Datadog) com retenção de 90
    dias e os alertas da tabela da seção 4.
13. Cada admin cadastra o próprio aplicativo autenticador no primeiro acesso. Ter **dois
    admins** para um cobrir o outro na perda do celular.
14. LGPD (seção 5): aviso de privacidade e termos revisados por advogado, DPAs da Supabase
    e da Vercel aceitos, cláusula de operador no contrato com os clientes.
15. Revogar o token Meta de testes; gerar o de produção só no site de produção.

### C. Rotina

| Quando            | O quê                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Toda semana       | Triar PRs do Dependabot. Crítica/alta: corrigir em até **7 dias**; demais, no mês.              |
| Todo mês          | Ler Administração → Auditoria e os alertas do mês.                                              |
| A cada 3 meses    | Testar restauração de backup (PITR) num projeto descartável.                                    |
| A cada 6–12 meses | Girar `TOKEN_ENCRYPTION_KEY` (procedimento abaixo), o token Meta e a chave secreta do Supabase. |
| Saída de pessoa   | Remover o acesso dela, girar as chaves que ela viu (`go-live.md`).                              |

## 3. Procedimentos

### Perda do celular do admin (MFA)

1. Outro admin (ou o responsável técnico) entra no Supabase → **Authentication → Users** →
   abre o usuário → **MFA factors** → remove o fator TOTP.
2. A pessoa entra com a senha e cadastra o aplicativo de novo na tela /mfa.
3. Registrar o ocorrido (quem pediu, quando) — é uma ação sensível.

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

| Suspeita                   | Primeira hora                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Token Meta                 | Business Manager → Usuários do sistema → **Revogar tokens**; gerar outro e reconectar. |
| Chave secreta do Supabase  | Supabase → API Keys → girar a secret key; atualizar na Vercel; redeploy.               |
| `TOKEN_ENCRYPTION_KEY`     | Revogar o token Meta (acima) e girar a chave (procedimento acima).                     |
| Conta de admin             | Remover o fator MFA e trocar a senha; revisar a Auditoria das últimas 72 h.            |
| Dados de clientes expostos | Avaliar comunicação à ANPD e aos titulares (LGPD art. 48) com o jurídico.              |

## 4. Alertas recomendados (log drain)

Filtro base: linhas com `"tag":"security"`.

| Alerta                       | Condição                                                   | Gravidade |
| ---------------------------- | ---------------------------------------------------------- | --------- |
| Tentativas de senha em massa | ≥ 20 `login.failed` em 5 min (ou ≥ 5 para a mesma `email`) | Alta      |
| Código MFA errado repetido   | ≥ 5 `mfa.failed` do mesmo `user` em 10 min                 | Alta      |
| Cron chamado sem a chave     | qualquer `cron.unauthorized`                               | Média     |
| Sincronização parada         | nenhuma linha `[cron] sync` com `"synced"` > 0 em 36 h     | Média     |
| Novo dispositivo de MFA      | qualquer `mfa.enrolled`                                    | Média     |
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

- Auditoria **antes** da alteração (L5) — hoje grava depois; baixo risco.
- Permissões por coluna para usuários de cliente (I2) — nada atravessa clientes hoje.
- CSP sem `'unsafe-inline'` — incompatível com o Partial Prerendering (ADR-015).
- Chave de criptografia no Supabase Vault/KMS em vez de variável de ambiente.
- Varredura dinâmica (OWASP ZAP baseline) contra as prévias no CI.
- MFA opcional também para usuários de cliente.
