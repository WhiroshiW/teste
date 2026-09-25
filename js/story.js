// ============================================================
// SANTA LÚCIA - Equipe Nakamura - Roteiro: diálogos, diário, objetivos, finais
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

export const INTRO_CLARA = [
  { who: 'n', text: '23:40. Estrada da Serra da Mantiqueira. Tempestade torrencial.' },
  { who: 'clara', text: 'Droga... as árvores caíram na pista. O carro derrapou nas pedras do portão.' },
  { who: 'clara', text: 'O Sanatório Santa Lúcia deveria estar em ruínas há anos... mas há luzes acesas no topo.' },
  { who: 'clara', text: 'Dr. Alencastro... eu sei o que você fazia com os pacientes naquelas caldeiras.' },
  { who: 'radio', text: '...chiado... Dra. Mendes... se estiver me ouvindo... não entre pelo saguão principal... o portão da floresta...' },
  { who: 'clara', text: 'O rádio do Bento! Preciso encontrar a passagem pela Capela ou pelo Porão e recuperar os dossiês antes que tudo desmorone.' },
];

export const INTRO_BENTO = [
  { who: 'n', text: '02:15 da madrugada. Os alarmes das caldeiras dispararam.' },
  { who: 'bento', text: 'As luzes estão oscilando... O Dr. Alencastro perdeu o controle dos testes.' },
  { who: 'bento', text: 'Preciso pegar minha chave mestra, religar o gerador e trancar o portão da floresta antes que essas aberrações cheguem à cidade.' },
  { who: 'bento', text: 'Aguente firme, Lúcia... o Bento vai tentar segurar isso.' },
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

  // ================= ENCONTRO DANIEL & CLARA (CUTSCENE) =================
  encontro_daniel: [
    { who: 'n', text: 'Uma silhueta se move na penumbra da Capela... armando o cão de um revólver.' },
    { who: 'clara', text: 'Fique onde está! Dê mais um passo e eu atiro!' },
    { who: 'daniel', text: 'Espere! Eu sou humano! Não sou uma daquelas coisas!' },
    { who: 'clara', text: '...Você fala. E respira. Quem é você? Como entrou aqui?' },
    { who: 'daniel', text: 'Meu nome é Daniel. Eu... eu estou procurando minha irmã, Lúcia.' },
    { who: 'clara', text: 'Lúcia?! ...Meu Deus. A paciente do quarto 3. O Alencastro falava que a família tinha desistido dela.' },
    { who: 'daniel', text: 'Eu nunca desisti! Eles me proibiram de visitá-la!' },
    { who: 'clara', text: 'Eu sou a Dra. Clara Mendes. Tentei parar os experimentos dele, mas era tarde demais.' },
    { who: 'clara', text: 'Tome esta CHAVE DO PORTÃO DE FERRO. Dá acesso aos jardins e ao cemitério onde ele escondia os corpos. Vá, Daniel. Eu vou descer às caldeiras para dar um fim no monstro que ele se tornou.' },
    { who: 'daniel', text: 'Obrigado, Dra. Clara. Tome cuidado lá embaixo.' },
  ],
  encontro_clara: [
    { who: 'n', text: 'Passos apressados ecoam pelo piso da Capela.' },
    { who: 'clara', text: 'Parado! Identifique-se!' },
    { who: 'daniel', text: 'Espere! Eu sou humano! Não sou uma daquelas coisas!' },
    { who: 'clara', text: 'Um rapaz... segurando uma arma trêmula. Você... é o irmão da paciente Lúcia Silva.' },
    { who: 'daniel', text: 'Você conheceu a minha irmã?! Onde ela está?!' },
    { who: 'clara', text: 'Tome esta chave do portão de ferro. Dá acesso aos jardins e ao cemitério onde ele escondia os corpos. Vá, Daniel. Eu vou descer às caldeiras para dar um fim no monstro que ele se tornou.' },
    { who: 'clara', text: 'Se você encontrar o Bento... diga a ele que eu cumpri minha promessa.' },
  ],

  // ================= INTERAÇÕES DA FLORESTA & CAPELA =================
  carro_clara: [
    { who: 'clara', text: 'Meu velho sedan azul. O radiador furou na batida contra o mourão.' },
    { who: 'n', text: 'No porta-malas amassado: munição sobressalente e suprimentos médicos de emergência.' },
  ],
  tumulo_lucia: [
    { who: 'n', text: 'Uma lápide de mármore gasta sob a copa de um salgueiro retorcido.' },
    { who: 'n', text: '"Lúcia Silva — 1994-2016. Que as estrelas guardem o teu sorriso suave."' },
    { who: 'daniel', text: 'Lúcia... finalmente te encontrei. Me perdoa por ter demorado tanto.' },
    { who: 'n', text: 'Entre as flores secas, repousa o MEDALHÃO DE LÚCIA com um Fragmento de Memória reluzente.' },
    { who: 'q', text: 'Você veio até o fim, Daniel. A tempestade está quase acabando.' },
  ],
  cabana_bento: [
    { who: 'n', text: 'A guarita de ferramentas do zelador Bento.' },
    { who: 'bento', text: '"Se alguém estiver lendo isso: os disjuntores das caldeiras esquentaram demais. Não desçam sem água nas tubulações. Bento."' },
    { who: 'n', text: 'Sobre a bancada de madeira: uma FITA DE TINTA para registrar o progresso.' },
  ],
  altar_capela: [
    { who: 'n', text: 'O altar de mármore sob o vitral gótico cintilante.' },
    { who: 'n', text: 'Uma inscrição em latim: "Lux in tenebris lucet" — A luz brilha nas trevas.' },
    { who: 'n', text: 'Você sente uma serenidade profunda ao lado desta mesa sagrada.' },
  ],
  confessionario: [
    { who: 'n', text: 'Um confessionário de carvalho escuro com marcas de unhas na portinhola.' },
    { who: 'medico', text: '"Gravação de Alencastro: Eu não sinto remorso. A depressão é uma falha química que só pode ser extirpada pelo choque absoluto. Se eles quebrarem... construiremos homens sem fraquezas."' },
    { who: 'daniel', text: 'Ele era um monstro completo. Tratava seres humanos como objetos de teste.' },
  ],
  anjo_capela: [
    { who: 'n', text: 'Uma estátua de anjo de pedra calcária com os olhos vendados por uma fita cinzenta.' },
    { who: 'n', text: '"A justiça divina não precisa de olhos para julgar o coração dos homens."' },
  ],
  typewriter_safe: [
    { who: 'n', text: 'Você se aproxima da velha máquina de escrever. O som do rolete de ferro traz uma sensação profunda de segurança.' },
    { who: 'n', text: 'Enquanto você estiver nesta sala, nenhuma criatura da noite ousará cruzar o umbral.' },
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
  diario_texto: (idx) => {
    const paginas = [
      // Página 0 (Quarto 3)
      [
        { who: 'n', text: 'PÁGINA DO DIÁRIO (1/8) — 12 DE JANEIRO' },
        { who: 'lucia', text: 'O quarto é pequeno, mas a janela dá para os pinheiros da serra.' },
        { who: 'lucia', text: 'O Daniel me prometeu que quando a primavera chegar, nós vamos voltar para casa.' },
        { who: 'lucia', text: 'Eu finjo que acredito para ele não chorar no ônibus de volta.' },
        { who: 'daniel', text: 'Lúcia... eu devia ter te tirado daqui no primeiro dia...' },
      ],
      // Página 1 (Saguão)
      [
        { who: 'n', text: 'PÁGINA DO DIÁRIO (2/8) — 28 DE MARÇO' },
        { who: 'lucia', text: 'O saguão fica cheio de parentes nos domingos. Eu fico no canto, olhando a estátua de Santa Lúcia.' },
        { who: 'lucia', text: 'O padre disse que ela entregou os próprios olhos por amor. Às vezes acho que eu perdi os meus por medo da vida.' },
        { who: 'daniel', text: 'Você nunca esteve errada em sentir medo, Lúcia. O mundo lá fora foi cruel demais com você.' },
      ],
      // Página 2 (Enfermaria - Ala Oeste)
      [
        { who: 'n', text: 'PÁGINA DO DIÁRIO (3/8) — 14 DE MAIO' },
        { who: 'lucia', text: 'As noites na enfermaria são longas demais. Ouço passos arrastados e gritos sufocados no corredor do porão.' },
        { who: 'lucia', text: 'O Daniel me trouxe o ursinho de pano escondido no casaco de chuva. Ele tem tanto medo de me perder... e eu tenho tanto medo de ficar.' },
      ],
      // Página 3 (Enfermaria - Leito 3)
      [
        { who: 'n', text: 'PÁGINA DO DIÁRIO (4/8) — 02 DE JULHO' },
        { who: 'lucia', text: 'Dr. Matias me chamou para a sala fechada. Ele anota tudo numa prancheta de metal e não olha nos meus olhos.' },
        { who: 'lucia', text: 'Perguntou se eu ainda queria viver. Eu não soube o que responder. Viver dói tanto... mas ver o Daniel sofrer por minha causa dói o dobro.' },
      ],
      // Página 4 (Consultório)
      [
        { who: 'n', text: 'PÁGINA DO DIÁRIO (5/8) — 19 DE AGOSTO' },
        { who: 'lucia', text: 'Ouvi o Dr. Alencastro conversando sobre o porão e a máquina de terapia eletroconvulsiva.' },
        { who: 'lucia', text: 'Eles acham que apagar memórias cura a dor. Mas se apagarem tudo o que eu lembro do meu irmão, o que sobra de mim? Quem vai se lembrar de quem eu fui?' },
      ],
      // Página 5 (Porão - Caldeiras)
      [
        { who: 'n', text: 'PÁGINA DO DIÁRIO (6/8) — 07 DE SETEMBRO' },
        { who: 'lucia', text: 'O porão é gelado e cheira a ferrugem e água estagnada. O Dr. Alencastro trancou os prontuários dos pacientes transferidos lá no fundo.' },
        { who: 'lucia', text: 'Eu vi os nomes de quem nunca mais subiu. Daniel... se você estiver lendo isso... não confie nos médicos.' },
      ],
      // Página 6 (Porão - Tubulações)
      [
        { who: 'n', text: 'PÁGINA DO DIÁRIO (7/8) — 23 DE SETEMBRO' },
        { who: 'lucia', text: 'As caldeiras rugem a noite toda como uma fera faminta. Não sinto mais o calor das minhas mãos.' },
        { who: 'lucia', text: 'Mas encontrei forças para esconder a manivela e a chave. A verdade sobre o Santa Lúcia não pode morrer soterrada nesta montanha.' },
      ],
      // Página 7 (Terraço)
      [
        { who: 'n', text: 'PÁGINA DO DIÁRIO (8/8) — 14 DE OUTUBRO' },
        { who: 'lucia', text: 'Última folha. O terraço é o único lugar onde ainda sinto o vento da serra no rosto. A névoa parece um abraço que não julga.' },
        { who: 'lucia', text: 'Se eu não estiver mais aqui quando você voltar, Daniel... saiba que eu te perdoo. Por favor, aprenda a se perdoar também. Viva por nós dois.' },
        { who: 'daniel', text: 'Eu vou viver, Lúcia. Eu prometo. Eu finalmente entendi.' },
      ],
    ];
    return paginas[idx] || [
      { who: 'n', text: `PÁGINA DO DIÁRIO (${(idx || 0) + 1}/8)` },
      { who: 'lucia', text: 'A caligrafia está desbotada pelo mofo e pela umidade do sanatório...' },
    ];
  },
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
export function objectiveFor(f, campaign = 'daniel') {
  if (campaign === 'clara') {
    if (f.bossDead) return 'O Dr. Alencastro foi derrotado! Atravesse o portal de luz nas caldeiras e escape.';
    if (f.chapelEncounterMet) return 'Desça às caldeiras do porão e enfrente o Dr. Alencastro!';
    if (f.luciaLocketGot) return 'Vá até a Capela no final do caminho para encontrar Daniel.';
    return 'Explore os jardins da floresta, examine o túmulo de Lúcia e encontre Daniel na Capela.';
  }
  if (campaign === 'bento') {
    if (f.bossDead) return 'O turno terminou. As caldeiras foram salvas e as criaturas eliminadas!';
    return 'Elimine as aberrações nas caldeiras do porão e proteja as passagens de serviço!';
  }

  const frags = (f.frags || []).filter(Boolean).length;
  if (f.bossDead) return 'O VULTO foi derrotado! Atravesse o portal de luz no terraço.';
  if (f.memorialOpen) return 'Derrote o VULTO com sua escopeta e armas!';
  if (frags >= 4 && f.fuseOn) return 'Suba de elevador e ative o memorial de memórias no terraço.';
  if (frags >= 4 && !f.fuseOn) return 'Instale o FUSÍVEL 30A no quadro de força da enfermaria para ligar o elevador.';
  if (f.valveOpen) return `Água drenada! Vasculhe o engradado no fundo do porão. Fragmentos: ${frags}/4.`;
  if (f.poraoOpen) return `Desça ao porão e use a MANIVELA na válvula para drenar a água. Fragmentos: ${frags}/4.`;
  if (f.safeOpened) return `Use a CHAVE DO PORÃO para abrir a porta oeste do saguão. Fragmentos: ${frags}/4.`;
  if (f.hasFuse) return 'Você tem o FUSÍVEL! Leve-o ao quadro de força na enfermaria.';
  if (f.consultOpen) return `Explore o consultório do Dr. Alencastro. Abra o cofre (senha: data da gaveta). Fragmentos: ${frags}/4.`;
  if (f.rustKey) return `Use a CHAVE ENFERRUJADA na porta norte da enfermaria. Fragmentos: ${frags}/4.`;
  if (f.pistol) return 'Vá ao saguão. Examine a estátua central para encontrar a chave do consultório.';
  if (f.bedKey) return 'Abra a gaveta trancada com a Chave Pequena para se armar.';
  return 'Vasculhe a cama do quarto para encontrar a Chave Pequena da gaveta.';
}

export const OBJECTIVES = objectiveFor;

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

export const END_CLARA_GOOD = [
  { who: 'n', text: 'O corpo mutado do Dr. Alencastro desaba sobre as engrenagens das caldeiras, dissolvendo-se em cinzas.' },
  { who: 'clara', text: 'Acabou, Alencastro. A dor não é uma doença a ser destruída com crueldade. É um sinal de que estamos vivos.' },
  { who: 'n', text: 'Clara carrega as pastas com os prontuários e as fitas de áudio em direção ao pátio da floresta.' },
  { who: 'clara', text: 'O sol desponta tímido entre as árvores da serra. Os nomes de Lúcia e dos outros pacientes serão lembrados com honra.' },
  { who: 'n', text: 'FINAL: REDENÇÃO MÉDICA — A Dra. Clara entregou o dossiê ao Ministério Público. O complexo foi demolido e uma fundação de acolhimento psicológico foi erguida em seu lugar.' },
];

export const END_CLARA_NORMAL = [
  { who: 'n', text: 'Com as caldeiras em chamas, Clara corre pelo alçapão e alcança os portões da floresta.' },
  { who: 'clara', text: 'Eu sobrevivi... mas quantos ficaram para trás? A escuridão ainda ecoa na serra.' },
  { who: 'n', text: 'FINAL: FUGA NA MADRUGADA — Clara escapou com vida. O fogo consumiu as ruínas, mas o peso do que viu naquela noite a acompanhará para sempre.' },
];

export const END_BENTO = [
  { who: 'n', text: 'Com as mãos trêmulas e ensanguentadas, o velho Bento passa a grossa corrente de ferro pelo portão dos fundos.' },
  { who: 'bento', text: 'O cadeado fechou... O alarme silenciou. Nenhuma criatura vai sair daqui.' },
  { who: 'bento', text: 'Ele se senta na cadeira da guarita, observando a garoa cair sobre o jardim.' },
  { who: 'bento', text: '"Bom descanso, meninos e meninas... O tio Bento vigiou o último turno."' },
  { who: 'n', text: 'FINAL: O ÚLTIMO TURNO — O sacrifício silencioso de um homem simples salvou centenas de vidas anônimas na cidade adormecida.' },
];

export const HELP_ROWS = [
  ['W / ↑', 'Andar para frente'],
  ['S / ↓', 'Andar para trás'],
  ['A / ← — D / →', 'Girar (controles tanque)'],
  ['V ou C', 'Alternar Câmera (Fixa PS1 / 3ª Pessoa GTA)'],
  ['SHIFT', 'Correr (segurar)'],
  ['ESPAÇO', 'Mirar com a arma (segurar)'],
  ['J ou clique', 'Atirar (enquanto mira)'],
  ['E', 'Interagir / confirmar / avançar texto'],
  ['TAB ou I', 'Inventário'],
  ['Q', 'Examinar item (no inventário)'],
  ['ESC ou P', 'Pausar'],
  ['ENTER', 'Avançar texto / confirmar'],
];
