/**
 * Plakr! — Termos de Uso
 */
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen" style={{ background: "#0B0F1A", color: "#E5E7EB" }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-10 backdrop-blur-sm" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(11,15,26,0.95)" }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm hover:text-white transition-colors" style={{ color: "#9CA3AF" }}>
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black"
              style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}>P!</div>
            <span className="font-bold text-white text-sm">Plakr!</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Termos de Uso</h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>Última atualização: 07 de abril de 2026</p>
        </div>

        <div className="space-y-10">

          <p style={{ color: "#9CA3AF" }}>
            Estes Termos de Uso regulam o acesso e a utilização do <strong className="text-white">Plakr</strong> ("plataforma"),
            de titularidade de <strong className="text-white">Marcos Gervazoni</strong>, com sede em Farroupilha/RS, Brasil.
            Ao criar uma conta ou utilizar qualquer funcionalidade do Plakr, você concorda integralmente com estes Termos.
          </p>
          <p style={{ color: "#9CA3AF" }}>
            Se você não concordar com alguma cláusula, não utilize a plataforma.
          </p>

          <Section title="1. O que é o Plakr">
            <p>
              O Plakr é uma plataforma digital de bolões esportivos por diversão. Os usuários registram palpites em
              partidas de futebol e competem entre si por pontuação.{" "}
              <strong className="text-white">Não há apostas em dinheiro, prêmios em dinheiro ou qualquer forma de ganho
              financeiro</strong> entre os participantes. A plataforma não é um serviço de apostas esportivas regulamentado.
            </p>
          </Section>

          <Section title="2. Cadastro e conta">
            <SubSection title="2.1 Elegibilidade">
              <p>Para utilizar o Plakr, você deve:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Ter ao menos 13 anos de idade;</li>
                <li>Fornecer informações verdadeiras e atualizadas no cadastro;</li>
                <li>Ser responsável por manter a confidencialidade das suas credenciais de acesso.</li>
              </ul>
            </SubSection>
            <SubSection title="2.2 Responsabilidade pela conta">
              <p>
                Você é o único responsável por todas as atividades realizadas com sua conta. Em caso de uso não
                autorizado, notifique imediatamente o suporte pelo e-mail{" "}
                <a href="mailto:contato@plakr.io" className="hover:text-white transition-colors" style={{ color: "#FFB800" }}>
                  contato@plakr.io
                </a>.
              </p>
            </SubSection>
            <SubSection title="2.3 Uma conta por pessoa">
              <p>
                É vedado criar múltiplas contas com o objetivo de obter vantagens em bolões ou burlar restrições
                da plataforma.
              </p>
            </SubSection>
          </Section>

          <Section title="3. Plano Pro e pagamentos">
            <p>
              O Plakr oferece um plano gratuito e um plano pago (<strong className="text-white">Pro</strong>), com
              funcionalidades adicionais. Os pagamentos do plano Pro são processados pela{" "}
              <strong className="text-white">Stripe, Inc.</strong> e estão sujeitos às condições descritas no momento
              da contratação.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>Os valores e benefícios do plano Pro podem ser alterados mediante aviso prévio de 30 dias;</li>
              <li>Não há reembolso de períodos já utilizados, salvo em casos previstos no Código de Defesa do Consumidor (Lei nº 8.078/1990);</li>
              <li>O cancelamento do plano Pro pode ser feito a qualquer momento, com efeito ao final do período já pago.</li>
            </ul>
          </Section>

          <Section title="4. Regras de uso">
            <SubSection title="4.1 Condutas permitidas">
              <ul className="list-disc pl-5 space-y-1">
                <li>Criar e participar de bolões com amigos, colegas e grupos;</li>
                <li>Registrar palpites nos jogos disponíveis;</li>
                <li>Interagir nos chats dos bolões de forma respeitosa;</li>
                <li>Compartilhar convites para bolões nas redes sociais.</li>
              </ul>
            </SubSection>
            <SubSection title="4.2 Condutas proibidas">
              <p>É expressamente proibido:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Utilizar a plataforma para fins ilegais ou fraudulentos;</li>
                <li>Publicar conteúdo ofensivo, discriminatório, pornográfico ou que incite violência;</li>
                <li>Tentar acessar sistemas, bancos de dados ou contas de outros usuários sem autorização;</li>
                <li>Usar scripts, bots ou automações para manipular resultados ou pontuações;</li>
                <li>Criar bolões com fins de arrecadação de dinheiro real entre participantes;</li>
                <li>Reproduzir, copiar ou distribuir qualquer parte da plataforma sem autorização prévia.</li>
              </ul>
              <p className="mt-3">
                O descumprimento dessas regras pode resultar na suspensão ou exclusão permanente da conta, sem aviso prévio.
              </p>
            </SubSection>
          </Section>

          <Section title="5. Conteúdo gerado pelo usuário">
            <p>
              Ao publicar palpites, mensagens ou qualquer conteúdo na plataforma, você declara que o conteúdo não
              viola direitos de terceiros e concede ao Plakr uma licença não exclusiva e gratuita para exibir esse
              conteúdo dentro da plataforma.
            </p>
            <p className="mt-3">
              Reservamo-nos o direito de remover qualquer conteúdo que viole estes Termos ou que seja considerado
              inadequado, sem necessidade de justificativa.
            </p>
          </Section>

          <Section title="6. Análises de IA e dados esportivos">
            <p>
              O Plakr utiliza inteligência artificial e dados de terceiros (API-Football) para gerar análises e
              previsões de partidas. Essas análises têm caráter{" "}
              <strong className="text-white">exclusivamente informativo e de entretenimento</strong>.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>As análises não constituem recomendação de apostas ou orientação financeira;</li>
              <li>Os dados esportivos podem conter imprecisões ou atrasos;</li>
              <li>O Plakr não se responsabiliza por decisões tomadas com base nas análises exibidas na plataforma.</li>
            </ul>
          </Section>

          <Section title="7. Disponibilidade da plataforma">
            <p>
              O Plakr é fornecido "no estado em que se encontra". Não garantimos disponibilidade ininterrupta do
              serviço. Podemos realizar manutenções, atualizações ou interrupções temporárias sem aviso prévio.
            </p>
            <p className="mt-3">
              Não nos responsabilizamos por perdas de palpites ou dados decorrentes de falhas técnicas,
              interrupções de serviço ou força maior.
            </p>
          </Section>

          <Section title="8. Propriedade intelectual">
            <p>
              Todo o conteúdo da plataforma — incluindo marca, logotipo, design, código-fonte, textos e
              funcionalidades — é de propriedade de Marcos Gervazoni ou de seus licenciantes. É proibida qualquer
              reprodução, distribuição ou uso comercial sem autorização expressa e por escrito.
            </p>
          </Section>

          <Section title="9. Limitação de responsabilidade">
            <p>Na máxima extensão permitida pela lei brasileira, o Plakr não se responsabiliza por:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>Danos indiretos, incidentais ou consequentes decorrentes do uso da plataforma;</li>
              <li>Perda de dados por falhas técnicas ou ataques externos;</li>
              <li>Condutas de outros usuários dentro dos bolões.</li>
            </ul>
          </Section>

          <Section title="10. Rescisão">
            <p>
              Você pode encerrar sua conta a qualquer momento pelo painel de configurações ou solicitando a
              exclusão pelo e-mail{" "}
              <a href="mailto:contato@plakr.io" className="hover:text-white transition-colors" style={{ color: "#FFB800" }}>
                contato@plakr.io
              </a>.
            </p>
            <p className="mt-3">
              Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos, sem aviso prévio
              e sem obrigação de reembolso de períodos não utilizados do plano Pro, exceto nos casos previstos em lei.
            </p>
          </Section>

          <Section title="11. Alterações nos Termos">
            <p>
              Podemos atualizar estes Termos a qualquer momento. Alterações relevantes serão comunicadas por
              e-mail ou por aviso na plataforma com antecedência mínima de 10 dias. O uso continuado da
              plataforma após a vigência das alterações implica aceitação dos novos Termos.
            </p>
          </Section>

          <Section title="12. Lei aplicável e foro">
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da
              Comarca de <strong className="text-white">Farroupilha, Rio Grande do Sul</strong>, para dirimir
              quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro,
              por mais privilegiado que seja.
            </p>
          </Section>

          <Section title="13. Contato">
            <p>Para dúvidas, reclamações ou solicitações relacionadas a estes Termos:</p>
            <div className="mt-3 p-4 rounded-xl space-y-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p><strong className="text-white">E-mail:</strong>{" "}
                <a href="mailto:contato@plakr.io" className="hover:text-white transition-colors" style={{ color: "#FFB800" }}>contato@plakr.io</a>
              </p>
              <p><strong className="text-white">Responsável:</strong> Marcos Gervazoni</p>
              <p><strong className="text-white">Localização:</strong> Farroupilha, Rio Grande do Sul, Brasil</p>
            </div>
          </Section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0B0F1A" }}>
        <div className="max-w-3xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-sm" style={{ color: "#6B7280" }}>
          <p>© {new Date().getFullYear()} Plakr! · Todos os direitos reservados</p>
          <nav className="flex gap-4">
            <Link href="/terms" className="hover:text-white transition-colors" style={{ color: "#FFB800" }}>Termos de Uso</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {title}
      </h2>
      <div className="space-y-3" style={{ color: "#9CA3AF" }}>
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <div style={{ color: "#9CA3AF" }}>{children}</div>
    </div>
  );
}
