import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { SkillDef } from "./skills.js";
import { logger } from "./logger.js";

const log = logger("skills-file");

interface SkillsFile {
  skills: SkillDef[];
}

export function skillsPath(cfg: { skillsFile: string }): string {
  return isAbsolute(cfg.skillsFile) ? cfg.skillsFile : resolve(process.cwd(), cfg.skillsFile);
}

export async function readSkillsFile(cfg: { skillsFile: string }): Promise<SkillDef[]> {
  const path = skillsPath(cfg);
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as SkillsFile | SkillDef[];
  if (Array.isArray(parsed)) return parsed;
  return parsed.skills ?? [];
}

export async function writeSkillsFile(cfg: { skillsFile: string }, skills: SkillDef[]): Promise<void> {
  const path = skillsPath(cfg);
  const out: SkillsFile = { skills };
  await writeFile(path, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  log.info(`wrote ${skills.length} skill(s) to ${path}`);
}

export async function upsertSkill(cfg: { skillsFile: string }, skill: SkillDef): Promise<SkillDef[]> {
  const skills = await readSkillsFile(cfg);
  const idx = skills.findIndex((s) => s.name === skill.name);
  if (idx >= 0) skills[idx] = skill;
  else skills.push(skill);
  await writeSkillsFile(cfg, skills);
  return skills;
}

export async function deleteSkill(cfg: { skillsFile: string }, name: string): Promise<SkillDef[]> {
  const skills = (await readSkillsFile(cfg)).filter((s) => s.name !== name);
  await writeSkillsFile(cfg, skills);
  return skills;
}

export async function importSkills(
  cfg: { skillsFile: string },
  incoming: SkillDef[],
  merge: boolean,
): Promise<SkillDef[]> {
  if (!merge) {
    await writeSkillsFile(cfg, incoming);
    return incoming;
  }
  const skills = await readSkillsFile(cfg);
  const byName = new Map(skills.map((s) => [s.name, s]));
  for (const s of incoming) byName.set(s.name, s);
  const merged = [...byName.values()];
  await writeSkillsFile(cfg, merged);
  return merged;
}

export async function patchLocalSkillWebhooks(
  cfg: { skillsFile: string },
  baseUrl: string,
): Promise<void> {
  const skills = await readSkillsFile(cfg);
  const base = baseUrl.replace(/\/$/, "");
  for (const skill of skills) {
    switch (skill.name) {
      case "github_api":
        skill.webhook = `${base}/api/integrations/github`;
        break;
      case "uipath_orchestrator":
        skill.webhook = `${base}/api/integrations/uipath`;
        break;
      case "standards_lookup":
        skill.webhook = `${base}/api/integrations/standards`;
        break;
      case "web_search":
        skill.webhook = `${base}/api/integrations/web-search`;
        break;
    }
  }
  await writeSkillsFile(cfg, skills);
}
