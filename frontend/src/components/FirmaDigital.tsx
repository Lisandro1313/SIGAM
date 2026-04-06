import { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Delete as ClearIcon } from '@mui/icons-material';

interface FirmaDigitalProps {
  onFirma: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

export default function FirmaDigital({ onFirma, width = 340, height = 180 }: FirmaDigitalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasFirma, setHasFirma] = useState(false);

  // Ajustar resolución del canvas al tamaño real del contenedor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#111';
    }
  }, [width, height]);

  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  }, []);

  const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  }, [getPos]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasFirma(true);
  }, [drawing, getPos]);

  const stopDraw = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    // Emitir la firma como base64
    const canvas = canvasRef.current;
    if (canvas && hasFirma) {
      onFirma(canvas.toDataURL('image/png'));
    }
  }, [drawing, hasFirma, onFirma]);

  const limpiar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasFirma(false);
    onFirma('');
  }, [onFirma]);

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
        Firme con el dedo o mouse dentro del recuadro
      </Typography>
      <Box
        sx={{
          border: '2px dashed',
          borderColor: hasFirma ? 'primary.main' : 'grey.400',
          borderRadius: 1,
          bgcolor: '#fafafa',
          touchAction: 'none',
          cursor: 'crosshair',
          width: width,
          height: height,
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          style={{ display: 'block' }}
        />
        {!hasFirma && (
          <Typography
            variant="body2"
            color="text.disabled"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            Firme aqui
          </Typography>
        )}
      </Box>
      {hasFirma && (
        <Button size="small" startIcon={<ClearIcon />} onClick={limpiar} sx={{ mt: 0.5 }}>
          Limpiar firma
        </Button>
      )}
    </Box>
  );
}
