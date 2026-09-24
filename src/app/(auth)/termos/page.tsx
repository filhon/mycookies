import type { Metadata } from "next";
import {
  PaginaDeTexto,
  type SecaoDeTexto,
} from "@/components/auth/PaginaDeTexto";
import { RESPONSAVEL } from "../responsavel";

export const metadata: Metadata = { title: "Termos de uso · Rende" };

/**
 * As seções nasceram na spec 027 (3.5) e cresceram com o que a 028 (3.10), a
 * 029 (3.8) e a 032 (3.8) mandaram afirmar. O texto é de 2026-09-24, escrito
 * sob a lei brasileira (CDC, Decreto 7.962/2013, Marco Civil, LGPD), e espera
 * a revisão de um advogado antes do deploy (`DECISOES.md#d171`). Os números
 * que o texto promete (14 dias, 7 de folga, 30 da purga, 5 ajudantes) são as
 * constantes de `domain/`; mudou lá, muda aqui.
 */
const SECOES: SecaoDeTexto[] = [
  {
    titulo: "Quem presta o serviço",
    paragrafos: [
      `O Rende é oferecido por ${RESPONSAVEL.nome}, pessoa física, inscrita no CPF sob o nº ${RESPONSAVEL.cpf}, com endereço para correspondência em ${RESPONSAVEL.endereco}. Neste texto, "nós" é essa pessoa, e "você" é quem cria uma conta no Rende.`,
      `Para qualquer assunto destes termos, inclusive reclamação, cancelamento ou pedido de reembolso, o contato é ${RESPONSAVEL.email}. Respondemos em até cinco dias úteis.`,
      'Ao marcar a caixa "Li e aceito" no cadastro, você declara que tem 18 anos ou mais, que leu estes termos e a política de privacidade, e que concorda com eles. Se usar o Rende em nome de um negócio, você declara que pode aceitá-los por ele.',
    ],
  },
  {
    titulo: "O que o Rende é, e o que não é",
    paragrafos: [
      "O Rende é um aplicativo para quem produz doces e comida por encomenda: calcula quanto custa cada receita a partir dos ingredientes que você cadastra, sugere um preço de venda, organiza pedidos, a despensa e o caixa, e, no plano Completo, publica um cardápio com link de pedido e deixa você convidar ajudantes.",
      "O Rende não é contador, nem consultoria financeira, fiscal ou jurídica, e não emite nota fiscal. O preço sugerido é o resultado de uma conta feita com os números que você informou: é uma sugestão, e a decisão de quanto cobrar é sempre sua. Se um custo, uma quantidade ou uma margem estiver errado no cadastro, o resultado também estará.",
      "O Rende funciona sem internet e guarda no seu aparelho o que você faz enquanto está offline, enviando tudo quando a conexão volta. Se o aparelho for perdido, formatado ou tiver os dados do navegador apagados antes de reconectar, o que ainda não foi enviado se perde junto.",
    ],
  },
  {
    titulo: "A sua conta, a sua senha e a responsabilidade por elas",
    paragrafos: [
      "Você se compromete a informar dados verdadeiros no cadastro e a manter sua senha em segredo. Tudo o que for feito com o seu login presume-se feito por você. Se suspeitar que alguém usou sua conta, troque a senha e nos avise pelo e-mail da seção 1.",
      "No plano Completo, você pode convidar até cinco ajudantes para a sua conta. A ajudante entra com login próprio e vê e altera o que o Rende deixa uma ajudante ver e alterar; o caixa, a configuração e a assinatura continuam só seus. Você é responsável por quem convida, por ter autorização para informar o e-mail dessa pessoa e por tirar o acesso de quem não deve mais tê-lo, o que se faz em Configuração, a qualquer momento.",
    ],
  },
  {
    titulo: "O teste grátis de catorze dias e o que acontece depois",
    paragrafos: [
      "Toda conta nova começa com catorze dias de teste grátis, com tudo liberado, inclusive o que é do plano Completo. O teste não pede cartão e não vira cobrança sozinho: se você não assinar, nada é cobrado.",
      "Terminado o teste, para continuar cadastrando e alterando é preciso assinar um dos planos. Sem assinatura, tudo o que você cadastrou continua guardado e pode ser visto e baixado, mas não alterado. O cardápio com link de pedido sai do ar e as ajudantes deixam de conseguir alterar a conta.",
    ],
  },
  {
    titulo: "Os planos, o pagamento e o direito de arrependimento",
    paragrafos: [
      "Há dois planos. O Essencial inclui o preço de cada doce, os pedidos, a despensa e o caixa. O Completo inclui tudo do Essencial, mais o cardápio com link de pedido e até cinco ajudantes. Os dois podem ser pagos por mês ou por ano, e o preço de cada um é o exibido na tela de assinatura no momento em que você assina.",
      "O pagamento é feito com cartão, na página da Stripe, empresa que processa a cobrança. A assinatura se renova sozinha ao fim de cada período, pelo mesmo valor, até que você a cancele. O recibo de cada cobrança é enviado pela Stripe ao seu e-mail.",
      "Você pode trocar de plano, trocar o cartão ou cancelar a qualquer momento, pelo portal de pagamento em Configuração. Ao cancelar, a assinatura não se renova e o que já foi pago vale até o fim do período. Se uma cobrança for recusada, a conta continua funcionando por sete dias para você acertar o cartão; depois, fica como no fim do teste.",
      "Mudar do Completo para o Essencial vale a partir do período seguinte. Quando a mudança vale, o cardápio sai do ar e as ajudantes perdem o acesso. Nada do que foi cadastrado é apagado: o cardápio volta como estava, e as ajudantes podem ser convidadas de novo, se você voltar ao Completo.",
      "Podemos mudar o preço dos planos. Se isso acontecer, avisamos com pelo menos trinta dias de antecedência, pelo e-mail da conta ou dentro do app, e o preço novo só vale a partir da renovação seguinte ao aviso. Se não concordar, é só cancelar antes dela.",
      "Direito de arrependimento: como a contratação é feita pela internet, você pode desistir da assinatura em até sete dias contados do primeiro pagamento, sem precisar justificar, e recebe de volta o valor integral pago, no mesmo cartão (Código de Defesa do Consumidor, art. 49). Para isso, cancele pelo portal e escreva para o e-mail da seção 1 pedindo o reembolso.",
    ],
  },
  {
    titulo: "O cardápio com link de pedido",
    paragrafos: [
      "O cardápio é uma página pública, com os produtos, fotos, descrições, preços e contato que você escolher mostrar. Quem abre o link pode montar um pedido e enviá-lo a você, informando nome, WhatsApp, data, e endereço quando for entrega. O pedido chega no Rende como orçamento, e a conversa com quem pediu continua sendo sua.",
      "O Rende não participa da venda. Você é a única responsável pelo que o cardápio mostra (inclusive direitos sobre as fotos e textos), pelos preços e pelas informações que a lei exige na oferta de alimentos, por confirmar ou recusar cada pedido, pela produção, entrega, cobrança e nota fiscal, e pelo atendimento de quem compra de você.",
      "Os dados que quem pede pelo cardápio informa são dados das suas clientes, tratados por você. O Rende os guarda por sua conta, como explica a política de privacidade, e você se compromete a usá-los só para atender o pedido e a relação com essa cliente.",
    ],
  },
  {
    titulo: "O que não se pode fazer, e o que é de quem",
    paragrafos: [
      "Não é permitido usar o Rende para atividade ilegal ou para publicar, no cardápio ou em qualquer campo, conteúdo ilegal, ofensivo, enganoso ou que viole direito de outra pessoa; tentar acessar conta ou dado de outra pessoa; testar, sobrecarregar ou contornar as proteções do sistema; nem revender ou copiar o Rende.",
      "O aplicativo, o nome e a marca Rende, o código e os textos e receitas de exemplo que o Rende oferece pertencem ao responsável pelo serviço. A assinatura dá a você o direito de usá-los enquanto a conta estiver ativa, e não transfere nenhum deles.",
    ],
  },
  {
    titulo: "Os dados são seus",
    paragrafos: [
      "Tudo o que você cadastra no Rende (receitas, preços, pedidos, clientes, caixa) é seu. Nós só o usamos para fazer o Rende funcionar para você, como explica a política de privacidade, e não o vendemos a ninguém.",
      'A qualquer momento, inclusive com o teste vencido ou sem assinatura, você pode baixar tudo o que cadastrou em "Baixar meus dados", em Configuração ou na tela de assinatura. O arquivo sai completo, no formato em que o Rende guarda os dados (JSON).',
    ],
  },
  {
    titulo: "Disponibilidade e limites de responsabilidade",
    paragrafos: [
      "Trabalhamos para que o Rende esteja sempre disponível e os dados, seguros, mas não podemos garantir funcionamento sem nenhuma interrupção ou erro. O Rende depende de serviços de terceiros (hospedagem, banco de dados, pagamento), e pode ficar fora do ar por falha deles, por manutenção ou por motivo que não controlamos. Recomendamos baixar seus dados de tempos em tempos.",
      {
        destaque:
          "Como o preço sugerido e os demais cálculos dependem dos números que você informa, e a decisão de preço, compra e venda é sua, não respondemos por prejuízo, lucro que deixou de ser obtido ou multa decorrente dessas decisões, nem por pedidos, produtos ou negócios feitos entre você e suas clientes. Esta cláusula não afasta nenhum direito que a lei, inclusive o Código de Defesa do Consumidor, garanta a você e que não possa ser afastado por contrato.",
      },
    ],
  },
  {
    titulo: "Encerramento, por qualquer lado",
    paragrafos: [
      'Você pode encerrar a conta quando quiser, sozinha, em "Encerrar minha conta", em Configuração. Encerrar cancela a assinatura na mesma hora, sem nenhuma cobrança nova, tira o acesso seu e das ajudantes, e tira o cardápio do ar. Baixe seus dados antes: depois de encerrar, não é mais possível.',
      {
        destaque:
          "Encerrar a conta não dá reembolso proporcional do período já pago, ressalvado o direito de arrependimento da seção 5. Se preferir usar até o fim do período pago, cancele a assinatura pelo portal e encerre a conta depois.",
      },
      "Em até trinta dias depois do encerramento, os dados da conta e o seu login são apagados de vez. Nesse intervalo, se mudar de ideia, escreva para o e-mail da seção 1 e reabrimos a conta como estava.",
      "Podemos suspender ou encerrar uma conta que descumpra estes termos, com aviso por e-mail e prazo para você baixar seus dados, salvo quando o descumprimento for grave ou exigir ação imediata, como fraude ou ameaça à segurança de outras contas. Se um dia decidirmos parar de oferecer o Rende, avisaremos com pelo menos sessenta dias de antecedência, para que você baixe seus dados, e devolveremos a parte proporcional do que tiver sido pago por período que não será usado.",
    ],
  },
  {
    titulo: "Mudanças nestes termos",
    paragrafos: [
      "Estes termos podem mudar, por exemplo quando o Rende ganhar ou perder uma função ou quando a lei mudar. A data no topo desta página diz qual versão está valendo. Mudanças que afetem seus direitos ou o que você paga serão avisadas com pelo menos trinta dias de antecedência, pelo e-mail da conta ou dentro do app. Se não concordar com a mudança, você pode cancelar a assinatura e encerrar a conta antes que ela valha, sem nenhuma multa.",
    ],
  },
  {
    titulo: "Lei aplicável e foro",
    paragrafos: [
      "Estes termos seguem as leis do Brasil. Antes de ir à Justiça, pedimos que você fale conosco pelo e-mail da seção 1: a maioria dos problemas se resolve assim. Você também pode registrar reclamação no consumidor.gov.br. Se houver disputa judicial, ela corre no foro da cidade onde você mora.",
    ],
  },
];

export default function PaginaTermos() {
  return (
    <PaginaDeTexto
      titulo="Termos de uso"
      vigenteDesde="24 de setembro de 2026"
      secoes={SECOES}
    />
  );
}
