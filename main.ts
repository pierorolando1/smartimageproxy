import { Application, Router } from "jsr:@oak/oak";
import { join } from "https://deno.land/std@0.180.0/path/mod.ts";
import { config } from "./config.ts"; 

let TODAY = new Date();
setInterval(() => {
  TODAY = new Date();
}, config.UPDATE_INTERVAL);

// Carpeta donde están las imágenes
const desktopImageFolder = "/home/pierorolando/Pictures/desktop/";
const mobileImageFolder = "/home/pierorolando/Pictures/mobile/";

// Función que carga el archivo JSON con las reglas de las imágenes
const loadImageConfig = async () => {
  const json = await Deno.readTextFile("./image-config.json");
  return JSON.parse(json);
};

// Función que determina si la fecha actual está dentro de un rango
const isInThisRange = (start: Date, end: Date): boolean => {
  return TODAY >= start && TODAY <= end;
};

// Función que detecta si el dispositivo es móvil
const isMobile = (userAgent: string): boolean => {
  const mobileRegex = /Mobile|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i;
  return mobileRegex.test(userAgent);
};

const router = new Router();

router.get("/(.*)", async (ctx) => {
  const urlPath = ctx.request.url.pathname;
  
  // Cargar la configuración de imágenes desde el archivo JSON
  const imageConfig = await loadImageConfig();

  const imageRules = imageConfig[urlPath.substring(1)]; // Eliminar el "/" inicial
  
  if (!imageRules) {
    ctx.response.status = 404;
    ctx.response.body = "Imagen no encontrada";
    return;
  }

  // Detectar si el usuario está usando un dispositivo móvil
  const userAgent = ctx.request.headers.get("User-Agent") || "";
  const isUserOnMobile = isMobile(userAgent);

  // Buscar una imagen que cumpla con las condiciones de fecha
  const selectedImageRule = imageRules.conditions.find((rule: any) => {
    const startDate = new Date(rule.from);
    const endDate = new Date(rule.to);
    return isInThisRange(startDate, endDate);
  });

  if (!selectedImageRule) {
    ctx.response.status = 404;
    ctx.response.body = "Imagen no encontrada";
    return;
  }

  // Seleccionar la imagen según el tipo de dispositivo
  const selectedImage = isUserOnMobile ? selectedImageRule.image_mobile : selectedImageRule.image;

  const imagePath = join(isUserOnMobile ? mobileImageFolder : desktopImageFolder, selectedImage);

  try {
    const imageFile = await Deno.open(imagePath, { read: true });

    return new Response(imageFile.readable, {
      headers: { "Content-Type": "image/jpeg" },
    });
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = "Error al leer la imagen";
  }
});

const app = new Application();

app.use(router.routes());
app.use(router.allowedMethods());

console.log(`Servidor de imágenes proxy con Oak escuchando en ${config.PORT}`);
await app.listen({ port: config.PORT });

