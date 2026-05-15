"use client";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const toggle = () => {
    const next = i18n.language === "en" ? "hi" : "en";
    i18n.changeLanguage(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("jewelflow-lang", next);
      document.documentElement.lang = next;
    }
  };

  const current = mounted ? i18n.language : "en";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="gap-1.5 font-semibold"
      title="Toggle language"
    >
      <Languages className="size-3.5" />
      {current === "en" ? "EN" : "हिं"}
    </Button>
  );
}
