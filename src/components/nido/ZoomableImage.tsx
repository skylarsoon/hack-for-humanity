import { useState } from "react";
import { Minus, Plus, RotateCcw, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MIN = 1, MAX = 4, STEP = 0.5;

/** A photo that opens in a larger viewer on click. Zoom with the buttons or by clicking the image; scroll to pan. */
export function ZoomableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const set = (z: number) => setZoom(Math.min(MAX, Math.max(MIN, z)));
  return (
    <>
      <button type="button" onClick={() => { setZoom(1); setOpen(true); }} aria-label={`Zoom in on ${alt}`} className="group relative block w-full cursor-zoom-in">
        <img src={src} alt={alt} className={cn("w-full rounded object-contain", className)} />
        <span aria-hidden="true" className="absolute bottom-2 right-2 rounded bg-background/80 p-1.5 opacity-80 shadow group-hover:opacity-100"><ZoomIn className="h-4 w-4" /></span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" aria-label="Zoom out" disabled={zoom <= MIN} onClick={() => set(zoom - STEP)}><Minus /></Button>
            <span className="w-14 text-center text-sm tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
            <Button size="sm" variant="outline" aria-label="Zoom in" disabled={zoom >= MAX} onClick={() => set(zoom + STEP)}><Plus /></Button>
            <Button size="sm" variant="ghost" aria-label="Reset zoom" onClick={() => set(1)}><RotateCcw /></Button>
          </div>
          <div className="max-h-[70vh] overflow-auto rounded border bg-muted">
            <img src={src} alt={alt} onClick={() => set(zoom >= 2 ? 1 : 2)} style={{ width: `${zoom * 100}%`, maxWidth: "none" }} className={cn("block", zoom >= 2 ? "cursor-zoom-out" : "cursor-zoom-in")} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
