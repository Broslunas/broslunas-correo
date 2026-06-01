const adjectives = [
  "ninja", "electrico", "fantasma", "cosmico", "secreto",
  "veloz", "robotico", "oculto", "magico", "espectral",
  "radioactivo", "cuantico", "espacial", "virtual", "mitico",
  "supremo", "invisible", "turbio", "letal", "silencioso",
  "oscuro", "luminoso", "estelar", "solar", "lunar",
  "errante", "fugaz", "supersonico", "dorado", "plateado",
  "facha", "pachucho", "flipado", "rayado", "enchufado",
  "salado", "majo", "pesao", "cutre", "top", "premium",
  "random", "locardo", "epico", "legendario", "galactico",
  "cansino", "espabilao", "parguela", "panoli", "pringao",
  "tieso", "forrao", "piripi", "monas", "viciao", "tocho",
  "pepino", "fresquito", "cremita", "bestial",
  "brutal", "salvaje", "atomico", "interdimensional", "cyberpunk",
  "vaporwave", "vintage", "retro", "analogico", "digital",
  "explosivo", "venenoso", "crujiente", "pegajoso", "resbaladizo",
];

const nouns = [
  "gato", "perro", "dragon", "lobo", "tigre",
  "aguila", "halcon", "zorro", "oso", "ciber",
  "hacker", "pirata", "fantasma", "alien", "titan",
  "samurai", "caballero", "espartano", "gladiador", "cazador",
  "jaguar", "pantera", "cobra", "fenix", "kraken",
  "chorizo", "croqueta", "albondiga", "paella", "gazpacho",
  "tortilla", "chancleta", "alpargata", "cunao", "paleto",
  "pichon", "perrete", "michu", "chisme", "trasto",
  "cacharro", "engendro", "bicho", "serpiente", "lagarto",
  "rana", "sapo", "pajaro", "paloma", "gaviota",
  "cuervo", "buitre", "cerdo", "vaca", "oveja",
  "cabra", "caballo", "burro", "mula", "conejo",
  "raton", "topo", "ardilla", "erizo", "murcielago",
  "pinguino", "delfin", "ballena", "tiburon", "pulpo",
  "tortuga", "cocodrilo", "dinosaurio", "unicornio",
  "zombie", "vampiro", "esqueleto", "robot",
  "mutante", "clon", "vikingo", "duende", "elfo",
  "enano", "gigante", "trol", "ogro", "goblin",
];

const suffixes = [
  "pro", "master", "boss", "777", "oficial",
  "hacker", "viciado", "powa", "lol", "gg",
];

export function generateFunnyEmailName(): string {
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];

  const useSuffix = Math.random() > 0.7;
  const suffix = useSuffix ? `-${suffixes[Math.floor(Math.random() * suffixes.length)]}` : "";

  const number = Math.random() > 0.5
    ? Math.floor(Math.random() * 90) + 10
    : [42, 77, 99, 0][Math.floor(Math.random() * 4)];

  return `${noun}-${adjective}-${number}${suffix}`.toLowerCase().replace(/\s+/g, '-');
}
