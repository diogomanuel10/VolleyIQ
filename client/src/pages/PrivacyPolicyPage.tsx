import { LegalDoc, LegalSection } from "@/components/legal/LegalDoc";

// NOTA: substituir os campos entre [ ] pelos dados reais do responsável pelo
// tratamento antes de publicar, e validar com aconselhamento jurídico.
const COMPANY = {
  name: "[NOME DA EMPRESA / RESPONSÁVEL]",
  nif: "[NIF]",
  address: "[MORADA]",
  email: "suporte@volleyiq.app",
  dpoEmail: "privacidade@volleyiq.app",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDoc title="Política de Privacidade" lastUpdated="12 de junho de 2026">
      <p>
        A presente Política de Privacidade descreve como o VolleyIQ recolhe,
        utiliza e protege os dados pessoais tratados no âmbito da plataforma,
        em conformidade com o Regulamento Geral sobre a Proteção de Dados
        (Regulamento (UE) 2016/679 — «RGPD») e a legislação nacional aplicável.
      </p>

      <LegalSection heading="1. Responsável pelo tratamento">
        <p>
          O responsável pelo tratamento dos dados é {COMPANY.name}, NIF{" "}
          {COMPANY.nif}, com sede em {COMPANY.address}. Para qualquer questão
          relacionada com privacidade, contacte{" "}
          <a className="text-primary hover:underline" href={`mailto:${COMPANY.dpoEmail}`}>
            {COMPANY.dpoEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="2. Dados que recolhemos">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Dados de conta:</strong> nome, endereço de email e, quando
            aplicável, foto de perfil fornecida pelo método de autenticação.
          </li>
          <li>
            <strong>Dados da equipa e jogadoras:</strong> nome, número, posição,
            altura, mão dominante, data de nascimento e fotografia das atletas
            inseridas pelo utilizador.
          </li>
          <li>
            <strong>Dados desportivos:</strong> registos de jogos, ações de
            scouting, estatísticas e relatórios produzidos na plataforma.
          </li>
          <li>
            <strong>Dados de faturação:</strong> nome, email e identificador de
            pagamento necessários para processar subscrições (o processamento do
            pagamento é feito pela EasyPay; não armazenamos dados completos de
            cartão).
          </li>
          <li>
            <strong>Dados técnicos:</strong> registos de acesso e dados estritamente
            necessários ao funcionamento e segurança do serviço.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Finalidades e base legal">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Prestação do serviço</strong> (execução do contrato, art.º 6.º/1/b
            RGPD): criar e gerir a conta, equipas, jogos e estatísticas.
          </li>
          <li>
            <strong>Gestão de subscrições e faturação</strong> (execução do contrato e
            obrigação legal, art.º 6.º/1/b e c).
          </li>
          <li>
            <strong>Comunicações de serviço</strong> (interesse legítimo, art.º 6.º/1/f):
            lembretes de jogos e notificações operacionais.
          </li>
          <li>
            <strong>Segurança e prevenção de fraude</strong> (interesse legítimo).
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Dados de menores">
        <p>
          A plataforma destina-se a treinadores e clubes que podem inserir dados
          de atletas menores de idade. O utilizador que insere esses dados declara
          ter obtido o <strong>consentimento dos respetivos encarregados de
          educação</strong> para o tratamento dos dados das atletas menores no
          contexto desportivo, sendo responsável por essa recolha de consentimento.
          O VolleyIQ disponibiliza mecanismos para correção e eliminação destes
          dados a qualquer momento.
        </p>
      </LegalSection>

      <LegalSection heading="5. Subcontratantes e transferências">
        <p>
          Recorremos a prestadores que tratam dados em nosso nome, sob acordos de
          tratamento de dados adequados:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Google Firebase</strong> — autenticação de utilizadores.</li>
          <li><strong>EasyPay</strong> — processamento de pagamentos.</li>
          <li><strong>Railway / Vercel</strong> — alojamento da aplicação e base de dados.</li>
        </ul>
        <p>
          Sempre que ocorram transferências para fora do Espaço Económico Europeu,
          asseguramos garantias adequadas (ex.: cláusulas contratuais-tipo).
        </p>
      </LegalSection>

      <LegalSection heading="6. Prazo de conservação">
        <p>
          Conservamos os dados enquanto a conta estiver ativa. Após a eliminação
          da conta, os dados pessoais são apagados ou anonimizados num prazo
          razoável, salvo quando a sua conservação for exigida por obrigação legal
          (ex.: dados de faturação).
        </p>
      </LegalSection>

      <LegalSection heading="7. Os seus direitos">
        <p>
          Nos termos do RGPD, tem direito de acesso, retificação, apagamento,
          limitação, portabilidade e oposição ao tratamento dos seus dados. Pode
          exercer estes direitos diretamente na aplicação (em{" "}
          <em>Perfil → Privacidade e dados</em>) ou contactando{" "}
          <a className="text-primary hover:underline" href={`mailto:${COMPANY.dpoEmail}`}>
            {COMPANY.dpoEmail}
          </a>
          . Tem ainda o direito de apresentar reclamação à Comissão Nacional de
          Proteção de Dados (CNPD).
        </p>
      </LegalSection>

      <LegalSection heading="8. Segurança">
        <p>
          Adotamos medidas técnicas e organizativas para proteger os dados,
          incluindo controlo de acesso por equipa, ligações encriptadas e
          armazenamento seguro de credenciais. Nenhum sistema é, contudo,
          totalmente imune a riscos.
        </p>
      </LegalSection>

      <LegalSection heading="9. Alterações">
        <p>
          Esta política pode ser atualizada. A data de «Última atualização» no
          topo reflete a versão em vigor. Alterações materiais serão comunicadas
          através da aplicação.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
