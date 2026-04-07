/**
 * Plakr! — Política de Privacidade
 */
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
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
          <h1 className="text-3xl font-bold text-white mb-2">Política de Privacidade</h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>Última atualização: 07 de abril de 2026</p>
        </div>

        <div className="prose-legal space-y-10">

          <p style={{ color: "#9CA3AF" }}>
            Esta Política de Privacidade descreve como o <strong className="text-white">Plakr</strong> ("nós", "nosso" ou "plataforma"),
            de titularidade de <strong className="text-white">Marcos Gervazoni</strong>, coleta, utiliza, armazena e protege os dados
            pessoais dos usuários, em conformidade com a <strong className="text-white">Lei Geral de Proteção de Dados Pessoais
            (Lei nº 13.709/2018 — LGPD)</strong>.
          </p>
          <p style={{ color: "#9CA3AF" }}>
            Ao criar uma conta ou utilizar o Plakr, você declara ter lido e concordado com esta Política.
          </p>

          <Section title="1. Quem somos">
            <p>
              O Plakr é uma plataforma de bolões esportivos por diversão, sem envolvimento de apostas ou dinheiro entre
              participantes. A plataforma é operada por Marcos Gervazoni, com sede em Farroupilha/RS, Brasil.
            </p>
            <p className="mt-3">
              <strong className="text-white">Contato do responsável pelos dados (DPO):</strong>{" "}
              <a href="mailto:contato@plakr.io" className="hover:text-white transition-colors" style={{ color: "#FFB800" }}>
                contato@plakr.io
              </a>
            </p>
          </Section>

          <Section title="2. Quais dados coletamos">
            <SubSection title="2.1 Dados fornecidos pelo usuário">
              <ul className="list-disc pl-5 space-y-1">
                <li>Nome e endereço de e-mail (fornecidos no cadastro via login social ou e-mail);</li>
                <li>Foto de perfil (quando disponibilizada pelo provedor de login social);</li>
                <li>Palpites e resultados registrados nos bolões;</li>
                <li>Mensagens enviadas em chats de bolões.</li>
              </ul>
            </SubSection>
            <SubSection title="2.2 Dados coletados automaticamente">
              <ul className="list-disc pl-5 space-y-1">
                <li>Endereço IP e informações do dispositivo/navegador;</li>
                <li>Data e hora de acesso;</li>
                <li>Páginas visitadas e ações realizadas na plataforma (logs de uso);</li>
                <li>Cookies de sessão e preferências.</li>
              </ul>
            </SubSection>
            <SubSection title="2.3 Dados de pagamento">
              <p>
                Para usuários do plano Pro, os dados de pagamento (número do cartão, CVV) são processados diretamente
                pela <strong className="text-white">Stripe, Inc.</strong> e <strong className="text-white">não são armazenados</strong> em
                nossos servidores. Armazenamos apenas o identificador da assinatura e o status do plano.
              </p>
            </SubSection>
          </Section>

          <Section title="3. Para que usamos seus dados">
            <Table
              headers={["Finalidade", "Base legal (LGPD)"]}
              rows={[
                ["Criar e manter sua conta", "Execução de contrato (art. 7º, V)"],
                ["Exibir seu nome e foto nos bolões", "Execução de contrato (art. 7º, V)"],
                ["Enviar notificações sobre bolões e resultados", "Execução de contrato / legítimo interesse (art. 7º, IX)"],
                ["Enviar e-mails transacionais (confirmação, lembretes)", "Execução de contrato (art. 7º, V)"],
                ["Processar pagamentos do plano Pro", "Execução de contrato (art. 7º, V)"],
                ["Melhorar a plataforma com base no uso", "Legítimo interesse (art. 7º, IX)"],
                ["Cumprir obrigações legais", "Cumprimento de obrigação legal (art. 7º, II)"],
              ]}
            />
            <p className="mt-4">
              Não utilizamos seus dados para publicidade de terceiros nem os vendemos a nenhuma empresa.
            </p>
          </Section>

          <Section title="4. Com quem compartilhamos seus dados">
            <p>Compartilhamos dados apenas com os seguintes parceiros, estritamente para operação da plataforma:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li><strong className="text-white">Stripe, Inc.</strong> — processamento de pagamentos do plano Pro;</li>
              <li><strong className="text-white">Manus AI</strong> — infraestrutura de hospedagem e banco de dados da plataforma;</li>
              <li><strong className="text-white">API-Football (RapidAPI)</strong> — dados públicos de partidas e campeonatos (não recebe dados pessoais de usuários);</li>
              <li><strong className="text-white">Provedores de login social</strong> (Google, etc.) — somente para autenticação, conforme suas próprias políticas.</li>
            </ul>
            <p className="mt-4">
              Não compartilhamos dados com autoridades governamentais, salvo por obrigação legal ou ordem judicial.
            </p>
          </Section>

          <Section title="5. Cookies">
            <p>
              Utilizamos cookies estritamente necessários para manter sua sessão autenticada. Não utilizamos cookies
              de rastreamento ou publicidade de terceiros.
            </p>
            <p className="mt-3">
              Você pode desativar cookies no seu navegador, mas isso impedirá o funcionamento do login na plataforma.
            </p>
          </Section>

          <Section title="6. Por quanto tempo guardamos seus dados">
            <Table
              headers={["Tipo de dado", "Prazo de retenção"]}
              rows={[
                ["Dados de conta (nome, e-mail)", "Enquanto a conta estiver ativa + 90 dias após exclusão"],
                ["Palpites e histórico de bolões", "Enquanto a conta estiver ativa + 90 dias após exclusão"],
                ["Logs de acesso", "6 meses"],
                ["Dados de pagamento (identificador Stripe)", "5 anos (obrigação fiscal)"],
              ]}
            />
          </Section>

          <Section title="7. Seus direitos como titular">
            <p>Nos termos da LGPD, você tem direito a:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li><strong className="text-white">Confirmar</strong> a existência de tratamento dos seus dados;</li>
              <li><strong className="text-white">Acessar</strong> os dados que temos sobre você;</li>
              <li><strong className="text-white">Corrigir</strong> dados incompletos, inexatos ou desatualizados;</li>
              <li><strong className="text-white">Solicitar a exclusão</strong> dos seus dados (direito ao esquecimento);</li>
              <li><strong className="text-white">Revogar o consentimento</strong> a qualquer momento;</li>
              <li><strong className="text-white">Portabilidade</strong> dos seus dados em formato estruturado;</li>
              <li><strong className="text-white">Opor-se</strong> ao tratamento realizado com base em legítimo interesse.</li>
            </ul>
            <p className="mt-4">
              Para exercer qualquer um desses direitos, envie uma solicitação para{" "}
              <a href="mailto:contato@plakr.io" className="hover:text-white transition-colors" style={{ color: "#FFB800" }}>
                contato@plakr.io
              </a>. Responderemos em até 15 dias úteis.
            </p>
          </Section>

          <Section title="8. Segurança dos dados">
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado,
              perda ou destruição, incluindo:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>Comunicação criptografada via HTTPS/TLS;</li>
              <li>Senhas armazenadas com hash seguro (nunca em texto puro);</li>
              <li>Acesso ao banco de dados restrito a sistemas autorizados;</li>
              <li>Tokens de sessão com expiração automática.</li>
            </ul>
            <p className="mt-4">
              Em caso de incidente de segurança que afete seus dados, notificaremos os usuários afetados e a
              Autoridade Nacional de Proteção de Dados (ANPD) nos prazos legais.
            </p>
          </Section>

          <Section title="9. Menores de idade">
            <p>
              O Plakr não é destinado a menores de 13 anos. Não coletamos intencionalmente dados de crianças.
              Se identificarmos que um menor cadastrou-se na plataforma, excluiremos os dados imediatamente.
            </p>
          </Section>

          <Section title="10. Alterações nesta política">
            <p>
              Podemos atualizar esta Política periodicamente. Quando houver alterações relevantes, notificaremos
              os usuários por e-mail ou por aviso na plataforma. A data da última atualização estará sempre
              indicada no topo deste documento.
            </p>
          </Section>

          <Section title="11. Contato">
            <p>Para dúvidas, solicitações ou reclamações relacionadas à privacidade:</p>
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
            <Link href="/terms" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link href="/privacy" className="hover:text-white transition-colors" style={{ color: "#FFB800" }}>Privacidade</Link>
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

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl mt-3" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-white">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3" style={{ color: "#9CA3AF" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
