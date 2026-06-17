import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { auth, db, doc, setDoc, onSnapshot, arrayUnion, arrayRemove, handleFirestoreError, OperationType, initializeApp, deleteApp, getAuth, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from '../firebase';
import { ShieldCheck, UserPlus, Loader2, ArrowLeft, CheckCircle2, AlertCircle, Mail, Lock, Users, ExternalLink, Settings2, Trash2, History, Search, Filter, Activity, Zap, TrendingUp, Monitor, RefreshCw, Video, Clock, Plus, Edit2, Calendar, X, Check, Image, PlusCircle } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import { sendWelcomeEmail } from '../services/emailService';
import { formatSignageUrl } from '../utils/signageGenerator';
import AuraCanvas, { VisualLayer } from './AuraCanvas';

const SUPER_ADMIN_EMAIL = 'holasolonet@gmail.com';

export default function SuperAdmin() {
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'sales' | 'admin' | 'superadmin'>('client');
  const [hasAdsPanel, setHasAdsPanel] = useState(false);
  const [hasImpulses, setHasImpulses] = useState(false);
  const [isDemoAccount, setIsDemoAccount] = useState(false);
  const [slug, setSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'sales' | 'client'>('all');
  const [filterCity, setFilterCity] = useState('all');
  const navigate = useNavigate();

  // External Ads states
  const [activeTab, setActiveTab] = useState<'users' | 'ads' | 'publicidad' | 'visualizers' | 'directo'>('users');
  const [externalAds, setExternalAds] = useState<any[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [adSubTab, setAdSubTab] = useState<'list' | 'create'>('list');
  
  // Global Network Ads states
  const [globalAds, setGlobalAds] = useState<any[]>([]);
  const [uploadingAd, setUploadingAd] = useState(false);

  // Listen to global ads from displays/global doc
  useEffect(() => {
    if (!isAuthorized) return;
    const unsub = onSnapshot(doc(db, 'displays', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGlobalAds(data.contents || []);
      }
    });
    return () => unsub();
  }, [isAuthorized]);
  
  // Ad slide fields
  const [adType, setAdType] = useState<'image' | 'quote' | 'design'>('image');
  const [adUrl, setAdUrl] = useState('');
  const [adText, setAdText] = useState('');
  const [adPrice, setAdPrice] = useState('');
  const [adCategory, setAdCategory] = useState('');
  const [adTag, setAdTag] = useState('');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adShowClock, setAdShowClock] = useState(false);
  
  // Signage/Cartelera Visual Designer state variables
  const [signageSector, setSignageSector] = useState("restauracion");
  const [signageTitle, setSignageTitle] = useState("RACIÓN DE GAMBAS");
  const [signageOffer, setSignageOffer] = useState("SOLO HOY AL 50% DTO");
  const [signageSubtext, setSignageSubtext] = useState("Pregunte al personal de mesa");
  const [signageBgType, setSignageBgType] = useState("gradient");
  const [signageSelectedGradient, setSignageSelectedGradient] = useState("linear-gradient(135deg, #1f1235, #0f081d)");
  const [signageCustomUrl, setSignageCustomUrl] = useState("");
  
  // Streaming Bake State
  const [bakeCanal, setBakeCanal] = useState('joyeria');
  const [bakeFranja, setBakeFranja] = useState('sunset');
  const [bakeFondo, setBakeFondo] = useState('fluidos_sinestesicos_shading');
  const [bakeSuperposicion, setBakeSuperposicion] = useState('ecualizador_lineal_v1');
  const [bakeParticulas, setBakeParticulas] = useState('motas_oro_luxury');
  const [isBaking, setIsBaking] = useState(false);
  const [targetBakeUser, setTargetBakeUser] = useState<string>('all');

  const handleLanzarCocinado = async () => {
    setIsBaking(true);
    try {
      const uids = targetBakeUser === 'all' ? users.filter(u => u.role === 'client').map((u: any) => u.id) : [targetBakeUser];
      
      for (const uid of uids) {
        const res = await fetch(`/api/displays/${uid}`);
        const displayData = res.ok ? await res.json() : {};
        
        displayData.composicionVisual = {
          fondo: bakeFondo,
          superposicion: bakeSuperposicion,
          particulas: bakeParticulas
        };

        await fetch(`/api/displays/${uid}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(displayData)
        });
      }

      const streamRes = await fetch('/api/admin/stream-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: targetBakeUser,
          action: 'bake_stream',
          payload: {
            canal: bakeCanal,
            franja: bakeFranja,
            composicionVisual: {
              fondo: bakeFondo,
              superposicion: bakeSuperposicion,
              particulas: bakeParticulas
            }
          }
        })
      });

      if (streamRes.ok) {
        alert("Pipeline de cocinado iniciado con éxito para " + (targetBakeUser === 'all' ? 'todos los canales' : targetBakeUser));
      } else {
        alert("Composición visual guardada correctamente. Stream Engine no disponible o notificado.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al iniciar el cocinado.");
    } finally {
      setIsBaking(false);
    }
  };

  const [signageOpacity, setSignageOpacity] = useState(0.5);
  const [signageScale, setSignageScale] = useState(1.0);
  const [signageColors, setSignageColors] = useState({
    title: "#ffffff",
    offer: "#f5af19",
    subtext: "#e9e4d4",
    tag: "#f5af19",
  });
  
  // Targeting fields
  const [adTargetType, setAdTargetType] = useState<'all' | 'users' | 'cities' | 'sectors'>('all');
  const [adTargetUsers, setAdTargetUsers] = useState<string[]>([]);
  const [adTargetCities, setAdTargetCities] = useState<string[]>([]);
  const [adTargetSectors, setAdTargetSectors] = useState<string[]>([]);
  
  // Scheduling fields
  const [adScheduleEnabled, setAdScheduleEnabled] = useState(false);
  const [adScheduleStartTime, setAdScheduleStartTime] = useState('08:00');
  const [adScheduleEndTime, setAdScheduleEndTime] = useState('22:00');
  const [adScheduleDays, setAdScheduleDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]); // Mon-Sun
  
  // UI states for inputs
  const [userInputField, setUserInputField] = useState('');
  const [cityInputField, setCityInputField] = useState('');
  const [uploadingAdImage, setUploadingAdImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateSignageImage = (): Promise<string> => {
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
        ctx.scale(signageScale, signageScale);
        ctx.translate(-960, -540);

        // Draw Tag
        const tagText = sectorStyles[signageSector]?.tagLabel || "AURA";
        ctx.font = tagFont;
        const tagWidth = ctx.measureText(tagText).width;
        ctx.fillStyle = hexToRgba(signageColors.tag, 0.1);
        ctx.strokeStyle = signageColors.tag;
        ctx.lineWidth = 2;
        drawRoundRect(ctx, 960 - (tagWidth + 24) / 2, 230, tagWidth + 24, 46, 6, true, true);

        ctx.fillStyle = signageColors.tag;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tagText, 960, 253);

        // Draw Title
        ctx.font = sectorStyles[signageSector]?.titleFont || "80px sans-serif";
        ctx.fillStyle = signageColors.title;
        ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
        ctx.fillText(signageTitle || "SIN TÍTULO", 960, 320);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw Offer Highlight Box
        ctx.font = offerFont;
        const offerText = signageOffer || "SIN OFERTA";
        const offerWidth = ctx.measureText(offerText).width;

        if (signageSector === "hotel" || signageSector === "restauracion") {
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

          ctx.fillStyle = signageColors.offer;
          ctx.shadowColor = "rgba(0,0,0,0.3)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 1;
        } else {
          ctx.fillStyle = hexToRgba(signageColors.offer, 0.08);
          ctx.strokeStyle = signageColors.offer;
          ctx.lineWidth = 3;
          ctx.shadowColor = signageColors.offer;
          ctx.shadowBlur = 20;
          drawRoundRect(ctx, 960 - (offerWidth + 50) / 2, 540, offerWidth + 50, 90, 12, true, true);
          ctx.shadowBlur = 0;
          ctx.fillStyle = signageColors.offer;
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(offerText, 960, 585);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw Subtext
        if (signageSubtext) {
          ctx.font = subtextFont;
          ctx.fillStyle = signageColors.subtext;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.shadowColor = "rgba(0,0,0,0.7)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillText(signageSubtext, 960, 710);
        }

        ctx.restore();
        resolve(canvas.toDataURL("image/png"));
      };

      const drawLinearBg = () => {
        const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
        if (signageSelectedGradient.includes("#8a2be2")) {
          grad.addColorStop(0, "#8a2be2");
          grad.addColorStop(1, "#4a00e0");
        } else if (signageSelectedGradient.includes("#ff007f")) {
          grad.addColorStop(0, "#ff007f");
          grad.addColorStop(1, "#75003b");
        } else if (signageSelectedGradient.includes("#00f2fe")) {
          grad.addColorStop(0, "#00f2fe");
          grad.addColorStop(1, "#4facfe");
        } else if (signageSelectedGradient.includes("#f12711")) {
          grad.addColorStop(0, "#f12711");
          grad.addColorStop(1, "#f5af19");
        } else if (signageSelectedGradient.includes("#11998e")) {
          grad.addColorStop(0, "#11998e");
          grad.addColorStop(1, "#38ef7d");
        } else if (signageSelectedGradient.includes("#130cb7")) {
          grad.addColorStop(0, "#130cb7");
          grad.addColorStop(1, "#52e5e7");
        } else {
          grad.addColorStop(0, "#1f1235");
          grad.addColorStop(1, "#0f081d");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1920, 1080);
      };

      if (signageBgType === "gradient" || !signageCustomUrl) {
        drawLinearBg();
        drawContent();
      } else {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.fillStyle = "#0a0712";
          ctx.fillRect(0, 0, 1920, 1080);

          const scale = Math.max(1920 / img.width, 1080 / img.height);
          const x = (1920 - img.width * scale) / 2;
          const y = (1080 - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

          ctx.globalAlpha = signageOpacity;
          drawLinearBg();
          ctx.globalAlpha = 1.0;

          drawContent();
        };
        img.onerror = () => {
          drawLinearBg();
          drawContent();
        };
        img.src = signageCustomUrl;
      }
    });
  };

  // External Ads operations
  const fetchExternalAds = async () => {
    setLoadingAds(true);
    try {
      const res = await fetch('/api/admin/external-ads');
      if (res.ok) {
        const data = await res.json();
        setExternalAds(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching external ads:", err);
    } finally {
      setLoadingAds(false);
    }
  };

  const handleUploadGlobalAd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen supera el límite de 2MB.");
      return;
    }

    setUploadingAd(true);
    try {
      const formData = new FormData();
      const distinctName = `aura-business-ad-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      formData.append("file", file, `${distinctName}.jpg`);
      formData.append("userId", "global");
      formData.append("screenId", "global");
      formData.append("destination", "slide");
      formData.append("fileName", distinctName);

      const response = await fetch("/api/signage/publish", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al subir archivo al servidor");
      }

      const uploadData = await response.json();
      const formattedUrl = formatSignageUrl(uploadData.url);

      const newItem = {
        url: formattedUrl,
        name: `Publicidad Global (${new Date().toLocaleDateString()})`,
        createdAt: Date.now(),
        storagePath: uploadData.key
      };

      await setDoc(
        doc(db, "displays", "global"),
        {
          contents: arrayUnion(newItem),
        },
        { merge: true },
      );
      alert("¡Publicidad global subida con éxito!");
    } catch (err: any) {
      console.error(err);
      alert(`Error al subir: ${err.message}`);
    } finally {
      setUploadingAd(false);
      // Reset input value
      e.target.value = "";
    }
  };

  const handleDeleteGlobalAd = async (ad: any) => {
    if (!confirm("¿Seguro que deseas eliminar este anuncio de la red global?")) return;
    try {
      await setDoc(
        doc(db, "displays", "global"),
        {
          contents: arrayRemove(ad),
        },
        { merge: true },
      );
      alert("Anuncio eliminado con éxito.");
    } catch (err: any) {
      console.error(err);
      alert(`Error al eliminar: ${err.message}`);
    }
  };


  useEffect(() => {
    if (activeTab === 'ads') {
      fetchExternalAds();
    }
  }, [activeTab]);

  const handleAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAdImage(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", "external_ads");
    try {
      const res = await fetch("/api/contents/upload", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setAdImageUrl(data.url);
        if (adType === 'image') {
          setAdUrl(data.url);
        }
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || "Fallo en la subida"}`);
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      alert("Error de conexión al subir imagen.");
    } finally {
      setUploadingAdImage(false);
    }
  };

  const resetAdForm = () => {
    setEditingAdId(null);
    setAdType('image');
    setAdUrl('');
    setAdText('');
    setAdPrice('');
    setAdCategory('');
    setAdTag('');
    setAdImageUrl('');
    setAdShowClock(false);
    
    // Reset signage designer state to defaults
    setSignageSector("restauracion");
    setSignageTitle("RACIÓN DE GAMBAS");
    setSignageOffer("SOLO HOY AL 50% DTO");
    setSignageSubtext("Pregunte al personal de mesa");
    setSignageBgType("gradient");
    setSignageSelectedGradient("linear-gradient(135deg, #1f1235, #0f081d)");
    setSignageCustomUrl("");
    setSignageOpacity(0.5);
    setSignageScale(1.0);
    setSignageColors({
      title: "#ffffff",
      offer: "#f5af19",
      subtext: "#e9e4d4",
      tag: "#f5af19",
    });

    setAdTargetType('all');
    setAdTargetUsers([]);
    setAdTargetCities([]);
    setAdTargetSectors([]);
    setAdScheduleEnabled(false);
    setAdScheduleStartTime('08:00');
    setAdScheduleEndTime('22:00');
    setAdScheduleDays([1, 2, 3, 4, 5, 6, 0]);
    setUserInputField('');
    setCityInputField('');
    setAdSubTab('list');
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAds(true);

    let finalUrl = adImageUrl.trim() || adUrl.trim();
    let finalIsDesigned = false;
    let finalDesignSettings = null;

    if (adType === 'design') {
      try {
        const dataUrl = await generateSignageImage();
        const fetchRes = await fetch(dataUrl);
        const fileBlob = await fetchRes.blob();
        
        const formData = new FormData();
        formData.append("file", fileBlob, `cartel_${Date.now()}.png`);
        formData.append("userId", "external_ads");

        const uploadRes = await fetch("/api/contents/upload", {
          method: "POST",
          body: formData
        });
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`Error en subida: ${errText || uploadRes.statusText}`);
        }
        const uploadData = await uploadRes.json();
        finalUrl = uploadData.url;
        finalIsDesigned = true;
        finalDesignSettings = {
          sector: signageSector,
          title: signageTitle,
          offer: signageOffer,
          subtext: signageSubtext,
          bgType: signageBgType,
          selectedGradient: signageSelectedGradient,
          customUrl: signageCustomUrl,
          opacity: signageOpacity,
          scale: signageScale,
          colors: { ...signageColors }
        };
      } catch (err: any) {
        console.error(err);
        alert(`Error al generar o subir el cartel: ${err.message || err}`);
        setLoadingAds(false);
        return;
      }
    }

    const newAd: any = {
      id: editingAdId || `ad_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: adType === 'design' ? 'image' : adType, // Save to D1/R2 as image
      createdAt: Date.now(),
      targetType: adTargetType,
      targetUsers: adTargetUsers,
      targetCities: adTargetCities,
      targetSectors: adTargetSectors,
      schedule: {
        enabled: adScheduleEnabled,
        startTime: adScheduleStartTime,
        endTime: adScheduleEndTime,
        days: adScheduleDays
      }
    };

    if (adType === 'quote') {
      newAd.text = adText.trim();
      newAd.price = adPrice.trim();
      newAd.subtext = adPrice.trim();
      newAd.category = adCategory.trim();
      newAd.tag = adTag.trim();
      newAd.imageUrl = adImageUrl.trim();
      newAd.showClock = adShowClock;
    } else if (adType === 'design') {
      newAd.url = finalUrl;
      newAd.name = signageTitle.trim() || "Cartelera Diseñada";
      newAd.isDesigned = finalIsDesigned;
      newAd.designSettings = finalDesignSettings;
    } else {
      newAd.url = finalUrl;
      newAd.name = adText.trim() || "Publicidad Externa";
    }

    if ((adType === 'image' || adType === 'design') && !newAd.url) {
      alert("Introduce la URL, sube una imagen o diseña un cartel.");
      setLoadingAds(false);
      return;
    }
    if (adType === 'quote' && !newAd.text) {
      alert("El texto del slide es obligatorio.");
      setLoadingAds(false);
      return;
    }

    const updatedAds = editingAdId
      ? externalAds.map(ad => ad.id === editingAdId ? newAd : ad)
      : [...externalAds, newAd];

    try {
      const res = await fetch('/api/admin/external-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAds)
      });
      if (res.ok) {
        setExternalAds(updatedAds);
        resetAdForm();
      } else {
        alert("Error al guardar.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red.");
    } finally {
      setLoadingAds(false);
    }
  };

  const handleEditAd = (ad: any) => {
    setEditingAdId(ad.id);
    
    if (ad.isDesigned && ad.designSettings) {
      setAdType('design');
      const ds = ad.designSettings;
      setSignageSector(ds.sector || 'restauracion');
      setSignageTitle(ds.title || '');
      setSignageOffer(ds.offer || '');
      setSignageSubtext(ds.subtext || '');
      setSignageBgType(ds.bgType || 'gradient');
      setSignageSelectedGradient(ds.selectedGradient || 'linear-gradient(135deg, #1f1235, #0f081d)');
      setSignageCustomUrl(ds.customUrl || '');
      setSignageOpacity(ds.opacity !== undefined ? ds.opacity : 0.5);
      setSignageScale(ds.scale !== undefined ? ds.scale : 1.0);
      setSignageColors(ds.colors || { title: "#ffffff", offer: "#f5af19", subtext: "#e9e4d4", tag: "#f5af19" });
      
      setAdText(ds.title || '');
      setAdUrl(ad.url || '');
      setAdImageUrl(ad.url || '');
      setAdPrice('');
      setAdCategory('');
      setAdTag('');
      setAdShowClock(false);
    } else {
      setAdType(ad.type);
      if (ad.type === 'quote') {
        setAdText(ad.text || '');
        setAdPrice(ad.price || ad.subtext || '');
        setAdCategory(ad.category || '');
        setAdTag(ad.tag || '');
        setAdImageUrl(ad.imageUrl || '');
        setAdShowClock(!!ad.showClock);
        setAdUrl('');
      } else {
        setAdText(ad.name || '');
        setAdUrl(ad.url || '');
        setAdImageUrl(ad.url || '');
        setAdPrice('');
        setAdCategory('');
        setAdTag('');
        setAdShowClock(false);
      }
      
      // Reset designer state to defaults
      setSignageSector("restauracion");
      setSignageTitle("RACIÓN DE GAMBAS");
      setSignageOffer("SOLO HOY AL 50% DTO");
      setSignageSubtext("Pregunte al personal de mesa");
      setSignageBgType("gradient");
      setSignageSelectedGradient("linear-gradient(135deg, #1f1235, #0f081d)");
      setSignageCustomUrl("");
      setSignageOpacity(0.5);
      setSignageScale(1.0);
      setSignageColors({
        title: "#ffffff",
        offer: "#f5af19",
        subtext: "#e9e4d4",
        tag: "#f5af19",
      });
    }

    setAdTargetType(ad.targetType || 'all');
    setAdTargetUsers(ad.targetUsers || []);
    setAdTargetCities(ad.targetCities || []);
    setAdTargetSectors(ad.targetSectors || []);
    
    const sched = ad.schedule || { enabled: false, startTime: '08:00', endTime: '22:00', days: [1, 2, 3, 4, 5, 6, 0] };
    setAdScheduleEnabled(sched.enabled);
    setAdScheduleStartTime(sched.startTime);
    setAdScheduleEndTime(sched.endTime);
    setAdScheduleDays(sched.days);
    setAdSubTab('create');
  };

  const handleDeleteAd = async (adId: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este anuncio?")) return;
    const updatedAds = externalAds.filter(ad => ad.id !== adId);
    setLoadingAds(true);
    try {
      const res = await fetch('/api/admin/external-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAds)
      });
      if (res.ok) {
        setExternalAds(updatedAds);
      } else {
        alert("Error al eliminar.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red.");
    } finally {
      setLoadingAds(false);
    }
  };

  const addTargetUser = () => {
    if (userInputField.trim()) {
      const val = userInputField.trim().toLowerCase();
      if (!adTargetUsers.includes(val)) {
        setAdTargetUsers([...adTargetUsers, val]);
      }
      setUserInputField('');
    }
  };

  const removeTargetUser = (val: string) => {
    setAdTargetUsers(adTargetUsers.filter(u => u !== val));
  };

  const addTargetCity = () => {
    if (cityInputField.trim()) {
      const val = cityInputField.trim();
      if (!adTargetCities.some(c => c.toLowerCase() === val.toLowerCase())) {
        setAdTargetCities([...adTargetCities, val]);
      }
      setCityInputField('');
    }
  };

  const removeTargetCity = (val: string) => {
    setAdTargetCities(adTargetCities.filter(c => c !== val));
  };

  const toggleTargetSector = (sector: string) => {
    setAdTargetSectors(prev => 
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
  };

  const toggleScheduleDay = (day: number) => {
    setAdScheduleDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAuthorized(false);
        setTimeout(() => navigate('/admin/login'), 2000);
        return;
      }

      const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      if (isSuperAdmin) {
        setIsAuthorized(true);
        setCurrentUserProfile({ role: 'admin', email: user.email });
        fetchUsers();
        return;
      }

      // Check role in backend API
      try {
        const userRes = await fetch(`/api/users/${user.uid}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUserProfile(userData);
          if (userData.role === 'admin' || userData.role === 'superadmin' || userData.role === 'sales') {
            setIsAuthorized(true);
            fetchUsers();
          } else {
            setIsAuthorized(false);
            setTimeout(() => navigate('/admin'), 2000);
          }
        } else {
          setIsAuthorized(false);
          setTimeout(() => navigate('/admin/login'), 2000);
        }
      } catch (error) {
        console.error("SuperAdmin auth check failed:", error);
      }
    });
    return () => unsub();
  }, [navigate]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Fetch Users from backend API
      const usersRes = await fetch('/api/users');
      const usersData = usersRes.ok ? await usersRes.json() : [];

      // Fetch Displays from backend API
      const displaysRes = await fetch('/api/displays');
      const displaysDataArr = displaysRes.ok ? await displaysRes.json() : [];
      const displaysData = displaysDataArr.reduce((acc: any, d: any) => {
        acc[d.id] = d;
        return acc;
      }, {});
      
      // Merge data
      let merged = usersData.map((user: any) => ({
        ...user,
        displayMetrics: displaysData[user.id] || {}
      }));

      // Add orphaned displays from current DB
      const usersDataIds = new Set(usersData.map(u => u.id));
      Object.keys(displaysData).forEach(displayId => {
        if (!usersDataIds.has(displayId)) {
          merged.push({
            id: displayId,
            email: displaysData[displayId].email || `orphan_${displayId.substring(0,6)}@auradisplay.es`,
            role: 'client',
            isOrphan: true,
            displayMetrics: displaysData[displayId]
          });
        }
      });

      // Only our primary database is queried now

      // Sort manually
      merged.sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setUsers(merged);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users/displays');
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = React.useMemo(() => {
    return users.filter(u => {
      const emailMatch = u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const slugMatch = u.slug?.toLowerCase().includes(searchTerm.toLowerCase());
      const cityMatchSearch = u.city?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = emailMatch || slugMatch || cityMatchSearch;
      
      const matchesRole = filterRole === 'all' || u.role === filterRole;
      const matchesCity = filterCity === 'all' || u.city === filterCity;
      
      return matchesSearch && matchesRole && matchesCity;
    });
  }, [users, searchTerm, filterRole, filterCity]);

  const cities = React.useMemo(() => {
    const list = users.map(u => u.city).filter(Boolean);
    const unique = Array.from(new Set(list)).sort() as string[];
    return unique;
  }, [users]);

  const kpis = React.useMemo(() => {
    const now = Date.now();
    const onlineThreshold = 3 * 60 * 1000; // 3 minutes

    const online = users.filter(u => {
      const lastSeen = u.displayMetrics?.lastSeen?.toMillis?.() || 
                       (u.displayMetrics?.lastSeen?.seconds ? u.displayMetrics.lastSeen.seconds * 1000 : null);
      return lastSeen && (now - lastSeen < onlineThreshold);
    }).length;

    const totalImpulses = users.reduce((acc, u) => acc + (u.displayMetrics?.totalImpulses || 0), 0);

    return {
      total: users.length,
      online,
      impulses: totalImpulses
    };
  }, [users]);

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'Nunca';
    const date = timestamp.toMillis?.() || (timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    const now = Date.now();
    const diff = now - date;

    if (diff < 60000) return 'Hace un momento';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return new Date(date).toLocaleDateString();
  };

  const isOnline = (timestamp: any) => {
    if (!timestamp) return false;
    const date = timestamp.toMillis?.() || (timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    return (Date.now() - date) < (3 * 60 * 1000);
  };

  const handleUpdatePermission = async (userId: string, field: string, value: any) => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      const userData = res.ok ? await res.json() : {};
      userData[field] = value;
      const postRes = await fetch(`/api/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!postRes.ok) throw new Error("Failed to update R2 user");
      setUsers(users.map(u => u.id === userId ? { ...u, [field]: value } : u));
    } catch (err) {
      console.error("Error updating permission in R2:", err);
      alert("Error al actualizar permisos.");
    }
  };

  const handleUpdateDisplayConfig = async (userId: string, field: string, value: any) => {
    try {
      const res = await fetch(`/api/displays/${userId}`);
      const dispResData = res.ok ? await res.json() : {};
      const configObj = dispResData.display ? dispResData.display : dispResData;
      configObj[field] = value;
      
      const postRes = await fetch(`/api/displays/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configObj)
      });
      if (!postRes.ok) throw new Error("Failed to update display config");
      
      setUsers(users.map(u => {
        if (u.id === userId) {
          const updatedMetrics = { ...u.displayMetrics, [field]: value };
          return { ...u, displayMetrics: updatedMetrics };
        }
        return u;
      }));
    } catch (err) {
      console.error("Error updating display config:", err);
      alert("Error al actualizar la configuración de la pantalla.");
    }
  };

  const getVjConfigObj = (metrics: any) => {
    if (!metrics || !metrics.vjConfig) {
      return {
        globalSpeed: 1.0,
        baseTrailOpacity: 0.12,
        layers: [
          { id: '1', geometry: 'lorenz', audioBand: 'subBass', scale: 8, color: '#ff7b72', opacity: 0.85 },
          { id: '2', geometry: 'clifford', audioBand: 'treble', scale: 1.2, color: '#ffc5a1', opacity: 0.6 },
          { id: '3', geometry: 'mycelium', audioBand: 'mid', scale: 1.0, color: '#e289f2', opacity: 0.7 },
          { id: '4', geometry: 'flowfield', audioBand: 'bass', scale: 1.0, color: '#ff9ebe', opacity: 0.5 }
        ]
      };
    }
    try {
      return typeof metrics.vjConfig === 'string' ? JSON.parse(metrics.vjConfig) : metrics.vjConfig;
    } catch (e) {
      console.error("vjConfig parse error", e);
      return {
        globalSpeed: 1.0,
        baseTrailOpacity: 0.12,
        layers: []
      };
    }
  };

  const handleUpdateVjConfig = async (userId: string, currentMetrics: any, updater: (config: any) => void) => {
    const currentConfig = getVjConfigObj(currentMetrics);
    updater(currentConfig);
    await handleUpdateDisplayConfig(userId, 'vjConfig', JSON.stringify(currentConfig));
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este usuario?")) return;
    try {
      const postRes = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      if (!postRes.ok) throw new Error("Failed to delete user in DB");
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      console.error("Error deleting user in DB:", err);
      alert("Error al eliminar usuario.");
    }
  };

  const handleResetDisplay = async (userId: string) => {
    if (!window.confirm("¿Estás seguro de restablecer por completo la pantalla de este cliente? Se borrarán todos los slides y la cartelería subida, y se volverá al modo automático en vivo.")) return;
    const docPathDisplays = `displays/${userId}`;
    const docPathUsers = `users/${userId}`;
    try {
      // 1. Reset Displays Collection in R2
      const dispRes = await fetch(`/api/displays/${userId}`);
      const dispData = dispRes.ok ? await dispRes.json() : {};
      const updatedDisp = {
        ...dispData,
        isRemoteControl: false,
        isZenMode: false,
        isNoDistractionsMode: false,
        contents: [],
        quotes: [],
        tickers: [],
        lastResetAt: new Date().toISOString()
      };
      await fetch(`/api/displays/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDisp)
      });

      // 2. Reset modo_manual in Users in R2
      const userRes = await fetch(`/api/users/${userId}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        userData.modo_manual = { activo: false };
        userData.manualUpdateAt = { seconds: Math.floor(Date.now() / 1000) };
        await fetch(`/api/users/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
      }
      alert("¡Pantalla restablecida con éxito!");
    } catch (err) {
      console.error("Error resetting display:", err);
      alert("Error al restablecer la pantalla.");
    }
  };

  const handleCreateJamonDemo = async () => {
    if (!window.confirm("¿Crear cuenta demo para Supermercados El Jamón?")) return;
    setLoading(true);
    setStatus(null);

    const jamonEmail = 'eljamon@auradisplay.es';
    const jamonPass = 'jamon2024';
    
    let secondaryApp;
    try {
      secondaryApp = initializeApp(firebaseConfig, 'SecondaryAppJamon');
      const secondaryAuth = getAuth(secondaryApp);

      let uid = "";
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, jamonEmail, jamonPass);
        uid = userCredential.user.uid;
      } catch (authErr: any) {
        const usersRes = await fetch('/api/users');
        const usersData = usersRes.ok ? await usersRes.json() : [];
        const existingUser = usersData.find((u: any) => u.email === jamonEmail);
        if (existingUser) {
          uid = existingUser.uid || existingUser.id;
        } else {
          throw new Error("El usuario ya existe en Auth pero no se encontró en R2.");
        }
      }

      const jamonQuotes = [
        { 
          category: "CHARCUTERÍA ARTESANA", 
          text: "EL SABOR DE LA SIERRA", 
          price: "JABUGO SELECCIÓN", 
          tag: "CORTE TRADICIONAL",
          ticker: "DISFRUTA DEL AUTÉNTICO JAMÓN DE HUELVA • SELECCIONAMOS CADA PIEZA EN LA SIERRA PARA TU MESA • EL JAMÓN: TRADICIÓN IBÉRICA",
          imageUrl: "https://images.unsplash.com/photo-1593504049359-74330189a345?auto=format&fit=crop&q=80&w=1920"
        },
        { 
          category: "FRUTERÍA DE CALIDAD", 
          text: "ORO DE NUESTRA TIERRA", 
          price: "FRESCURA KM 0", 
          tag: "HUERTA ONUBENSE",
          ticker: "FRUTAS Y VERDURAS SELECCIONADAS DIARIAMENTE EN NUESTROS CAMPOS • MÁXIMA CALIDAD Y VITAMINAS PARA TU FAMILIA • EL JAMÓN CON EL AGRICULTOR LOCAL",
          imageUrl: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=1920"
        },
        { 
          category: "PESCADERÍA DE LONJA", 
          text: "DIRECTO DE NUESTRAS COSTAS", 
          price: "CALIDAD MARINA", 
          tag: "PUERTO DE HUELVA",
          ticker: "RECIBIMOS CADA MAÑANA LO MEJOR DE NUESTROS PUERTOS • DEL MAR A TU CESTA EN TIEMPO RÉCORD • DISFRUTA DEL SABOR AUTÉNTICO DE HUELVA",
          imageUrl: "https://images.unsplash.com/photo-1534043464124-3be32fe000c9?auto=format&fit=crop&q=80&w=1920"
        },
        { 
          category: "AURA × EL JAMÓN", 
          text: "EL FUTURO DEL RETAIL", 
          price: "SISTEMA INTELIGENTE", 
          tag: "DEMO EXCLUSIVA",
          ticker: "ESTÁS ESCUCHANDO AURA BUSINESS: LA BANDA SONORA DISEÑADA PARA OPTIMIZAR TU EXPERIENCIA EN SUPERMERCADOS EL JAMÓN • TECNOLOGÍA AL SERVICIO DEL CLIENTE",
          imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1920"
        }
      ];

      await fetch(`/api/displays/${uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [],
          quotes: jamonQuotes,
          tickers: [
            { text: "BIENVENIDO A EL JAMÓN • DISFRUTA DE LA MEJOR CALIDAD × PRECIO DE HUELVA • AURA SOUNDSCAPE ACTIVO" }
          ],
          theme: 'classic',
          tickerTheme: 'classic',
          volume: 0.7,
          showTicker: true,
          establishmentName: 'Supermercado El Jamón',
          location: 'Huelva, ES',
          createdAt: new Date().toISOString()
        })
      });
      await fetch(`/api/users/${uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          email: jamonEmail,
          nombre: 'Supermercado El Jamón',
          role: 'client',
          status: 'active',
          hasImpulses: true,
          hasAdsPanel: true,
          createdAt: new Date().toISOString()
        })
      });

      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
      
      setStatus({ type: 'success', message: "Demo de 'El Jamón' actualizada con éxito." });
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || "Error al crear la demo." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePragaDemo = async () => {
    if (!window.confirm("¿Crear cuenta demo para Clínica Praga?")) return;
    setLoading(true);
    setStatus(null);

    const pragaEmail = 'clinicapraga@auradisplay.es';
    const pragaPass = 'praga2024';
    
    let secondaryApp;
    try {
      secondaryApp = initializeApp(firebaseConfig, 'SecondaryAppPraga');
      const secondaryAuth = getAuth(secondaryApp);

      let uid = "";
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, pragaEmail, pragaPass);
        uid = userCredential.user.uid;
      } catch (authErr: any) {
        const usersRes = await fetch('/api/users');
        const usersData = usersRes.ok ? await usersRes.json() : [];
        const existingUser = usersData.find((u: any) => u.email === pragaEmail);
        if (existingUser) {
          uid = existingUser.uid || existingUser.id;
        } else {
          throw new Error("El usuario ya existe en Auth pero no se encontró en R2.");
        }
      }

      const pragaQuotes = [
        { 
          category: "FISIOTERAPIA Y REHABILITACIÓN", 
          text: "RECUPERA TU MOVIMIENTO Y BIENESTAR", 
          price: "CITA PREVIA", 
          tag: "LESIONES Y SALUD DEPORTIVA",
          ticker: "TRATAMIENTO PERSONALIZADO DE LESIONES MUSCULARES • RECUPERACIÓN POSTOPERATORIA Y FISIOTERAPIA DEPORTIVA • CLÍNICA PRAGA ARACENA",
          imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=1920"
        },
        { 
          category: "PODOLOGÍA Y CUIDADO DEL PIE", 
          text: "SALUD EN CADA PASO DE TU VIDA", 
          price: "ESTUDIO DE PISADA", 
          tag: "QUIROPODIA Y PLANTILLAS",
          ticker: "TRATAMIENTO DE AFECCIONES DE PIEL Y UÑAS • ESTUDIOS COMPLETOS DE LA PISADA Y PLANTILLAS PERSONALIZADAS • CAMINA SIN DOLOR",
          imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1920"
        },
        { 
          category: "NUTRICIÓN Y DIETÉTICA", 
          text: "ALIMENTACIÓN INTELIGENTE A TU MEDIDA", 
          price: "PLANES PERSONALIZADOS", 
          tag: "ASESORAMIENTO NUTRICIONAL",
          ticker: "PLANES DE ALIMENTACIÓN INDIVIDUALES • CONTROL DE PESO Y ASESORAMIENTO PARA PATOLOGÍAS • APRENDE A NUTRIR TU CUERPO DE FORMA SANA",
          imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=1920"
        },
        { 
          category: "PSICOLOGÍA Y SALUD MENTAL", 
          text: "BIENESTAR EMOCIONAL Y ESPACIO SEGURO", 
          price: "CONSULTA INDIVIDUAL", 
          tag: "NIÑOS Y ADULTOS",
          ticker: "ATENCIÓN PSICOLÓGICA Y TERAPIA ADAPTADA PARA NIÑOS Y ADULTOS • ENCUENTRA TU EQUILIBRIO EMOCIONAL • SOLICITA TU CITA",
          imageUrl: "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&q=80&w=1920"
        },
        { 
          category: "BIENESTAR Y ESTÉTICA", 
          text: "CUIDADO INTEGRAL FACIAL Y CORPORAL", 
          price: "TRATAMIENTOS DE BELLEZA", 
          tag: "MASAJES Y ESTÉTICA",
          ticker: "MASAJES TERAPÉUTICOS Y TRATAMIENTOS CORPORALES ORIENTADOS AL CUIDADO DE TU PIEL Y ALIVIO DEL ESTRÉS • TU ESPACIO DE BIENESTAR",
          imageUrl: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&q=80&w=1920"
        }
      ];

      await fetch(`/api/displays/${uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [],
          quotes: pragaQuotes,
          tickers: [
            { text: "BIENVENIDO A CLÍNICA PRAGA ARACENA • CENTRO MÉDICO MULTIDISCIPLINAR AL SERVICIO DE TU BIENESTAR • AURA ACTIVE" }
          ],
          theme: 'classic',
          tickerTheme: 'classic',
          volume: 0.5,
          showTicker: true,
          establishmentName: 'Clínica Praga',
          location: 'Aracena, ES',
          createdAt: new Date().toISOString()
        })
      });
      await fetch(`/api/users/${uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          email: pragaEmail,
          nombre: 'Clínica Praga',
          role: 'client',
          status: 'active',
          hasImpulses: true,
          hasAdsPanel: true,
          createdAt: new Date().toISOString()
        })
      });

      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
      
      setStatus({ type: 'success', message: "Demo de 'Clínica Praga' creada/actualizada con éxito." });
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || "Error al crear la demo." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    // Auto-generate identifier if not specified
    let finalSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!finalSlug) {
      const base = city.trim() ? city.trim().substring(0, 3).toUpperCase() : "AUR";
      const cleanBase = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/gi, 'A');
      const num = Math.floor(1000 + Math.random() * 9000);
      finalSlug = `${cleanBase}${num}`.toLowerCase();
    }

    let secondaryApp;
    try {
      // 1. Create a secondary Firebase app to avoid logging out the current admin
      secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = userCredential.user;

      // 3. Initialize their Displays document in R2
      await fetch(`/api/displays/${newUser.uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [],
          quotes: [],
          tickers: [],
          establishmentName: 'Aura Business',
          location: 'Huelva, ES',
          theme: 'classic',
          createdAt: new Date().toISOString()
        })
      });

      // 4. Initialize their user profile in R2
      await fetch(`/api/users/${newUser.uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: newUser.uid,
          email: newUser.email,
          role: role,
          hasAdsPanel: hasAdsPanel,
          hasImpulses: hasImpulses,
          isDemoAccount: isDemoAccount,
          slug: finalSlug,
          whatsapp: whatsapp.trim().replace(/[^0-9+]/g, ''),
          city: city.trim(),
          createdAt: new Date().toISOString()
        })
      });

      // 4. Cleanup the secondary app
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }

      // 5. Send welcome email via Resend
      const emailResult = await sendWelcomeEmail(email, password, finalSlug);
      
      if (emailResult.success) {
        setStatus({ type: 'success', message: `Usuario ${email} creado y email enviado correctamente.` });
      } else {
        setStatus({ type: 'success', message: `Usuario ${email} creado, pero hubo un error al enviar el email.` });
      }
      
      setEmail('');
      setPassword('');
      setRole('client');
      setHasAdsPanel(false);
      setHasImpulses(false);
      setIsDemoAccount(false);
      setSlug('');
      setWhatsapp('');
      setCity('');
      fetchUsers();
    } catch (err: any) {
      console.error("Error creating user:", err);
      if (secondaryApp) await deleteApp(secondaryApp);
      
      let msg = `Error: ${err.message || 'Error desconocido'}`;
      if (err.code) msg = `Error (${err.code}): ${err.message}`;
      if (err.code === 'auth/email-already-in-use') msg = 'Este email ya está registrado.';
      if (err.code === 'auth/weak-password') msg = 'La contraseña es demasiado débil (mínimo 6 caracteres).';
      if (err.code === 'auth/operation-not-allowed') msg = 'El registro con email/contraseña no está habilitado en Firebase.';
      
      setStatus({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (isAuthorized === null) return null;

  if (isAuthorized === false) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold uppercase tracking-widest">Acceso Denegado</h1>
          <p className="mt-2 text-sm text-white/40">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-screen flex-col bg-[#0a0a0a] p-6 text-white selection:bg-white/10">
      {/* Top Navigation & Header Panel */}
      <div className="mx-auto mb-8 w-full max-w-6xl flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden pointer-events-none">
            <img 
              src="https://solonet.es/wp-content/uploads/2026/03/LOGO-AURA-BUSINESS-512-x-512-px.png" 
              alt="Aura Business Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SuperAdmin Aura Business</h1>
            <p className="text-xs text-white/40 uppercase tracking-widest">
              Conectado: {currentUserProfile?.email} ({currentUserProfile?.role})
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                activeTab === 'users' ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'
              }`}
            >
              👥 Usuarios
            </button>
            <button
              onClick={() => setActiveTab('ads')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                activeTab === 'ads' ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'
              }`}
            >
              📢 Publicidad Externa
            </button>
            <button
              onClick={() => setActiveTab('publicidad')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                activeTab === 'publicidad' ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'
              }`}
            >
              🌐 Publicidad Global ({globalAds.length})
            </button>
            <button
              onClick={() => setActiveTab('visualizers')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                activeTab === 'visualizers' ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'
              }`}
            >
              🎥 Grabar Visualizers
            </button>
            <button
              onClick={() => setActiveTab('directo')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                activeTab === 'directo' ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'
              }`}
            >
              🔴 Directo OBS
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="mx-auto w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Create User Form */}
        {(currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'superadmin') && (
          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-white/10 to-white/5 opacity-50 blur-xl" />
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative rounded-3xl border border-white/10 bg-black p-10 shadow-2xl"
            >
              <button 
                onClick={() => navigate('/admin')}
                className="mb-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white"
              >
                <ArrowLeft size={12} /> Volver al Panel
              </button>

              <div className="mb-10 flex flex-col items-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center pointer-events-none">
                  <img 
                    src="https://solonet.es/wp-content/uploads/2026/03/LOGO-AURA-BUSINESS-512-x-512-px.png" 
                    alt="Aura Business Logo"
                    className="w-full h-full object-contain"
                    style={{ filter: "url(#remove-white)" }}
                  />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">Super Admin Aura Business</h1>
                <p className="mt-2 text-sm text-white/40">Creación de nuevos usuarios y gestión de permisos.</p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <Zap className="text-yellow-500" size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Demos de Éxito Rápidas</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleCreateJamonDemo}
                    disabled={loading}
                    className="group relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-left transition-all hover:bg-yellow-500/10 hover:border-yellow-500/40"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-yellow-400">Supermercados El Jamón</span>
                        </div>
                        <p className="max-w-[180px] text-[10px] text-white/40">Crea el perfil con slides de frescos, jamonería y mensajes personalizados.</p>
                      </div>
                      <ExternalLink size={14} className="text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreatePragaDemo}
                    disabled={loading}
                    className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-left transition-all hover:bg-emerald-500/10 hover:border-emerald-500/40"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-400">Clínica Praga Aracena</span>
                        </div>
                        <p className="max-w-[180px] text-[10px] text-white/40">Crea el perfil con servicios de fisio, podología, nutrición, psicología y estética.</p>
                      </div>
                      <ExternalLink size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                </div>
              </div>

              <div className="my-8 flex items-center gap-4 px-2">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">O registro manual</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Email del Usuario</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 py-3 text-sm transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none"
                      placeholder="usuario@aurabusiness.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Contraseña Temporal</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 py-3 text-sm transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Rol del Usuario</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-white/20 focus:outline-none text-white"
                    >
                      <option value="client" className="bg-[#1a172e] text-white">Cliente</option>
                      <option value="sales" className="bg-[#1a172e] text-white">Comercial</option>
                      <option value="admin" className="bg-[#1a172e] text-white">Administrador</option>
                      <option value="superadmin" className="bg-[#1a172e] text-white">Super Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Panel Publicidad</label>
                    <div 
                      onClick={() => setHasAdsPanel(!hasAdsPanel)}
                      className={`flex h-[46px] cursor-pointer items-center justify-between rounded-xl border border-white/10 px-4 transition-all ${hasAdsPanel ? 'bg-white/10' : 'bg-white/5'}`}
                    >
                      <span className="text-xs font-medium">{hasAdsPanel ? 'Activado' : 'Desactivado'}</span>
                      <div className={`h-4 w-4 rounded-full border-2 border-white/20 ${hasAdsPanel ? 'bg-white' : ''}`} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Impulsos Aura</label>
                    <div 
                      onClick={() => setHasImpulses(!hasImpulses)}
                      className={`flex h-[46px] cursor-pointer items-center justify-between rounded-xl border border-white/10 px-4 transition-all ${hasImpulses ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-white/5'}`}
                    >
                      <span className={`text-xs font-medium ${hasImpulses ? 'text-yellow-400' : ''}`}>{hasImpulses ? 'Activado' : 'Desactivado'}</span>
                      <div className={`h-4 w-4 rounded-full border-2 border-white/20 ${hasImpulses ? 'bg-yellow-500 border-yellow-500' : ''}`} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Modo Demo / Ventas</label>
                    <div 
                      onClick={() => setIsDemoAccount(!isDemoAccount)}
                      className={`flex h-[46px] cursor-pointer items-center justify-between rounded-xl border border-white/10 px-4 transition-all ${isDemoAccount ? 'bg-purple-500/20 border-purple-500/30' : 'bg-white/5'}`}
                    >
                      <span className={`text-xs font-medium ${isDemoAccount ? 'text-purple-400' : ''}`}>{isDemoAccount ? 'Activado' : 'Desactivado'}</span>
                      <div className={`h-4 w-4 rounded-full border-2 border-white/20 ${isDemoAccount ? 'bg-purple-500 border-purple-500' : ''}`} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Código de Cuenta (ID Cliente)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const base = city.trim() ? city.trim().substring(0, 3).toUpperCase() : "AUR";
                          const cleanBase = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/gi, 'A');
                          const num = Math.floor(1000 + Math.random() * 9000);
                          setSlug(`${cleanBase}${num}`.toLowerCase());
                        }}
                        className="text-[9px] font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-all"
                      >
                        Generar Auto
                      </button>
                    </div>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full h-[46px] rounded-xl border border-white/10 bg-[#0d0d0d] px-4 text-xs focus:border-white/20 focus:outline-none"
                      placeholder="ej: HUE1024"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Ciudad / Delegación</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full h-[46px] rounded-xl border border-white/10 bg-white/5 px-4 text-xs focus:border-white/20 focus:bg-white/10 focus:outline-none"
                      placeholder="ej: Sevilla"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">WhatsApp de Contacto (con prefijo)</label>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full h-[46px] rounded-xl border border-white/10 bg-white/5 px-4 text-xs focus:border-white/20 focus:bg-white/10 focus:outline-none"
                      placeholder="ej: 34600000000"
                    />
                  </div>
                </div>

                {status && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`flex items-center gap-2 rounded-xl p-4 text-[10px] font-bold uppercase tracking-widest ${
                      status.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {status.message}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <UserPlus size={18} />
                  )}
                  Crear Usuario Aura Business
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Right: User List */}
        <div className={`space-y-6 ${currentUserProfile?.role !== 'admin' ? 'lg:col-span-2 max-w-4xl mx-auto w-full' : ''}`}>
          
          {/* Card: Cocinado Multimedia para Streaming */}
          <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-purple-500/10 to-transparent p-6 sm:p-8 backdrop-blur-md space-y-6">
            <div className="flex items-center gap-3">
              <Activity className="text-purple-400 animate-pulse" />
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white">Cocinado y Fusión de Visualizadores (Streaming)</h2>
                <p className="text-xs text-white/50">Pipeline automático de renderizado en Google Cloud Run y almacenamiento en Cloudflare R2</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Canal Objetivo</label>
                <select
                  value={bakeCanal}
                  onChange={(e) => setBakeCanal(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#161426] px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="joyeria">💍 Joyería (Lujo)</option>
                  <option value="hoteleria">🏨 Hoteles (Lounge)</option>
                  <option value="gyms">💪 Gyms (Energy)</option>
                  <option value="social">🍻 Social / Restauración</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Franja Circadiana (Sunset, Noon...)</label>
                <select
                  value={bakeFranja}
                  onChange={(e) => setBakeFranja(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#161426] px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="amanecer">🌅 Amanecer (Suave)</option>
                  <option value="mediodia">☀️ Mediodía (Brillante)</option>
                  <option value="atardecer">🌇 Atardecer (Premium/Lounge)</option>
                  <option value="noche">🌌 Noche (Relajante)</option>
                  <option value="eclipse">🔮 Eclipse (Energético)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-purple-300 mb-4">Composición Visual por Capas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-white/40 block mb-2">1. Lienzo de Fondo</label>
                  <select
                    value={bakeFondo}
                    onChange={(e) => setBakeFondo(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#161426] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="fluidos_sinestesicos_shading">🌊 Fluidos Sinestésicos</option>
                    <option value="retro-grid">📐 Rejilla Retro (Horizonte)</option>
                    <option value="wormhole-tunnel">🌀 Túnel Gusano (Círculos)</option>
                    <option value="aurora-wave">✨ Ondas Aurora (Líneas)</option>
                    <option value="default">🎨 Degradado Circadiano Plano</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-white/40 block mb-2">2. Superposición Reactiva</label>
                  <select
                    value={bakeSuperposicion}
                    onChange={(e) => setBakeSuperposicion(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#161426] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="ecualizador_lineal_v1">📊 Ecualizador Lineal Clásico</option>
                    <option value="radial-bars">⭕ Ecualizador Circular</option>
                    <option value="frequency-bars">📶 Espectro de Frecuencia Bajo</option>
                    <option value="none">❌ Ninguno (Solo Fondo)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-white/40 block mb-2">3. Partículas y Efectos</label>
                  <select
                    value={bakeParticulas}
                    onChange={(e) => setBakeParticulas(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#161426] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="motas_oro_luxury">✨ Oro Luxury (Motas de Oro)</option>
                    <option value="stars">⭐ Estrellas Shimmer</option>
                    <option value="none">❌ Ninguno (Sin partículas)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Pantalla Destino</label>
                <select
                  value={targetBakeUser}
                  onChange={(e) => setTargetBakeUser(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#161426] px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="all">Global (Todas las Pantallas)</option>
                  {users.filter(u => u.role === 'client').map((u) => (
                    <option key={u.id} value={u.id}>{u.establishmentName || u.email}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleLanzarCocinado}
                disabled={isBaking}
                className="flex items-center justify-center gap-2 rounded-xl bg-purple-500 hover:bg-purple-600 px-6 py-3 text-sm font-bold text-white transition-all disabled:opacity-50"
              >
                {isBaking ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Cocinando en Cloud Run...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    <span>Lanzar Cocinado y Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="text-white/40" />
              <h2 className="text-xl font-semibold tracking-tight">Usuarios Registrados</h2>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/admin/visualizer')}
                className="group flex items-center gap-2 rounded-full bg-purple-500/20 px-4 py-2 text-xs font-bold uppercase tracking-widest text-purple-300 border border-purple-500/30 transition-all hover:bg-purple-500/30 hover:text-purple-200"
              >
                <Video size={14} />
                Creador de Visualizers
              </button>
              <button 
                onClick={() => navigate('/admin/changelog')}
                className="group flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/60 transition-all hover:bg-white/10 hover:text-white"
              >
                <History size={14} />
                Novedades
              </button>
              {currentUserProfile?.role !== 'admin' && (
                <button 
                  onClick={() => navigate('/admin')}
                  className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
                >
                  Volver al Panel
                </button>
              )}
              <button 
                onClick={fetchUsers}
                className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
              >
                Actualizar
              </button>
            </div>
          </div>

          {!loadingUsers && (
            <>
              {/* Dashboard KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <Monitor size={18} />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Total Cuentas</div>
                      <div className="text-xl font-bold">{kpis.total}</div>
                    </div>
                  </div>
                  <TrendingUp size={48} className="absolute -bottom-2 -right-2 opacity-5" />
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4 shadow-[0_0_20px_rgba(34,197,94,0.05)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                      <Activity size={18} />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Online Ahora</div>
                      <div className="text-xl font-bold">{kpis.online}</div>
                    </div>
                  </div>
                  <Zap size={48} className="absolute -bottom-2 -right-2 opacity-5 text-green-500" />
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4 shadow-[0_0_20px_rgba(234,179,8,0.05)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                      <Zap size={18} />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Impulsos Totales</div>
                      <div className="text-xl font-bold">{kpis.impulses}</div>
                    </div>
                  </div>
                  <TrendingUp size={48} className="absolute -bottom-2 -right-2 opacity-5 text-yellow-500" />
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={12} />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por Email, Slug o Ciudad..."
                    className="w-full bg-transparent border-b border-white/5 pl-9 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                    <Filter size={12} className="text-white/20" />
                    <select 
                      value={filterRole}
                      onChange={(e: any) => setFilterRole(e.target.value)}
                      className="bg-transparent text-[9px] font-bold uppercase tracking-widest text-white/60 focus:outline-none cursor-pointer outline-none"
                    >
                      <option value="all" className="bg-[#1a172e] text-white">Roles</option>
                      <option value="client" className="bg-[#1a172e] text-white">Clientes</option>
                      <option value="sales" className="bg-[#1a172e] text-white">Comerciales</option>
                      <option value="admin" className="bg-[#1a172e] text-white">Admins</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                    <Filter size={12} className="text-white/20" />
                    <select 
                      value={filterCity}
                      onChange={(e: any) => setFilterCity(e.target.value)}
                      className="bg-transparent text-[9px] font-bold uppercase tracking-widest text-white/60 focus:outline-none cursor-pointer outline-none"
                    >
                      <option value="all" className="bg-[#1a172e] text-white">Todas las Ciudades</option>
                      {cities.map(c => (
                        <option key={c} value={c} className="bg-[#1a172e] text-white">{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {loadingUsers ? (
              <div className="flex h-40 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.02]">
                <Loader2 className="animate-spin text-white/20" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/[0.02]">
                <p className="text-xs text-white/20">No se encontraron usuarios con esos criterios.</p>
              </div>
            ) : (
              filteredUsers.map((u) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`h-2.5 w-2.5 rounded-full ${isOnline(u.displayMetrics?.lastSeen) ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/10'}`} />
                          {isOnline(u.displayMetrics?.lastSeen) && (
                            <div className="absolute -inset-1 h-full w-full animate-ping rounded-full bg-green-500/20" />
                          )}
                        </div>
                        <p className="truncate text-sm font-medium text-white/90">{u.email}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                          u.role === 'superadmin' ? 'bg-[#9333ea]/20 text-[#a855f7]' :
                          u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 
                          u.role === 'sales' ? 'bg-blue-500/20 text-blue-400' : 
                          'bg-white/10 text-white/40'
                        }`}>
                          {u.role}
                        </span>
                        {u.isOrphan && (
                          <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                            PERFIL V1 (Huérfano)
                          </span>
                        )}
                        {u.isFromDefaultDb && (
                          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                            RECUPERADO (Default DB)
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <p className="text-[9px] text-white/20 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                          <Monitor size={10} className="opacity-50" /> ID: {u.slug ? u.slug.toUpperCase() : 'SIN ID'}
                        </p>
                        <p className={`text-[9px] uppercase tracking-widest flex items-center gap-1.5 ${isOnline(u.displayMetrics?.lastSeen) ? 'text-green-500/60 font-bold' : 'text-white/20'}`}>
                          <Activity size={10} className="opacity-50" /> {getRelativeTime(u.displayMetrics?.lastSeen)}
                        </p>
                        {u.city && (
                          <p className="text-[9px] text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                            <ShieldCheck size={10} className="opacity-50" /> {u.city}
                          </p>
                        )}
                        <p className="text-[9px] text-yellow-500/60 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                          <Zap size={10} className="opacity-50" /> {u.displayMetrics?.totalImpulses || 0} Impulsos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      { (u.isOrphan || u.isFromDefaultDb) && (
                        <button 
                          onClick={async () => {
                            if (!window.confirm(`¿Crear perfil de usuario para ${u.email}?`)) return;
                              try {
                                const res = await fetch(`/api/users/${u.id}`);
                                const userData = res.ok ? await res.json() : {};
                                const updatedUser = {
                                  ...userData,
                                  email: u.email,
                                  role: u.role || 'client',
                                  createdAt: userData.createdAt || new Date().toISOString(),
                                  migrated: true
                                };
                                await fetch(`/api/users/${u.id}`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updatedUser)
                                });
                                alert("Perfil creado con éxito.");
                                fetchUsers();
                              } catch (err) {
                                alert("Error al crear perfil.");
                              }
                          }}
                          title="Crear Perfil (Vincular)"
                          className="rounded-lg bg-orange-500/10 p-2 text-orange-500 transition-all hover:bg-orange-500 hover:text-white"
                        >
                          <UserPlus size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleResetDisplay(u.id)}
                        title="Restablecer Pantalla (Auto / Vaciar)"
                        className="rounded-lg bg-yellow-500/10 p-2 text-yellow-500 transition-all hover:bg-yellow-500 hover:text-black"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button 
                        onClick={() => window.open(`/admin?uid=${u.id}`, '_blank')}
                        title="Entrar en su Pantalla"
                        className="rounded-lg bg-white/5 p-2 text-white/40 transition-all hover:bg-white hover:text-black"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button 
                        onClick={() => window.open(`/view?id=${u.id}&auraAgent=true`, '_blank')}
                        title="Ver Pantalla Pública"
                        className="rounded-lg bg-white/5 p-2 text-white/40 transition-all hover:bg-white/10 hover:text-white"
                      >
                        <Settings2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        title="Eliminar Usuario"
                        className="rounded-lg bg-white/5 p-2 text-red-500/40 transition-all hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {(currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'superadmin') && (
                    <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/5 pt-4">
                      {/* Toggles Group */}
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Publicidad:</span>
                          <button 
                            onClick={() => handleUpdatePermission(u.id, 'hasAdsPanel', !u.hasAdsPanel)}
                            className={`h-4 w-8 rounded-full transition-all relative ${u.hasAdsPanel ? 'bg-green-500' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${u.hasAdsPanel ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Impulsos:</span>
                          <button 
                            onClick={() => handleUpdatePermission(u.id, 'hasImpulses', !u.hasImpulses)}
                            className={`h-4 w-8 rounded-full transition-all relative ${u.hasImpulses ? 'bg-yellow-500' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${u.hasImpulses ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Modo Demo:</span>
                          <button 
                            onClick={() => handleUpdatePermission(u.id, 'isDemoAccount', !u.isDemoAccount)}
                            className={`h-4 w-8 rounded-full transition-all relative ${u.isDemoAccount ? 'bg-purple-500' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${u.isDemoAccount ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Streaming HLS:</span>
                          <button 
                            onClick={() => handleUpdateDisplayConfig(u.id, 'modoStreaming', !u.displayMetrics?.modoStreaming)}
                            className={`h-4 w-8 rounded-full transition-all relative ${u.displayMetrics?.modoStreaming ? 'bg-indigo-500' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${u.displayMetrics?.modoStreaming ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                      </div>

                      {/* Inputs Group */}
                      <div className="flex flex-wrap items-center gap-6 flex-1">
                        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Código de Cuenta (ID Cliente):</span>
                          <input 
                            type="text"
                            id={`slug-input-${u.id}`}
                            defaultValue={u.slug || ''}
                            onBlur={(e) => {
                              const newSlug = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
                              if (newSlug !== (u.slug || '')) {
                                handleUpdatePermission(u.id, 'slug', newSlug);
                              }
                            }}
                            className="flex-1 bg-transparent border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60 focus:outline-none focus:border-white/30 p-1"
                            placeholder="ej: HUE1024"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const base = u.city?.trim() ? u.city.trim().substring(0, 3).toUpperCase() : "AUR";
                              const cleanBase = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/gi, 'A');
                              const num = Math.floor(1000 + Math.random() * 9000);
                              const generatedSlug = `${cleanBase}${num}`.toLowerCase();
                              
                              const inputEl = document.getElementById(`slug-input-${u.id}`) as HTMLInputElement;
                              if (inputEl) {
                                inputEl.value = generatedSlug;
                              }
                              handleUpdatePermission(u.id, 'slug', generatedSlug);
                            }}
                            className="text-[9px] font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-all border border-purple-500/30 rounded px-1.5 py-0.5 bg-purple-500/5 hover:bg-purple-500/15"
                            title="Generar Identificador Único"
                          >
                            Generar
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!u.slug) {
                                alert("Primero debes asignar y guardar un Identificador Único a este cliente.");
                                return;
                              }
                              if (!confirm(`¿Enviar email con credenciales y recordatorio a ${u.email}?`)) return;
                              try {
                                const res = await sendWelcomeEmail(u.email, "*(Usa tu contraseña actual o solicita una nueva si no la recuerdas)*", u.slug);
                                if (res.success) {
                                  alert("¡Email enviado con éxito!");
                                } else {
                                  alert("Error al enviar email: " + (res.error || "Error desconocido"));
                                }
                              } catch (err) {
                                alert("Error de red al enviar el email.");
                              }
                            }}
                            className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-all border border-emerald-500/30 rounded px-2.5 py-1.5 bg-emerald-500/5 hover:bg-emerald-500/15 flex items-center gap-1.5"
                          >
                            ✉️ Enviar Credenciales
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">URL Stream:</span>
                          <input 
                            type="text"
                            defaultValue={u.displayMetrics?.streamingUrl || ''}
                            onBlur={(e) => {
                              const newUrl = e.target.value.trim();
                              if (newUrl !== (u.displayMetrics?.streamingUrl || '')) {
                                handleUpdateDisplayConfig(u.id, 'streamingUrl', newUrl);
                              }
                            }}
                            className="flex-1 bg-transparent border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60 focus:outline-none focus:border-white/30 p-1"
                            placeholder="https://..."
                          />
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">WhatsApp:</span>
                          <input 
                            type="text"
                            defaultValue={u.whatsapp || ''}
                            onBlur={(e) => {
                              const newWap = e.target.value.trim().replace(/[^0-9+]/g, '');
                              if (newWap !== (u.whatsapp || '')) {
                                handleUpdatePermission(u.id, 'whatsapp', newWap);
                              }
                            }}
                            className="flex-1 bg-transparent border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60 focus:outline-none focus:border-white/30 p-1"
                            placeholder="34..."
                          />
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Ciudad:</span>
                          <input 
                            type="text"
                            defaultValue={u.city || ''}
                            onBlur={(e) => {
                              const newCity = e.target.value.trim();
                              if (newCity !== (u.city || '')) {
                                handleUpdatePermission(u.id, 'city', newCity);
                              }
                            }}
                            className="flex-1 bg-transparent border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60 focus:outline-none focus:border-white/30 p-1"
                            placeholder="Sevilla..."
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Rol:</span>
                          <select 
                            value={u.role}
                            onChange={(e) => handleUpdatePermission(u.id, 'role', e.target.value)}
                            className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-white/60 focus:outline-none cursor-pointer"
                          >
                            <option value="client" className="bg-[#1a172e] text-white">Cliente</option>
                            <option value="sales" className="bg-[#1a172e] text-white">Comercial</option>
                            <option value="admin" className="bg-[#1a172e] text-white">Admin</option>
                            <option value="superadmin" className="bg-[#1a172e] text-white">Super Admin</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Intervalo Ads:</span>
                          <select 
                            value={u.adIntervalMins || 10}
                            onChange={(e) => handleUpdatePermission(u.id, 'adIntervalMins', parseInt(e.target.value, 10))}
                            className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-white/60 focus:outline-none cursor-pointer"
                          >
                            <option value={10} className="bg-[#1a172e] text-white">10 Min</option>
                            <option value={20} className="bg-[#1a172e] text-white">20 Min</option>
                            <option value={30} className="bg-[#1a172e] text-white">30 Min</option>
                            <option value={60} className="bg-[#1a172e] text-white">60 Min</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Estilo Visual:</span>
                          <select 
                            value={u.displayMetrics?.visualStyle || 'standard'}
                            onChange={(e) => handleUpdateDisplayConfig(u.id, 'visualStyle', e.target.value)}
                            className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-white/60 focus:outline-none cursor-pointer"
                          >
                            <option value="standard" className="bg-[#1a172e] text-white">Estándar (Live/Fallbacks)</option>
                            <option value="geolab" className="bg-[#1a172e] text-white">GEOLAB (Audio-Reactivo)</option>
                          </select>
                        </div>
                      </div>
                      
                      {u.displayMetrics?.visualStyle === 'geolab' && (() => {
                        const vjConfig = getVjConfigObj(u.displayMetrics);
                        return (
                          <div className="w-full mt-4 p-4 rounded-xl border border-purple-500/10 bg-purple-950/5 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                                <Activity size={12} /> Consola de Control GEOLAB
                              </span>
                              <span className="text-[9px] text-white/40 uppercase tracking-widest">Solo SuperAdmin</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-white/40 flex justify-between">
                                  <span>Velocidad Global: {vjConfig.globalSpeed}x</span>
                                </label>
                                <input 
                                  type="range" 
                                  min="0.1" 
                                  max="3.0" 
                                  step="0.1"
                                  value={vjConfig.globalSpeed}
                                  onChange={(e) => handleUpdateVjConfig(u.id, u.displayMetrics, (cfg) => {
                                    cfg.globalSpeed = parseFloat(e.target.value);
                                  })}
                                  className="w-full accent-purple-500 bg-white/5 rounded-lg appearance-none h-1"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-white/40 flex justify-between">
                                  <span>Persistencia / Estela: {vjConfig.baseTrailOpacity}</span>
                                </label>
                                <input 
                                  type="range" 
                                  min="0.01" 
                                  max="0.5" 
                                  step="0.01"
                                  value={vjConfig.baseTrailOpacity}
                                  onChange={(e) => handleUpdateVjConfig(u.id, u.displayMetrics, (cfg) => {
                                    cfg.baseTrailOpacity = parseFloat(e.target.value);
                                  })}
                                  className="w-full accent-purple-500 bg-white/5 rounded-lg appearance-none h-1"
                                />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-white/30 block">Capas del Motor Geométrico:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {vjConfig.layers.map((layer: any, idx: number) => (
                                  <div key={layer.id || idx} className="p-3 rounded-lg border border-white/5 bg-white/[0.01] space-y-2.5">
                                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-purple-300">
                                      <span>Capa #{idx + 1}</span>
                                      <select 
                                        value={layer.geometry} 
                                        onChange={(e) => handleUpdateVjConfig(u.id, u.displayMetrics, (cfg) => {
                                          cfg.layers[idx].geometry = e.target.value;
                                        })}
                                        className="bg-transparent text-white focus:outline-none cursor-pointer text-[9px] font-bold uppercase"
                                      >
                                        <option value="lorenz" className="bg-[#1a172e] text-white">Atractor Lorenz (3D)</option>
                                        <option value="clifford" className="bg-[#1a172e] text-white">Atractor Clifford (2D)</option>
                                        <option value="mycelium" className="bg-[#1a172e] text-white">Red Micelio</option>
                                        <option value="flowfield" className="bg-[#1a172e] text-white">Flow Field</option>
                                      </select>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-[9px] font-bold uppercase tracking-widest text-white/40">
                                      <div className="space-y-1">
                                        <span>Reacción Audio:</span>
                                        <select 
                                          value={layer.audioBand}
                                          onChange={(e) => handleUpdateVjConfig(u.id, u.displayMetrics, (cfg) => {
                                            cfg.layers[idx].audioBand = e.target.value;
                                          })}
                                          className="w-full bg-white/5 border border-white/5 rounded px-1.5 py-0.5 text-white/80 focus:outline-none cursor-pointer"
                                        >
                                          <option value="subBass" className="bg-[#1a172e] text-white">Sub Bass</option>
                                          <option value="bass" className="bg-[#1a172e] text-white">Bass</option>
                                          <option value="lowMid" className="bg-[#1a172e] text-white">Low Mid</option>
                                          <option value="mid" className="bg-[#1a172e] text-white">Mid</option>
                                          <option value="highMid" className="bg-[#1a172e] text-white">High Mid</option>
                                          <option value="treble" className="bg-[#1a172e] text-white">Treble</option>
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                        <span>Color:</span>
                                        <div className="flex items-center gap-1">
                                          <input 
                                            type="color" 
                                            value={layer.color}
                                            onChange={(e) => handleUpdateVjConfig(u.id, u.displayMetrics, (cfg) => {
                                              cfg.layers[idx].color = e.target.value;
                                            })}
                                            className="w-4 h-4 bg-transparent border-0 rounded cursor-pointer"
                                          />
                                          <input 
                                            type="text" 
                                            value={layer.color}
                                            onChange={(e) => handleUpdateVjConfig(u.id, u.displayMetrics, (cfg) => {
                                              cfg.layers[idx].color = e.target.value;
                                            })}
                                            className="w-full bg-white/5 border border-white/5 rounded px-1 py-0.5 text-[8px] text-white/80 font-mono"
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <span>Escala:</span>
                                        <input 
                                          type="number" 
                                          step="0.1" 
                                          value={layer.scale}
                                          onChange={(e) => handleUpdateVjConfig(u.id, u.displayMetrics, (cfg) => {
                                            cfg.layers[idx].scale = parseFloat(e.target.value) || 1.0;
                                          })}
                                          className="w-full bg-white/5 border border-white/5 rounded px-1.5 py-0.5 text-white/80 focus:outline-none"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <span>Opacidad: {layer.opacity}</span>
                                        <input 
                                          type="range" 
                                          min="0" 
                                          max="1" 
                                          step="0.05"
                                          value={layer.opacity}
                                          onChange={(e) => handleUpdateVjConfig(u.id, u.displayMetrics, (cfg) => {
                                            cfg.layers[idx].opacity = parseFloat(e.target.value);
                                          })}
                                          className="w-full accent-purple-500 bg-white/5 rounded appearance-none h-1 mt-1.5"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'ads' && (
        <div className="mx-auto w-full max-w-6xl space-y-6">
          {adSubTab === 'list' ? (
            <div className="space-y-6">
              {/* Top Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0a0712]/40 border border-white/5 p-6 rounded-3xl backdrop-blur-md">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    📢 Publicidad Externa
                  </h2>
                  <p className="text-xs text-white/40 mt-1.5 max-w-2xl leading-relaxed">
                    Las imágenes y slides que configures aquí se intercalarán de manera uniforme en la reproducción de los clientes segmentados (una diapositiva de publicidad por cada 2 locales).
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={fetchExternalAds} 
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 text-white/80 transition-all"
                  >
                    Actualizar Lista
                  </button>
                  <button
                    onClick={() => { resetAdForm(); setAdSubTab('create'); }}
                    className="px-5 py-2.5 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Crear Anuncio
                  </button>
                </div>
              </div>

              {/* Ads List Grid */}
              {loadingAds ? (
                <div className="flex h-60 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.01]">
                  <Loader2 className="animate-spin text-white/20" />
                </div>
              ) : externalAds.length === 0 ? (
                <div className="flex h-60 flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/[0.01] text-center p-6">
                  <p className="text-xs text-white/40 italic">No hay publicidad externa configurada.</p>
                  <button
                    onClick={() => { resetAdForm(); setAdSubTab('create'); }}
                    className="mt-4 px-4 py-2.5 rounded-xl bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 transition-all"
                  >
                    Crear el Primer Anuncio
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {externalAds.map((ad) => (
                    <motion.div
                      key={ad.id}
                      layoutId={ad.id}
                      className="rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] p-5 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        {/* Thumbnail or Icon */}
                        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/5 shadow-inner">
                          {ad.type === 'quote' ? (
                            <div className="absolute inset-0 flex flex-col justify-center p-4 bg-gradient-to-br from-purple-900/40 to-black text-center">
                              {ad.imageUrl && (
                                <img src={ad.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35" />
                              )}
                              <div className="relative z-10">
                                {ad.category && <span className="text-[7px] font-extrabold uppercase tracking-widest text-white/40 block mb-0.5">{ad.category}</span>}
                                <p className="text-[11px] font-bold text-white line-clamp-2 leading-tight">{ad.text}</p>
                                {ad.price && <p className="text-[10px] font-semibold text-yellow-400 mt-1">{ad.price}</p>}
                              </div>
                            </div>
                          ) : (
                            ad.url && <img src={ad.url} alt={ad.name} className="w-full h-full object-cover" />
                          )}
                          <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest ${
                            ad.isDesigned ? 'bg-yellow-500/20 text-yellow-300' : ad.type === 'quote' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {ad.isDesigned ? 'Diseño' : ad.type === 'quote' ? 'Slide' : 'Imagen'}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="px-1">
                          <h4 className="text-sm font-bold text-white/95 line-clamp-1">
                            {ad.type === 'quote' ? ad.text : ad.name}
                          </h4>
                          <div className="mt-2.5 space-y-1">
                            {/* Segmentación Badge */}
                            <div className="flex items-center gap-1.5 text-[9px] text-white/40 uppercase tracking-wider">
                              <span className="font-bold">Target:</span>
                              <span className="text-white/60">
                                {ad.targetType === 'all' && 'Global (Todos)'}
                                {ad.targetType === 'users' && `Usuarios (${ad.targetUsers?.length || 0})`}
                                {ad.targetType === 'cities' && `Ciudades (${ad.targetCities?.length || 0})`}
                                {ad.targetType === 'sectors' && `Sectores (${ad.targetSectors?.join(', ') || ''})`}
                              </span>
                            </div>

                            {/* Horario Badge */}
                            <div className="flex items-center gap-1.5 text-[9px] text-white/40 uppercase tracking-wider">
                              <span className="font-bold">Horario:</span>
                              <span className="text-white/60">
                                {ad.schedule?.enabled 
                                  ? `${ad.schedule.startTime} - ${ad.schedule.endTime} (${
                                      ad.schedule.days?.map((d: number) => ['D', 'L', 'M', 'X', 'J', 'V', 'S'][d]).join(', ')
                                    })`
                                  : 'Todo el día'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 border-t border-white/5 mt-4 pt-3">
                        <button
                          onClick={() => handleEditAd(ad)}
                          className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white flex items-center justify-center gap-1 transition-all"
                        >
                          <Edit2 size={10} /> Editar
                        </button>
                        <button
                          onClick={() => handleDeleteAd(ad.id)}
                          className="py-2 px-3 text-[10px] font-bold uppercase rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Back Bar */}
              <div className="flex items-center justify-between bg-[#0a0712]/40 border border-white/5 p-4 px-6 rounded-3xl backdrop-blur-md">
                <button
                  onClick={() => { resetAdForm(); setAdSubTab('list'); }}
                  className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Volver a la Lista</span>
                </button>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {editingAdId ? "Editar Anuncio Externo" : "Crear Nuevo Anuncio"}
                </span>
              </div>

              {/* Large Split Columns Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Column 1: Designer / Form Controls */}
                <div className="relative">
                  <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-white/5 to-white/0 opacity-30 blur-xl" />
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative rounded-3xl border border-white/10 bg-black p-8 shadow-2xl"
                  >
                    <form onSubmit={handleSaveAd} className="space-y-6">
                      {/* Tipo de Anuncio */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tipo de Anuncio</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => { setAdType('image'); if (!adImageUrl) setAdImageUrl(adUrl); }}
                            className={`py-2.5 text-[10px] font-bold rounded-xl border transition-all text-center ${
                              adType === 'image' ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                            }`}
                          >
                            Imagen
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdType('quote')}
                            className={`py-2.5 text-[10px] font-bold rounded-xl border transition-all text-center ${
                              adType === 'quote' ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                            }`}
                          >
                            Plantilla Slide
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdType('design')}
                            className={`py-2.5 text-[10px] font-bold rounded-xl border transition-all text-center ${
                              adType === 'design' ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                            }`}
                          >
                            Cartelera
                          </button>
                        </div>
                      </div>

                      {/* Título o Texto principal */}
                      {adType !== 'design' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                            {adType === 'quote' ? 'Texto del Slide (Título)' : 'Nombre del Anuncio'}
                          </label>
                          <input
                            type="text"
                            required
                            value={adText}
                            onChange={(e) => setAdText(e.target.value)}
                            placeholder={adType === 'quote' ? 'Ej: NUEVO MENÚ DEL DÍA' : 'Ej: Promoción Verano'}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Campos extra de Quote */}
                      {adType === 'quote' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Subtexto / Precio</label>
                              <input
                                type="text"
                                value={adPrice}
                                onChange={(e) => setAdPrice(e.target.value)}
                                placeholder="Ej: Solo 12,90€"
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Categoría</label>
                              <input
                                type="text"
                                value={adCategory}
                                onChange={(e) => setAdCategory(e.target.value)}
                                placeholder="Ej: RESTAURANTE"
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Etiqueta / Tag</label>
                              <input
                                type="text"
                                value={adTag}
                                onChange={(e) => setAdTag(e.target.value)}
                                placeholder="Ej: HOY"
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Reloj en Pantalla</label>
                              <button
                                type="button"
                                onClick={() => setAdShowClock(!adShowClock)}
                                className={`w-full h-[46px] rounded-xl border transition-all text-xs font-semibold flex items-center justify-between px-4 ${
                                  adShowClock ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'
                                }`}
                              >
                                <span>{adShowClock ? 'Mostrar Reloj' : 'Ocultar Reloj'}</span>
                                <Clock size={16} className={adShowClock ? 'text-white' : 'text-white/20'} />
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Diseñador de Cartelera */}
                      {adType === 'design' && (
                        <>
                          {/* Sector & Estilo Visual */}
                          <div className="space-y-3 border-t border-white/5 pt-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Sector & Estilo Visual</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {Object.entries({
                                restauracion: "Restauración",
                                clinica: "Clínica",
                                gym: "Gimnasio",
                                retail: "Retail / Tienda",
                                hotel: "Hotel / Premium"
                              }).map(([sec, name]) => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => {
                                    setSignageSector(sec);
                                    const styles: Record<string, any> = {
                                      restauracion: { title: "#ffffff", offer: "#f5af19", subtext: "#e9e4d4", tag: "#f5af19" },
                                      clinica: { title: "#ffffff", offer: "#20c997", subtext: "#9d94b0", tag: "#20c997" },
                                      gym: { title: "#ffffff", offer: "#ff007f", subtext: "#e9dce5", tag: "#ff007f" },
                                      retail: { title: "#ffffff", offer: "#00f2fe", subtext: "#d1eff2", tag: "#00f2fe" },
                                      hotel: { title: "#ffffff", offer: "#e5c158", subtext: "#f3effa", tag: "#e5c158" }
                                    };
                                    setSignageColors(styles[sec]);
                                  }}
                                  className={`px-2.5 py-1.5 text-[9px] font-bold rounded-lg transition-all border ${signageSector === sec ? "bg-white text-black border-white shadow-md shadow-white/5" : "bg-white/5 text-white/60 border-white/5 hover:bg-white/10"}`}
                                >
                                  {name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Textos del Cartel */}
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Título Principal</label>
                              <input 
                                type="text"
                                required
                                value={signageTitle}
                                onChange={(e) => {
                                  setSignageTitle(e.target.value);
                                  setAdText(e.target.value);
                                }}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                                placeholder="Ej: MARISCADA ROYAL"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Oferta Destacada</label>
                              <input 
                                type="text"
                                value={signageOffer}
                                onChange={(e) => setSignageOffer(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                                placeholder="Ej: SOLO HOY 35€"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Subtexto o Condiciones</label>
                              <input 
                                type="text"
                                value={signageSubtext}
                                onChange={(e) => setSignageSubtext(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-white/20 focus:outline-none"
                                placeholder="Ej: IVA Incluido, consumo en local"
                              />
                            </div>
                          </div>

                          {/* Opciones del Fondo */}
                          <div className="space-y-3 border-t border-white/5 pt-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Fondo del Cartel</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setSignageBgType("gradient")}
                                className={`flex-1 py-2 text-[10px] font-bold rounded-xl border transition-all ${signageBgType === "gradient" ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"}`}
                              >
                                Gradientes
                              </button>
                              <button
                                type="button"
                                onClick={() => setSignageBgType("image")}
                                className={`flex-1 py-2 text-[10px] font-bold rounded-xl border transition-all ${signageBgType === "image" ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"}`}
                              >
                                Imagen Foto
                              </button>
                            </div>

                            {signageBgType === "gradient" ? (
                              <div className="space-y-2 pt-1">
                                <div className="flex flex-wrap gap-1.5">
                                  {[
                                    { name: "Cosmo", value: "linear-gradient(135deg, #1f1235, #0f081d)" },
                                    { name: "Violet", value: "linear-gradient(135deg, #8a2be2, #4a00e0)" },
                                    { name: "Pink", value: "linear-gradient(135deg, #ff007f, #75003b)" },
                                    { name: "Cyan", value: "linear-gradient(135deg, #00f2fe, #4facfe)" },
                                    { name: "Amber", value: "linear-gradient(135deg, #f12711, #f5af19)" },
                                    { name: "Mint", value: "linear-gradient(135deg, #11998e, #38ef7d)" },
                                    { name: "Ocean", value: "linear-gradient(135deg, #130cb7, #52e5e7)" },
                                  ].map((grad) => (
                                    <button
                                      key={grad.name}
                                      type="button"
                                      onClick={() => setSignageSelectedGradient(grad.value)}
                                      className={`px-2.5 py-1 rounded text-[9px] font-bold text-white transition-all border ${signageSelectedGradient === grad.value ? "border-white scale-105" : "border-white/10 opacity-70 hover:opacity-100"}`}
                                      style={{ background: grad.value }}
                                    >
                                      {grad.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3 pt-1">
                                <input 
                                  type="text"
                                  value={signageCustomUrl}
                                  onChange={(e) => setSignageCustomUrl(e.target.value)}
                                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs focus:border-white/20 focus:outline-none"
                                  placeholder="Ej: https://images.unsplash.com/..."
                                />

                                {/* Presets */}
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    { name: "Platillo", url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200" },
                                    { name: "Copas", url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=1200" },
                                    { name: "Burger", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1200" },
                                    { name: "Gym", url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1200" }
                                  ].map((preset) => (
                                    <button
                                      key={preset.name}
                                      type="button"
                                      onClick={() => setSignageCustomUrl(preset.url)}
                                      className="text-left rounded-lg bg-black/40 border border-white/10 p-1.5 flex items-center gap-1.5 hover:bg-white/5 transition-all"
                                    >
                                      <img src={preset.url} className="w-6 h-6 rounded object-cover" referrerPolicy="no-referrer" />
                                      <span className="text-[9px] text-white/60 font-medium truncate">{preset.name}</span>
                                    </button>
                                  ))}
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold uppercase tracking-widest text-white/40 block">Opacidad Tinte ({Math.round(signageOpacity * 100)}%)</label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={signageOpacity}
                                    onChange={(e) => setSignageOpacity(parseFloat(e.target.value))}
                                    className="w-full accent-white"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Ajustes Avanzados */}
                          <div className="space-y-3 border-t border-white/5 pt-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Colores & Escala</label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[8px] font-bold uppercase tracking-widest text-white/45">Título</label>
                                <div className="flex gap-1.5">
                                  <input 
                                    type="color" 
                                    value={signageColors.title} 
                                    onChange={(e) => setSignageColors({ ...signageColors, title: e.target.value })}
                                    className="w-7 h-6 rounded border-0 bg-transparent cursor-pointer"
                                  />
                                  <span className="text-[9px] font-mono text-white/60 leading-6 uppercase">{signageColors.title}</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[8px] font-bold uppercase tracking-widest text-white/45">Oferta</label>
                                <div className="flex gap-1.5">
                                  <input 
                                    type="color" 
                                    value={signageColors.offer} 
                                    onChange={(e) => setSignageColors({ ...signageColors, offer: e.target.value })}
                                    className="w-7 h-6 rounded border-0 bg-transparent cursor-pointer"
                                  />
                                  <span className="text-[9px] font-mono text-white/60 leading-6 uppercase">{signageColors.offer}</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[8px] font-bold uppercase tracking-widest text-white/45">Tag / Etiqueta</label>
                                <div className="flex gap-1.5">
                                  <input 
                                    type="color" 
                                    value={signageColors.tag} 
                                    onChange={(e) => setSignageColors({ ...signageColors, tag: e.target.value })}
                                    className="w-7 h-6 rounded border-0 bg-transparent cursor-pointer"
                                  />
                                  <span className="text-[9px] font-mono text-white/60 leading-6 uppercase">{signageColors.tag}</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[8px] font-bold uppercase tracking-widest text-white/45">Subtexto</label>
                                <div className="flex gap-1.5">
                                  <input 
                                    type="color" 
                                    value={signageColors.subtext} 
                                    onChange={(e) => setSignageColors({ ...signageColors, subtext: e.target.value })}
                                    className="w-7 h-6 rounded border-0 bg-transparent cursor-pointer"
                                  />
                                  <span className="text-[9px] font-mono text-white/60 leading-6 uppercase">{signageColors.subtext}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1 pt-1">
                              <label className="text-[8px] font-bold uppercase tracking-widest text-white/45 block">Escala del Letrero ({signageScale.toFixed(1)}x)</label>
                              <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.1"
                                value={signageScale}
                                onChange={(e) => setSignageScale(parseFloat(e.target.value))}
                                className="w-full accent-white"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Segmentación (Targeting) */}
                      <div className="border-t border-white/5 pt-4 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Segmentación</h3>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Criterio de Target</label>
                          <select
                            value={adTargetType}
                            onChange={(e) => setAdTargetType(e.target.value as any)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-white/20 focus:outline-none text-white"
                          >
                            <option value="all" className="bg-[#1a172e] text-white">Global (Todas las Pantallas)</option>
                            <option value="users" className="bg-[#1a172e] text-white">Por Usuario (IDs o Emails)</option>
                            <option value="cities" className="bg-[#1a172e] text-white">Por Ciudades / Provincias</option>
                            <option value="sectors" className="bg-[#1a172e] text-white">Por Sector de Comercio</option>
                          </select>
                        </div>

                        {adTargetType === 'users' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Usuarios Objetivos</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={userInputField}
                                onChange={(e) => setUserInputField(e.target.value)}
                                placeholder="ID o email del cliente"
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs focus:border-white/20 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={addTargetUser}
                                className="rounded-xl bg-white text-black px-4 text-xs font-bold"
                              >
                                Añadir
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                              {adTargetUsers.map(u => (
                                <span key={u} className="flex items-center gap-1 text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                                  {u}
                                  <button type="button" onClick={() => removeTargetUser(u)} className="text-white/40 hover:text-white">
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {adTargetType === 'cities' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Ciudades / Provincias</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={cityInputField}
                                onChange={(e) => setCityInputField(e.target.value)}
                                placeholder="Ej: Huelva"
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs focus:border-white/20 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={addTargetCity}
                                className="rounded-xl bg-white text-black px-4 text-xs font-bold"
                              >
                                Añadir
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                              {adTargetCities.map(c => (
                                <span key={c} className="flex items-center gap-1 text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                                  {c}
                                  <button type="button" onClick={() => removeTargetCity(c)} className="text-white/40 hover:text-white">
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {adTargetType === 'sectors' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Sectores Objetivos</label>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              {[
                                { id: 'restauracion', name: 'Restauración' },
                                { id: 'clinica', name: 'Clínica / Salud' },
                                { id: 'gym', name: 'Gimnasio' },
                                { id: 'retail', name: 'Retail / Tienda' },
                                { id: 'hotel', name: 'Hotel' }
                              ].map(sec => (
                                <button
                                  type="button"
                                  key={sec.id}
                                  onClick={() => toggleTargetSector(sec.id)}
                                  className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
                                    adTargetSectors.includes(sec.id)
                                      ? 'bg-white text-black border-white'
                                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                                  }`}
                                >
                                  {sec.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Programación (Scheduling) */}
                      <div className="border-t border-white/5 pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Programación Horaria</h3>
                          <button
                            type="button"
                            onClick={() => setAdScheduleEnabled(!adScheduleEnabled)}
                            className={`h-5 w-10 rounded-full transition-all relative ${adScheduleEnabled ? 'bg-green-500' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${adScheduleEnabled ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>

                        {adScheduleEnabled && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-4 overflow-hidden"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-white/40">Hora Inicio</label>
                                <input
                                  type="time"
                                  value={adScheduleStartTime}
                                  onChange={(e) => setAdScheduleStartTime(e.target.value)}
                                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs focus:border-white/20 focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-white/40">Hora Fin</label>
                                <input
                                  type="time"
                                  value={adScheduleEndTime}
                                  onChange={(e) => setAdScheduleEndTime(e.target.value)}
                                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs focus:border-white/20 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-white/40 block">Días de Semana</label>
                              <div className="flex justify-between gap-1">
                                {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, idx) => (
                                  <button
                                    type="button"
                                    key={idx}
                                    onClick={() => toggleScheduleDay(idx)}
                                    className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                                      adScheduleDays.includes(idx)
                                        ? 'bg-white text-black'
                                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Form Buttons */}
                      <div className="flex gap-3 border-t border-white/5 pt-4">
                        <button
                          type="submit"
                          className="flex-1 rounded-xl bg-white py-3 text-xs font-bold uppercase tracking-widest text-black hover:scale-[1.02] transition-transform"
                        >
                          {editingAdId ? "Actualizar Anuncio" : "Guardar Anuncio"}
                        </button>
                        {(editingAdId || adImageUrl || adText || adUrl) && (
                          <button
                            type="button"
                            onClick={resetAdForm}
                            className="rounded-xl bg-white/5 border border-white/10 px-4 text-xs font-bold uppercase hover:bg-white/10"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>
                    </form>
                  </motion.div>
                </div>

                {/* Column 2: Large Visual Preview & Image Uploaders */}
                <div className="space-y-6 lg:sticky lg:top-6">
                  {/* Vista Previa 1080p */}
                  {adType === 'design' && (
                    <div className="relative rounded-3xl border border-white/10 bg-black p-8 shadow-2xl space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Vista Previa del Cartel (1080p)</h3>
                      <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-black shadow-lg">
                        <div 
                          className="relative aspect-video w-full flex flex-col items-center justify-center p-6 text-center"
                          style={{
                            background: signageBgType === "gradient" ? signageSelectedGradient : "#0a0712"
                          }}
                        >
                          {/* Image base layer */}
                          {signageBgType !== "gradient" && signageCustomUrl && (
                            <img 
                              src={signageCustomUrl}
                              className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-all duration-300"
                              style={{ opacity: 1 }}
                              referrerPolicy="no-referrer"
                            />
                          )}

                          {/* Gradient shader block */}
                          {signageBgType !== "gradient" && (
                            <div 
                              className="absolute inset-0 pointer-events-none"
                              style={{ 
                                background: signageSelectedGradient,
                                opacity: signageOpacity
                              }}
                            />
                          )}

                          {/* Cinematic shadow vignette */}
                          <div 
                            className="absolute inset-0 z-[2] pointer-events-none"
                            style={{
                              background: "radial-gradient(circle, rgba(10,7,18,0.15) 0%, rgba(10,7,18,0.85) 100%)"
                            }}
                          />

                          {/* Render visual content */}
                          <div 
                            className="relative z-10 flex flex-col items-center justify-center gap-2 max-w-[85%] transition-transform duration-200"
                            style={{ transform: `scale(${signageScale})` }}
                          >
                            <div 
                              className="text-[9px] font-bold tracking-[0.25em] uppercase py-0.5 px-2.5 rounded border transition-all"
                              style={{ 
                                color: signageColors.tag,
                                borderColor: signageColors.tag,
                                background: `${signageColors.tag}15`
                              }}
                            >
                              {{
                                restauracion: "RESTAURACIÓN",
                                clinica: "CLÍNICA / SALUD",
                                gym: "DEPORTE / FITNESS",
                                retail: "RETAIL / PROMO",
                                hotel: "HOTEL / PREMIUM"
                              }[signageSector] || "AURA"}
                            </div>

                            <h1 
                              className="text-[18px] sm:text-[22px] font-black uppercase tracking-tight leading-tight max-w-[340px] transition-all drop-shadow-md"
                              style={{ 
                                color: signageColors.title,
                                textShadow: "0 2px 6px rgba(0, 0, 0, 0.82)"
                              }}
                            >
                              {signageTitle || "SIN TÍTULO"}
                            </h1>

                            <div 
                              className="py-1 px-4 rounded border transition-all shadow-md"
                              style={{
                                borderColor: signageColors.offer,
                                background: `${signageColors.offer}12`,
                                boxShadow: `0 0 12px ${signageColors.offer}20`
                              }}
                            >
                              <span 
                                className="text-[12px] font-extrabold uppercase tracking-wide"
                                style={{ 
                                  color: signageColors.offer,
                                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.45)"
                                }}
                              >
                                {signageOffer || "SIN OFERTA"}
                              </span>
                            </div>

                            {signageSubtext && (
                              <p 
                                className="text-[9px] font-light italic opacity-85 mt-1"
                                style={{ 
                                  color: signageColors.subtext,
                                  textShadow: "0 1px 4px rgba(0, 0, 0, 0.65)"
                                }}
                              >
                                {signageSubtext}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subida de Imagen Background / Imagen Publicidad */}
                  {adType !== 'design' && (
                    <div className="relative rounded-3xl border border-white/10 bg-black p-8 shadow-2xl space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Imagen de Anuncio</h3>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={adType === 'image' ? (adImageUrl || adUrl) : adImageUrl}
                            onChange={(e) => {
                              setAdImageUrl(e.target.value);
                              if (adType === 'image') setAdUrl(e.target.value);
                            }}
                            placeholder="http://..."
                            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs focus:border-white/20 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAdImage}
                            className="rounded-xl border border-white/10 bg-white/10 px-4 hover:bg-white/20 text-xs font-bold uppercase"
                          >
                            {uploadingAdImage ? "Subiendo..." : "Subir"}
                          </button>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleAdImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        {(adImageUrl || (adType === 'image' && adUrl)) && (
                          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg">
                            <img
                              src={adImageUrl || adUrl}
                              alt="Previsualización"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => { setAdImageUrl(''); setAdUrl(''); }}
                              className="absolute right-2.5 top-2.5 rounded-full bg-black/60 p-1.5 hover:bg-black transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Info Explanatory Panel in Designer View */}
                  <div className="p-6 rounded-3xl border border-white/5 bg-[#0a0712]/30 space-y-2">
                    <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">💡 Proporción de Publicidad</h4>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Este anuncio se integrará automáticamente en las pantallas que coincidan con la segmentación elegida. El sistema intercala de forma uniforme **1 diapositiva de publicidad por cada 2 locales**.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'publicidad' && (
        <div className="mx-auto w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Upload */}
          <div className="lg:col-span-1 relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-white/10 to-white/5 opacity-50 blur-xl" />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative rounded-3xl border border-white/10 bg-black p-8 shadow-2xl space-y-6"
            >
              <h2 className="text-xl font-bold tracking-tight">Publicar en Red Global</h2>
              <p className="text-xs text-white/40 leading-relaxed">
                Las imágenes que subas aquí se intercalarán de manera uniforme en la reproducción de todos los clientes (una diapositiva global por cada 2 locales).
              </p>

              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-white/20 rounded-2xl p-8 bg-white/[0.01] hover:bg-white/[0.02] transition-all cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadGlobalAd}
                    disabled={uploadingAd}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {uploadingAd ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-white/40" />
                      <span className="text-xs font-bold uppercase tracking-widest text-white/40">Subiendo Anuncio...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <PlusCircle className="text-white/40 mb-1" size={28} />
                      <span className="text-xs font-bold uppercase tracking-widest text-white/80">Seleccionar Imagen</span>
                      <span className="text-[10px] text-white/30">Límite de tamaño: 2MB (1920x1080 recomendado)</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Global Ads List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold tracking-tight">
              Anuncios de Red Activos ({globalAds.length})
            </h2>

            {globalAds.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/[0.02]">
                <p className="text-xs text-white/40 italic">No hay anuncios de red configurados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                {globalAds.map((ad, idx) => (
                  <motion.div
                    key={ad.storagePath || idx}
                    className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-white/5">
                        <img src={ad.url} alt={ad.name} className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest bg-purple-500/20 text-purple-300">
                          Red Global
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white/95 line-clamp-1">{ad.name}</h4>
                        <span className="text-[9px] text-white/30 block mt-1">
                          Subido: {new Date(ad.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-white/5 mt-4 pt-3">
                      <button
                        onClick={() => handleDeleteGlobalAd(ad)}
                        className="w-full py-2 text-[10px] font-bold uppercase rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center gap-1"
                      >
                        <Trash2 size={10} /> Eliminar de la Red
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'visualizers' && (
        <VisualizerBakerPanel />
      )}

      {activeTab === 'directo' && (
        <div className="rounded-[2rem] border border-white/5 bg-white/[0.03] p-8 backdrop-blur-sm relative overflow-hidden space-y-6 animate-in fade-in duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500/50" />
          
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wider">Laboratorio en Vivo: Experimento Overlay OBS</h2>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
              Guía y acceso para integrar explicaciones dinámicas de desarrollo en tus retransmisiones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Guide Info */}
            <div className="space-y-4 text-sm text-white/80 leading-relaxed">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest block">¿Cómo funciona?</span>
                <p className="text-xs text-white/70">
                  Este sistema es 100% local y no interfiere con el código ni la base de datos de producción de Aura. Utiliza la sesión compartida de tu navegador local (vía <code>localStorage</code>) para sincronizar al instante tu panel de control con OBS.
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block">Instrucciones de configuración:</span>
                <ol className="list-decimal pl-5 space-y-2 text-xs text-white/70">
                  <li>Abre el panel de control haciendo clic en el botón de abajo (se abrirá en una pestaña nueva).</li>
                  <li>En tu software OBS, añade una nueva fuente del tipo <b>Navegador (Browser Source)</b>.</li>
                  <li>Configura la URL de la fuente OBS apuntando al archivo <code>overlay.html</code> del servidor local:
                    <br />
                    <code className="text-blue-400 font-mono text-[10px] select-all bg-black/40 px-2 py-0.5 rounded mt-1 inline-block">
                      {window.location.origin}/overlay.html
                    </code>
                  </li>
                  <li>Coloca las dimensiones en OBS a <b>1920x1080</b> para una alineación perfecta de la marquesina.</li>
                  <li>¡Listo! Cualquier texto o pantalla de despliegue que envíes desde el controlador se renderizará automáticamente en OBS sobre tu pantalla de retransmisión de AuraDisplay.</li>
                </ol>
              </div>

              <div className="pt-4 flex gap-4">
                <a
                  href="/controller.html"
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
                >
                  <ExternalLink size={14} /> Abrir Controlador del Directo
                </a>
                
                <a
                  href="/overlay.html"
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <Monitor size={14} /> Previsualizar Overlay
                </a>
              </div>
            </div>

            {/* Quick Embedded Controller Preview */}
            <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/40 h-[450px]">
              <div className="bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 border-b border-white/5">
                Vista Previa del Controlador
              </div>
              <iframe 
                src="/controller.html" 
                className="w-full h-full border-none"
                title="Mini Controlador"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VisualizerBakerPanel() {
  const [selectedPreset, setSelectedPreset] = useState('amanecer_lorenz');
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [statusText, setStatusText] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const PRESETS = [
    { id: 'amanecer_lorenz', label: 'Amanecer - Lorenz', cycle: 'amanecer', geometry: 'lorenz', color: '#ff7b72' },
    { id: 'mediodia_flowfield', label: 'Mediodía - Flow Field', cycle: 'mediodia', geometry: 'flowfield', color: '#38bdf8' },
    { id: 'atardecer_mycelium', label: 'Atardecer - Mycelium', cycle: 'atardecer', geometry: 'mycelium', color: '#e76f51' },
    { id: 'noche_clifford', label: 'Noche - Clifford', cycle: 'noche', geometry: 'clifford', color: '#6366f1' },
    { id: 'eclipse_flowfield', label: 'Eclipse - Flow Field', cycle: 'eclipse', geometry: 'flowfield', color: '#a855f7' }
  ];

  const currentPreset = PRESETS.find(p => p.id === selectedPreset) || PRESETS[0];

  const presetLayers: VisualLayer[] = [
    {
      id: 'layer_1',
      geometry: currentPreset.geometry as any,
      audioBand: 'mid',
      scale: currentPreset.geometry === 'clifford' ? 1.0 : 1.2,
      color: currentPreset.color,
      opacity: 0.9
    }
  ];

  const handleStartBake = async () => {
    if (!containerRef.current || isRecording) return;
    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) {
      alert("No se encontró el lienzo (canvas) del visualizador para grabar.");
      return;
    }

    try {
      setIsRecording(true);
      setStatusText('Inicializando grabación...');
      
      const stream = canvas.captureStream(30); // 30 FPS
      const options = { mimeType: 'video/webm;codecs=vp9' };
      let mediaRecorder: MediaRecorder;
      
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      }

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setStatusText('Transcodificando y subiendo a R2 (Procesando con FFmpeg)...');
        const webmBlob = new Blob(chunks, { type: 'video/webm' });
        
        const formData = new FormData();
        formData.append('file', webmBlob, `${currentPreset.id}.webm`);
        formData.append('name', currentPreset.id);

        try {
          const res = await fetch('/api/admin/bake-visualizer-video', {
            method: 'POST',
            body: formData
          });
          
          if (res.ok) {
            const data = await res.json();
            setStatusText('¡Grabado y cocinado con éxito en R2!');
            alert(`Visualizador '${currentPreset.label}' guardado correctamente en MP4.`);
          } else {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Server error');
          }
        } catch (err: any) {
          console.error(err);
          setStatusText(`Error al guardar: ${err.message}`);
          alert(`Error al guardar en el servidor: ${err.message}`);
        } finally {
          setIsRecording(false);
          setCountdown(0);
        }
      };

      mediaRecorder.start();
      let secondsLeft = 15;
      setCountdown(secondsLeft);
      setStatusText(`Grabando bucle en tiempo real... (${secondsLeft}s restante)`);

      const interval = setInterval(() => {
        secondsLeft -= 1;
        setCountdown(secondsLeft);
        if (secondsLeft <= 0) {
          clearInterval(interval);
          mediaRecorder.stop();
        } else {
          setStatusText(`Grabando bucle en tiempo real... (${secondsLeft}s restante)`);
        }
      }, 1000);

    } catch (err: any) {
      console.error(err);
      alert("Error al iniciar MediaRecorder: " + err.message);
      setIsRecording(false);
      setStatusText('');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-black p-8 shadow-2xl">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3 space-y-6">
          <div>
            <h2 className="text-xl font-bold">Cocinador de Loops Visuales</h2>
            <p className="text-xs text-white/40 mt-1">Graba un fragmento del visualizador animado a 30 FPS, lo convierte en MP4 compatible y lo guarda directamente en R2 para uso de las pantallas.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Seleccionar Estilo / Franja</label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              disabled={isRecording}
              className="w-full rounded-xl border border-white/10 bg-[#161426] px-4 py-3 text-sm text-white focus:outline-none disabled:opacity-50"
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-2">
            <p className="font-bold">⚠️ Instrucciones:</p>
            <p>1. Al pulsar "Grabar", el sistema capturará 15 segundos del canvas en tiempo real.</p>
            <p>2. El archivo se enviará a tu servidor local donde FFmpeg lo convertirá a un MP4 ligero de alta compatibilidad.</p>
            <p>3. El MP4 final se guardará directamente en tu bucket R2 de producción.</p>
          </div>

          <button
            onClick={handleStartBake}
            disabled={isRecording}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 py-4 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:scale-100"
          >
            {isRecording ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Grabando ({countdown}s)...</span>
              </>
            ) : (
              <>
                <Video size={16} />
                <span>Grabar Bucle de 15s y Cocinar</span>
              </>
            )}
          </button>

          {statusText && (
            <p className="text-[10px] text-center font-mono text-purple-400 animate-pulse">{statusText}</p>
          )}
        </div>

        <div className="w-full md:w-2/3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Vista Previa del Canvas (Capturando desde aquí)</label>
          <div 
            ref={containerRef}
            className="relative w-full aspect-video rounded-2xl border border-white/10 bg-[#0d0c15] overflow-hidden flex items-center justify-center"
          >
            <AuraCanvas
              analyser={null}
              circadianCycle={currentPreset.cycle as any}
              layers={presetLayers}
              globalSpeed={1.0}
              baseTrailOpacity={0.06}
            />
            {isRecording && (
              <div className="absolute inset-0 bg-red-500/10 border-4 border-red-500 animate-pulse pointer-events-none flex items-center justify-center">
                <span className="bg-red-600 text-white font-bold uppercase tracking-widest text-[10px] px-3 py-1 rounded-full shadow-lg">REC ● {countdown}s</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
