import type { Metadata } from "next";
import {
  PaginaDeTexto,
  type SecaoDeTexto,
} from "@/components/auth/PaginaDeTexto";
import { RESPONSAVEL } from "../responsavel";

export const metadata: Metadata = { title: "Política de privacidade · Rende" };

/**
 * As seções seguem o art. 9º da LGPD, na ordem da spec 027 (3.5), com o que a
 * 029 (3.8) mandou afirmar e as seções que a lei pede e a spec não listava
 * (papéis, base legal, segurança). O texto é de 2026-09-24 e espera a revisão
 * de um advogado antes do deploy (`DECISOES.md#d171`). "Em até 30 dias" é
 * `DIAS_ATE_A_PURGA` (`domain/meusDados.ts`).
 */
const SECOES: SecaoDeTexto[] = [
  {
    titulo: "Quem controla os seus dados, e como falar com ele",
    paragrafos: [
      `O controlador dos dados pessoais tratados pelo Rende é ${RESPONSAVEL.nome}, pessoa física, CPF nº ${RESPONSAVEL.cpf}, com endereço para correspondência em ${RESPONSAVEL.endereco}, responsável pelo serviço.`,
      `O canal para qualquer assunto de privacidade, inclusive para exercer os seus direitos, é o e-mail ${RESPONSAVEL.email}. Como agente de tratamento de pequeno porte, o Rende não indica um encarregado, e este e-mail cumpre o papel de canal de comunicação com você (Resolução CD/ANPD nº 2/2022, art. 11).`,
    ],
  },
  {
    titulo: "A quem esta política se aplica",
    paragrafos: [
      "A três grupos de pessoas: quem cria uma conta no Rende (a dona da conta); as ajudantes que ela convida; e as clientes dela, que fazem pedidos pelo cardápio com link.",
      "Para os dados da dona da conta e das ajudantes, o Rende é o controlador. Para os dados das clientes, que a dona cadastra ou que chegam pelo cardápio, a controladora é a própria dona da conta, que decide o que fazer com eles; o Rende é o operador, que os guarda e processa por conta dela (LGPD, art. 5º, VI e VII, e art. 39). A seção 7 trata disso.",
    ],
  },
  {
    titulo: "O que é coletado",
    paragrafos: [
      "Da dona da conta: nome, e-mail, senha (guardada cifrada pelo serviço de login do Google; ninguém a vê, nem nós), nome do negócio, e a data em que aceitou os termos.",
      // Spec 043 (`DECISOES.md#d198`). Espera a revisão de quem conduz o projeto.
      "Se você entrar com o Google, o Rende recebe do Google o seu nome, o seu e-mail e a sua foto de perfil. A foto não é guardada.",
      "Do que ela cadastra: ingredientes, receitas, preços, fotos e descrições de produtos, pedidos, clientes (nome, telefone, endereço e o que ela anotar), despensa, lançamentos de caixa e o contato do negócio (telefone e Instagram).",
      "Das ajudantes: e-mail, senha (nas mesmas condições da dona) e a data em que foram convidadas ou tiradas da conta.",
      "Das clientes que pedem pelo cardápio: nome, WhatsApp, os produtos, a data, a forma de entrega, o endereço quando for entrega, e as observações que escreverem.",
      "Da assinatura: o plano, as datas e a situação dos pagamentos, e os identificadores que a Stripe nos devolve. Os dados do cartão são digitados na página da Stripe e ficam com ela: o Rende não os vê nem os guarda.",
      "Da foto de nota fiscal: quando você usa a leitura de nota, a imagem é enviada para ser lida por inteligência artificial, e só os itens e valores lidos voltam para o app. O Rende não guarda a imagem.",
      "Dados técnicos: os serviços que hospedam o Rende registram, como qualquer site, o endereço IP, a data e hora dos acessos e informações do navegador e do aparelho.",
      // Spec 038 (`DECISOES.md#d180`). Espera a revisão de quem conduz o projeto.
      "Nas páginas públicas do Rende e na tela de criar conta, contamos visitas de forma agregada, pela Vercel: qual página foi aberta, de que site a pessoa veio, o país e o tipo de aparelho. Não usamos cookie para isso, não identificamos quem visitou, e nada disso é contado dentro do aplicativo.",
    ],
  },
  {
    titulo: "Para quê, e com que base legal",
    paragrafos: [
      "Para criar e manter a conta, fazer os cálculos, guardar e sincronizar o que você cadastra, publicar o cardápio que você abrir, ler a nota fiscal que você enviar e deixar suas ajudantes entrarem: é a execução do contrato que você aceitou nos termos de uso (LGPD, art. 7º, V).",
      "Para cobrar a assinatura e guardar os registros de pagamento pelo prazo que a lei fiscal exige: execução do contrato e cumprimento de obrigação legal (art. 7º, II e V).",
      "Para proteger a conta e o sistema contra fraude e abuso, responder a pedidos seus e melhorar o Rende a partir de números de uso por conta (por exemplo, quando a conta foi criada e se já calculou o primeiro preço), sem olhar o conteúdo do que você cadastrou: legítimo interesse (art. 7º, IX), sempre no limite do necessário.",
      "Para atender ordem judicial ou pedido de autoridade com poder legal para fazê-lo: cumprimento de obrigação legal ou regulatória (art. 7º, II, e Marco Civil da Internet).",
      "Nós não vendemos dados, não os usamos para publicidade e não os compartilhamos para fins de marketing. Só olhamos o conteúdo de uma conta quando você pede ajuda e nos autoriza, ou quando a lei ou a segurança do sistema exigirem.",
    ],
  },
  {
    titulo: "Quem opera por trás",
    paragrafos: [
      "Google (Firebase): o login e o banco de dados onde fica tudo o que você cadastra. Google (Gemini): a leitura da foto da nota fiscal; a imagem é enviada, lida e descartada pelo Rende, e o Google pode mantê-la por tempo limitado para prevenir abuso, sem usá-la para treinar seus modelos, conforme os termos do serviço. Vercel: o servidor que entrega o app e roda o cadastro, a assinatura, a exportação, o encerramento e o cardápio. Stripe: a cobrança da assinatura.",
      "Cada um desses fornecedores trata os dados só para prestar o serviço ao Rende, sob contrato e com as proteções de segurança que declaram. Eles podem guardar e processar dados em servidores fora do Brasil, inclusive nos Estados Unidos. Essa transferência internacional é necessária para executar o contrato com você e é feita com as garantias contratuais que esses fornecedores oferecem (LGPD, art. 33).",
      "Fora esses fornecedores, dados só são compartilhados com autoridade pública, quando houver obrigação legal ou ordem judicial, ou com quem vier a suceder o Rende, caso o serviço seja transferido, que ficará obrigado por esta mesma política.",
    ],
  },
  {
    titulo: "Por quanto tempo",
    paragrafos: [
      "Enquanto a conta existir, inclusive depois que o teste ou a assinatura vencerem, para que você possa voltar ou baixar tudo. Os dados de uma ajudante saem da conta quando a dona a tira, e o login dela é apagado quando a conta for encerrada.",
      "Quando a conta é encerrada, os dados dela e o login são apagados de vez em até trinta dias. Depois disso, podem restar por tempo limitado em cópias de segurança dos fornecedores, até serem sobrescritos. O que fica guardado são os registros de pagamento na Stripe, pelo prazo que a lei fiscal exige, e o que for necessário para cumprir obrigação legal ou para defender direitos em processo.",
    ],
  },
  {
    titulo: "Os dados das suas clientes",
    paragrafos: [
      "Se você é dona de uma conta, os dados das suas clientes, cadastrados por você ou enviados pelo cardápio, são tratados por você, para os seus pedidos. Cabe a você usá-los só para isso, informar suas clientes a respeito e atender os pedidos delas sobre esses dados. O Rende só os guarda e processa conforme as suas instruções, que são o uso do app, e não os usa para nada mais.",
      "Se você fez um pedido pelo cardápio de uma confeiteira que usa o Rende, os seus dados foram enviados a ela. Para saber o que ela faz com eles, ou pedir correção ou exclusão, fale com ela. Se não conseguir, escreva para o e-mail da seção 1 e ajudamos a encaminhar o pedido.",
    ],
  },
  {
    titulo: "Segurança",
    paragrafos: [
      "Os dados trafegam cifrados (HTTPS). Cada conta só é lida por quem tem login nela, conferido pelo servidor a cada acesso, e as ajudantes só alcançam o que o papel delas permite. As chaves de acesso aos fornecedores ficam fora do código e fora do aparelho.",
      "Nenhum sistema é inviolável. Se acontecer um incidente de segurança que possa trazer risco ou dano relevante a você, avisaremos você e a Autoridade Nacional de Proteção de Dados (ANPD), dizendo o que aconteceu, que dados foram afetados e o que foi feito (LGPD, art. 48).",
      "Do seu lado: use uma senha que não use em outro lugar, não a compartilhe, e saia da conta em aparelho que não é seu. Ao sair, o Rende apaga do aparelho a cópia local dos dados.",
    ],
  },
  {
    titulo: "Os seus direitos",
    paragrafos: [
      "A LGPD (art. 18) garante a você: confirmar se tratamos dados seus e acessá-los; corrigir dados incompletos, inexatos ou desatualizados; pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários, excessivos ou tratados em desacordo com a lei; a portabilidade dos seus dados; a eliminação dos dados; saber com quem os compartilhamos; e, quando o tratamento depender de consentimento, saber o que acontece se não consentir e revogá-lo.",
      'No próprio app: a portabilidade e o acesso são "Baixar meus dados", em Configuração, que entrega tudo num arquivo; a eliminação é "Encerrar minha conta", no mesmo lugar; a correção é editar o dado onde ele está. Os demais, e qualquer dúvida, pelo e-mail da seção 1. Respondemos em até quinze dias, e podemos pedir que confirme a sua identidade antes de atender.',
      "Se achar que seus direitos não foram respeitados, você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD), em gov.br/anpd.",
    ],
  },
  {
    titulo: "Cookies e rastreamento",
    paragrafos: [
      "O Rende não usa cookies de rastreamento, de publicidade ou de análise de terceiros. Para funcionar, e para funcionar sem internet, ele guarda no armazenamento do seu navegador a sessão de login e uma cópia dos dados da sua conta. Isso é necessário ao serviço e não segue você por outros sites; sair da conta apaga essa cópia.",
      "A página de pagamento é da Stripe, e usa os cookies dela, sob a política de privacidade dela, para processar o pagamento e prevenir fraude.",
    ],
  },
  {
    titulo: "Mudanças nesta política",
    paragrafos: [
      "Esta política pode mudar quando o Rende mudar ou quando a lei mudar. A data no topo diz qual versão está valendo. Se a mudança for relevante, como um novo tipo de dado, um novo fornecedor ou uma nova finalidade, avisaremos pelo e-mail da conta ou dentro do app antes de ela valer.",
    ],
  },
];

export default function PaginaPrivacidade() {
  return (
    <PaginaDeTexto
      titulo="Política de privacidade"
      vigenteDesde="24 de setembro de 2026"
      secoes={SECOES}
    />
  );
}
