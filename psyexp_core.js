
export const PsyExpBaseConfig = (scenes) => {
    return {
	type: Phaser.WEBGL,
	antialias: true,
	width: 1920,
	height: 1000,
	backgroundColor: '#000000',
	scene: scenes,
	fps: {
		min: 60,
		target: 60,
	},
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER,
		orientation: 'landscape',
	},
    }
};

const db_url = "https://obxyvfzojhcpfeeoxrez.supabase.co"
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHl2ZnpvamhjcGZlZW94cmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAxMTE1MTIsImV4cCI6MjAzNTY4NzUxMn0.a6-Ff7bzShSloowgJMxVCyB8DACAVOy5_P2a3hhRBBY";

export const db = supabase.createClient(db_url, token);

function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

function random_word() {
    return palavras[Math.floor(Math.random() * palavras.length)];
}

function make_nickname() {
  return Array(2).fill().map((v) => random_word()).join(" ");
}

const palavras = [
    "amor", "amizade", "carinho", "alegria", "sorriso", "felicidade", "tristeza", "raiva", "medo", "esperança",
    "saudade", "abraço", "beijo", "paz", "guerra", "música", "dança", "canto", "riso", "choro",
    "coração", "alma", "vida", "morte", "nascer", "viver", "sonho", "realidade", "tempo", "memória",
    "lembrança", "esquecimento", "natureza", "flor", "árvore", "fruta", "terra", "água", "fogo", "ar",
    "vento", "chuva", "sol", "lua", "estrela", "céu", "mar", "rio", "lago", "montanha",
    "campo", "cidade", "vila", "aldeia", "estrada", "caminho", "viagem", "destino", "origem", "história",
    "conta", "livro", "página", "palavra", "letra", "frase", "texto", "escrita", "leitura", "biblioteca",
    "escola", "professor", "aluno", "aula", "lição", "aprendizado", "conhecimento", "sabedoria", "ciência", "arte",
    "pintura", "escultura", "fotografia", "cinema", "teatro", "poesia", "prosa", "romance", "conto", "crônica",
    "ensaio", "jornal", "revista", "notícia", "reportagem", "entrevista", "opinião", "debate", "discussão", "conversa",
    "diálogo", "monólogo", "palco", "plateia", "aplausos", "silêncio", "som", "ruído", "barulho", "voz",
    "paladar", "olfato", "visão", "audição", "tato", "percepção", "sensação", "emoção", "sentimento", "pensamento",
    "ideia", "conceito", "teoria", "prática", "experiência", "experimento", "descoberta", "invenção", "criação", "desenho",
    "modelo", "projeto", "plano", "estratégia", "tática", "objetivo", "meta", "propósito", "intenção", "motivo",
    "causa", "efeito", "consequência", "resultado", "sucesso", "fracasso", "vitória", "derrota", "ganho", "perda",
    "lucro", "prejuízo", "dinheiro", "riqueza", "pobreza", "fortuna", "miséria", "trabalho", "emprego", "profissão",
    "carreira", "ocupação", "atividade", "negócio", "empresa", "firma", "indústria", "comércio", "mercado", "venda",
    "compra", "troca", "transação", "negociação", "contrato", "acordo", "aliança", "parceria", "sociedade", "comunidade",
    "grupo", "equipe", "time", "família", "parentes", "amigos", "colegas", "conhecidos", "vizinho", "habitante",
    "cidadão", "estrangeiro", "turista", "viajante", "passageiro", "condutor", "motorista", "pedestre", "ciclista", "esportista",
    "atleta", "jogador", "torcedor", "árbitro", "treinador", "capitão", "líder", "chefe", "diretor", "gerente"
];

export const run_id = makeid(10);




export const nickname = make_nickname();
