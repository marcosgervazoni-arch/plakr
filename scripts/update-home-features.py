#!/usr/bin/env python3
"""Update Home.tsx: add Para quem é section, update Features grid."""

with open('client/src/pages/Home.tsx', 'r') as f:
    content = f.read()

# Find the features section by the unique comment line (with em-dashes)
# The comment has varying number of em-dashes, use a reliable anchor
FEATURES_START = '      {/* \u2500\u2500 FEATURES \u2500\u2500\u2500'
FEATURES_END = '      )}\n\n      {/* \u2500\u2500 PLANOS'

start_idx = content.find(FEATURES_START)
end_idx = content.find(FEATURES_END)

if start_idx == -1:
    print(f'ERROR: Could not find FEATURES start marker')
    exit(1)
if end_idx == -1:
    print(f'ERROR: Could not find FEATURES end marker (PLANOS)')
    exit(1)

print(f'Found Features section: lines {content[:start_idx].count(chr(10))+1} to {content[:end_idx].count(chr(10))+1}')

old_features_block = content[start_idx:end_idx]

new_block = '''      {/* \u2500\u2500 PARA QUEM \u00c9 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <section className="py-20" style={{ background: "#0D1120" }} aria-labelledby="section-para-quem-e">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 id="section-para-quem-e" className="text-3xl md:text-4xl font-black mb-4">
              Para quem \u00e9 o{" "}
              <span style={{ color: "#FFB800" }}>Plakr!</span>
            </h2>
            <p className="text-lg" style={{ color: "#9CA3AF" }}>
              Dois perfis. Duas experi\u00eancias. Uma plataforma.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Card Organizador */}
            <div className="rounded-2xl p-8" style={{ background: "#121826", border: "2px solid #FFB800", boxShadow: "0 0 40px rgba(255,184,0,0.08)" }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
                style={{ background: "rgba(255,184,0,0.1)", border: "1px solid rgba(255,184,0,0.3)", color: "#FFB800" }}>
                <Crown size={12} />
                Para organizadores
              </div>
              <h3 className="text-xl font-black text-white mb-2">Voc\u00ea organiza. A plataforma cuida do resto.</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#9CA3AF" }}>
                Crie o bol\u00e3o, convide a galera e acompanhe tudo sem planilha, sem cobran\u00e7a manual, sem dor de cabe\u00e7a.
                Com o Pro, crie seu pr\u00f3prio campeonato \u2014 do bairro \u00e0 empresa.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  { icon: Trophy, text: "Bol\u00f5es para qualquer campeonato global" },
                  { icon: Crown, text: "Campeonato personalizado com seus times e fases" },
                  { icon: DollarSign, text: "Taxa de inscri\u00e7\u00e3o com controle de pagamento integrado" },
                  { icon: BarChart3, text: "Ranking atualizado automaticamente a cada resultado" },
                  { icon: Users, text: "Convite por link ou c\u00f3digo de 6 d\u00edgitos" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm">
                    <Icon size={15} style={{ color: "#FFB800", flexShrink: 0 }} />
                    <span style={{ color: "#D1D5DB" }}>{text}</span>
                  </li>
                ))}
              </ul>
              <a href={loginUrl} className="block">
                <button className="w-full flex items-center justify-center gap-2 font-bold text-base px-6 py-3 rounded-lg transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}>
                  Criar bol\u00e3o gr\u00e1tis
                  <ArrowRight size={16} />
                </button>
              </a>
            </div>

            {/* Card Participante */}
            <div className="rounded-2xl p-8" style={{ background: "#121826", border: "2px solid rgba(255,184,0,0.3)", boxShadow: "0 0 30px rgba(255,184,0,0.04)" }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
                style={{ background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.2)", color: "#FFB800" }}>
                <Star size={12} />
                Para participantes
              </div>
              <h3 className="text-xl font-black text-white mb-2">Aposte com mais intelig\u00eancia. Ganhe com mais estilo.</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#9CA3AF" }}>
                Palpite com an\u00e1lises de IA antes de cada jogo. Desafie rivais em duelos X1.
                Colecione badges e dispute o topo do ranking. Com o Passe VIP, sem an\u00fancios e com IA ilimitada.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  { icon: Brain, text: "An\u00e1lise pr\u00e9-jogo com probabilidades reais geradas por IA" },
                  { icon: Swords, text: "Duelos X1: desafie quem voc\u00ea quiser dentro do bol\u00e3o" },
                  { icon: Award, text: "Badges e conquistas por desempenho" },
                  { icon: Globe, text: "Campeonatos globais: Copa do Mundo, Brasileir\u00e3o, Champions" },
                  { icon: Star, text: "Passe VIP: sem an\u00fancios, IA ilimitada, acesso antecipado" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm">
                    <Icon size={15} style={{ color: "#FFB800", flexShrink: 0 }} />
                    <span style={{ color: "#D1D5DB" }}>{text}</span>
                  </li>
                ))}
              </ul>
              <a href={user ? "/upgrade#vip" : upgradeLoginUrl} className="block">
                <button className="w-full flex items-center justify-center gap-2 font-bold text-base px-6 py-3 rounded-lg transition-all hover:opacity-90"
                  style={{ background: "rgba(255,184,0,0.12)", border: "1px solid rgba(255,184,0,0.4)", color: "#FFB800" }}>
                  <Star size={16} />
                  Ativar Passe VIP
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* \u2500\u2500 FEATURES \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      {(config?.sectionFeaturesEnabled ?? true) && (
        <CustomOrDefault customCode={config?.featuresCustomCode}>
          <section className="py-20" aria-labelledby="section-features">
            <div className="max-w-6xl mx-auto px-4">
              <div className="text-center mb-14">
                <h2 id="section-features" className="text-3xl md:text-4xl font-black mb-4">
                  Tudo que voc\u00ea precisa para um{" "}
                  <span style={{ color: "#FFB800" }}>bol\u00e3o \u00e9pico</span>
                </h2>
                <p className="text-lg" style={{ color: "#9CA3AF" }}>
                  Funcionalidades pensadas para organizadores e participantes.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FeatureCard icon={Trophy} title="Ranking autom\u00e1tico"
                  description="Pontua\u00e7\u00e3o calculada automaticamente ap\u00f3s cada resultado. Acompanhe a disputa jogo a jogo." highlight />
                <FeatureCard icon={Brain} title="An\u00e1lise pr\u00e9-jogo com IA"
                  description="Probabilidades reais, forma dos times e confrontos diretos. Palpite com mais intelig\u00eancia." highlight />
                <FeatureCard icon={Swords} title="Duelos X1"
                  description="Desafie um rival direto dentro do bol\u00e3o. Quem pontuar mais na rodada, vence o duelo." highlight />
                <FeatureCard icon={Users} title="Convite f\u00e1cil"
                  description="Link direto ou c\u00f3digo de 6 d\u00edgitos. A galera entra em segundos, sem precisar criar conta antes." />
                <FeatureCard icon={DollarSign} title="Taxa de inscri\u00e7\u00e3o"
                  description="Defina um valor de entrada e controle quem pagou diretamente na plataforma. Sem planilha." />
                <FeatureCard icon={BarChart3} title="Estat\u00edsticas detalhadas"
                  description="Aproveitamento, placares exatos, zebras acertadas, goleadas. Perfil completo de cada apostador." />
                <FeatureCard icon={Award} title="Conquistas e badges"
                  description="Sistema de gamifica\u00e7\u00e3o com badges por desempenho. Quem acerta mais, sobe de n\u00edvel." />
                <FeatureCard icon={Settings} title="Regras customiz\u00e1veis"
                  description="No Pro, voc\u00ea define quantos pontos vale cada tipo de acerto. Deixe o bol\u00e3o do seu jeito." />
                <FeatureCard icon={Crown} title="Campeonato personalizado"
                  description="Crie seu pr\u00f3prio torneio com times, fases e resultados. Exclusivo do plano Pro." highlight />
              </div>
            </div>
          </section>
        </CustomOrDefault>
      )}'''

new_content = content[:start_idx] + new_block + content[end_idx:]

with open('client/src/pages/Home.tsx', 'w') as f:
    f.write(new_content)

print(f'SUCCESS: Replaced {len(old_features_block)} chars with {len(new_block)} chars')
print(f'New file size: {len(new_content)} chars')
