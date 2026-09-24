# Cashback e "Combina com"

## Cashback

**Regra no ar:** cada R$ 1 pago em produtos vira R$ 1 de crédito, válido por
30 dias (comprou dia 24/09, usa até 24/10). O crédito paga **até 50% dos
produtos** de cada pedido.

- O cliente é identificado pelo **WhatsApp** do pedido — não precisa de login.
- O crédito só nasce quando o pedido vira **pago**, **enviado** ou **entregue**
  (webhook do Mercado Pago, pagamento de cartão ou a retaguarda confirmando o Pix).
- **Frete não gera cashback**, e o cashback usado não gera cashback de novo.
- Pedido **cancelado / recusado / reembolsado** devolve o cashback que usou e
  estorna o que gerou. Pedido Pix abandonado precisa ser cancelado na
  retaguarda para o saldo reservado voltar ao cliente.

### Mudar a regra (sem deploy)

No SQL Editor do Supabase:

```sql
-- % que volta (100 = R$ 1 vira R$ 1; 10 = 10%)
update configuracoes set valor = '100' where chave = 'cashback_percentual';

-- dias para usar
update configuracoes set valor = '30' where chave = 'cashback_validade_dias';

-- quanto do pedido o crédito pode pagar (100 = tudo; 0 = ninguém usa)
update configuracoes set valor = '50' where chave = 'cashback_uso_max_percentual';

-- desligar o programa no site (some a faixa, o carrinho e o checkout)
update configuracoes set valor = '0' where chave = 'cashback_percentual';
```

### Consultas úteis

```sql
-- saldo de um cliente
select * from consultar_cashback('11999999999');

-- créditos em aberto, do que vence primeiro
select whatsapp, saldo, expira_em, pedido_id
from cashback_creditos
where saldo > 0 and not estornado and expira_em > now()
order by expira_em;

-- quanto de cashback foi usado por mês
select date_trunc('month', criado_em) mes, sum(cashback_usado)
from pedidos where cashback_usado > 0 group by 1 order by 1;
```

## "Combina com"

No carrinho e na página do produto o site oferece o complemento natural:

| Levou     | Oferece                        |
|-----------|--------------------------------|
| Seda      | piteira, isqueiro, tabaco      |
| Piteira   | seda, isqueiro, tabaco         |
| Tabaco    | seda, piteira, isqueiro        |
| Isqueiro  | seda, piteira, tabaco          |
| Blunt     | isqueiro, triturador           |
| Essência  | carvão                         |
| Charuto   | isqueiro                       |

Um produto por tipo, até três. Dentro de cada tipo, **o produto marcado como
destaque na retaguarda vem primeiro**; sem destaque, vai a promoção e depois o
mais barato (a BIC do lado do caixa). As regras ficam em `src/lib/sugestoes.ts`.
