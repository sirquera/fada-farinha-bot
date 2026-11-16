# Fada Farinha Bot · Central de Pedidos

Servidor que recebe as mensagens do WhatsApp das lojas pela Z-API (webhook "Ao receber") e guarda,
numa lista única, os pedidos e orçamentos enviados pelo cardápio digital.

## O que faz
- `POST /webhook`: recebe as mensagens da Z-API. Mensagens do cardápio ("✅ PEDIDO CONFIRMADO" / "🟡 SÓ ORÇAMENTO")
  viram um registro com loja, cliente, itens, data, valor e situação. Imagem de um cliente com pedido aberto é
  guardada como anexo; só na Mogi (única loja que pede sinal via Pix) ela fica marcada como comprovante a conferir (`comprovante_a_conferir: true`).
- `GET /pedidos?loja=&situacao=&desde=`: lista os pedidos (cabeçalho `x-api-key: CENTRAL_TOKEN`).
- `PATCH /pedidos/:id`: atualiza `situacao`, `comanda`, `sinal_conferido`, `comprovante_a_conferir`,
  `observacao_loja`, `impresso_vias` (mesmo cabeçalho).
- Situações: orcamento, pedido, sinal_pago, comanda_criada, impresso, entregue, cancelado.
- A resposta automática com IA fica desligada; só liga com `BOT_IA=on`.

## Variáveis no Railway
| Variável | Exemplo | Para quê |
| --- | --- | --- |
| `CENTRAL_TOKEN` | uma senha longa | protege `/pedidos` |
| `INSTANCIAS_LOJAS` | `{"ID_DA_INSTANCIA_MOGI":"Mogi"}` | diz de qual loja é cada conexão Z-API |
| `DATA_DIR` | `/data` | pasta do volume do Railway onde fica `pedidos.json` |
| `BOT_IA` | (vazio) | `on` religa a resposta automática com IA |
| `ANTHROPIC_API_KEY`, `ZAPI_INSTANCE`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN` | | só usados pelo modo IA |

No Railway, crie um **Volume** montado em `/data`, senão a lista some a cada novo deploy.

## Testes
`npm test`
