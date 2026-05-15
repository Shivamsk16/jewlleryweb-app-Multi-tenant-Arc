"use client";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../locales/en.json";
import hi from "../../locales/hi.json";

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        hi: { translation: hi },
      },
      lng:
        typeof window !== "undefined"
          ? localStorage.getItem("jewelflow-lang") || "en"
          : "en",
      fallbackLng: "en",
      interpolation: { escapeValue: false },
    });
}

export default i18n;
