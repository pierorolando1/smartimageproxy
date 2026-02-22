import { join } from "https://deno.land/std@0.180.0/path/mod.ts";
import { config } from "./config.ts";

let TODAY = new Date();
setInterval(() => {
  TODAY = new Date();
}, config.UPDATE_INTERVAL);

// Image folders
const desktopImageFolder = "/app/primatourpc/";
const mobileImageFolder = "/app/primatourcelular/";

// Load image rules from config.json
const loadImageConfig = async () => {
  const json = await Deno.readTextFile("./config.json");
  return JSON.parse(json);
};

// Check if today falls within a date range (inclusive, end date is end of day)
const isInThisRange = (start: Date, end: Date): boolean => {
  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);
  return TODAY >= start && TODAY <= endOfDay;
};

// Detect mobile device from User-Agent
const isMobile = (userAgent: string): boolean => {
  const mobileRegex = /Mobile|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i;
  return mobileRegex.test(userAgent);
};

// Detect image MIME type from extension
const getMimeType = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
};

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Only handle /imagesapi/* routes
  if (!pathname.startsWith("/imagesapi/")) {
    return new Response("Not found", { status: 404 });
  }

  const imageConfig = await loadImageConfig();

  // Normalize path: strip numeric prefix variants
  const imagePath_ = pathname
    .replace(/^\/imagesapi\/\d+\//, "")
    .replace(/^\/imagesapi\//, "");

  const imageRules = imageConfig[imagePath_];

  if (!imageRules) {
    return new Response("Imagen no encontrada", { status: 404 });
  }

  // Detect device type
  const userAgent = req.headers.get("User-Agent") ?? "";
  const isUserOnMobile = isMobile(userAgent) || imagePath_.includes("phone");

  // Find the matching date-range rule
  const selectedImageRule = imageRules.conditions.find((rule: { from: string; to: string }) => {
    return isInThisRange(new Date(rule.from), new Date(rule.to));
  });

  if (!selectedImageRule) {
    return new Response("Imagen no encontrada para la fecha actual", { status: 404 });
  }

  // Pick desktop or mobile image
  const selectedImage: string = isUserOnMobile
    ? selectedImageRule.image_mobile
    : selectedImageRule.image;

  const imagePath = join(
    isUserOnMobile ? mobileImageFolder : desktopImageFolder,
    selectedImage,
  );

  try {
    const imageData = await Deno.readFile(imagePath);
    return new Response(imageData, {
      status: 200,
      headers: { "Content-Type": getMimeType(selectedImage) },
    });
  } catch (error) {
    console.error(`Error reading image: ${imagePath}`, error);
    return new Response("Error al leer la imagen", { status: 500 });
  }
}

console.log(`SmartImageProxy listening on port ${config.PORT}`);
Deno.serve({ port: config.PORT }, handler);

