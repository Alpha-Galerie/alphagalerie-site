# Cardápio para o 99 Food

Três recusas até aqui:

1. Mandamos o link da loja. O catálogo do site tem bong, cachimbo, CBD e
   esotérico, que o marketplace não aceita.
2. Mandamos um cardápio com bebida, tabaco, seda, essência e acessório. A
   resposta foi *"Menu não criado - grocery store: o estabelecimento não
   pertence ao segmento de restaurantes (ex: mercado, adega...)"* — lista de
   conveniência não passa por cardápio.

3. Mandamos um cardápio só de bebida. Mesmo texto de recusa.

A leitura é que o sistema não enxerga comida nenhuma no cardápio. Por isso o
cardápio agora abre com **Aperitivos** — batata frita, nuggets e amendoim
japonês —, que é a primeira coisa que o analista vê. Fumo e acessório ficaram
de fora por decisão: incluí-los de novo é reabrir o motivo da recusa.

## As porções não saem do catálogo do site

Batata frita, nuggets e amendoim não existem em `produtos` — o site vende
produto de prateleira, não comida. Estão escritos direto em
`src/lib/cardapio99.ts`, com preço fechado, e aparecem sempre disponíveis.
Mudou o preço ou entrou porção nova, é lá que se mexe.

## Sem endereço, sem telefone, sem o nome da loja

No aplicativo a operação atende por outro nome. O cardápio não leva endereço,
telefone, e-mail nem horário: só a logo do delivery, os itens e os preços. O que
identifica a loja fica no cadastro do marketplace, e não pode ser contradito
aqui. A marca usada é `public/logo-cardapio.jpg`.

Vale lembrar que o endereço do link (`alphagalerie.com`) carrega o nome antigo.
Se isso for um problema na análise, mande o PDF em vez do link.

## O que mandar

- **PDF:** `cardapio-99food.pdf` — é o que anexar no cadastro.
- **Link:** `https://alphagalerie.com/cardapio-99` — página de cardápio, fora do
  índice do Google, sempre com os preços e o estoque do momento.
- **Planilha:** `cardapio-99food.csv` — categoria, item, descrição,
  preço, código do produto e link da foto.

## Como atualizar

Os arquivos desta pasta são uma fotografia do dia em que foram gerados. Para
uma versão nova, abra `/cardapio-99` e use os dois botões do topo: *Imprimir /
salvar em PDF* e *Baixar planilha (CSV)*. Sai do banco na hora, sem depender de
ninguém publicar código.

## Regras que a página aplica sozinha

- Aperitivos primeiro, depois a bebida da categoria Bebidas, dividida em sem
  álcool, cervejas e drinks, e garrafas (`src/lib/cardapio99.ts`).
- Item com estoque zerado fica de fora: no delivery o cliente paga antes de a
  gente separar o pedido, e item que acabou vira cancelamento.
- O preço é o de venda da loja, não o do Pix — no app o cliente paga por lá.
  Vale lembrar que o marketplace cobra comissão sobre esse valor.
- Foto só entra na planilha quando é link público. Parte do catálogo tem a
  imagem salva em base64 dentro do banco; esses itens precisam de foto enviada
  à mão no cadastro, e a própria página diz quantos são.

## Falta foto das porções

As três porções entram sem foto, e o marketplace cobra imagem de item. Tirar
uma foto de cada uma e subir no cadastro é o passo que falta do nosso lado.

## O que ainda pesa contra a aprovação

Os nomes no catálogo são genéricos — "CERVEJAS", "RED BULL´S", "SMIRNOFF ICE /
SKOL BEATS" como item único. Cardápio de restaurante ou bar lista item
específico, com marca e volume ("Heineken 600 ml", "Coca-Cola lata 350 ml").
Se a recusa se repetir, é por aí que vale mexer: desmembrar esses itens no
cadastro de produtos.
