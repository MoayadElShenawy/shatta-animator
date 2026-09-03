/**
 * Character registry.
 *
 * The engine talks to "the active character", never to Shatta directly. Adding
 * a future character means registering another CharacterDefinition here — no
 * engine, sprite or UI change required.
 */

import { shatta } from "@/characters/shatta/personality";
import type { CharacterDefinition } from "@/characters/types";

const characters = new Map<string, CharacterDefinition>();

export function registerCharacter(character: CharacterDefinition) {
  characters.set(character.id, character);
}

registerCharacter(shatta);

let activeId = shatta.id;

export function getCharacter(id: string): CharacterDefinition | undefined {
  return characters.get(id);
}

export function listCharacters(): readonly CharacterDefinition[] {
  return [...characters.values()];
}

export function getActiveCharacter(): CharacterDefinition {
  return characters.get(activeId) ?? shatta;
}

export function setActiveCharacter(id: string) {
  if (characters.has(id)) activeId = id;
}
