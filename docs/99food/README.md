# Cardápio para o 99 Food

O cadastro foi reprovado quando mandamos o link da loja inteira: o catálogo do
site tem bong, cachimbo, CBD e esotérico, que o marketplace não aceita. O que
vale para o delivery é o recorte deste cardápio — bebidas, tabaco, seda,
essência de narguile, alumínio, carvão, isqueiro, filtro e piteira.

## O que mandar

- **Link:** `https://alphagalerie.com/cardapio-99` — página de cardápio, fora do
  índice do Google, sempre com os preços e o estoque do momento.
- **PDF:** `cardapio-alpha-galerie-99food.pdf` — para anexar no cadastro.
- **Planilha:** `cardapio-alpha-galerie-99food.csv` — categoria, item, descrição,
  preço, código do produto e link da foto.

## Como atualizar

Os arquivos desta pasta são uma fotografia do dia em que foram gerados. Para
uma versão nova, abra `/cardapio-99` e use os dois botões do topo: *Imprimir /
salvar em PDF* e *Baixar planilha (CSV)*. Sai do banco na hora, sem depender de
ninguém publicar código.

## Regras que a página aplica sozinha

- Só entra o que está nas seções liberadas (`src/lib/cardapio99.ts`).
- Item com estoque zerado fica de fora: no delivery o cliente paga antes de a
  gente separar o pedido, e item que acabou vira cancelamento.
- O preço é o de venda da loja, não o do Pix — no app o cliente paga por lá.
  Vale lembrar que o marketplace cobra comissão sobre esse valor.
- Foto só entra na planilha quando é link público. Parte do catálogo tem a
  imagem salva em base64 dentro do banco; esses itens precisam de foto enviada
  à mão no cadastro, e a própria página diz quantos são.
