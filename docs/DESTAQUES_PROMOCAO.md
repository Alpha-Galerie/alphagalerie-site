# Vitrine de Destaques + Preço promocional

Como funciona a seção "Destaques" da home e a promoção de/por — no site e na retaguarda.

## No site (alphagalerie.com)

Logo abaixo do hero, antes da vitrine completa, existe a seção **Destaques**
(`#destaques`). Ela mostra até **8 produtos** marcados como destaque:

- produtos **em promoção aparecem primeiro**, do maior desconto para o menor;
- cada card em promoção ganha o selo **-X%** e o preço cheio riscado;
- produto sem estoque (e sem variação disponível) **não entra** na vitrine;
- se nenhum produto estiver marcado como destaque, a seção **some** da home;
- no celular a vitrine vira um carrossel horizontal, para não empurrar o
  catálogo para baixo.

O botão "Ver toda a vitrine" leva para a vitrine completa (`#produtos`).

## Campos no banco (`produtos`)

| Campo | O que é |
|---|---|
| `destaque` | Liga/desliga o produto na vitrine de destaques |
| `destaque_ordem` | Ordem manual da vitrine (menor primeiro); desempate depois do desconto |
| `preco` | Preço cheio — é o valor riscado quando há promoção |
| `preco_promocional` | Preço "por". Vazio = sem promoção. Só vale se for **menor** que `preco` |
| `preco_pix` | Preço à vista no Pix. Só aparece se for menor que o preço de venda |

A regra de preço fica num lugar só: `src/lib/preco.ts` (`getPrecoInfo`), usada
pelo card, pela página do produto, pelos modais e pelo carrinho. O desconto do
selo é calculado de `preco` para o preço de venda (o Pix não entra na conta).

Migration: `supabase/migrations/20260917000000_add_preco_promocional.sql`.

## Na retaguarda

Na aba **Produtos**:

- botão **★** em cada linha: coloca/tira o produto da vitrine de destaques na hora;
- filtro **TODA A VITRINE**: mostrar só destaques ou só promoções;
- a coluna Preço mostra `PROMO: R$ x (-y%)` quando o produto está em promoção.

No modal do produto:

- campo **Preço promocional (de/por)** — vazio = sem promoção;
- o aviso embaixo do campo mostra como vai sair no site, ou avisa se a promoção
  não for menor que o preço normal (nesse caso o site ignora e o salvamento é
  bloqueado);
- o **Preço Pix** passa a ser calculado sobre o preço promocional quando existe;
- checkbox **Destaque** continua sendo o que coloca o produto na vitrine.

## Para desencalhar produto parado

1. Na retaguarda, filtre por categoria e ache o produto parado.
2. Abra o produto, preencha o **preço promocional** e salve.
3. Clique no **★** para jogar ele na vitrine de destaques da home.

Ele passa a aparecer no topo da home, com selo de desconto e preço riscado.
