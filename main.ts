import { Application, Router } from "jsr:@oak/oak";
import { join } from "https://deno.land/std@0.180.0/path/mod.ts";
import { config } from "./config.ts"; 

let TODAY = new Date();
setInterval(() => {
  TODAY = new Date();
}, config.UPDATE_INTERVAL);

// Carpeta donde están las imágenes
const desktopImageFolder = "/home/primatour/Pictures/desktop/";
const mobileImageFolder = "/home/primatour/Pictures/mobile/";

// Función que carga el archivo JSON con las reglas de las imágenes
const loadImageConfig = async () => {
  const json = await Deno.readTextFile("./config.json");
  return JSON.parse(json);
};

// Función que determina si la fecha actual está dentro de un rango
const isInThisRange = (start: Date, end: Date): boolean => {

	console.log(TODAY)

	return TODAY >= start && TODAY <= end;
};

// Función que detecta si el dispositivo es móvil
const isMobile = (userAgent: string): boolean => {
  console.log(userAgent)
  const mobileRegex = /Mobile|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i;
  return mobileRegex.test(userAgent);
};

const router = new Router();

router.get("/imagesapi/(.*)", async (ctx) => {
  const urlPath = ctx.request.url.pathname;

  console.log(urlPath)


  // Cargar la configuración de imágenes desde el archivo JSON
  const imageConfig = await loadImageConfig();


  const imagePath_ = urlPath.replace("/imagesapi/", ""  ).replace("?unique=88872b3e", "")
  
  console.log(imagePath_)

  const imageRules = imageConfig[imagePath_]; // Eliminar el "/" inicial


  if (!imageRules) {
    ctx.response.status = 404;
    ctx.response.body = "Imagen no encontrada";
    return;
  }

  // Detectar si el usuario está usando un dispositivo móvil
  const userAgent = ctx.request.headers.get("User-Agent") || "";
  const isUserOnMobile = isMobile(userAgent) || imagePath_.includes("phone")

  // Buscar una imagen que cumpla con las condiciones de fecha
  const selectedImageRule = imageRules.conditions.find((rule: any) => {
    const startDate = new Date(rule.from);
    const endDate = new Date(rule.to);

    console.log(startDate, endDate)
    console.log( isInThisRange(startDate, endDate) )
    return isInThisRange(startDate, endDate);
  });

  console.log(selectedImageRule)

  if (!selectedImageRule) {
    ctx.response.status = 404;
    ctx.response.body = "Imagen no encontrada";
    return;
  }

  // Seleccionar la imagen según el tipo de dispositivo
  const selectedImage = isUserOnMobile ? selectedImageRule.image_mobile : selectedImageRule.image;

  const imagePath = join(isUserOnMobile ? mobileImageFolder : desktopImageFolder, selectedImage);

  console.log(imagePath)

  try {
    const imageFile = await Deno.open(imagePath, { read: true });

    ctx.response.status = 200;
    ctx.response.headers.set("Content-Type", "image/jpeg");
    ctx.response.body = imageFile;

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

