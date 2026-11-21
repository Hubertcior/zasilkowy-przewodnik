// Synthetic demo cases (committed). Imported statically so they are bundled for serverless deploys.
// To add a case: drop a JSON file here and add it below.

import adopcja2Latka from "./adopcja-2-latka.json";
import bliznetaZaZyciem from "./blizneta-za-zyciem.json";
import etatDuzyPracodawca from "./etat-duzy-pracodawca.json";
import jdgBezChorobowego from "./jdg-bez-chorobowego.json";
import jdgDobrowolne from "./jdg-dobrowolne.json";
import laczenieZPraca from "./laczenie-z-praca.json";
import likwidacjaPracodawcy from "./likwidacja-pracodawcy.json";
import martweUrodzenie from "./martwe-urodzenie.json";
import odmowaKoniecZlecenia from "./odmowa-koniec-zlecenia.json";
import zlecenieWczesniak from "./zlecenie-wczesniak.json";

export const fixtureCases: unknown[] = [
  adopcja2Latka,
  bliznetaZaZyciem,
  etatDuzyPracodawca,
  jdgBezChorobowego,
  jdgDobrowolne,
  laczenieZPraca,
  likwidacjaPracodawcy,
  martweUrodzenie,
  odmowaKoniecZlecenia,
  zlecenieWczesniak,
];
