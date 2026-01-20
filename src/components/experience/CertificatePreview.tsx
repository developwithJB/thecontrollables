import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface CertificatePreviewProps {
  certificateUrl: string;
  startDate: string;
  onClose?: () => void;
}

const withCacheBust = (url: string) => `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;

export function CertificatePreview({ certificateUrl, startDate, onClose }: CertificatePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const displayUrl = useMemo(() => withCacheBust(certificateUrl), [certificateUrl]);

  // Convert SVG to PNG using canvas
  const convertSvgToPng = async (svgUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        const scale = 2; // 2x for retina quality
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert to PNG"));
          }
        }, "image/png", 1.0);
      };
      
      img.onerror = () => reject(new Error("Failed to load certificate image"));
      img.src = svgUrl;
    });
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const pngBlob = await convertSvgToPng(displayUrl);

      const blobUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `controllables-certificate-${format(new Date(startDate), "yyyy-MM-dd")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      onClose?.();
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Certificate preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-2xl overflow-hidden border border-accent/30 shadow-2xl bg-slate-900"
      >
        <img
          src={displayUrl}
          alt="Your Controllables Certificate"
          className="w-full h-auto"
        />
      </motion.div>

      {/* Download button */}
      <Button
        onClick={handleDownload}
        disabled={isDownloading}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        Download Certificate
      </Button>
    </div>
  );
}
