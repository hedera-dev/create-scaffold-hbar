import * as p from "@clack/prompts";
import chalk from "chalk";
import figlet from "figlet";
import { BRAND_COLORS } from "./consts";

const COMPACT_TITLE = chalk.hex(BRAND_COLORS.hederaTeal).bold(" scaffold-hbar ");

/** The "Small" figlet banner is 57 columns wide; below this it wraps and looks broken. */
const BANNER_MIN_COLUMNS = 70;

export function renderIntroMessage() {
  const columns = process.stdout.columns ?? 80;

  if (columns < BANNER_MIN_COLUMNS) {
    p.intro(COMPACT_TITLE);
    return;
  }

  const banner = figlet.textSync("scaffold-hbar", { font: "Small" });
  const coloredBanner = chalk.hex(BRAND_COLORS.hederaTeal)(banner);
  console.log(coloredBanner);
  p.intro(COMPACT_TITLE);
}
