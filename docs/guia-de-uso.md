# Guia de uso

Como o WRMax Metrics é usado no dia a dia, quem faz o quê e em que ordem. Cada item diz
se **já funciona** (com dados simulados) ou se **depende de uma fase futura**.

## Quem usa

Só dois tipos de pessoa (ADR-009):

| Pessoa                          | Papel no sistema | O que vê                                                 |
| ------------------------------- | ---------------- | -------------------------------------------------------- |
| Agência (dono / administrador)  | `admin`          | Todos os clientes + área de Administração                |
| Cliente final (ex.: a pizzaria) | `client`         | Só os próprios dados; não escolhe cliente nem administra |

## Fluxo de atividades

```
 AGÊNCIA (uma vez por cliente)          SISTEMA (todo dia, sozinho)        CLIENTE (quando quiser)
 ─────────────────────────────          ───────────────────────────        ───────────────────────
 1. Conecta a Meta                ──►   4. Às 06:10 busca as métricas ──►  6. Recebe o convite e entra
 2. Cadastra o cliente                     dos últimos 28 dias             7. Abre a Visão geral:
    (objetivo + meta de custo)          5. Marca falhas e avisa a             "meu investimento está
 3. Associa as contas de anúncio           agência                            dando resultado?"
    e convida o cliente                                                    8. Consulta Campanhas
                                        AGÊNCIA (rotina)
                                        ─ confere Sincronizações e
                                          "Contas que precisam de atenção"
                                        ─ analisa clientes e campanhas
```

### 1–3. Configuração pela agência

| Passo                                       | Onde                        | Hoje                     |
| ------------------------------------------- | --------------------------- | ------------------------ |
| Conectar a conta Meta Business              | Administração → Integrações | Só visualização · Fase 6 |
| Cadastrar cliente, objetivo e meta de custo | Administração → Clientes    | Funciona                 |
| Associar contas de anúncio ao cliente       | Administração → Contas      | Funciona                 |
| Criar o login do cliente                    | Administração → Acessos     | Funciona                 |

O **objetivo** (vendas, conversas ou cadastros) define o "resultado principal" da Visão
geral. A **meta de custo** liga o selo Saudável / Atenção / Crítico. Sem eles, o sistema
usa o tipo de resultado com mais investimento e não mostra selo.

**Login do cliente, passo a passo**

1. Administração → Acessos → **Criar acesso de cliente** (nome, e-mail, cliente).
2. O sistema mostra um **link de uso único**. Copie e envie à pessoa (ex.: WhatsApp). O link
   não fica salvo: se perder ou expirar, use **Novo link** na lista.
3. A pessoa abre o link, cria a própria senha e já entra vendo só o cliente dela.
4. Esqueceu a senha? **Novo link** na lista de acessos. Para cortar o acesso: lixeira
   (**Remover acesso**). Tudo fica registrado em Auditoria.

Nenhum e-mail é enviado pelo sistema: quem entrega o link é a agência.

### 4–5. Atualização automática

- Todo dia **entre 6h e 7h** (horário de Brasília) o sistema busca na Meta os últimos 28
  dias (a Meta corrige números de dias anteriores), para cada conta com **Atualização:
  Diária** em Administração → Contas de anúncio. Ao associar uma conta a um cliente, a
  atualização diária liga sozinha; o interruptor permite pausar. **Buscar dados** continua
  funcionando a qualquer hora.
- Uma conta já atualizada no dia não é buscada de novo. Em falha temporária (limite da
  Meta, instabilidade), o sistema tenta de novo nas execuções seguintes, esperando cada vez
  mais; após **5 falhas seguidas** ele para de tentar sozinho até um "Buscar dados" dar
  certo. Chave da Meta inválida marca a conexão para reconectar.
- Se uma conta falhar, os dados anteriores são mantidos, o cliente vê "Atualizado em…"
  com a data real, e a falha aparece para a agência em:
  - **Administração → Integrações** ("Contas que precisam de atenção");
  - **Administração → Sincronizações** (histórico e retentativas).
- Toda ação administrativa fica registrada em **Administração → Auditoria**.

### 6–8. Uso pelo cliente (e pela agência)

**Visão geral** (`/dashboard`) — já funciona:

1. Escolha o período nos chips **7 dias · 30 dias · Mês atual** (ou um período
   personalizado em Detalhes).
2. Leia a **frase-resumo**: quanto investiu, quantos resultados, quanto custou cada um e
   se ficou mais caro ou mais barato que o período anterior.
3. Olhe os **4 números**: Investimento, Resultado principal, Custo por resultado e
   Retorno (quando há vendas) ou Pessoas alcançadas. **Toque num número** para abrir a
   explicação, o gráfico por dia e as métricas técnicas.
4. Use as abas:
   - **Funil** — quantas pessoas viram, clicaram e converteram;
   - **Anúncios** — anúncios campeões e ranking de campanhas;
   - **Detalhes** — métricas técnicas (CPM, CPC…), melhor dia da semana, resultados por
     tipo, período personalizado.
5. Atenção aos avisos: selo de saúde contra a meta, alerta de **frequência alta** (a
   mesma pessoa vendo o anúncio mais de 3,5 vezes, sinal de público cansado) e falha de
   atualização.

**Campanhas** (`/campaigns`) — já funciona: lista de todas as campanhas do cliente no
período, com busca por nome, filtro Ativas / Pausadas e ordenação por coluna. No celular
vira uma lista de cartões.

**Trocar de cliente** (só agência): seletor no topo do menu lateral. O cliente não vê
seletor — só o nome do próprio negócio. O cliente e o
período escolhidos acompanham a navegação entre as telas.

## Como usar hoje

### Com o Supabase (login real)

Uma vez só:

1. Aplique as migrações de `supabase/migrations` no **SQL Editor** (ver
   `docs/data-model.md`).
2. Crie o seu usuário em **Supabase → Authentication → Users → Add user → Create new
   user** (e-mail + senha, marque **Auto Confirm User**). A senha fica só com você.
3. No terminal: `pnpm db:seed --admin-email seu@email.com`. Isso cria a agência, liga você
   como administrador e carrega os clientes de demonstração (com o selo "Dados simulados").

Depois: `pnpm dev`, abra o endereço e entre com o seu e-mail e senha. Para atualizar a
demonstração até ontem, rode o `pnpm db:seed` de novo (não duplica nada).

### Sem o Supabase (modo demonstração)

Se o `.env.local` não tiver as chaves do Supabase, o app roda só com a simulação:

1. Rode `pnpm dev` e, na tela de login, clique em **Explorar com dados simulados**.
2. Você entra como **Ana Administradora** (agência).
3. Para ver o que o cliente vê: menu do usuário (rodapé do menu lateral) →
   **Visualizar como cliente**. Você vira **Carla (Auto Center)**, que só enxerga o Auto
   Center Modelo. Para voltar: **Voltar para a visão da agência**.

Clientes de demonstração:

| Cliente                  | O que demonstra                                                    |
| ------------------------ | ------------------------------------------------------------------ |
| Pizzaria Demonstração    | Vendas online: Retorno, funil de 5 etapas, anúncios campeões, meta |
| Auto Center Modelo       | Objetivos misturados (sem objetivo cadastrado)                     |
| Clínica Exemplo          | Conversas no WhatsApp e falha de atualização                       |
| Imobiliária Demonstração | Cliente sem dados (estado vazio)                                   |

Tudo que é simulado mostra o selo **Dados simulados** no topo.
