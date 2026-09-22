// ============================================================
// ECOS DO VAZIO - Roteiro: diálogos, diário, objetivos, finais
// Todos os textos do jogo em PT-BR.
// Linha: { who:'daniel'|'lucia'|'medico'|'vulto'|'q'|'n', text:'...' }
// who 'n' = narrador (sem retrato). 'q' = voz desconhecida.
// ============================================================

export const INTRO = [
  { who: 'n', text: 'A chuva não parava naquela noite. Como não parava dentro de mim.' },
  { who: 'n', text: 'Dizem que a depressão é um quarto escuro onde a gente se tranca por dentro.' },
  { who: 'n', text: 'O meu quarto tinha o nome do lugar onde tudo começou: o Sanatório Santa Lúcia.' },
  { who: 'daniel', text: 'Eu... eu acordei aqui. De novo. Este lugar não existe mais. Foi demolido há dez anos.' },
  { who: 'q', text: 'Daniel... me encontra... antes que a luz apague de vez...' },
  { who: 'daniel', text: 'Lúcia?! ...Não. É só a minha cabeça. É sempre só a minha cabeça.' },
  { who: 'n', text: 'Encontre os 4 FRAGMENTOS DE MEMÓRIA. Acenda o memorial. E, por favor... não desista.' },
];

export const D = {
  cama_locked: [
    { who: 'daniel', text: 'Minha cama de quando eu era interno aqui. O colchão afunda no meio, como naquela época.' },
  ],
  cama_key: [
    { who: 'n', text: 'Há algo duro sob o travesseiro...' },
    { who: 'daniel', text: 'Uma chave pequena. Eu escondia coisas aqui para as enfermeiras não levarem.' },
  ],
  cama_after: [
    { who: 'daniel', text: 'Nada mais aqui. Só o cheiro de mofo e remédio.' },
  ],
  gaveta_locked: [
    { who: 'n', text: 'A gaveta está trancada. Precisa de uma CHAVE PEQUENA.' },
  ],
  gaveta_open: [
    { who: 'n', text: 'Dentro da gaveta: uma pistola, balas, comprimidos e um bilhete amarelado.' },
    { who: 'daniel', text: '"Lúcia — 14 de fevereiro. O dia em que a neve caiu. Eu nunca esqueço." ...O aniversário dela.' },
    { who: 'daniel', text: 'Uma arma... É. Vou precisar. As sombras deste lugar têm fome.' },
  ],
  gaveta_after: [
    { who: 'daniel', text: 'A gaveta está vazia agora.' },
  ],
  urso_frag: [
    { who: 'daniel', text: 'O urso da Lúcia... Ela o levava para todo lugar. Como ele veio parar aqui?' },
    { who: 'n', text: 'Algo brilha dentro da costura rasgada do urso: um FRAGMENTO DE MEMÓRIA.' },
    { who: 'q', text: 'Um de quatro, Daniel. Guarde com carinho. Memórias boas também pesam.' },
  ],
  urso_after: [
    { who: 'daniel', text: 'Desculpa, Lúcia. Por tudo. Principalmente por não ter ficado.' },
  ],
  relogio: [
    { who: 'n', text: 'O relógio está parado nas 3:07 — a hora em que tudo aconteceu.' },
    { who: 'daniel', text: 'Aqui dentro o tempo não anda. Ele só... repete.' },
  ],
  janela_quarto: [
    { who: 'n', text: 'Lá fora só há névoa e chuva. O jardim do sanatório afundou nela há muito tempo.' },
    { who: 'daniel', text: 'Às vezes eu acho que a névoa sou eu.' },
  ],
  estatua_key: [
    { who: 'daniel', text: 'A estátua da Santa Lúcia, padroeira dos olhos. "Para que enxerguem na escuridão", dizia a placa.' },
    { who: 'n', text: 'Atrás da base da estátua há uma CHAVE ENFERRUJADA.' },
    { who: 'daniel', text: 'Deve ser do consultório do Dr. Matias. Ele trancava tudo, até os próprios erros.' },
  ],
  estatua_after: [
    { who: 'daniel', text: 'Me ajuda a enxergar, santa. Porque aqui dentro está muito escuro.' },
  ],
  escada: [
    { who: 'n', text: 'A escada para o segundo andar desabou. Só restam ferros retorcidos.' },
    { who: 'daniel', text: 'O andar de cima era onde ficavam os "casos graves". Eu era um deles.' },
  ],
  vaso: [
    { who: 'n', text: 'Dentro do vaso há um frasco de COMPRIMIDOS esquecido.' },
    { who: 'daniel', text: 'Eu escondia remédio em todo canto. Tomar era admitir que eu precisava. Eu precisava.' },
  ],
  vaso_after: [
    { who: 'daniel', text: 'Só poeira agora.' },
  ],
  diario_noribbon: [
    { who: 'n', text: 'Um diário gasto sobre a mesa. Sem uma FITA DE TINTA, não dá para registrar nada.' },
  ],
  quadro_falta: [
    { who: 'n', text: 'O quadro de força está aberto. Falta o FUSÍVEL principal.' },
    { who: 'daniel', text: 'Sem energia, o elevador do saguão é só uma caixa de metal.' },
  ],
  quadro_ok: [
    { who: 'n', text: 'Você encaixa o FUSÍVEL. Um estalo seco... e as luzes do saguão voltam a respirar.' },
    { who: 'daniel', text: 'Energia. O elevador deve estar funcionando agora.' },
  ],
  quadro_after: [
    { who: 'daniel', text: 'O quadro ronrona baixinho. Energia estável.' },
  ],
  armario: [
    { who: 'n', text: 'Dentro do armário de remédios: uma MANIVELA de ferro e um FRAGMENTO DE MEMÓRIA.' },
    { who: 'daniel', text: 'Dois de quatro... Cada fragmento dói como uma lembrança que eu enterrei.' },
  ],
  armario_after: [
    { who: 'daniel', text: 'Só frascos vazios. Cheiro de álcool e arrependimento.' },
  ],
  cama3: [
    { who: 'n', text: 'Leito 3. Lençóis dobrados com capricho, como se o paciente fosse voltar.' },
    { who: 'daniel', text: 'Era o meu leito. Eu dobrava assim para fingir que estava tudo sob controle.' },
  ],
  cadeira_rodas: [
    { who: 'daniel', text: 'A cadeira do Seu Ernesto. Ele dizia que as pernas dele tinham desistido antes do coração.' },
    { who: 'daniel', text: 'No fim, o coração dele também desistiu. Espero que ele tenha descansado.' },
  ],
  cortina: [
    { who: 'n', text: 'Atrás da cortina rasgada não há nada. Só uma mancha no formato de alguém sentado.' },
  ],
  poema: [
    { who: 'n', text: 'Um poema datilografado, assinado "M.":' },
    { who: 'medico', text: '"No dia em que a neve caiu sobre o lago, catorze de fevereiro, o mundo calou. Guardei no cofre o que não pude dizer: a chave e a culpa, para me proteger."' },
    { who: 'daniel', text: 'Dr. Matias... Até ele sabia. 14 de fevereiro. 1-4-0-2. A senha do cofre.' },
  ],
  cofre_ok: [
    { who: 'n', text: 'O cofre se abre com um suspiro metálico. Dentro: a CHAVE DO PORÃO e cartuchos de escopeta.' },
    { who: 'daniel', text: 'O porão... É lá que ele guardava os arquivos proibidos. E, dizem, outras coisas.' },
  ],
  cofre_vazio: [
    { who: 'daniel', text: 'O cofre está vazio. A culpa, essa ele levou junto.' },
  ],
  quadro_pintura: [
    { who: 'daniel', text: 'O retrato do fundador do sanatório. Os olhos dele parecem me seguir... e me julgar.' },
    { who: 'n', text: 'Atrás da moldura há um FRAGMENTO DE MEMÓRIA escondido.' },
    { who: 'daniel', text: 'Três de quatro. Falta pouco. Aguenta, Daniel.' },
  ],
  quadro_pintura_after: [
    { who: 'daniel', text: 'Pode julgar. Eu mesmo me julgo há dez anos.' },
  ],
  estante: [
    { who: 'n', text: 'Prontuários e mais prontuários. Um deles tem o seu nome — mas as páginas estão em branco.' },
    { who: 'daniel', text: 'Em branco... É assim que eu me sinto na maioria dos dias. Em branco.' },
  ],
  valvula_falta: [
    { who: 'n', text: 'Um registro enferrujado. Sem uma MANIVELA, é impossível girar.' },
  ],
  valvula_ok: [
    { who: 'n', text: 'Você encaixa a MANIVELA e gira com força. A água represada escoa roncando pelo ralo.' },
    { who: 'daniel', text: 'Passagem livre. O que quer que esteja lá atrás... vamos acabar com isso.' },
  ],
  valvula_after: [
    { who: 'daniel', text: 'O registro range, mas a água já foi embora.' },
  ],
  caldeira: [
    { who: 'n', text: 'A caldeira ainda pulsa quente, como um coração teimoso.' },
    { who: 'daniel', text: 'Se uma máquina velha dessas continua batendo, quem sabe eu também consigo.' },
  ],
  engradado: [
    { who: 'n', text: 'No fundo do engradado, entre seringas antigas: o último FRAGMENTO DE MEMÓRIA.' },
    { who: 'q', text: 'Quatro de quatro. Agora suba, Daniel. Me encontre no terraço. Acenda o memorial.' },
  ],
  engradado_after: [
    { who: 'daniel', text: 'Só vidro e ferrugem agora.' },
  ],
  memorial_falta: [
    { who: 'n', text: 'O memorial apagado. Há quatro reentrâncias em forma de lágrima.' },
    { who: 'daniel', text: 'Faltam fragmentos. Eu preciso de todos... preciso de todas as lembranças, até as que doem.' },
  ],
  memorial_ok: [
    { who: 'n', text: 'Você encaixa os quatro fragmentos. O memorial acende numa luz quente...' },
    { who: 'vulto', text: 'VOCÊ NÃO MERECE A LUZ. VOCÊ A DEIXOU MORRER. VOCÊ DESISTIU DELA. DESISTA DE VOCÊ TAMBÉM.' },
    { who: 'daniel', text: 'Não... NÃO! Eu carrego a culpa há dez anos! Mas eu não vou mais obedecer a ela!' },
  ],
  boss_dead: [
    { who: 'n', text: 'O Vulto se desfaz em cinza e silêncio. Pela primeira vez, a chuva diminui.' },
    { who: 'lucia', text: 'Você conseguiu, mano. Agora vem. Atravessa a luz. E lá fora... continua. Por mim, continua.' },
  ],
  beirada: [
    { who: 'n', text: 'Do terraço se vê a cidade acesa lá embaixo, pequena e distante.' },
    { who: 'daniel', text: 'Tem gente lá embaixo vivendo. Rindo, talvez. Eu... eu quero tentar de novo.' },
    { who: 'n', text: '(Se algum dia a escuridão pesar demais, peça ajuda. No Brasil, ligue 188 — CVV. Você importa.)' },
  ],
  elevador_off: [
    { who: 'n', text: 'O elevador está morto. O painel nem acende.' },
    { who: 'daniel', text: 'Preciso restabelecer a energia. O quadro de força fica na enfermaria.' },
  ],
  porta_trancada: [
    { who: 'n', text: 'Trancada. A fechadura range, mas não cede.' },
  ],
};

// --------------------------- PÁGINAS DO DIÁRIO ---------------------------
export const DIARY = [
  { title: 'Página 1 — Admissão', text: 'Hoje me internaram de novo. O Dr. Matias disse que é "só uma fase". Fase nenhuma dura dez anos. A Lúcia chorou na porta. Eu prometi que ia melhorar. Prometer é fácil. Difícil é levantar da cama.' },
  { title: 'Página 2 — A promessa', text: 'Lúcia me visitou e trouxe o urso dela para "me proteger". Ela tinha 9 anos e entendia mais de cuidado do que todos os médicos juntos. Eu prometi que um dia a gente ia ver a neve. Aqui nunca neva. Mas uma promessa é uma promessa.' },
  { title: 'Página 3 — Leito 3', text: 'O leito 3 é o meu. Decorei cada mancha do teto. Quando a tristeza aperta, eu conto as manchas. Ontem contei 214. Hoje contei 214. Amanhã vou contar de novo. Rotina é a única corda que me segura.' },
  { title: 'Página 4 — Remédios', text: 'Escondi comprimidos no vaso do saguão. Não me orgulho. Tomar remédio parecia admitir derrota. Hoje eu sei: derrota é não pedir ajuda. Tomar é resistir. Anota isso, Daniel: pedir ajuda é resistir.' },
  { title: 'Página 5 — Dr. Matias', text: 'Ouvi o Dr. Matias chorando no consultório. Ele perdeu um paciente ontem. Médicos também quebram. Ele me disse uma vez: "A culpa é um cofre. Se você não abre, ela enferruja por dentro." Vou lembrar disso.' },
  { title: 'Página 6 — A caldeira', text: 'Desci ao porão escondido. A caldeira bate como um coração gigante. Fiquei pensando: se até uma máquina velha continua funcionando, talvez eu também possa. Talvez quebrado não signifique inútil.' },
  { title: 'Página 7 — 14 de fevereiro', text: 'Hoje é aniversário da Lúcia. 14 de fevereiro. Lá fora, dizem que nevou na serra — a primeira neve em 50 anos. Ela sempre quis ver neve. Eu prometi. EU PROMETI. E eu não estava lá.' },
  { title: 'Página 8 — A última', text: 'Se você está lendo isto, é porque eu juntei todas as partes de mim. A culpa, a saudade, o medo... e também o amor. O amor pesa, mas ele também acende. Atravesse a luz, Daniel. E continue. Continue por nós dois.' },
];

export const TIPS = [
  'Controles: W/S anda, A/D gira, SHIFT corre, ESPAÇO mira, J atira, E interage.',
  'Munição é escassa. Às vezes, correr é a melhor arma.',
  'Examine tudo. Memórias se escondem nos cantos.',
  'Registre o progresso no DIÁRIO do saguão (precisa de Fita de Tinta).',
  'A senha do cofre é uma data que Daniel nunca esqueceu...',
];

// ------------------------------ OBJETIVOS ------------------------------
export function objectiveFor(f) {
  const frags = (f.frags || []).filter(Boolean).length;
  if (f.bossDead) return 'Atravesse a luz no terraço.';
  if (f.memorialOpen) return 'Derrote o VULTO!';
  if (frags >= 4 && f.fuseOn) return 'Suba de elevador e acenda o memorial no terraço.';
  if (frags >= 4) return 'Restabeleça a energia e suba ao terraço.';
  if (f.valveOpen) return `Explore o fundo do porão. Fragmentos: ${frags}/4.`;
  if (f.baseKey || f.safeOpened) return `Abra o porão (porta oeste do saguão). Fragmentos: ${frags}/4.`;
  if (f.fuseOn) return 'O elevador funciona! Explore o consultório (porta norte da enfermaria).';
  if (f.hasFuse) return 'Instale o FUSÍVEL no quadro de força da enfermaria.';
  if (f.rustKey) return `Entre no consultório. Fragmentos: ${frags}/4.`;
  if (f.pistol) return 'Explore o saguão e a enfermaria. Encontre 4 Fragmentos de Memória.';
  return 'Vasculhe o quarto. Encontre um jeito de se defender.';
}

export const END_GOOD = [
  { who: 'n', text: 'A luz envolve tudo — quente, sem queimar. Como um abraço demorado.' },
  { who: 'lucia', text: 'Você leu todas as páginas. Você se lembrou de tudo. Até das partes que doíam.' },
  { who: 'lucia', text: 'A tristeza não some para sempre, mano. Mas agora você sabe: ela passa. E você fica.' },
  { who: 'daniel', text: 'Eu vou continuar, Lúcia. Um dia de cada vez. Por nós dois.' },
  { who: 'n', text: 'FINAL: ACEITAÇÃO — Daniel despertou no hospital, de verdade desta vez. E pediu ajuda. E melhorou. Devagar. Mas melhorou.' },
];

export const END_NORMAL = [
  { who: 'n', text: 'A luz envolve tudo — quente, sem queimar. Como um abraço demorado.' },
  { who: 'lucia', text: 'Você atravessou, mano. Mas há páginas suas que você ainda não leu...' },
  { who: 'lucia', text: 'Partes de você ficaram para trás, no escuro. Um dia, volte para buscá-las.' },
  { who: 'daniel', text: 'Eu volto. Eu prometo. Eu estou aprendendo a prometer de novo.' },
  { who: 'n', text: 'FINAL: MEIO CAMINHO — Daniel despertou. Melhor, mas incompleto. Algumas memórias ficaram no sanatório... esperando.' },
];

export const HELP_ROWS = [
  ['W / ↑', 'Andar para frente'],
  ['S / ↓', 'Andar para trás'],
  ['A / ← — D / →', 'Girar (controles tanque)'],
  ['SHIFT', 'Correr (segurar)'],
  ['ESPAÇO', 'Mirar com a arma (segurar)'],
  ['J ou clique', 'Atirar (enquanto mira)'],
  ['E', 'Interagir / confirmar / avançar texto'],
  ['TAB ou I', 'Inventário'],
  ['Q', 'Examinar item (no inventário)'],
  ['ESC ou P', 'Pausar'],
  ['ENTER', 'Avançar texto / confirmar'],
];
