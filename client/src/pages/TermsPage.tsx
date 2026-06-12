import { LegalDoc, LegalSection } from "@/components/legal/LegalDoc";

// NOTA: substituir os campos entre [ ] e validar com aconselhamento jurídico.
const COMPANY = {
  name: "[NOME DA EMPRESA / RESPONSÁVEL]",
  nif: "[NIF]",
  email: "suporte@volleyiq.app",
  jurisdiction: "[COMARCA]",
};

export default function TermsPage() {
  return (
    <LegalDoc title="Termos de Serviço" lastUpdated="12 de junho de 2026">
      <p>
        Estes Termos de Serviço regulam o acesso e a utilização da plataforma
        VolleyIQ. Ao criar uma conta ou utilizar o serviço, declara aceitar
        integralmente estes Termos.
      </p>

      <LegalSection heading="1. Objeto">
        <p>
          O VolleyIQ é uma plataforma de análise e scouting de voleibol que
          permite gerir equipas, registar jogos, produzir estatísticas e
          relatórios. O serviço é prestado por {COMPANY.name}, NIF {COMPANY.nif}.
        </p>
      </LegalSection>

      <LegalSection heading="2. Conta e elegibilidade">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            É responsável pela veracidade dos dados da conta e pela
            confidencialidade das suas credenciais.
          </li>
          <li>
            É responsável por toda a atividade realizada através da sua conta.
          </li>
          <li>
            Ao inserir dados de terceiros (incluindo atletas menores), declara
            ter legitimidade e consentimento para o fazer, nos termos da Política
            de Privacidade.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Planos, período experimental e pagamentos">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            O serviço disponibiliza um período experimental gratuito e planos
            pagos com diferentes funcionalidades.
          </li>
          <li>
            As subscrições são cobradas de acordo com o plano e periodicidade
            escolhidos. Os preços são apresentados na página de subscrição.
          </li>
          <li>
            O processamento de pagamentos é efetuado pela EasyPay. Pode cancelar
            a subscrição a qualquer momento; o cancelamento produz efeitos no
            final do período já pago, salvo disposição legal imperativa em
            contrário.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Utilização aceitável">
        <p>Compromete-se a não:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>utilizar o serviço para fins ilícitos ou não autorizados;</li>
          <li>
            tentar aceder a dados de outras equipas ou contas, ou comprometer a
            segurança da plataforma;
          </li>
          <li>
            reproduzir, revender ou explorar o serviço sem autorização escrita.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Propriedade intelectual e dados do utilizador">
        <p>
          A plataforma, o software e a marca VolleyIQ são propriedade do
          prestador. Os dados que insere (equipas, jogos, estatísticas)
          permanecem seus; concede-nos apenas a licença necessária para operar o
          serviço. Pode exportar e eliminar os seus dados a qualquer momento.
        </p>
      </LegalSection>

      <LegalSection heading="6. Disponibilidade e limitação de responsabilidade">
        <p>
          Empenhamo-nos em manter o serviço disponível e fiável, mas este é
          prestado «tal como está», sem garantia de ausência de interrupções ou
          erros. Na medida máxima permitida por lei, a nossa responsabilidade
          está limitada ao montante pago pela subscrição nos 12 meses anteriores
          ao facto que origina a responsabilidade.
        </p>
      </LegalSection>

      <LegalSection heading="7. Cessação">
        <p>
          Pode cessar a utilização e eliminar a conta a qualquer momento. Podemos
          suspender ou encerrar contas que violem estes Termos, mediante aviso
          quando razoável.
        </p>
      </LegalSection>

      <LegalSection heading="8. Lei aplicável e foro">
        <p>
          Estes Termos regem-se pela lei portuguesa. Para a resolução de
          litígios é competente o foro da comarca de {COMPANY.jurisdiction}, sem
          prejuízo dos direitos dos consumidores recorrerem ao foro do seu
          domicílio e a meios de resolução alternativa de litígios.
        </p>
      </LegalSection>

      <LegalSection heading="9. Contacto">
        <p>
          Para qualquer questão sobre estes Termos, contacte{" "}
          <a className="text-primary hover:underline" href={`mailto:${COMPANY.email}`}>
            {COMPANY.email}
          </a>
          .
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
