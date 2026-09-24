import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { useClubeRegras } from '../hooks/useClube';
import {
  custoCupom,
  formatarPontos,
  formatarReais,
  percentualDeVolta,
  valorDosPontos,
  type ClubeRegras,
} from '../lib/clube';
import styles from './ClubeRegulamento.module.css';

// Enquanto as regras carregam, o texto usa os valores de lançamento do clube;
// assim a página nunca aparece vazia nem com números errados por muito tempo.
const PADRAO: ClubeRegras = {
  ativo: true,
  nome: 'Alpha Club',
  pontosPorReal: 1,
  valorPonto: 0.1,
  validadeDias: 365,
  checkoutMaxPercentual: 10,
  cupomValores: [5, 10],
  cupomValidadeDias: 30,
  cupomMinimoMultiplicador: 3,
  bonusBoasVindas: 50,
  bonusAniversario: 100,
  bonusIndicacao: 100,
};

/** Regulamento do Alpha Club. Os números saem da configuração da retaguarda. */
export default function ClubeRegulamento() {
  const carregadas = useClubeRegras();
  const r = carregadas ?? PADRAO;
  const volta = percentualDeVolta(r).toLocaleString('pt-BR');
  const exemploCompra = 100;
  const exemploPontos = Math.floor(exemploCompra * r.pontosPorReal);
  const cupomExemplo = r.cupomValores[r.cupomValores.length - 1] ?? 10;

  useEffect(() => {
    const anterior = document.title;
    document.title = `${r.nome} — regulamento | ALPHA GALERIE`;
    return () => { document.title = anterior; };
  }, [r.nome]);

  return (
    <>
      <header className={styles.topo}>
        <Link to="/" className={styles.voltar}>← Voltar para a loja</Link>
      </header>

      <main id="main-content" className={styles.main}>
        <p className={styles.eyebrow}>Programa de cashback e fidelidade</p>
        <h1 className={styles.titulo}>
          {r.nome}: <em>regras e funcionamento</em>
        </h1>
        <p className={styles.lead}>
          O {r.nome} recompensa você em todas as compras na Alpha Galerie: seus gastos viram pontos,
          e os pontos viram desconto de verdade.
        </p>

        {carregadas && !carregadas.ativo && (
          <p className={styles.pausa}>
            O programa está pausado no momento. Seus pontos continuam guardados e voltam a valer quando ele reabrir.
          </p>
        )}

        <section className={styles.bloco}>
          <h2>📜 Regras gerais</h2>
          <ul>
            <li>Você entra no programa ao fazer a primeira compra pelo site, identificado pelo seu WhatsApp.</li>
            <li>Os pontos são pessoais e intransferíveis.</li>
            <li>Pontos não podem ser trocados por dinheiro nem transferidos para outro número.</li>
            <li>Em caso de fraude, mau uso ou tentativa de manipulação, a loja pode cancelar o saldo de pontos sem aviso prévio.</li>
            <li>O programa pode ser alterado, suspenso ou encerrado a qualquer momento, sem aviso prévio.</li>
          </ul>
        </section>

        <section className={styles.bloco}>
          <h2>💸 Como funciona o cashback</h2>
          <ul>
            <li>Cada R$ 1 pago em produtos = {formatarPontos(r.pontosPorReal)} (o frete não conta).</li>
            <li>Na prática, você recebe <strong>{volta}% de volta</strong> em todas as compras.</li>
            <li>Os pontos entram assim que o pagamento é confirmado e ficam disponíveis para descontos nas próximas compras.</li>
          </ul>
          <p className={styles.exemplo}>
            Exemplo: numa compra de {formatarReais(exemploCompra)} você acumula {formatarPontos(exemploPontos)},
            que valem {formatarReais(valorDosPontos(exemploPontos, r))} em desconto.
          </p>
        </section>

        <section className={styles.bloco}>
          <h2>🔁 Duas formas de usar seus pontos</h2>

          <h3>1. Direto no checkout</h3>
          <p>
            Ao finalizar o pedido com o seu WhatsApp, o saldo aparece e pode ser usado na hora. O desconto vai até
            {' '}<strong>{r.checkoutMaxPercentual}% dos produtos</strong>, limitado aos pontos que você tem.
          </p>
          <p className={styles.exemplo}>
            Exemplo: você tem {formatarPontos(100)} ({formatarReais(valorDosPontos(100, r))}) e um carrinho de {formatarReais(120)}:
            o desconto é de {formatarReais(Math.min(valorDosPontos(100, r), 120 * r.checkoutMaxPercentual / 100))}.
          </p>

          {r.cupomValores.length > 0 && (
            <>
              <h3>2. Trocando por cupom</h3>
              <p>Na página inicial, em “Consulte seus pontos”, você troca pontos por cupons de valor fixo:</p>
              <ul>
                {r.cupomValores.map((v) => (
                  <li key={v}>Cupom de {formatarReais(v)} → {formatarPontos(custoCupom(v, r))}</li>
                ))}
              </ul>
              <ul>
                <li>O cupom vale {r.cupomValidadeDias} dias corridos depois da troca e é de uso único.</li>
                <li>
                  Só pode ser usado com o mesmo WhatsApp e em carrinho de no mínimo
                  {' '}{r.cupomMinimoMultiplicador.toLocaleString('pt-BR')}× o valor do cupom.
                  Exemplo: cupom de {formatarReais(cupomExemplo)} → carrinho a partir de
                  {' '}{formatarReais(cupomExemplo * r.cupomMinimoMultiplicador)}.
                </li>
              </ul>
            </>
          )}
        </section>

        <section className={styles.bloco}>
          <h2>🚫 Regras importantes sobre o uso</h2>
          <ul>
            <li>Os pontos não podem ser usados em produtos que já estão em promoção.</li>
            <li>O desconto dos pontos não soma com cupons de desconto: escolha um dos dois em cada pedido.</li>
            <li>Os pontos não podem ser convertidos em dinheiro.</li>
            <li>Se um pedido for cancelado, os pontos que ele usou voltam para você e os que ele gerou saem do saldo.</li>
          </ul>
        </section>

        <section className={styles.bloco}>
          <h2>⏳ Validade dos pontos</h2>
          <ul>
            <li>Cada lote de pontos vale {r.validadeDias} dias, contados a partir do dia em que foi gerado.</li>
            <li>Pontos ganhos hoje vencem em {r.validadeDias} dias; pontos ganhos amanhã vencem em {r.validadeDias} dias a partir de amanhã.</li>
            <li>Quando você usa pontos, os que vencem primeiro saem primeiro.</li>
          </ul>
        </section>

        {(r.bonusBoasVindas > 0 || r.bonusAniversario > 0 || r.bonusIndicacao > 0) && (
          <section className={styles.bloco}>
            <h2>🎁 Bonificações extras</h2>
            {r.bonusBoasVindas > 0 && (
              <>
                <h3>🎉 Boas-vindas</h3>
                <p>
                  Na sua primeira compra paga você entra no {r.nome} e ganha {formatarPontos(r.bonusBoasVindas)} de
                  boas-vindas, além dos pontos da compra. A pontuação de boas-vindas pode mudar sem aviso prévio.
                </p>
              </>
            )}
            {r.bonusAniversario > 0 && (
              <>
                <h3>🎂 Aniversário</h3>
                <p>
                  No mês do seu aniversário você recebe {formatarPontos(r.bonusAniversario)}
                  {' '}({formatarReais(valorDosPontos(r.bonusAniversario, r))} em desconto). Informe o dia e o mês no checkout;
                  o presente entra quando você consultar seus pontos ou fizer um pedido no mês.
                </p>
              </>
            )}
            {r.bonusIndicacao > 0 && (
              <>
                <h3>🤝 Indique e ganhe</h3>
                <p>
                  Indique um amigo e ganhe {formatarPontos(r.bonusIndicacao)} ({formatarReais(valorDosPontos(r.bonusIndicacao, r))})
                  para usar nas próximas compras. Como funciona:
                </p>
                <ul>
                  <li>Seu amigo não pode ser cliente da loja.</li>
                  <li>No checkout, ele informa o seu WhatsApp em “Quem te indicou?”.</li>
                  <li>Quando a primeira compra dele for paga, os pontos entram no seu saldo.</li>
                </ul>
              </>
            )}
          </section>
        )}

        <section className={styles.bloco}>
          <h2>👤 Quem pode participar</h2>
          <p>
            Todo cliente que compra pelo site com o seu WhatsApp participa automaticamente do {r.nome} a partir
            da primeira compra paga.
          </p>
        </section>

        <a href="/#clube" className={styles.cta}>Consultar meus pontos →</a>
      </main>

      <Footer />
    </>
  );
}
