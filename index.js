const fs = require("fs");
const yargs = require("yargs");

yargs
  .usage('Usage: --input "inputFile" --system "gameName" --source "bookName" --output "outputFile" --processSW false --appendStats false')
  .option('input', {
    describe: 'Path to input text file.',
    type: 'string',
    demandOption: true,
  }).option('system', {
    describe: 'Name of the game to be included in parsed monsters.',
    type: 'string',
    demandOption: true,
  }).option('source', {
    describe: 'Name of the sourcebook the monsters are from to be included in parsed monsters.',
    type: 'string',
    demandOption: true,
  }).option('output', {
    describe: 'Path to output text file. (Default = .\\output.txt)',
    type: 'string',
    demandOption: false,
  }).option('processSW', {
    describe: 'Enables extra Swords & Wizardry monster parsing (see readme).',
    type: 'boolean',
    demandOption: false,
  }).option('appendStats', {
    describe: 'If true, an extra stats object is appended to the monster object that includes "hd" and "ac".',
    type: 'boolean',
    demandOption: false,
  }).argv;

const {
  input,
  system,
  source,
  output,
  processSW,
  appendStats,
} = yargs.argv;

processInput(input, output, source);

function processInput(inputFile, outputFile, source) {
  let inputLines = processInputText(fs.readFileSync(inputFile, "utf8"));

  let monsterStartLines = inputLines
    .map((line, ix) => line.match(/^Hit Dice:/i) ? ix - 1 : -1)
    .filter(x => x > -1);

  let monsters = [];

  for (let i = 0; i < monsterStartLines.length; i++) {
    let endIx = -1;

    if (i < monsterStartLines.length - 1) {
      endIx = monsterStartLines[i + 1];
    } else {
      endIx = inputLines.length;
    }

    monsters.push(...parseLinesToMonsters(inputLines.slice(monsterStartLines[i], endIx)));
  }

  // Process all the monsters into the format expected by jet4rpgs.
  monsters.forEach(x => {
    x.content = x.text;
    delete x.content;
    x.system = system;
    x.source = source;

    if (appendStats) {
      x.stats = {
        hd: x.hd,
        ac: x.ac,
      };
    }
  });

  fs.writeFileSync(outputFile, JSON.stringify(monsters, null, 2), "utf8");
}

function parseLinesToMonsters(lines) {
  let hdIx = findLineIxByStartsWith(lines, "Hit Dice:");
  let acIx = findLineIxByStartsWith(lines, "Armor Class:");
  let attacksIx = findLineIxByStartsWith(lines, "Attacks:", "Attack:");
  let stIx = findLineIxByStartsWith(lines, "Saving Throw:", "Save:");
  let specialIx = findLineIxByStartsWith(lines, "Special:");
  let moveIx = findLineIxByStartsWith(lines, "Move:");
  let algIx = findLineIxByStartsWith(lines, "Alignment:");
  let clIx = findLineIxByStartsWith(lines, "Challenge Level/XP:");

  let name = lines[0];

  warnIfBadIx(hdIx, "hd", name);
  warnIfBadIx(acIx, "ac", name);
  warnIfBadIx(attacksIx, "attacks", name);
  warnIfBadIx(stIx, "st", name);
  warnIfBadIx(specialIx, "special", name);
  warnIfBadIx(moveIx, "move", name);
  warnIfBadIx(algIx, "alignment", name);
  warnIfBadIx(clIx, "CL", name);

  let hdString = combineLinesFromTo(lines, hdIx, acIx, true);
  let hdListMatch = hdString.match(/(\d+), (\d+), or (\d+)/);
  let hdRangeMatch = hdString.match(/(\d+)-(\d+)/);

  let clString = combineLinesFromTo(lines, clIx, clIx + 1, true);
  let clListMatch = clString.match(/(\d+ HD \(.+?\))/g)
    || clString.match(/(HD \d+ \(.+?\))/g);

  let stString = combineLinesFromTo(lines, stIx, specialIx, true);
  let stListMatch = stString.match(/(\d+)/g);

  let monsterList = [];

  let textOverride = processSW && name.match(/^ravager/i)
    ? combineLinesFromTo(getRavagerText(), 0, getRavagerText().length)
    : undefined;

  try {
    if (hdListMatch
      || hdRangeMatch) {
      let hds = hdListMatch
        ? hdListMatch.slice(1, 4)
        : new Array(Number(hdRangeMatch[2]) - Number(hdRangeMatch[1]) + 1).fill(0).map((_, ix) => ix + Number(hdRangeMatch[1]));

      let sts = stListMatch && stListMatch.length === hds.length
        ? stListMatch
        : null;

      let isDragon = !name.match(/^dragon turtle$/i)
        && name.match(/^dragon, (.+?)$/i) !== null;

      hds.forEach((hd, ix) => {
        if (processSW && isDragon) {
          getDragonTypes().forEach(dragonType => {
            const dragon = {
              name: name + `, ${dragonType.name} (${hd} HD)`,
              hd: hd,
              ac: combineLinesFromTo(lines, acIx, attacksIx, true),
              attacks: combineLinesFromTo(lines, attacksIx, stIx, true),
              st: sts
                ? sts[ix]
                : combineLinesFromTo(lines, stIx, specialIx, true),
              special: combineLinesFromTo(lines, specialIx, moveIx, true),
              move: combineLinesFromTo(lines, moveIx, algIx, true),
              alignment: combineLinesFromTo(lines, algIx, clIx, true),
              cl: clListMatch?.find(x => x.startsWith(hd) || x.startsWith(`HD ${hd}`)) || combineLinesFromTo(lines, clIx, clIx + 1, true),
              text: textOverride || (clIx === lines.length - 1 ? "" : combineLinesFromTo(lines, clIx + 1, lines.length)),
            };

            updateDragon(dragon, dragonType);

            monsterList.push(dragon);
          });
        } else {
          monsterList.push({
            name: name + ` (${hd} HD)`,
            hd: hd,
            ac: combineLinesFromTo(lines, acIx, attacksIx, true),
            attacks: combineLinesFromTo(lines, attacksIx, stIx, true),
            st: sts
              ? sts[ix]
              : combineLinesFromTo(lines, stIx, specialIx, true),
            special: combineLinesFromTo(lines, specialIx, moveIx, true),
            move: combineLinesFromTo(lines, moveIx, algIx, true),
            alignment: combineLinesFromTo(lines, algIx, clIx, true),
            cl: clListMatch?.find(x => x.startsWith(hd) || x.startsWith(`HD ${hd}`)) || combineLinesFromTo(lines, clIx, clIx + 1, true),
            text: textOverride || (clIx === lines.length - 1 ? "" : combineLinesFromTo(lines, clIx + 1, lines.length)),
          });
        }
      });

    } else {
      monsterList.push({
        name,
        hd: hdString,
        ac: combineLinesFromTo(lines, acIx, attacksIx, true),
        attacks: combineLinesFromTo(lines, attacksIx, stIx, true),
        st: combineLinesFromTo(lines, stIx, specialIx, true),
        special: combineLinesFromTo(lines, specialIx, moveIx, true),
        move: combineLinesFromTo(lines, moveIx, algIx, true),
        alignment: combineLinesFromTo(lines, algIx, clIx, true),
        cl: combineLinesFromTo(lines, clIx, clIx + 1, true),
        text: textOverride || (clIx === lines.length - 1 ? "" : combineLinesFromTo(lines, clIx + 1, lines.length)),
      });
    }
  } catch (err) {
    console.log(name);
    console.log(err);
  }

  return monsterList;
}

function findLineIxByStartsWith(lines, startsText, altStartText) {
  return lines
    .findIndex(x => x.match(new RegExp("^" + startsText, "i"))
      || x.match(new RegExp("^" + altStartText, "i")))
}

function warnIfBadIx(ix, field, name) {
  if (ix === -1) {
    console.log(`${name} has no ${field}!`);
  }
}

function combineLinesFromTo(lines, from, to, isLabeled) {
  let str = lines
    .slice(from, to)
    .map(x => x === '' ? '\n' : x)
    .join(' ');

  return isLabeled
    ? str.substring(str.indexOf(':') + 1).trim()
    : str.trim();
}

function processInputText(text) {
  return text
    .replace(/'/g, "'")
    .replace(/–/g, '-')
    .split('\n')
    .map(x => x.replace('\r', ''))
    .map(x => x.endsWith("\\") ? x + '\n' : x);
}

function getRavagerText() {
  return processInputText(`The ravager has three possible forms, and corresponding descriptions:\
  \
  Crawler: This enormous creature stands 18 feet high at the shoulders
  and has a body 30 feet long. Its body is long and narrow, with eight stubby
  legs ending in ebon claws the size of large falchions. Its mouth is filled
  with sharp black teeth, and its eyes are jet-black orbs the size of dinner
  platters, set above a delicate muzzle like that of a bulldog. The body is
  hairless, covered with a thick, leathery crimson hide.\
  \
  Brawler: Towering 35 feet high is a massive, apelike creature, resting
  on two sets of powerfully muscled legs. A third set of arms, thick and
  corded with muscle, bulges out from its massive shoulders, ending with
  massive black claws. The mouth is filled with jagged black teeth, and
  glistening black eyes are set over a wide muzzle. Its skin is deep red,
  somewhat lighter on the underbelly.\
  \
  Flier: With a crack and boom, this creature spreads a pair of great
  leathery wings over 50 feet in span. Its body is lean and covered with
  rippling muscle beneath a thick, leathery crimson hide. Its claws and teeth
  are black, as are its eyes.\
  \
  The Ravager was created eons ago by a primeval race of beings who
  believed in the unity of three forces: body, mind, and spirit. In their
  ongoing war with another race of savages, they created several weapons
  of terrible power. The greatest of these is the living beast known only as
  the Ravager.\
  This beast was given incredible vitality, and the power to manipulate its
  own body to assume a form most advantageous to it: a crawling weasel-
  like form that can burrow, a hulking apelike humanoid form with greater
  reach and strength, and a winged form to allow it greater mobility and
  agility.\
  After being used once or twice on the battlefield, those who created it
  realized its awesome danger and contained it in the strongest prison they
  could devise, suspended in time until it would once again be needed.
  However, due to the subsequent influence of Orcus near the vault where
  the Ravager was contained, the wards were damaged, and a taint of evil
  infected its quarantine. This has resulted in it reproducing asexually, and
  has granted the ravager an astonishing capacity for growth. For every
  decade that it lives, it permanently gains 1 hit die. There is no known limit
  to how far this advancement can go before it either devastates the planet it
  lives on or collapses under its own weight.\
  The ravager can damage creatures by simply walking over them,
  trampling them for 4d6 points of damage (save for half).\
  The ravager possesses an innate resistance to effects that would kill
  or permanently incapacitate it, including petrification and imprisonment.
  Against such effects it is considered to automatically make any required
  saving throws. It is also immune to all energy level damage and drain.\
  The ravager can physically alter its physiology to take on one of the
  three listed forms: the crawler, the brawler, or the flier. Doing so takes one
  minute, and during this period it cannot take any other actions, though it
  is not considered helpless.\
  Every time the ravager comes into contact with a spell or supernatural
  effect, there is a percent chance as indicated above that the magic does not
  affect it. In the case of ongoing effects, a new check is made each round.\
  Whenever the ravager hits with a melee attack, it is healed hit points
  equal to half the damage it inflicts on its opponent. This ability cannot heal
  it above its natural maximum hit points. This ability extends to its trample
  special attack, where applicable.`);
}

function getDragonTypes() {
  return [{
    name: "Very young dragon",
    pointsPerHD: 1,
  }, {
    name: "Young",
    pointsPerHD: 2,
  }, {
    name: "Immature",
    pointsPerHD: 3,
  }, {
    name: "Adult",
    pointsPerHD: 4,
  }, {
    name: "Old",
    pointsPerHD: 5,
  }, {
    name: "Very old (100 years old)",
    pointsPerHD: 6,
  }, {
    name: "Aged (101-400 years old)",
    pointsPerHD: 7,
  }, {
    name: "Ancient (401+ years old)",
    pointsPerHD: 8,
  }];
}

function updateDragon(dragon, type) {
  let breathDamage = dragon.hd * type.pointsPerHD;
  dragon.hd = breathDamage + " hp";
  let bodyLength = type.pointsPerHD * 5;
  if (bodyLength > 20) {
    bodyLength = 20;
  }

  let extraText = `A dragon of type '${type.name}' has a body roughly ${bodyLength} feet long. Dragons have double normal treasure (gp value 4x dragon's XP).`;

  dragon.text = !dragon.text
    ? extraText
    : dragon.text + '\n\n' + extraText;
}