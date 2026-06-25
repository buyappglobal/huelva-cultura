import { doc, updateDoc, arrayUnion, setDoc, db } from '../firebase';

export interface SignageParams {
  sector: string;
  title: string;
  offer: string;
  subtext: string;
  bgType: "gradient" | "customUrl";
  selectedGradient: string;
  customUrl?: string;
  opacity?: number;
  scale?: number;
  colors: {
    title: string;
    offer: string;
    subtext: string;
    tag: string;
  };
}

export function generateSignageImageWithParams(params: SignageParams): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject("No canvas context");

    const sectorStyles: Record<string, { titleFont: string; tagLabel: string }> = {
      restauracion: { titleFont: "bold 80px sans-serif", tagLabel: "RESTAURACIÓN" },
      clinica: { titleFont: "italic 300 80px serif", tagLabel: "CLÍNICA / SALUD" },
      gym: { titleFont: "italic 900 90px sans-serif", tagLabel: "DEPORTE / FITNESS" },
      retail: { titleFont: "300 75px sans-serif", tagLabel: "RETAIL / PROMO" },
      hotel: { titleFont: "600 78px serif", tagLabel: "HOTEL / PREMIUM" }
    };

    const tagFont = "bold 26px sans-serif";
    const offerFont = "bold 60px sans-serif";
    const subtextFont = "italic 32px sans-serif";

    const hexToRgba = (hex: string, alpha: number) => {
      const cleanHex = hex.replace("#", "");
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const drawRoundRect = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
      fill: boolean,
      stroke: boolean
    ) => {
      context.beginPath();
      context.moveTo(x + radius, y);
      context.lineTo(x + width - radius, y);
      context.quadraticCurveTo(x + width, y, x + width, y + radius);
      context.lineTo(x + width, y + height - radius);
      context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      context.lineTo(x + radius, y + height);
      context.quadraticCurveTo(x, y + height, x, y + height - radius);
      context.lineTo(x, y + radius);
      context.quadraticCurveTo(x, y, x + radius, y);
      context.closePath();
      if (fill) context.fill();
      if (stroke) context.stroke();
    };

    const drawContent = () => {
      // Draw radial dark contrast overlay to ensure readability
      const radialGrad = ctx.createRadialGradient(960, 540, 100, 960, 540, 1000);
      radialGrad.addColorStop(0, "rgba(10, 7, 18, 0.15)");
      radialGrad.addColorStop(1, "rgba(10, 7, 18, 0.82)");
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, 1920, 1080);

      ctx.save();
      ctx.translate(960, 540);
      const scaleVal = params.scale || 1.0;
      ctx.scale(scaleVal, scaleVal);
      ctx.translate(-960, -540);

      // Draw Tag
      const tagText = sectorStyles[params.sector]?.tagLabel || "AURA";
      ctx.font = tagFont;
      const tagWidth = ctx.measureText(tagText).width;
      ctx.fillStyle = hexToRgba(params.colors.tag, 0.1);
      ctx.strokeStyle = params.colors.tag;
      ctx.lineWidth = 2;
      drawRoundRect(ctx, 960 - (tagWidth + 24) / 2, 230, tagWidth + 24, 46, 6, true, true);

      ctx.fillStyle = params.colors.tag;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tagText, 960, 253);

      // Draw Title
      ctx.font = sectorStyles[params.sector]?.titleFont || "80px sans-serif";
      ctx.fillStyle = params.colors.title;
      ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 3;
      ctx.fillText(params.title || "SIN TÍTULO", 960, 320);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw Offer Highlight Box
      ctx.font = offerFont;
      const offerText = params.offer || "SIN OFERTA";
      const offerWidth = ctx.measureText(offerText).width;

      if (params.sector === "hotel" || params.sector === "restauracion") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 25;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 8;
        drawRoundRect(ctx, 960 - (offerWidth + 50) / 2, 540, offerWidth + 50, 90, 12, true, true);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = params.colors.offer;
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
      } else {
        ctx.fillStyle = hexToRgba(params.colors.offer, 0.08);
        ctx.strokeStyle = params.colors.offer;
        ctx.lineWidth = 3;
        ctx.shadowColor = params.colors.offer;
        ctx.shadowBlur = 20;
        drawRoundRect(ctx, 960 - (offerWidth + 50) / 2, 540, offerWidth + 50, 90, 12, true, true);
        ctx.shadowBlur = 0;
        ctx.fillStyle = params.colors.offer;
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(offerText, 960, 585);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw Subtext
      if (params.subtext) {
        ctx.font = subtextFont;
        ctx.fillStyle = params.colors.subtext;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(params.subtext, 960, 710);
      }

      ctx.restore();
      resolve(canvas.toDataURL("image/png"));
    };

    const drawLinearBg = () => {
      const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
      const gradientStr = params.selectedGradient;
      if (gradientStr.includes("#8a2be2")) {
        grad.addColorStop(0, "#8a2be2");
        grad.addColorStop(1, "#4a00e0");
      } else if (gradientStr.includes("#ff007f")) {
        grad.addColorStop(0, "#ff007f");
        grad.addColorStop(1, "#75003b");
      } else if (gradientStr.includes("#00f2fe")) {
        grad.addColorStop(0, "#00f2fe");
        grad.addColorStop(1, "#4facfe");
      } else if (gradientStr.includes("#f12711")) {
        grad.addColorStop(0, "#f12711");
        grad.addColorStop(1, "#f5af19");
      } else if (gradientStr.includes("#11998e")) {
        grad.addColorStop(0, "#11998e");
        grad.addColorStop(1, "#38ef7d");
      } else if (gradientStr.includes("#130cb7")) {
        grad.addColorStop(0, "#130cb7");
        grad.addColorStop(1, "#52e5e7");
      } else {
        grad.addColorStop(0, "#1f1235");
        grad.addColorStop(1, "#0f081d");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1920, 1080);
    };

    if (params.bgType === "gradient" || !params.customUrl) {
      drawLinearBg();
      drawContent();
    } else {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.fillStyle = "#0a0712";
        ctx.fillRect(0, 0, 1920, 1080);

        const imgScale = Math.max(1920 / img.width, 1080 / img.height);
        const x = (1920 - img.width * imgScale) / 2;
        const y = (1080 - img.height * imgScale) / 2;
        ctx.drawImage(img, x, y, img.width * imgScale, img.height * imgScale);

        ctx.globalAlpha = params.opacity ?? 0.5;
        drawLinearBg();
        ctx.globalAlpha = 1.0;

        drawContent();
      };
      img.onerror = () => {
        drawLinearBg();
        drawContent();
      };
      img.src = params.customUrl;
    }
  });
}

export function getTemplatesForSector(
  sector: string, 
  establishmentName: string, 
  location: string
): SignageParams[] {
  const nameUpper = (establishmentName || "Aura Local").toUpperCase();
  const locUpper = (location || "Nuestra ciudad").toUpperCase();

  // Pick suitable gradients & colors based on sector
  let mainGradient = "linear-gradient(135deg, #1f1235, #0f081d)";
  let tagColor = "#a855f7"; // purple-500
  let titleColor = "#ffffff";
  let offerColor = "#fbbf24"; // amber-400
  let subtextColor = "#e2e8f0";

  if (sector === "clinica") {
    mainGradient = "linear-gradient(135deg, #11998e, #38ef7d)";
    tagColor = "#38ef7d";
    offerColor = "#ffffff";
  } else if (sector === "gym") {
    mainGradient = "linear-gradient(135deg, #130cb7, #52e5e7)";
    tagColor = "#52e5e7";
    offerColor = "#f5af19";
  } else if (sector === "retail") {
    mainGradient = "linear-gradient(135deg, #ff007f, #75003b)";
    tagColor = "#ff007f";
    offerColor = "#ffffff";
  } else if (sector === "hotel") {
    mainGradient = "linear-gradient(135deg, #1f1235, #0f081d)";
    tagColor = "#f5af19";
    offerColor = "#f5af19";
  }

  const commonColors = { title: titleColor, offer: offerColor, subtext: subtextColor, tag: tagColor };

  switch (sector) {
    case "clinica":
      return [
        {
          sector,
          title: nameUpper,
          offer: "BIENVENIDO",
          subtext: `Tu sonrisa en las mejores manos en ${locUpper}`,
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        },
        {
          sector,
          title: "TECNOLOGÍA DENTAL",
          offer: "IMPLANTOLOGÍA AVANZADA",
          subtext: "Diagnóstico gratuito y financiación a tu medida",
          bgType: "gradient",
          selectedGradient: "linear-gradient(135deg, #130cb7, #52e5e7)", // Alternative tech gradient
          colors: { ...commonColors, tag: "#52e5e7" }
        },
        {
          sector,
          title: "ORTODONCIA INVISIBLE",
          offer: "15% DE DESCUENTO",
          subtext: "Estética y comodidad sin que nadie lo note",
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        },
        {
          sector,
          title: "TU BIENESTAR NOS IMPORTA",
          offer: "CUIDAMOS DE TI",
          subtext: "Reserva tu próxima cita antes de salir",
          bgType: "gradient",
          selectedGradient: "linear-gradient(135deg, #1f1235, #0f081d)",
          colors: { ...commonColors, tag: "#e2e8f0" }
        },
        {
          sector,
          title: "AMBIENTACIÓN EXCLUSIVA",
          offer: "AURA SOUNDSCAPE",
          subtext: "Música seleccionada científicamente para tu relajación",
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        }
      ];

    case "gym":
      return [
        {
          sector,
          title: nameUpper,
          offer: "BIENVENIDO AL RETO",
          subtext: `Entrena hoy con nosotros en ${locUpper}`,
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        },
        {
          sector,
          title: "PLANES DE ENTRENAMIENTO",
          offer: "CLASES DIRIGIDAS",
          subtext: "Spinning, Crossfit, Pilates y mucho más",
          bgType: "gradient",
          selectedGradient: "linear-gradient(135deg, #ff007f, #75003b)",
          colors: { ...commonColors, tag: "#ff007f" }
        },
        {
          sector,
          title: "MATRÍCULA ABIERTA",
          offer: "SIN PERMANENCIA",
          subtext: "Consulta tarifas especiales para estudiantes y empresas",
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        },
        {
          sector,
          title: "NUTRICIÓN DEPORTIVA",
          offer: "ASESORÍA GRATUITA",
          subtext: "Mejora tus resultados con planes de alimentación a tu medida",
          bgType: "gradient",
          selectedGradient: "linear-gradient(135deg, #11998e, #38ef7d)",
          colors: { ...commonColors, tag: "#38ef7d" }
        },
        {
          sector,
          title: "AMBIENTE MOTIVADOR",
          offer: "SONIDO AURA",
          subtext: "La mejor energía musical para tus entrenamientos",
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        }
      ];

    case "retail":
      return [
        {
          sector,
          title: nameUpper,
          offer: "BIENVENIDOS",
          subtext: `Las últimas tendencias están en ${locUpper}`,
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        },
        {
          sector,
          title: "NUEVA COLECCIÓN",
          offer: "20% DE DESCUENTO",
          subtext: "En prendas seleccionadas de temporada",
          bgType: "gradient",
          selectedGradient: "linear-gradient(135deg, #8a2be2, #4a00e0)",
          colors: { ...commonColors, tag: "#8a2be2" }
        },
        {
          sector,
          title: "PROMOCIONES EXCLUSIVAS",
          offer: "2×1 EN ACCESORIOS",
          subtext: "Combina tus complementos favoritos de este mes",
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        },
        {
          sector,
          title: "TARJETA FIDELIDAD",
          offer: "ÚNETE GRATIS",
          subtext: "Acumula puntos y obtén descuentos directos en tus compras",
          bgType: "gradient",
          selectedGradient: "linear-gradient(135deg, #11998e, #38ef7d)",
          colors: { ...commonColors, tag: "#38ef7d" }
        },
        {
          sector,
          title: "EXPERIENCIA DE COMPRA",
          offer: "AURA RETAIL SOUND",
          subtext: "Diseñamos la banda sonora para que disfrutes de tu visita",
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        }
      ];

    case "hotel":
      return [
        {
          sector,
          title: nameUpper,
          offer: "WELCOME TO PREMIUM",
          subtext: `Enjoy an unforgettable stay with us in ${locUpper}`,
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        },
        {
          sector,
          title: "GASTRONOMÍA PREMIUM",
          offer: "ROOM SERVICE 24H",
          subtext: "Descubre nuestra carta internacional de alta cocina",
          bgType: "gradient",
          selectedGradient: "linear-gradient(135deg, #ff007f, #75003b)",
          colors: { ...commonColors, tag: "#ff007f" }
        },
        {
          sector,
          title: "SPA & WELLNESS",
          offer: "CIRCUTOS EXCLUSIVOS",
          subtext: "Relájate con masajes y circuitos hidrotermales",
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        },
        {
          sector,
          title: "COCKTAIL BAR & TERRAZA",
          offer: "SUNSET SESSIONS",
          subtext: "Disfruta del atardecer con las mejores vistas del hotel",
          bgType: "gradient",
          selectedGradient: "linear-gradient(135deg, #00f2fe, #4facfe)",
          colors: { ...commonColors, tag: "#00f2fe" }
        },
        {
          sector,
          title: "ATMÓSFERA EXCLUSIVA",
          offer: "AURA LUXURY SOUND",
          subtext: "Sonido y música chillout curados para tu descanso y confort",
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        }
      ];

    case "restauracion":
    default:
      return [
        {
          sector: "restauracion",
          title: nameUpper,
          offer: "BIENVENIDOS",
          subtext: `El auténtico sabor gastronómico en ${locUpper}`,
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        },
        {
          sector: "restauracion",
          title: "SUGERENCIAS DEL CHEF",
          offer: "PRODUCTO FRESCO KM 0",
          subtext: "Pregunta a nuestro personal de sala por el plato del día",
          bgType: "gradient",
          selectedGradient: "linear-gradient(135deg, #f12711, #f5af19)",
          colors: { ...commonColors, tag: "#f5af19" }
        },
        {
          sector: "restauracion",
          title: "NUESTRAS BEBIDAS",
          offer: "SELECCIÓN DE VINOS",
          subtext: "El maridaje perfecto para cada una de nuestras recetas",
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        },
        {
          sector: "restauracion",
          title: "POSTRES ARTESANALES",
          offer: "EL TOQUE DULCE",
          subtext: "Elaborados con ingredientes 100% naturales",
          bgType: "gradient",
          selectedGradient: "linear-gradient(135deg, #ff007f, #75003b)",
          colors: { ...commonColors, tag: "#ff007f" }
        },
        {
          sector: "restauracion",
          title: "AMBIENTADO CON ÉXITO",
          offer: "AURA SOUNDSCAPE",
          subtext: "La banda sonora ideal para una comida memorable",
          bgType: "gradient",
          selectedGradient: mainGradient,
          colors: commonColors
        }
      ];
  }
}

export async function uploadGeneratedSlideBlob(
  blob: Blob,
  userId: string,
  slideName: string
): Promise<any> {
  const formData = new FormData();
  const distinctName = `aura-business-slide-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  formData.append("file", blob, `${distinctName}.png`);
  formData.append("userId", userId);
  formData.append("screenId", userId);
  formData.append("destination", "slide");
  formData.append("fileName", distinctName);

  const res = await fetch("/api/signage/publish", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to upload slide to backend");
  }
  return res.json();
}

export async function create5DefaultSlides(
  clientId: string,
  establishmentName: string,
  location: string,
  sector: string,
  onProgress?: (msg: string) => void
): Promise<any[]> {
  if (!clientId) throw new Error("Client ID required");
  
  onProgress?.("Generando diseños adaptados al sector...");
  const configs = getTemplatesForSector(sector, establishmentName, location);
  
  const quotesList: any[] = [];
  
  for (let i = 0; i < configs.length; i++) {
    onProgress?.(`Compilando diapositiva ${i + 1} de 5...`);
    const dataUrl = await generateSignageImageWithParams(configs[i]);
    const resFetch = await fetch(dataUrl);
    const blob = await resFetch.blob();
    
    onProgress?.(`Subiendo diapositiva ${i + 1} de 5 a la TV...`);
    const uploadRes = await uploadGeneratedSlideBlob(blob, clientId, `Demo ${i + 1}`);
    
    quotesList.push({
      category: sectorStylesLabel[sector] || "PRODUCTO",
      text: configs[i].title,
      price: configs[i].offer,
      tag: sectorStylesLabel[sector] || "PROMO",
      ticker: `BIENVENIDO A ${establishmentName.toUpperCase()} • DISFRUTA DE LA MEJOR EXPERIENCIA Y AMBIENTE`,
      imageUrl: formatSignageUrl(uploadRes.url),
      showClock: false
    });
  }

  if (clientId !== "dev_preview_uid") {
    onProgress?.("Registrando diapositivas en tu cuenta de televisión...");
    const displayRef = doc(db, "displays", clientId);
    await updateDoc(displayRef, {
      quotes: quotesList
    });
  }
  
  onProgress?.("¡Lote de diapositivas creado con éxito!");
  return quotesList;
}

const sectorStylesLabel: Record<string, string> = {
  restauracion: "CARTA",
  clinica: "SALUD",
  gym: "ENTRENAMIENTO",
  retail: "PROMO",
  hotel: "HOTEL"
};

export function formatSignageUrl(url: string | null | undefined): string {
  if (!url) return "";

  if (url.includes("media.auradisplay.es") && !url.toLowerCase().endsWith(".mp3")) {
    url = url.replace("media.auradisplay.es", "ads.auradisplay.es");
  }

  // Auto-rewrite old absolute firebase/gcs urls to our new R2 domain
  if (url.includes("gen-lang-client-") || url.includes("storage.googleapis.com/")) {
    const parts = url.split("/clientes/");
    if (parts.length > 1) {
      return `https://ads.auradisplay.es/clientes/${parts[1]}`;
    }
  }

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanPath = url.startsWith("/") ? url.slice(1) : url;
  return `https://ads.auradisplay.es/${cleanPath}`;
}
