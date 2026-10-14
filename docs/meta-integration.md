# Integração Meta Ads (Marketing API)

Levantamento da Fase 1 (outubro de 2026). **Nada aqui está validado contra uma conta
real ainda** — a integração só será considerada concluída na Fase 6, após uma consulta
autorizada cujos números batam com o Gerenciador de Anúncios.

## Versão da API

- Versões vigentes: **v25.0** (fev/2026, expira jul/2028) e **v26.0** (lançada em
  29/07/2026). A v24.0 expirou em 06/10/2026.
- Notas de terceiros indicam que algumas mudanças da v26 passam a valer **em todas as
  versões** a partir de 27/10/2026 — conferir no
  [changelog oficial](https://developers.facebook.com/docs/graph-api/changelog/versions/)
  antes de fixar a versão.
- A versão fica em uma única variável (`META_GRAPH_API_VERSION`) e é gravada em cada
  linha de métrica (`api_version`).

## App e autorização

| Item                          | Requisito                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tipo de app                   | **Business** no Meta for Developers, com o produto _Marketing API_.                                                                                                                                                                                                                                              |
| Login                         | **Facebook Login for Business** com `config_id` (substitui `scope`).                                                                                                                                                                                                                                             |
| Token para o sync             | **System User Access Token (SUAT)** de integração de negócio: não expira por padrão, delegado explicitamente pelo cliente, ideal para servidor-a-servidor. Exige fluxo _authorization code_ (`response_type=code`, `override_default_response_type=true`) e um _business portfolio_ da agência associado ao app. |
| Troca do code                 | `GET https://graph.facebook.com/vXX.0/oauth/access_token?client_id=…&client_secret=…&code=…` — **sempre no servidor**.                                                                                                                                                                                           |
| Permissões                    | `ads_read` (leitura de insights) + `business_management` (para emitir SUAT e listar contas de negócios).                                                                                                                                                                                                         |
| Contas próprias da agência    | _Standard access_ basta — viabiliza o desenvolvimento e o uso interno.                                                                                                                                                                                                                                           |
| Contas de **outras empresas** | _Advanced Access_ em `ads_read` via **App Review**, **verificação da empresa**, e _Full access_ no Marketing API Access Tier (≥ 500 chamadas bem-sucedidas em 15 dias e < 15% de erro).                                                                                                                          |

Alternativa para o MVP interno: a agência gera manualmente um token de **System User**
no Business Manager próprio (que já tem acesso às contas dos clientes como parceira) e
o cola num formulário admin protegido. Mais simples, sem App Review, mas não escala para
autoatendimento — fica documentado como caminho de bootstrap.

## Implementação (Fase 6)

| Peça                      | Onde                                                                        |
| ------------------------- | --------------------------------------------------------------------------- |
| Cofre do token (AES-GCM)  | `src/lib/crypto/token-cipher.ts`, `src/server/crypto`                       |
| Cliente Graph API         | `src/server/integrations/meta/client.ts` (+ `api.ts`)                       |
| Resultado por campanha    | `src/lib/meta/results.ts`                                                   |
| Linha de insights → banco | `src/lib/meta/insights.ts`                                                  |
| Erros e limites           | `src/lib/meta/errors.ts`, `src/lib/meta/usage.ts`                           |
| Janela de sincronização   | `src/lib/meta/sync-window.ts` (90 dias na 1ª vez; 28 depois; até ontem)     |
| Motor por conta           | `src/server/sync/meta-account.ts`, `src/server/sync/run.ts`                 |
| Telas                     | Integrações (conectar/trocar chave/atualizar contas), Contas (buscar dados) |

Regra de **resultado**: a Meta repete o mesmo evento com nomes diferentes (`purchase`,
`omni_purchase`, `offsite_conversion.fb_pixel_purchase`…) com o **mesmo valor**; usamos a
primeira variante presente, nunca a soma. O evento vem do objetivo da campanha
(Vendas → compra, ou conversa se for o que a campanha gerou; Cadastros → cadastro ou
conversa; Engajamento → conversa; Tráfego → clique no link; Reconhecimento → sem
resultado). Com evento definido, ausência no dia = 0; sem evento, `null`.
**A conferir com o Gerenciador de Anúncios** na primeira conta real.

## Consulta de métricas

- Endpoint: `GET /{act_id}/insights` com `level=campaign`, `time_increment=1`,
  `time_range={"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}`,
  `use_unified_attribution_setting=true` (alinha com o Gerenciador de Anúncios).
- Campos MVP: `campaign_id, campaign_name, date_start, date_stop, spend, impressions,
reach, clicks, inline_link_clicks, actions, action_values, account_currency` (+ campo
  de resultados a definir na Fase 6).
- Valores chegam como **strings** → parse com Zod para `numeric`, preservando ausência
  como `null`.
- Datas retornadas estão no **fuso da conta de anúncios**.
- **Paginação** por `paging.cursors.after` / `paging.next`; o cliente percorre até o fim.
- Consultas pesadas: tentar síncrono; em timeout ou erro de volume (código 100,
  subcódigo 1487534), usar **job assíncrono** (`POST …/insights` → `report_run_id` →
  polling de `async_status` até "Job Completed" → `GET {report_run_id}/insights`).
- Alcance (métrica única) em chamada separada, conforme recomendação da Meta.
- Janela de reprocessamento: **28 dias** (a Meta informa que os dados param de mudar
  após 28 dias).
- Mudanças de 2026 a respeitar: janelas de atribuição _7-day view_ e _28-day view_
  removidas (jan/2026); retenção de 13 meses para breakdowns únicos/horários e 6 meses
  para frequência.

## Limites de requisição

- Cabeçalhos a ler em **toda** resposta: `X-FB-Ads-Insights-Throttle`
  (`app_id_util_pct`, `acc_id_util_pct`, `ads_api_access_tier`), `x-ad-account-usage`,
  `x-business-use-case-usage`.
- Erros de limite: código **4** (app), **17**, **613** / subcódigo 1487225, **80000–80014**
  (business use case). Tratamento: pausar a conta até o tempo sugerido
  (`estimated_time_to_regain_access`) e reagendar o job.
- Política própria: concorrência baixa por app, desaceleração quando utilização > 75%.

## Erros e mapeamento

| Situação                         | Detecção                                   | Ação                                                                |
| -------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| Token inválido/expirado/revogado | código 190 (subcódigos 458, 460, 463, 467) | conexão → `needs_reauth`; job → `failed` sem retry; alerta no admin |
| Permissão ausente                | código 10, 200–299                         | conexão → `error`; mensagem orientando reautorização                |
| Rate limit                       | 4, 17, 613, 80000+                         | `retry_scheduled` com backoff                                       |
| Erro temporário                  | 1, 2, HTTP 5xx, timeout                    | retry com backoff exponencial + jitter (máx. 5)                     |
| Dados muito volumosos            | 100 / 1487534                              | dividir janela ou mudar para async                                  |

Os erros são normalizados em `src/server/integrations/core/errors.ts`
(`AuthError`, `PermissionError`, `RateLimitError`, `TransientError`, `DataError`), para
que o motor de sync não conheça detalhes de cada plataforma.

## Ferramentas disponíveis neste ambiente

- O conector **"MCP META ADS WRMAX"** está conectado nesta sessão do Claude Code. Ele
  será usado **somente para conferência** (ex.: comparar totais e nomes de campos na
  Fase 6). A aplicação **não** depende dele: o produto chama a Graph API diretamente.

## Fontes

- [Insights API](https://developers.facebook.com/docs/marketing-api/insights/)
- [Insights — boas práticas e limites](https://developers.facebook.com/docs/marketing-api/insights/best-practices/)
- [Rate limiting](https://developers.facebook.com/docs/marketing-api/overview/rate-limiting/)
- [Autorização / níveis de acesso](https://developers.facebook.com/docs/marketing-api/get-started/authorization/)
- [Facebook Login for Business](https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/)
- [Versões da Graph API](https://developers.facebook.com/docs/graph-api/changelog/versions/)
