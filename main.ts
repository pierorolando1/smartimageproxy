import { Application, Router } from "jsr:@oak/oak";
import { join } from "https://deno.land/std@0.180.0/path/mod.ts";
import { config } from "./config.ts"; 

let TODAY = new Date();
setInterval(() => {
  TODAY = new Date();
}, config.UPDATE_INTERVAL);

// Carpeta donde están las imágenes
const imageFolder = "/home/pierorolando/Pictures/";

// Función que carga el archivo JSON con las reglas de las imágenes
const loadImageConfig = async () => {
  const json = await Deno.readTextFile("./image-config.json");
  return JSON.parse(json);
};

// Función que determina si la fecha actual está dentro de un rango
const isInThisRange = (start: Date, end: Date): boolean => {
  return TODAY >= start && TODAY <= end;
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

  // Buscar una imagen que cumpla con las condiciones de fecha
  const selectedImage = imageRules.conditions.find((rule: any) => {
    const startDate = new Date(rule.from);
    const endDate = new Date(rule.to);
    return isInThisRange(startDate, endDate);
  })?.image;

  if (!selectedImage) {
    ctx.response.status = 404;
    ctx.response.body = "Imagen no encontrada";
    return;
  }

  const imagePath = join(imageFolder, selectedImage);

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

