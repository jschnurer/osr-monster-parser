# OSR Monster Parser
This node app reads text in from a file, searches it, and parses out OSR monster statblocks in JSON format.

# Running
Execute `node .\index.js inputfile systemname sourcename outputfile processSwordsAndWizardry`.

- `inputfile` the path to the text file to import
- `systemname` the name of the game to put into the json output for each monster
- `sourcename` the name of the sourcebook to put into the json output for each monster
- `outputfile` (Optional) the file to output the json to. If not provided, ".\output.json" will be used.
- `processSwordsAndWizardry` (Optional) true or false. If true, certain extra functionality will be used for Swords and Wizardry.

# Input
The app searches the text for any line that starts with "hit dice:". The line immediately before this is read in as the monster's name. Everything after that (until the next monster) is considered part of its statblock or description.

## Input properties
It can read and understand the following properties. Each property name must be at the start of the line and be followed by a ":" to be found correctly. Note that the property names are not case sensitive.

- `Hit Dice`
- `Armor Class`
- `Attacks` or `Attack`
- `Saving Throw` or `Save`
- `Special`
- `Move`
- `Alignment`
- `Challenge Level/XP`

These inputs must be in a single block together and each must be on ONE LINE ONLY.

All lines that appear after these properties but before the next `Hit Dice` instance are considered part of the monster's `description`.

All newlines in the description are removed and all lines are appended together. Any totally blank lines will be parsed as newlines ('\n').

## Example input text file
```
My Monster
Hit Dice: 1
Armor Class: 13 (with shield)
Attack: Slash (1d6)
Saving Throw: 13
Special: Is an idiot
Move: 6 (12 flying)
Alignment: Lawful
Challenge Level/XP: 8/800
This is my super fun monster. I really like it.

This is the second paragraph of its description.
A Titanic Ooze
Hit Dice: 15
Armor Class: 3
Attack: Engulf (10d6), Pseudopod (3d6)
Saving Throw: 5
Special: Acidic, corrodes all metal, dissolves organic material on touch
Move: 6
Alignment: Neutral
Challenge Level/XP: 99/999999
The titan ooze is a super mega awesome huge oozey dude. Bla bla bla.
```

## Example output json file
```json
[
  {
    "name": "My Monster",
    "hd": "1",
    "ac": "13 (with shield)",
    "attacks": "Slash (1d6)",
    "st": "13",
    "special": "Is an idiot",
    "move": "6 (12 flying)",
    "alignment": "Lawful",
    "cl": "8/800",
    "text": "This is my super fun monster. I really like it. \n This is the second paragraph of its description.",
    "system": "swordsAndWizardry",
    "source": "My Fake Monsters",
    "stats": {
      "hd": "1",
      "ac": "13 (with shield)"
    }
  },
  {
    "name": "A Titanic Ooze",
    "hd": "15",
    "ac": "3",
    "attacks": "Engulf (10d6), Pseudopod (3d6)",
    "st": "5",
    "special": "Acidic, corrodes all metal, dissolves organic material on touch",
    "move": "6",
    "alignment": "Neutral",
    "cl": "99/999999",
    "text": "The titan ooze is a super mega awesome huge oozey dude. Bla bla bla.",
    "system": "swordsAndWizardry",
    "source": "My Fake Monsters",
    "stats": {
      "hd": "15",
      "ac": "3"
    }
  }
]
```

## Sworsd & Wizardry Extras
If the input flag `processSwordsAndWizardry` is true, if the monster's name is "dragon turtle" or in the format "dragon, xxxx", its stats will be duplicated for each size category and age of dragon. If the monster's name starts with "ravager", it will also include some extra ravager text in the monster's description.
