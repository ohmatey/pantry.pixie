#!/usr/bin/env bun

/**
 * PWA Asset Generator
 *
 * Generates icons and screenshots for the Pantry Pixie PWA.
 * - Icons: 192x192 and 512x512 (standard + maskable)
 * - Shortcut icons: add-item, chat (192x192)
 * - Screenshots: 540x720 (narrow) and 1280x720 (wide)
 */

import { createCanvas } from "@napi-rs/canvas";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

// Pantry Pixie brand colors
const COLORS = {
  sage400: "#8FAF9D",
  sage500: "#6F8F7D",
  sage600: "#4F6F5D",
  cream100: "#F4EFE6",
  charcoal300: "#1A1A1A",
  white: "#FFFFFF",
};

interface IconConfig {
  name: string;
  size: number;
  isMaskable?: boolean;
  emoji?: string;
  backgroundColor?: string;
}

const ICON_CONFIGS: IconConfig[] = [
  { name: "icon-192", size: 192, emoji: "✨", backgroundColor: COLORS.sage400 },
  { name: "icon-512", size: 512, emoji: "✨", backgroundColor: COLORS.sage400 },
  {
    name: "icon-maskable-192",
    size: 192,
    isMaskable: true,
    emoji: "✨",
    backgroundColor: COLORS.sage400,
  },
  {
    name: "icon-maskable-512",
    size: 512,
    isMaskable: true,
    emoji: "✨",
    backgroundColor: COLORS.sage400,
  },
  { name: "add-item", size: 192, emoji: "➕", backgroundColor: COLORS.sage500 },
  { name: "chat", size: 192, emoji: "💬", backgroundColor: COLORS.sage600 },
];

async function generateIcon(config: IconConfig, outputDir: string) {
  const { name, size, isMaskable, emoji, backgroundColor } = config;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Calculate safe zone for maskable icons (20% padding)
  const safeZone = isMaskable ? size * 0.2 : 0;
  const contentSize = size - safeZone * 2;
  const radius = size / 2;

  // Draw circular background
  ctx.fillStyle = backgroundColor || COLORS.sage400;
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw emoji in center
  if (emoji) {
    const fontSize = isMaskable ? contentSize * 0.5 : size * 0.6;
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, radius, radius);
  }

  // Save PNG
  const buffer = await canvas.encode("png");
  const outputPath = join(outputDir, `${name}.png`);
  await writeFile(outputPath, buffer);
  console.log(`✓ Generated ${name}.png (${size}x${size})`);
}

async function generateAllIcons() {
  const publicDir = join(import.meta.dir, "..", "public");
  const iconsDir = join(publicDir, "icons");

  // Ensure icons directory exists
  await mkdir(iconsDir, { recursive: true });

  // Generate all icons
  for (const config of ICON_CONFIGS) {
    await generateIcon(config, iconsDir);
  }

  console.log("\n✨ All icons generated successfully!");
}

async function generateScreenshotPlaceholders() {
  const publicDir = join(import.meta.dir, "..", "public");
  const screenshotsDir = join(publicDir, "screenshots");

  // Ensure screenshots directory exists
  await mkdir(screenshotsDir, { recursive: true });

  const screenshots = [
    { name: "screenshot-1", width: 540, height: 720, label: "Chat Page" },
    { name: "screenshot-2", width: 1280, height: 720, label: "Shopping List" },
    { name: "screenshot-wide", width: 1280, height: 720, label: "Wide View" },
  ];

  for (const screenshot of screenshots) {
    const canvas = createCanvas(screenshot.width, screenshot.height);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = COLORS.cream100;
    ctx.fillRect(0, 0, screenshot.width, screenshot.height);

    // Centered text
    ctx.fillStyle = COLORS.charcoal300;
    ctx.font = "32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${screenshot.label}`,
      screenshot.width / 2,
      screenshot.height / 2 - 20,
    );
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillStyle = COLORS.sage500;
    ctx.fillText(
      `${screenshot.width}x${screenshot.height}`,
      screenshot.width / 2,
      screenshot.height / 2 + 20,
    );
    ctx.fillText(
      "⚠ Replace with actual screenshot",
      screenshot.width / 2,
      screenshot.height / 2 + 50,
    );

    // Save PNG
    const buffer = await canvas.encode("png");
    const outputPath = join(screenshotsDir, `${screenshot.name}.png`);
    await writeFile(outputPath, buffer);
    console.log(
      `✓ Generated ${screenshot.name}.png (${screenshot.width}x${screenshot.height})`,
    );
  }

  console.log("\n📸 Screenshot placeholders generated!");
  console.log(
    "⚠️  IMPORTANT: Replace these with actual app screenshots for production.\n",
  );
  console.log("To capture real screenshots:");
  console.log("1. Run: bun run dev");
  console.log("2. Open browser DevTools → Device Mode");
  console.log("3. Navigate to ChatPage (540x720) and ListPage (1280x720)");
  console.log("4. Take screenshots and save to public/screenshots/\n");
}

async function main() {
  console.log("🎨 Pantry Pixie PWA Asset Generator\n");

  try {
    await generateAllIcons();
    await generateScreenshotPlaceholders();
    console.log("✅ All assets generated successfully!\n");
  } catch (error) {
    console.error("❌ Error generating assets:", error);
    process.exit(1);
  }
}

main();
